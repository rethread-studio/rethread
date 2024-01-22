use anyhow::{anyhow, Result};
use config::Config;
use crossterm::{
    event::{self, DisableMouseCapture, EnableMouseCapture, Event, KeyCode},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use enum_iterator::cardinality;
use futures_util::{SinkExt, StreamExt};
use fxhash::FxHashMap;
use log::*;
use menu::MenuItem;
use rand::{thread_rng, Rng};
use ratatui as tui;
use ratatui::{
    backend::{Backend, CrosstermBackend},
    layout::{Alignment, Constraint, Layout},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, Cell, Gauge, Paragraph, Row, Table, TableState, Wrap},
    Frame, Terminal,
};
use rtrb::{Consumer, Producer};
use send_osc::{OscSender, WebsocketSender};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    fmt::Debug,
    fs::File,
    io::{Read, Write},
    sync::{atomic::AtomicBool, Arc, Mutex},
    time::{Duration, Instant, SystemTime},
};
use std::{net::SocketAddr, path::PathBuf};
use syscalls_shared::score::{Movement, Score, ScorePlaybackData, ScoreUpdate};
use syscalls_shared::{Packet, Syscall, SyscallKind};
use tokio::{
    net::{TcpListener, TcpStream},
    sync::mpsc::UnboundedSender,
};
use tokio_tungstenite::tungstenite::Message;
use uuid::Uuid;

mod audience_interaction_communication;
mod config;
mod egui_main;
mod menu;
mod send_osc;

static SHOW_TUI: bool = true;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RecordedPackets {
    records: Vec<Record>,
    name: String,
    intensity: u32,
    main_program: String,
}

impl RecordedPackets {
    fn new(name: String) -> Self {
        Self {
            records: vec![],
            name,
            intensity: 0,
            main_program: String::new(),
        }
    }
    fn record_packet(&mut self, packet: Packet, timestamp: Duration) {
        self.records.push(Record { packet, timestamp })
    }
    fn trim_from_start(&mut self, seconds: f32) {
        let final_start_dur = Duration::from_secs_f32(seconds);
        let mut i = 0;
        while i < self.records.len() {
            if self.records[i].timestamp < final_start_dur {
                i += 1;
            } else {
                break;
            }
        }
        self.records.drain(0..i);
        for r in &mut self.records {
            r.timestamp -= final_start_dur;
        }
    }
    fn trim_silence_before(&mut self) {
        if let Some(first_timestamp) = self.records.first().map(|r| r.timestamp) {
            for r in &mut self.records {
                r.timestamp -= first_timestamp;
            }
        }
    }
    fn save_postcard(&self, path: &PathBuf) -> Result<()> {
        let data = postcard::to_stdvec(&self).unwrap();
        std::fs::create_dir_all(
            path.parent()
                .ok_or(anyhow!("recording path has no parent"))?,
        )?;
        let mut file = File::create(path)?;
        file.write_all(data.as_slice()).unwrap();
        Ok(())
    }
    fn analyse_main_program(&mut self) {
        let mut program_count = FxHashMap::default();
        for r in &self.records {
            match &r.packet {
                syscalls_shared::Packet::Syscall(s) => {
                    *program_count.entry(s.command.clone()).or_insert(0) += 1
                }
            }
        }
        let mut sorted_programs = program_count.into_iter().collect::<Vec<_>>();
        sorted_programs.sort_by(|a, b| a.1.cmp(&b.1));
        if let Some((main_program, _)) = sorted_programs.first() {
            self.main_program = main_program.clone();
        }
    }
    fn mean_activity(&self, timestep: Duration) -> f32 {
        let mut time = Duration::ZERO;
        let mut activity_slices = vec![];
        let mut current_i = 0;

        while current_i < self.records.len() {
            let mut calls_per_ts = 0;
            while self.records[current_i].timestamp < time {
                calls_per_ts += 1;
                current_i += 1;
                if current_i >= self.records.len() {
                    break;
                }
            }
            activity_slices.push(calls_per_ts);
            time += timestep;
        }

        let num_slices = activity_slices.len();
        (activity_slices.into_iter().sum::<usize>() as f64 / num_slices as f64) as f32
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Record {
    packet: Packet,
    timestamp: Duration,
}

#[derive(Clone, Debug)]
pub struct RecordingPlayback {
    recorded_packets: RecordedPackets,
    /// Playback is driven by the timestamps as Duration
    current_duration: Duration,
    /// Store current packet so we don't add a packet twice
    current_packet: usize,
    playing: bool,
    looping: bool,
    last_packet_timestamp: Duration,
    uuid: Uuid,
}

impl RecordingPlayback {
    fn new(mut recorded_packets: RecordedPackets) -> Self {
        // Sort packets because they have to be in time order
        recorded_packets
            .records
            .sort_by_key(|record| record.timestamp);
        let last_packet_timestamp = if recorded_packets.records.len() > 0 {
            recorded_packets.records.iter().last().unwrap().timestamp
        } else {
            Duration::ZERO
        };
        Self {
            recorded_packets,
            current_duration: Duration::ZERO,
            current_packet: 0,
            playing: false,
            last_packet_timestamp,
            looping: false,
            uuid: Uuid::new_v4(),
        }
    }
    fn start_playback(&mut self, osc_sender: &mut OscSender) {
        self.current_duration = Duration::ZERO;
        self.current_packet = 0;
        self.playing = true;
        osc_sender.send_start_recording_playback(self.recorded_packets.name.clone());
    }
    fn stop_playback(&mut self, osc_sender: &mut OscSender) {
        self.playing = false;
        osc_sender.send_stop_recording_playback(self.recorded_packets.name.clone());
    }
    fn from_file(path: &PathBuf) -> Result<Self> {
        let mut file = File::open(path)?;
        let mut bytes = Vec::new();
        file.read_to_end(&mut bytes)?;
        let recorded_packets = postcard::from_bytes(&bytes)?;
        Ok(Self::new(recorded_packets))
    }
    fn progress_time(&mut self, dt: Duration) {
        if self.playing {
            self.current_duration += dt;
        }
    }
    fn reset(&mut self) {
        self.current_duration = Duration::ZERO;
        self.current_packet = 0;
    }
    fn log_debug_info(&self) {
        info!("Debug for {}", self.recorded_packets.name);
        info!(
            "dur/index {}/{}",
            self.current_duration.as_secs_f32(),
            self.current_packet
        );
        info!("first packet {:?}", self.recorded_packets.records[0]);
    }
    fn trim_from_start(&mut self, seconds: f32) {
        self.recorded_packets.trim_from_start(seconds);
        self.last_packet_timestamp = if self.recorded_packets.records.len() > 0 {
            self.recorded_packets
                .records
                .iter()
                .last()
                .unwrap()
                .timestamp
        } else {
            Duration::ZERO
        };
    }
    fn trim_silence_before(&mut self) {
        self.recorded_packets.trim_silence_before();
        self.last_packet_timestamp = if self.recorded_packets.records.len() > 0 {
            self.recorded_packets
                .records
                .iter()
                .last()
                .unwrap()
                .timestamp
        } else {
            Duration::ZERO
        };
    }
    fn next_packet(&mut self) -> RecordingUpdate {
        if !self.playing {
            return RecordingUpdate::None;
        }
        if self.current_packet >= self.recorded_packets.records.len() {
            if self.looping {
                self.current_duration = Duration::ZERO;
                self.current_packet = 0;
            } else {
                self.playing = false;
                return RecordingUpdate::Stopped;
            }
        }
        if self.recorded_packets.records[self.current_packet].timestamp <= self.current_duration {
            let packet = &self.recorded_packets.records[self.current_packet].packet;
            self.current_packet += 1;
            return RecordingUpdate::Packet(packet);
        } else {
            RecordingUpdate::None
        }
    }
}
enum RecordingUpdate<'a> {
    Packet(&'a Packet),
    Stopped,
    None,
}
struct Analysers {
    syscall_analyser: SyscallAnalyser,
}
impl Analysers {
    pub fn new(settings: &Config) -> Self {
        Self {
            syscall_analyser: SyscallAnalyser::new(),
        }
    }

    fn register_packet(&mut self, packet: &Packet, osc_sender: &mut OscSender) {
        match packet {
            Packet::Syscall(syscall) => {
                self.syscall_analyser.register_packet(syscall);
                osc_sender.send_syscall(syscall);
            }
        }
    }

    fn update(&mut self, osc_sender: &mut OscSender) {
        self.syscall_analyser.update(osc_sender);
    }
}

#[derive(Clone, Debug)]
pub enum RecordingCommand {
    /// Replaces the recording with the same label name
    ReplaceRecording(RecordingPlayback),
    ReplaceAllRecordings(Vec<RecordingPlayback>),
    SendAllRecordings,
    StartPlayback(Uuid),
    StopPlayback(Uuid),
    LoadRecordingFromFile(PathBuf),
    SaveRecordingToFile(Uuid, PathBuf),
    CloseRecording(Uuid),
    PlayScore,
    PlayRandomMovements,
    StopScorePlayback,
}

#[derive(Clone, Debug)]
pub enum EguiUpdate {
    AllRecordings(Vec<RecordingPlayback>),
    StartingPlaybackOfRecording(Uuid),
    StoppingPlaybackOfRecording(Uuid),
    PlaybackUpdate(Uuid, PlaybackData),
    SetActivePrograms(Vec<&'static str>),
    ScorePlay,
    ScorePlayRandom,
    ScoreStop,
}
struct PacketHQ {
    score: Score,
    analysers: Analysers,
    osc_sender: OscSender,
    recording: Option<RecordedPackets>,
    recording_playbacks: Vec<RecordingPlayback>,
    start_recording_time: Instant,
    tui_update_sender: rtrb::Producer<GuiUpdate>,
    command_receiver: rtrb::Consumer<PacketHQCommands>,
    egui_command_receiver: rtrb::Consumer<RecordingCommand>,
    egui_update_sender: rtrb::Producer<EguiUpdate>,
    last_update: Instant,
    last_gui_update_sent: Instant,
}
impl PacketHQ {
    fn new(
        settings: &Config,
        tui_update_sender: rtrb::Producer<GuiUpdate>,
        command_receiver: rtrb::Consumer<PacketHQCommands>,
        egui_update_sender: rtrb::Producer<EguiUpdate>,
        egui_command_receiver: rtrb::Consumer<RecordingCommand>,
    ) -> Self {
        Self {
            score: Score::new(),
            recording: None,
            osc_sender: OscSender::new(settings),
            start_recording_time: Instant::now(),
            tui_update_sender,
            command_receiver,
            recording_playbacks: vec![],
            last_update: Instant::now(),
            analysers: Analysers::new(settings),
            egui_command_receiver,
            egui_update_sender,
            last_gui_update_sent: Instant::now(),
        }
    }
    pub fn register_websocket_senders(&mut self, ws: WebsocketSender) {
        self.osc_sender.register_websocket_senders(ws);
    }
    fn start_recording(&mut self) {
        self.start_recording_time = Instant::now();
        self.recording = Some(RecordedPackets::new(
            humantime::format_rfc3339(SystemTime::now()).to_string(),
        ));
    }
    fn stop_and_save_recording(&mut self, path: PathBuf) {
        let Some(recording) = self.recording.take() else {
            return;
        };
        if let Err(e) = recording.save_postcard(&path) {
            error!("Failed to save recording: {e}");
        }
        self.register_new_recording(recording);
    }
    fn stop_recording(&mut self) {
        let Some(recording) = self.recording.take() else {
            return;
        };
        self.register_new_recording(recording);
    }
    fn register_new_recording(&mut self, recording: RecordedPackets) {
        // Add the recording to the list
        self.recording_playbacks
            .push(RecordingPlayback::new(recording));
        // Send the updated list of recordings to the editor
        self.egui_update_sender
            .push(EguiUpdate::AllRecordings(self.recording_playbacks.clone()))
            .ok();
    }
    fn stop_and_save_recording_json(&mut self, path: PathBuf) {
        let Some(recording) = self.recording.take() else {
            return;
        };
        let data = serde_json::to_string(&recording).unwrap();
        let Ok(mut file) = File::create(path) else {
            error!("Couldn't open file to save data!");
            return;
        };
        write!(file, "{}", data).unwrap();
    }
    fn load_recording(&mut self, path: PathBuf) {
        let Ok(recording_playback) = RecordingPlayback::from_file(&path) else {
            error!("Failed to load data from path: {path:?}");
            return;
        };
        self.recording_playbacks.push(recording_playback);
        if let Err(e) = self
            .egui_update_sender
            .push(EguiUpdate::AllRecordings(self.recording_playbacks.clone()))
        {
            error!("Failed to send update (AllRecordings) to egui: {e}");
        }
    }
    fn register_packet(&mut self, packet: Packet) {
        self.analysers
            .register_packet(&packet, &mut self.osc_sender);
        if let Some(recording) = &mut self.recording {
            recording.record_packet(packet, self.start_recording_time.elapsed());
        }
    }
    fn update(&mut self) {
        let dt = self.last_update.elapsed();
        self.last_update = Instant::now();
        self.analysers.update(&mut self.osc_sender);
        for rp in &mut self.recording_playbacks {
            rp.progress_time(dt);
            loop {
                match rp.next_packet() {
                    RecordingUpdate::Packet(packet) => {
                        self.analysers.register_packet(packet, &mut self.osc_sender);
                    }
                    RecordingUpdate::Stopped => {
                        // The recording just stopped, send that on
                        rp.stop_playback(&mut self.osc_sender);
                        self.egui_update_sender
                            .push(EguiUpdate::StoppingPlaybackOfRecording(rp.uuid))
                            .ok();
                    }
                    RecordingUpdate::None => break,
                }
            }
        }
        if self.last_gui_update_sent.elapsed() > Duration::from_millis(200) {
            self.last_gui_update_sent = Instant::now();
            for rp in &self.recording_playbacks {
                let pd = PlaybackData {
                    current_index: rp.current_packet,
                    max_index: rp.recorded_packets.records.len(),
                    current_timestamp: rp.current_duration,
                    max_timestamp: rp.last_packet_timestamp,
                    playing: rp.playing,
                };
                self.egui_update_sender
                    .push(EguiUpdate::PlaybackUpdate(rp.uuid, pd))
                    .ok();
            }
            let playback_data = if let Some(rp) = &self.recording_playbacks.first() {
                PlaybackData {
                    current_index: rp.current_packet,
                    max_index: rp.recorded_packets.records.len(),
                    current_timestamp: rp.current_duration,
                    max_timestamp: rp.last_packet_timestamp,
                    playing: rp.playing,
                }
            } else {
                PlaybackData::default()
            };
            let score_playback_data = self.score.score_playback_data();
            self.tui_update_sender
                .push(GuiUpdate {
                    syscall_analyser: self.analysers.syscall_analyser.clone(),
                    playback_data,
                    score_playback_data,
                })
                .ok();
        }
        while let Ok(command) = self.egui_command_receiver.pop() {
            match command {
                RecordingCommand::ReplaceRecording(new_recording) => {
                    for r in &mut self.recording_playbacks {
                        if r.uuid.eq(&new_recording.uuid) {
                            *r = new_recording;
                            break;
                        }
                    }
                }
                RecordingCommand::SendAllRecordings => self
                    .egui_update_sender
                    .push(EguiUpdate::AllRecordings(self.recording_playbacks.clone()))
                    .unwrap(),
                RecordingCommand::StartPlayback(uuid) => {
                    let mut recording_found = false;
                    for r in &mut self.recording_playbacks {
                        if r.uuid == uuid {
                            r.start_playback(&mut self.osc_sender);
                            info!("Started playback on packethq");
                            recording_found = true;
                        }
                    }
                    if !recording_found {
                        warn!("Unable to find and start recording {}", &uuid);
                    }
                }
                RecordingCommand::StopPlayback(uuid) => {
                    for r in &mut self.recording_playbacks {
                        if r.uuid == uuid {
                            r.stop_playback(&mut self.osc_sender);
                        }
                    }
                }
                RecordingCommand::LoadRecordingFromFile(path) => self.load_recording(path),
                RecordingCommand::CloseRecording(uuid) => {
                    if let Some(i) = self.recording_playbacks.iter().position(|r| r.uuid == uuid) {
                        self.recording_playbacks.remove(i);
                    }
                }
                RecordingCommand::ReplaceAllRecordings(recordings) => {
                    self.recording_playbacks = recordings
                }
                RecordingCommand::SaveRecordingToFile(uuid, path) => {
                    if let Some(r) = self.recording_playbacks.iter().find(|r| r.uuid == uuid) {
                        if let Err(e) = r.recorded_packets.save_postcard(&path) {
                            error!("Failed to save recording: {e}");
                        }
                    }
                }
                RecordingCommand::PlayScore => self.play_score(),
                RecordingCommand::PlayRandomMovements => self.play_random_movements(),
                RecordingCommand::StopScorePlayback => {
                    self.score.stop();
                    self.osc_sender.send_score_stop();
                }
            }
        }
        while let Ok(command) = self.command_receiver.pop() {
            match command {
                PacketHQCommands::StartRecording => self.start_recording(),
                PacketHQCommands::SaveRecording { path } => self.stop_and_save_recording(path),
                PacketHQCommands::SaveRecordingJson { path } => {
                    self.stop_and_save_recording_json(path)
                }
                PacketHQCommands::StopRecording => self.stop_recording(),
                PacketHQCommands::LoadRecording { path } => self.load_recording(path),
                PacketHQCommands::PauseRecordingPlayback => {
                    for recording in &mut self.recording_playbacks {
                        recording.playing = false;
                        self.egui_update_sender
                            .push(EguiUpdate::StoppingPlaybackOfRecording(recording.uuid))
                            .ok();
                    }
                }
                PacketHQCommands::StartRecordingPlayback => {
                    for recording in &mut self.recording_playbacks {
                        recording.start_playback(&mut self.osc_sender);

                        self.egui_update_sender
                            .push(EguiUpdate::StartingPlaybackOfRecording(recording.uuid))
                            .ok();
                    }
                }
                PacketHQCommands::ResetRecordingPlayback => {
                    for recording in &mut self.recording_playbacks {
                        recording.reset();
                    }
                }
                PacketHQCommands::PlayScore => {
                    self.play_score();
                }
                PacketHQCommands::StopScorePlayback => {
                    self.score.stop();
                    self.osc_sender.send_score_stop();
                }
                PacketHQCommands::NextMovement => {
                    let update = self.score.next_movement();
                    match update {
                        ScoreUpdate::ScoreStop => {
                            self.osc_sender.send_score_stop();
                            self.egui_update_sender.push(EguiUpdate::ScoreStop).ok();
                        }
                        ScoreUpdate::NewMovement { new_mvt, next_mvt } => {
                            self.osc_sender.send_movement(&new_mvt, next_mvt);
                            if !self.score.random_order {
                                self.egui_update_sender
                                    .push(EguiUpdate::SetActivePrograms(new_mvt.programs.clone()))
                                    .ok();
                            }
                        }
                        ScoreUpdate::Nothing => (),
                    }
                }
                PacketHQCommands::PreviousMovement => {
                    let update = self.score.previous_movement();
                    match update {
                        ScoreUpdate::ScoreStop => {
                            self.osc_sender.send_score_stop();
                            self.egui_update_sender.push(EguiUpdate::ScoreStop).ok();
                        }
                        ScoreUpdate::NewMovement { new_mvt, next_mvt } => {
                            self.osc_sender.send_movement(&new_mvt, next_mvt);
                            if !self.score.random_order {
                                self.egui_update_sender
                                    .push(EguiUpdate::SetActivePrograms(new_mvt.programs.clone()))
                                    .ok();
                            }
                        }
                        ScoreUpdate::Nothing => (),
                    }
                }
                PacketHQCommands::PlayRandomMovements => {
                    self.play_random_movements();
                }
            }
        }
        match self.score.update() {
            ScoreUpdate::ScoreStop => {
                self.osc_sender.send_score_stop();
                self.egui_update_sender.push(EguiUpdate::ScoreStop).ok();
            }
            ScoreUpdate::NewMovement { new_mvt, next_mvt } => {
                self.osc_sender.send_movement(&new_mvt, next_mvt);
                if !self.score.random_order {
                    self.egui_update_sender
                        .push(EguiUpdate::SetActivePrograms(new_mvt.programs.clone()))
                        .ok();
                }
            }
            ScoreUpdate::Nothing => (),
        }
    }
    pub fn play_score(&mut self) {
        if !self.score.is_playing() {
            self.osc_sender.send_score_start(false);
        }
        self.score.random_order = false;
        self.egui_update_sender.push(EguiUpdate::ScorePlay).ok();
        let (new_mvt, next_mvt) = self.score.play_from(0);
        self.osc_sender.send_movement(&new_mvt, next_mvt);
        if !self.score.random_order {
            self.egui_update_sender.push(EguiUpdate::ScorePlay).ok();
            self.egui_update_sender
                .push(EguiUpdate::SetActivePrograms(new_mvt.programs.clone()))
                .ok();
        }
    }
    pub fn play_random_movements(&mut self) {
        if !self.score.is_playing() {
            self.osc_sender.send_score_start(true);
        }
        self.egui_update_sender
            .push(EguiUpdate::ScorePlayRandom)
            .ok();
        self.score.random_order = true;
        let num_movements = self.score.movements.len();
        let mut rng = thread_rng();
        let start_movement = rng.gen_range(0..num_movements - 1);
        let (new_mvt, next_mvt) = self.score.play_from(start_movement);
        self.osc_sender.send_movement(&new_mvt, next_mvt);
    }
}

#[derive(Clone, Debug)]
pub struct GuiUpdate {
    syscall_analyser: SyscallAnalyser,
    playback_data: PlaybackData,
    score_playback_data: ScorePlaybackData,
}
#[derive(Clone, Debug)]
pub struct PlaybackData {
    current_index: usize,
    max_index: usize,
    current_timestamp: Duration,
    max_timestamp: Duration,
    playing: bool,
}
impl Default for PlaybackData {
    fn default() -> Self {
        Self {
            current_index: 0,
            max_index: 0,
            current_timestamp: Duration::ZERO,
            max_timestamp: Duration::ZERO,
            playing: false,
        }
    }
}
enum PacketHQCommands {
    PlayScore,
    PlayRandomMovements,
    NextMovement,
    PreviousMovement,
    StopScorePlayback,
    StartRecording,
    StopRecording,
    SaveRecording { path: PathBuf },
    SaveRecordingJson { path: PathBuf },
    LoadRecording { path: PathBuf },
    PauseRecordingPlayback,
    StartRecordingPlayback,
    ResetRecordingPlayback,
}

#[derive(Clone, Debug)]
struct SyscallAnalyser {
    pub num_packets_total: usize,
    pub num_errors_total: usize,
    pub packets_per_kind: HashMap<SyscallKind, u64>,
    pub packets_per_kind_last_interval: Vec<i32>,
    pub average_packets_per_kind_last_interval: Vec<f32>,
    pub num_packets_last_interval: usize,
    pub num_errors_last_interval: usize,
    last_interval: Instant,
}
impl SyscallAnalyser {
    pub fn new() -> Self {
        let num_kinds = cardinality::<SyscallKind>();
        Self {
            packets_per_kind: HashMap::new(),
            num_packets_last_interval: 0,
            num_errors_last_interval: 0,
            last_interval: Instant::now(),
            num_packets_total: 0,
            num_errors_total: 0,
            packets_per_kind_last_interval: vec![0; num_kinds],
            average_packets_per_kind_last_interval: vec![0.; num_kinds],
        }
    }
    pub fn register_packet(&mut self, syscall: &Syscall) {
        self.num_packets_total += 1;
        *self.packets_per_kind.entry(syscall.kind).or_insert(0) += 1;
        self.packets_per_kind_last_interval
            [<SyscallKind as Into<u8>>::into(syscall.kind) as usize] += 1;
        self.num_packets_last_interval += 1;
        if syscall.returns_error {
            self.num_errors_last_interval += 1;
            self.num_errors_total += 1;
        }
    }
    pub fn update(&mut self, osc_sender: &mut OscSender) {
        if self.last_interval.elapsed() >= Duration::from_secs_f32(0.1) {
            osc_sender.send_syscall_analysis(
                self.num_packets_last_interval,
                self.num_errors_last_interval,
                &self.packets_per_kind_last_interval,
            );
            for i in 0..cardinality::<SyscallKind>() {
                let ratio = self.packets_per_kind_last_interval[i] as f32
                    / self.average_packets_per_kind_last_interval[i];
                if ratio > 2.0 {
                    let kind = SyscallKind::try_from(i as u8).unwrap().to_string();
                    osc_sender.send_category_peak(kind, ratio)
                }
                self.average_packets_per_kind_last_interval[i] *= 0.9;
                self.average_packets_per_kind_last_interval[i] +=
                    self.packets_per_kind_last_interval[i] as f32 * 0.9;
                self.packets_per_kind_last_interval[i] = 0;
            }
            self.num_packets_last_interval = 0;
            self.num_errors_last_interval = 0;
            self.last_interval = Instant::now();
        }
        // let mut i = 0;
        // while i < self.packets_last_second.len() {
        //     if self.packets_last_second[i].1.elapsed().as_secs() > 0 {
        //         self.packets_last_second.remove(i);
        //     } else {
        //         i += 1;
        //     }
        // }
        // let mut i = 0;
        // while i < self.errors_last_second.len() {
        //     if self.errors_last_second[i].1.elapsed().as_secs() > 0 {
        //         self.errors_last_second.remove(i);
        //     } else {
        //         i += 1;
        //     }
        // }
    }
    pub fn packets_per_kind_rows<'a, 'b>(&'a self) -> Vec<Row<'b>> {
        let rows = self
            .packets_per_kind
            .iter()
            .map(|(key, number)| {
                let cells = vec![
                    Cell::from(format!("{key:?}")).style(Style::default().fg(Color::Cyan)),
                    Cell::from(format!("{number}")),
                ];
                Row::new(cells).height(1).bottom_margin(0)
            })
            .collect();
        rows
    }
}

impl Default for SyscallAnalyser {
    fn default() -> Self {
        Self::new()
    }
}
#[tokio::main(flavor = "multi_thread")]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Debug using tokio-console
    // console_subscriber::init();
    let log_file = File::create("debug.log")?;
    tracing_subscriber::fmt()
        .with_thread_names(true)
        .with_writer(Mutex::new(log_file))
        // enable everything
        .with_max_level(tracing::Level::INFO)
        // sets this to be the default, global subscriber for this application.
        .init();

    let settings = if let Ok(settings) = Config::load_from_file() {
        settings
    } else {
        error!("Failed to load configuration");
        Config::empty()
    };

    let (gui_update_sender, gui_update_receiver) = rtrb::RingBuffer::new(1000);
    let (packet_hq_sender, packet_hq_receiver) = rtrb::RingBuffer::new(1000);
    let (packet_hq_command_sender, egui_command_receiver) = rtrb::RingBuffer::new(1000);
    let (egui_update_sender, egui_update_receiver) = rtrb::RingBuffer::new(1000);
    let packet_hq = PacketHQ::new(
        &settings,
        gui_update_sender,
        packet_hq_receiver,
        egui_update_sender,
        egui_command_receiver,
    );

    tokio_main(packet_hq, gui_update_receiver, packet_hq_sender).unwrap();

    egui_main::start_egui(packet_hq_command_sender, egui_update_receiver).unwrap();

    Ok(())
}

fn tokio_main(
    packet_hq: PacketHQ,
    gui_update_receiver: Consumer<GuiUpdate>,
    packet_hq_sender: Producer<PacketHQCommands>,
) -> Result<(), Box<dyn std::error::Error>> {
    let rt = tokio::runtime::Runtime::new().expect("Unable to create Runtime");

    // Enter the runtime so that `tokio::spawn` is available immediately.
    let _enter = rt.enter();

    // Execute the runtime in its own thread.
    // The future doesn't have to do anything. In this example, it just sleeps forever.
    std::thread::spawn(move || {
        rt.block_on(async {
            if SHOW_TUI {
                {
                    tokio::spawn(start_network_communication(packet_hq));
                }
                let mut restart = false;
                let tui_handle = tokio::task::spawn_blocking(move || {
                    setup_tui(gui_update_receiver, packet_hq_sender).unwrap()
                });
                for h in [tui_handle] {
                    if let Err(e) = h.await {
                        error!("Error in TUI: {e}");
                        panic!("{e}");
                    }
                }
            } else {
                start_network_communication(packet_hq).await.unwrap();
            }
            // loop {
            //     tokio::time::sleep(Duration::from_secs(3600)).await;
            // }
        })
    });
    Ok(())
}

fn setup_tui(
    gui_update_receiver: Consumer<GuiUpdate>,
    packet_hq_sender: Producer<PacketHQCommands>,
) -> anyhow::Result<()> {
    // setup terminal
    enable_raw_mode()?;
    let mut stdout = std::io::stdout();
    execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;
    // create app and run it
    let app = App {
        gui_update_receiver,
        packet_hq_sender,
        syscall_analyser: None,
        table_state: TableState::default(),
        menu_table_state: TableState::default(),
        is_recording: false,
        playback_data: None,
        score_playback_data: ScorePlaybackData::default(),
    };
    let res = run_app(&mut terminal, app);

    // restore terminal
    disable_raw_mode()?;
    execute!(
        terminal.backend_mut(),
        LeaveAlternateScreen,
        DisableMouseCapture
    )?;
    terminal.show_cursor()?;

    if let Err(err) = res {
        println!("{:?}", err)
    }
    Ok(())
}

pub struct App {
    syscall_analyser: Option<SyscallAnalyser>,
    playback_data: Option<PlaybackData>,
    score_playback_data: ScorePlaybackData,
    gui_update_receiver: rtrb::Consumer<GuiUpdate>,
    packet_hq_sender: rtrb::Producer<PacketHQCommands>,
    table_state: TableState,
    menu_table_state: TableState,
    is_recording: bool,
}

fn run_app<B: Backend>(terminal: &mut Terminal<B>, mut app: App) -> anyhow::Result<()> {
    let mut last_tick = Instant::now();
    let tick_rate = Duration::from_millis(16);
    loop {
        terminal.draw(|f| ui(f, &mut app))?;
        if !app.gui_update_receiver.is_empty() {
            let available = app.gui_update_receiver.slots();
            let chunk = app.gui_update_receiver.read_chunk(available);
            if let Ok(chunk) = chunk {
                let chunk_slices = chunk.as_slices();
                let gui_update = chunk_slices
                    .1
                    .last()
                    .unwrap_or(chunk_slices.0.last().expect("the first slice to have elements since we checked that there are slots to read"));
                app.syscall_analyser = Some(gui_update.syscall_analyser.clone());
                app.playback_data = Some(gui_update.playback_data.clone());
                app.score_playback_data = gui_update.score_playback_data.clone();
                chunk.commit_all();
            }
        }

        let timeout = tick_rate
            .checked_sub(last_tick.elapsed())
            .unwrap_or_else(|| Duration::from_secs(0));
        if crossterm::event::poll(timeout)? {
            if let Event::Key(key) = event::read()? {
                match key.code {
                    KeyCode::Down => {
                        if let Some(selected) = app.menu_table_state.selected() {
                            app.menu_table_state.select(Some(
                                (selected + 1) % enum_iterator::cardinality::<MenuItem>(),
                            ));
                        } else {
                            app.menu_table_state.select(Some(0));
                        }
                    }
                    KeyCode::Up => {
                        if let Some(selected) = app.menu_table_state.selected() {
                            if selected > 0 {
                                app.menu_table_state.select(Some(
                                    (selected - 1) % enum_iterator::cardinality::<MenuItem>(),
                                ));
                            } else {
                                app.menu_table_state
                                    .select(Some(enum_iterator::cardinality::<MenuItem>() - 1));
                            }
                        } else {
                            app.menu_table_state
                                .select(Some(enum_iterator::cardinality::<MenuItem>() - 1));
                        }
                    }
                    KeyCode::Enter => {
                        let selected = app.menu_table_state.selected().unwrap_or(0);
                        match MenuItem::try_from(selected as u8).unwrap() {
                            MenuItem::LoadRecordedData => {
                                if let Some(path) = rfd::FileDialog::new().pick_file() {
                                    app.is_recording = false;
                                    app.packet_hq_sender
                                        .push(PacketHQCommands::LoadRecording { path })?;
                                }
                            }
                            MenuItem::RecordData => {
                                app.is_recording = true;
                                app.packet_hq_sender
                                    .push(PacketHQCommands::StartRecording)?;
                            }
                            MenuItem::StopAndSaveRecording => {
                                if let Some(path) = rfd::FileDialog::new().save_file() {
                                    app.is_recording = false;
                                    app.packet_hq_sender
                                        .push(PacketHQCommands::SaveRecording { path })?;
                                }
                            }
                            MenuItem::StopAndSaveRecordingJson => {
                                if let Some(path) = rfd::FileDialog::new().save_file() {
                                    app.is_recording = false;
                                    app.packet_hq_sender
                                        .push(PacketHQCommands::SaveRecordingJson { path })?;
                                }
                            }
                            MenuItem::StartPlayback => {
                                app.packet_hq_sender
                                    .push(PacketHQCommands::StartRecordingPlayback)?;
                            }
                            MenuItem::PausePlayback => {
                                app.packet_hq_sender
                                    .push(PacketHQCommands::PauseRecordingPlayback)?;
                            }
                            MenuItem::Exit => return Ok(()),
                            MenuItem::ResetPlayback => {
                                app.packet_hq_sender
                                    .push(PacketHQCommands::ResetRecordingPlayback)?;
                            }
                            MenuItem::PlayScore => {
                                app.packet_hq_sender.push(PacketHQCommands::PlayScore)?;
                            }
                            MenuItem::StopScorePlayback => app
                                .packet_hq_sender
                                .push(PacketHQCommands::StopScorePlayback)?,
                            MenuItem::NextMovement => {
                                app.packet_hq_sender.push(PacketHQCommands::NextMovement)?
                            }
                            MenuItem::PreviousMovement => app
                                .packet_hq_sender
                                .push(PacketHQCommands::PreviousMovement)?,
                            MenuItem::StopRecording => {
                                app.is_recording = false;
                                app.packet_hq_sender.push(PacketHQCommands::StopRecording)?
                            }
                            MenuItem::PlayRandomMovements => {
                                app.packet_hq_sender
                                    .push(PacketHQCommands::PlayRandomMovements)?;
                            }
                        }
                    }
                    KeyCode::Char('q') => return Ok(()),
                    _ => {}
                }
            }
        }
        if last_tick.elapsed() >= tick_rate {
            // app.on_tick();
            last_tick = Instant::now();
        }
    }
}

fn ui<B: Backend>(f: &mut Frame<B>, app: &mut App) {
    let rects = Layout::default()
        .direction(tui::layout::Direction::Vertical)
        .constraints(
            [
                Constraint::Percentage(60),
                Constraint::Min(5),
                Constraint::Min(15),
            ]
            .as_ref(),
        )
        .split(f.size());
    let progress_bar = rects[1];
    let score_bar = rects[2];
    let rects = Layout::default()
        .direction(tui::layout::Direction::Horizontal)
        .constraints([Constraint::Percentage(25), Constraint::Percentage(75)].as_ref())
        .margin(1)
        .split(rects[0]);
    let data_rects = Layout::default()
        .direction(tui::layout::Direction::Vertical)
        .constraints([Constraint::Percentage(25), Constraint::Percentage(75)])
        .margin(1)
        .split(rects[1]);
    let menu_rect = rects[0];

    if let Some(pd) = &app.playback_data {
        render_progress_bar(f, progress_bar, pd);
    }
    let spd = &app.score_playback_data;
    render_score_bar(f, score_bar, spd);

    if let Some(sa) = &app.syscall_analyser {
        let (packets_per_kind_rows, syscalls_last_second, errors_last_second) = {
            let packets_per_kind_rows = sa.packets_per_kind_rows();
            (
                packets_per_kind_rows,
                sa.num_packets_last_interval,
                sa.num_errors_last_interval,
            )
        };
        render_general(
            f,
            syscalls_last_second,
            errors_last_second,
            sa.num_packets_total,
            sa.num_errors_total,
            data_rects[0],
            app,
        );
        render_packets_per_kind(f, packets_per_kind_rows, data_rects[1], app);
    }
    menu::menu_ui(f, app, menu_rect);
}
fn render_movement_info<B: Backend>(
    f: &mut Frame<B>,
    rect: tui::layout::Rect,
    name: &'static str,
    mvt: &Movement,
) {
    let break_text = if mvt.is_break { "BREAK" } else { "" };
    let interlude_text = if mvt.is_interlude { "INTERLUDE" } else { "" };
    let text = vec![
        Line::from(vec![
            Span::styled(
                break_text,
                Style::default()
                    .add_modifier(Modifier::ITALIC)
                    .fg(Color::Blue),
            ),
            Span::styled(
                interlude_text,
                Style::default()
                    .add_modifier(Modifier::ITALIC)
                    .fg(Color::LightMagenta),
            ),
            Span::raw("."),
        ]),
        Line::from(Span::styled(
            format!("id: {}", mvt.id),
            Style::default().fg(Color::Red),
        )),
        Line::from(Span::styled(
            format!("description: {}", mvt.description),
            Style::default(),
        )),
        Line::from(Span::styled(
            format!("duration: {} seconds", mvt.duration.as_secs_f32()),
            Style::default(),
        )),
    ];

    let paragraph = Paragraph::new(text)
        .block(Block::default().title(name).borders(Borders::ALL))
        .style(Style::default().fg(Color::White).bg(Color::Black))
        .alignment(Alignment::Center)
        .wrap(Wrap { trim: true });

    f.render_widget(paragraph, rect);
}
fn render_score_bar<B: Backend>(
    f: &mut Frame<B>,
    rect: tui::layout::Rect,
    score_playback_data: &ScorePlaybackData,
) {
    let score_rects = Layout::default()
        .direction(tui::layout::Direction::Vertical)
        .constraints([
            Constraint::Percentage(34),
            Constraint::Percentage(33),
            Constraint::Percentage(33),
        ])
        .margin(0)
        .split(rect);
    let max_timestamp = score_playback_data
        .current_mvt
        .as_ref()
        .map_or(Duration::ZERO, |m| m.duration);
    let tags = score_playback_data
        .current_mvt
        .as_ref()
        .map_or("", |m| &m.description);
    let g = Gauge::default()
        .block(Block::default().borders(Borders::ALL).title(format!(
            "Movement progress: {} / {} | {} / {} | total duration: {} / {}",
            score_playback_data.current_index,
            score_playback_data.max_index,
            humantime::format_duration(Duration::from_secs(
                score_playback_data.current_timestamp_for_mvt.as_secs()
            )),
            humantime::format_duration(max_timestamp),
            humantime::format_duration(Duration::from_secs(
                score_playback_data.total_duration_at_playhead.as_secs()
            )),
            humantime::format_duration(score_playback_data.total_duration),
        )))
        .gauge_style(
            Style::default()
                .fg(if score_playback_data.playing {
                    Color::Green
                } else {
                    Color::White
                })
                .bg(Color::Black)
                .add_modifier(Modifier::ITALIC),
        )
        .percent(
            ((score_playback_data.current_timestamp_for_mvt.as_secs_f64()
                / max_timestamp.as_secs_f64())
                * 100.)
                .clamp(0., 100.) as u16,
        );

    f.render_widget(g, score_rects[2]);
    if let Some(current) = &score_playback_data.current_mvt {
        render_movement_info(f, score_rects[0], "Current movement", current);
    }
    if let Some(next) = &score_playback_data.next_mvt {
        render_movement_info(f, score_rects[1], "Next movement", next);
    }
}
fn render_progress_bar<B: Backend>(
    f: &mut Frame<B>,
    rect: tui::layout::Rect,
    playback_data: &PlaybackData,
) {
    let g = Gauge::default()
        .block(Block::default().borders(Borders::ALL).title(format!(
            "Playback progress: {} / {} | {} / {}",
            playback_data.current_index,
            playback_data.max_index,
            humantime::format_duration(playback_data.current_timestamp),
            humantime::format_duration(playback_data.max_timestamp),
        )))
        .gauge_style(
            Style::default()
                .fg(if playback_data.playing {
                    Color::Green
                } else {
                    Color::White
                })
                .bg(Color::Black)
                .add_modifier(Modifier::ITALIC),
        )
        .percent(
            (((playback_data.current_timestamp.as_secs_f64()
                / playback_data.max_timestamp.as_secs_f64())
                * 100.) as u16)
                .clamp(0, 100),
        );

    f.render_widget(g, rect);
}
fn render_packets_per_kind<B: Backend>(
    f: &mut Frame<B>,
    packets_per_kind_rows: Vec<Row>,
    rect: tui::layout::Rect,
    app: &mut App,
) {
    let selected_style = Style::default().add_modifier(Modifier::REVERSED);
    let normal_style = Style::default().bg(Color::Blue);
    let header_cells = ["Kind", "Num events"]
        .iter()
        .map(|h| Cell::from(*h).style(Style::default().fg(Color::Black)));
    let header = Row::new(header_cells)
        .style(normal_style)
        .height(1)
        .bottom_margin(1);
    let t = Table::new(packets_per_kind_rows)
        .header(header)
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title("Syscall events per kind total"),
        )
        .highlight_style(selected_style)
        .highlight_symbol(">> ")
        .widths(&[
            Constraint::Percentage(50),
            Constraint::Length(30),
            Constraint::Min(10),
        ]);
    f.render_stateful_widget(t, rect, &mut app.table_state);
}
fn render_general<B: Backend>(
    f: &mut Frame<B>,
    syscalls_last_second: usize,
    errors_last_second: usize,
    syscalls_total: usize,
    errors_total: usize,
    rect: tui::layout::Rect,
    app: &mut App,
) {
    let selected_style = Style::default().add_modifier(Modifier::REVERSED);
    let normal_style = Style::default().bg(Color::Blue);
    let header_cells = ["Kind", "Num"]
        .iter()
        .map(|h| Cell::from(*h).style(Style::default().fg(Color::Black)));
    let header = Row::new(header_cells)
        .style(normal_style)
        .height(1)
        .bottom_margin(1);
    let kind_style = Style::default().fg(Color::LightCyan);
    let rows = vec![
        Row::new(vec![
            Cell::from("syscalls since start").style(kind_style),
            Cell::from(format!("{syscalls_total}")),
        ]),
        Row::new(vec![
            Cell::from("errors since start").style(kind_style),
            Cell::from(format!("{errors_total}")),
        ]),
        Row::new(vec![
            Cell::from("syscalls last second").style(kind_style),
            Cell::from(format!("{syscalls_last_second}")),
        ]),
        Row::new(vec![
            Cell::from("errors last second").style(kind_style),
            Cell::from(format!("{errors_last_second}")),
        ]),
    ];
    let t = Table::new(rows)
        .header(header)
        .block(Block::default().borders(Borders::ALL).title("Global data"))
        .highlight_style(selected_style)
        .highlight_symbol(">> ")
        .widths(&[
            Constraint::Percentage(50),
            Constraint::Length(30),
            Constraint::Min(10),
        ]);
    f.render_stateful_widget(t, rect, &mut app.table_state);
}
async fn start_network_communication(mut packet_hq: PacketHQ) -> Result<()> {
    let addr = "0.0.0.0:3012";
    let listener = TcpListener::bind(&addr).await.expect("Can't listen");
    let (packet_sender, mut packet_receiver) = tokio::sync::mpsc::unbounded_channel();

    let (message_tx, message_rx1) = tokio::sync::broadcast::channel(1000000);
    drop(message_rx1);
    {
        let message_tx = message_tx.clone();
        tokio::spawn(async move {
            let ws = WebsocketSender { message_tx };
            packet_hq.register_websocket_senders(ws);
            let mut counter = 0;
            loop {
                tokio::select! {
                    Some(packet) = packet_receiver.recv() => {
                        packet_hq.register_packet(packet);
                        counter += 1;
                        if counter >= 500 {
                            counter = 0;
                            packet_hq.update();
                        }
                    }
                    _ = tokio::time::sleep(Duration::from_millis(10)) => {
                        packet_hq.update();
                    }
                }
                // tokio::time::sleep(Duration::from_millis(1)).await;
            }
        });
    }
    tokio::spawn(async move { start_websocket_endpoints(message_tx).await });
    loop {
        let (socket, _) = listener.accept().await?;
        let packet_sender = packet_sender.clone();
        let peer = socket
            .peer_addr()
            .expect("connected streams should have a peer address");
        info!("Peer address: {}", peer);
        tokio::spawn(async move {
            handle_strace_collector_client(peer, socket, packet_sender)
                .await
                .ok();
        });
    }

    //Ok(())
}
enum EndpointMessage {
    Syscall(Syscall),
    Movement(Movement),
    CategoryPeak { kind: String, ratio: f32 },
}
// type Tx = UnboundedSender<EndpointMessage>;
type Tx = tokio::sync::mpsc::UnboundedSender<bool>;
type EndpointClients = Arc<Mutex<HashMap<SocketAddr, Tx>>>;

async fn start_websocket_endpoints(
    message_tx: tokio::sync::broadcast::Sender<String>,
) -> Result<()> {
    let addr = "0.0.0.0:1237".to_string();
    // Create the event loop and TCP listener we'll accept connections on.
    let try_socket = TcpListener::bind(&addr).await;
    let listener = try_socket.expect("Failed to bind");
    info!("Listening for endpoints on: {}", addr);
    let endpoint_clients: EndpointClients = Arc::new(Mutex::new(HashMap::new()));

    let mut all_handles = Vec::new();
    // Let's spawn the handling of each connection in a separate task.
    loop {
        match listener.accept().await {
            Ok((stream, addr)) => {
                let (private_tx, private_rx) = tokio::sync::mpsc::unbounded_channel();
                tokio::spawn(async move {
                    let mut num = 0;
                    loop {
                        private_tx.send(format!("{num} is the value")).ok();
                        num += 1;
                        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                    }
                });
                let syscall_rx = message_tx.subscribe();
                all_handles.push(tokio::spawn(async move {
                    register_new_websocket_endpoint_client(addr, stream, syscall_rx).await
                }));
            }
            Err(e) => {
                error!("Error accepting listeners: {e:?}");
            }
        }
    }
    for handle in all_handles {
        handle.await;
    }

    Ok(())
}
async fn register_new_websocket_endpoint_client(
    addr: SocketAddr,
    stream: TcpStream,
    // endpoints: EndpointClients,
    mut message_rx: tokio::sync::broadcast::Receiver<String>,
) -> Result<()> {
    info!("Incoming TCP connection from: {}", addr);

    let mut ws_stream = tokio_tungstenite::accept_async(stream)
        .await
        .expect("Error during the websocket handshake occurred");
    info!("WebSocket connection established for endpoint: {}", addr);
    let start_send = ws_stream
        .send(Message::Text("Start of transfer".to_owned()))
        .await;
    info!("{start_send:?}");
    // info!("{:?}", ws_stream.flush().await);

    let (mut write, mut read) = ws_stream.split();

    let disconnected = Arc::new(AtomicBool::new(false));
    let (disconnect_tx, mut disconnect_rx) = tokio::sync::oneshot::channel();
    {
        let disconnected = disconnected.clone();
        tokio::spawn(async move {
            loop {
                let message = read.next().await;
                info!("Received from endpoint {addr}: {message:?}");
                if matches!(message, None) {
                    // This means disconnection
                    // disconnected.store(true, std::sync::atomic::Ordering::SeqCst);
                    // If this fails the sending stream has already disconnected
                    disconnect_tx.send(true).ok();
                    break;
                }
            }
        });
    }

    let mut sent_since_flush: u64 = 0;

    loop {
        if disconnected.load(std::sync::atomic::Ordering::SeqCst) {
            break;
        }
        tokio::select! {
            m = message_rx.recv() => {
                match m {
                    Ok(m) => {
                        let m = Message::Text(m);
                        match write.feed(m).await {
                            Ok(_) => {}
                            Err(e) => {
                                error!("Error in endpoint {addr} ws stream: {e:?}");
                                break;
                            }
                        }
                        sent_since_flush += 1;
                        if sent_since_flush > 1000 {
                            write.flush().await.ok();
                        }
                    }
                    Err(e) => {
                        error!("Error receiving from broadcast channel: {e}");
                    }
                }

            }
            _ = &mut disconnect_rx => {
                break;
            }
        }
        // TODO: Avoid busy looping here, maybe by receiving from just one channel and awaiting that channel.
        // #[rustfmt::skip]
        // tokio::select! {
        //     // oneshot_message = rx.recv() => {
        //     //     error!("Got message to abort: {oneshot_message:?}");
        //     //     break;
        //     // }
        //     s = private_rx.recv() => {
        //         if let Some(s) = s{
        //             let m = Message::Text(s);
        //             match write.send(m).await {
        //                 Ok(_) => {}
        //                 Err(e) => {
        //                     error!("Error in endpoint {addr} ws stream: {e:?}");
        //                     break;
        //                 }
        //             }
        //         }
        //     }
        //     message = read.next() => {
        //         info!("Received from endpoint {addr}: {message:?}");
        //         if matches!(message, None) {
        //             // This means disconnection
        //             break;
        //         }
        //     }
        //     mvt = movement_rx.recv()=> {
        //         if let Ok(mvt) = mvt{
        //             let m = Message::Text(mvt.description);
        //             match write.send(m).await {
        //                 Ok(_) => {}
        //                 Err(e) => {
        //                     error!("Error in endpoint {addr} ws stream: {e:?}");
        //                     break;
        //                 }
        //             }
        //         }
        //     }
        //     syscall = syscall_rx.recv() => {
        //         match syscall {
        //             Ok(syscall) => {
        //                 let m = Message::Text(syscall.to_string());
        //                 match write.feed(m).await {
        //                     Ok(_) => {}
        //                     Err(e) => {
        //                         error!("Error in endpoint {addr} ws stream: {e:?}");
        //                         break;
        //                     }
        //                 }
        //                 sent_since_flush += 1;
        //                 if sent_since_flush > 1000 {
        //                     write.flush().await.ok();
        //                 }
        //             }
        //             Err(e) => {
        //                 error!("Error from syscall_rx {addr}: {e:?}");
        //             }
        //         }
        //     }
        // }
    }

    info!("{} disconnected", &addr);
    // let ws_stream = write.merge
    // ws_stream.close(None).await.ok();
    Ok(())
    // endpoints.lock().unwrap().remove(&addr);
}
async fn handle_strace_collector_client(
    peer: SocketAddr,
    stream: TcpStream,
    packet_sender: UnboundedSender<Packet>,
) -> anyhow::Result<()> {
    let mut ws_stream = tokio_tungstenite::accept_async(stream)
        .await
        .expect("Failed to accept");

    info!("New WebSocket strace client connection: {}", peer);
    while let Some(msg) = ws_stream.next().await {
        match msg? {
            tokio_tungstenite::tungstenite::Message::Text(text) => info!("ws message: {text}"),
            tokio_tungstenite::tungstenite::Message::Binary(data) => {
                match postcard::from_bytes(&data) {
                    Ok(packet) => packet_sender.send(packet)?,
                    Err(e) => error!("Failed to parse binary packet as postcard: {e}"),
                }
            }
            tokio_tungstenite::tungstenite::Message::Ping(_) => {
                warn!("Received Ping from websocket")
            }
            tokio_tungstenite::tungstenite::Message::Pong(_) => {
                warn!("Received Pong from websocket")
            }
            tokio_tungstenite::tungstenite::Message::Close(_) => {
                info!("Websocket client closed")
            }
            tokio_tungstenite::tungstenite::Message::Frame(_) => unreachable!(),
        }
    }

    Ok(())

    // old

    // let settings = protocol::Settings {
    //     byte_order: protocol::ByteOrder::LittleEndian,
    //     ..Default::default()
    // };
    // let mut connection: Connection<Packet, TcpStream> = protocol::wire::stream::Connection::new(
    //     stream,
    //     protocol::wire::middleware::pipeline::default(),
    //     settings,
    // );

    // loop {
    //     if let Some(response) = connection.receive_packet().unwrap() {
    //         match response {
    //             Packet::Syscall(syscall) => {
    //                 let mut analyser = syscall_analyser.lock().unwrap();
    //                 analyser.register_packet(syscall);
    //             }
    //             _ => (),
    //         }
    //     }
    // }
    // Ok(())
}
