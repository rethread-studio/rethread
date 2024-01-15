use std::{
    ffi::OsStr,
    path::PathBuf,
    time::{Duration, Instant},
};

use eframe::egui;
use egui::{menu, Color32, DragValue, ProgressBar, Widget};
use egui_plot::{CoordinatesFormatter, Corner, Legend, Line, Plot, PlotPoints};
use fxhash::FxHashMap;
use log::{error, info};
use rand::{seq::SliceRandom, thread_rng, Rng};
use std::io::{BufRead, BufReader, Write};
use walkdir::WalkDir;

use crate::{
    audience_interaction_communication::{AudienceUi, AudienceUiMessage},
    EguiUpdate, RecordingCommand, RecordingPlayback,
};

pub fn start_egui(
    packet_hq_command_sender: rtrb::Producer<RecordingCommand>,
    egui_update_receiver: rtrb::Consumer<EguiUpdate>,
) -> Result<(), eframe::Error> {
    let options = eframe::NativeOptions {
        initial_window_size: Some(egui::vec2(620.0, 440.0)),
        ..Default::default()
    };
    eframe::run_native(
        "My egui App",
        options,
        Box::new(|cc| {
            // This gives us image support:
            egui_extras::install_image_loaders(&cc.egui_ctx);

            Box::new(EguiApp::new(packet_hq_command_sender, egui_update_receiver))
        }),
    )
}
#[derive(Clone)]
struct LineData {
    points: Vec<[f64; 2]>,
    name: String,
    color: Color32,
}
impl Into<Line> for LineData {
    fn into(self) -> Line {
        Line::new(PlotPoints::new(self.points))
            .color(self.color)
            .name(self.name)
    }
}
struct PlotData {
    lines: Vec<LineData>,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct PersistentSettings {
    folder_to_load: Option<PathBuf>,
}
impl Default for PersistentSettings {
    fn default() -> Self {
        Self {
            folder_to_load: Default::default(),
        }
    }
}
#[derive(Copy, Clone, Debug)]
enum RecordingPlaybackMode {
    /// Activated programs stay activated, and a new recording is selected at random when the old ends.
    StickyProgramRandom,
    /// Activated programs stay activated, and a new recording is selected based on intensity when the old ends (essentially looping).
    StickyProgramIntensity,
    /// Activated programs trigger one playback at random and are then deactivated.
    RandomOnce,
}

struct EguiApp {
    packet_hq_command_sender: rtrb::Producer<RecordingCommand>,
    egui_update_receiver: rtrb::Consumer<EguiUpdate>,
    recordings: Vec<RecordingPlayback>,
    plots: FxHashMap<String, PlotData>,
    active_programs: Vec<String>,
    current_intensity: u32,
    all_program_values: Vec<String>,
    selected_program_value: String,
    persistent_settings: PersistentSettings,
    audience_ui_com: Option<AudienceUi>,
    cut_from_start_length: f32,
    recording_playback_mode: RecordingPlaybackMode,
    last_audience_interaction: Instant,
    // If we should activate programs without audience interaction
    self_activating_mode: bool,
    next_self_activation: Duration,
    last_self_activation: Instant,
}
impl EguiApp {
    pub fn new(
        packet_hq_command_sender: rtrb::Producer<RecordingCommand>,
        egui_update_receiver: rtrb::Consumer<EguiUpdate>,
    ) -> Self {
        let persistent_settings = {
            if let Ok(file) = std::fs::read_to_string("./settings.json") {
                if let Ok(settings) = serde_json::from_str(&file) {
                    settings
                } else {
                    PersistentSettings::default()
                }
            } else {
                PersistentSettings::default()
            }
        };
        // let (tx1, rx1) = std::sync::mpsc::sync_channel(100);
        // let (tx2, rx2) = std::sync::mpsc::sync_channel(100);
        let mut num_tries = 0;
        let audience_ui_com = loop {
            let audience_ui_com = AudienceUi::new();
            match audience_ui_com {
                Ok(mut a) => {
                    a.send_data_vertex_restart();
                    break Some(a);
                }
                Err(e) => {
                    if num_tries > 10 {
                        error!("Failed to create audience ui communicator: {}", e);
                        break None;
                    }
                }
            }
            num_tries += 1;
        };

        let mut s = Self {
            packet_hq_command_sender,
            egui_update_receiver,
            recordings: vec![],
            plots: FxHashMap::default(),
            active_programs: vec![],
            current_intensity: 0,
            all_program_values: vec![],
            selected_program_value: String::new(),
            persistent_settings,
            audience_ui_com,
            cut_from_start_length: 0.0,
            recording_playback_mode: RecordingPlaybackMode::StickyProgramRandom,
            last_audience_interaction: Instant::now(),
            self_activating_mode: false,
            next_self_activation: Duration::from_secs(10),
            last_self_activation: Instant::now(),
        };
        s.apply_persistent_settings();
        s
    }
    fn apply_persistent_settings(&mut self) {
        if let Some(path) = &self.persistent_settings.folder_to_load {
            // Load folder
            self.load_folder(path.clone());
        }
    }
    fn save_persistent_settings(&self) {
        let Ok(json) = serde_json::to_string(&self.persistent_settings) else {
            error!("Failed to turn settings into JSON");
            return;
        };
        let Ok(mut output) = std::fs::File::create("./settings.json") else {
            error!("Failed to open settings file");
            return;
        };
        write!(output, "{json}").ok();
    }
    pub fn load_folder(&mut self, folder: PathBuf) {
        self.persistent_settings.folder_to_load = Some(folder.clone());
        self.save_persistent_settings();
        for entry in WalkDir::new(folder).into_iter().filter_map(|e| e.ok()) {
            match entry.path().extension().and_then(OsStr::to_str) {
                Some("postcard") => {
                    if let Ok(recording_playback) =
                        RecordingPlayback::from_file(&entry.path().to_path_buf())
                    {
                        self.recordings.push(recording_playback);
                    };
                }
                _ => (),
            }
        }
        if let Err(e) = self
            .packet_hq_command_sender
            .push(RecordingCommand::ReplaceAllRecordings(
                self.recordings.clone(),
            ))
        {
            error!("Failed to send recordings to PacketHQ: {e}");
        }
    }
    pub fn update_playing_recordings(&mut self) {
        match self.recording_playback_mode {
            RecordingPlaybackMode::StickyProgramRandom => self.update_random_recording(),
            RecordingPlaybackMode::StickyProgramIntensity => self.update_sticky_program_intensity(),
            RecordingPlaybackMode::RandomOnce => self.update_random_recording(),
        }
    }
    pub fn update_random_recording(&mut self) {
        for active_program in &self.active_programs {
            // If there's no recording running for an active program, try to start one.
            // The "program" will be deactivated when the playback ends if we should only do one.

            let already_playing = self
                .recordings
                .iter()
                .find(|r| r.playing && r.recorded_packets.name == *active_program)
                .is_some();

            if !already_playing {
                let mut available_variants = vec![];
                for (i, r) in self.recordings.iter().enumerate() {
                    if r.recorded_packets.main_program == *active_program {
                        available_variants.push(i);
                    }
                }
                if available_variants
                    .iter()
                    .find(|i| self.recordings[**i].playing)
                    .is_none()
                {
                    let mut rng = thread_rng();
                    if let Some(chosen) = available_variants.choose(&mut rng) {
                        let chosen = &mut self.recordings[*chosen];
                        chosen.playing = true;
                        if let Err(e) = self
                            .packet_hq_command_sender
                            .push(RecordingCommand::StartPlayback(chosen.uuid.clone()))
                        {
                            error!("Failed to send command to PacketHq: {e}");
                        }
                    }
                }
            }
        }
    }
    pub fn update_sticky_program_intensity(&mut self) {
        // For all main_programs, collect the available intensities and choose the one that is closest
        for active_program in &self.active_programs {
            let mut available_intensities = vec![];
            for r in &self.recordings {
                if r.recorded_packets.main_program == *active_program {
                    available_intensities.push(r.recorded_packets.intensity);
                }
            }
            if available_intensities.len() > 0 {
                let mut best_distance = i32::MAX;
                let mut closest_intensity = 0;
                for i in available_intensities {
                    let distance = (i as i32 - self.current_intensity as i32).abs();
                    if distance < best_distance {
                        closest_intensity = i;
                        best_distance = distance;
                    }
                }
                // Activate the selected recording and stop any playing recordings that aren't the selected recording
                for r in &mut self.recordings {
                    if r.recorded_packets.main_program == *active_program {
                        if r.recorded_packets.intensity == closest_intensity {
                            if !r.playing {
                                r.playing = true;
                                if let Err(e) = self
                                    .packet_hq_command_sender
                                    .push(RecordingCommand::StartPlayback(r.uuid.clone()))
                                {
                                    error!("Failed to send command to PacketHq: {e}");
                                }
                            }
                        } else if r.playing {
                            r.playing = false;
                            if let Err(e) = self
                                .packet_hq_command_sender
                                .push(RecordingCommand::StopPlayback(r.uuid.clone()))
                            {
                                error!("Failed to send command to PacketHq: {e}");
                            }
                        }
                    }
                }
            }
        }
        // Stop recordings in an inactive program
        for r in &mut self.recordings {
            if r.playing {
                if !self
                    .active_programs
                    .contains(&r.recorded_packets.main_program)
                {
                    r.playing = false;
                    if let Err(e) = self
                        .packet_hq_command_sender
                        .push(RecordingCommand::StopPlayback(r.uuid.clone()))
                    {
                        error!("Failed to send command to PacketHq: {e}");
                    }
                }
            }
        }
    }
    pub fn add_active_program(&mut self, new_active_program: String) {
        if !self.active_programs.contains(&new_active_program) {
            if let Some(a) = &mut self.audience_ui_com {
                a.send_activated_program(new_active_program.clone());
            }
            // // Start any recordings that match the new active program
            // for r in &mut self.recordings {
            //     if !r.playing && r.recorded_packets.main_program == new_active_program {
            //         info!("Starting {}", &r.recorded_packets.name);
            //         // TODO: Get the best match for intensity setting
            //         r.playing = true;
            //         if let Err(e) =
            //             self.packet_hq_command_sender
            //                 .push(RecordingCommand::StartPlayback(
            //                     r.recorded_packets.name.clone(),
            //                 ))
            //         {
            //             error!("Failed to send command to PacketHq: {e}");
            //         }
            //     }
            // }
            self.active_programs.push(new_active_program);
        }
        self.update_playing_recordings();
    }
    /// After removing an "active program" from the list, stop any recordings matching it
    pub fn stop_active_program(&mut self, removed_active_program: String) {
        if let Some(a) = &mut self.audience_ui_com {
            a.send_deactivated_program(removed_active_program.clone());
        }
        while let Some(i) = self
            .active_programs
            .iter()
            .position(|p| *p == removed_active_program)
        {
            self.active_programs.remove(i);
        }
        for r in &mut self.recordings {
            if r.playing && r.recorded_packets.main_program == removed_active_program {
                if let Err(e) = self
                    .packet_hq_command_sender
                    .push(RecordingCommand::StopPlayback(r.uuid.clone()))
                {
                    error!("Failed to send command to PacketHq: {e}");
                }
            }
        }
        self.update_playing_recordings();
    }
}

impl eframe::App for EguiApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        let mut send_all_active_programs = false;
        if let Some(a) = &mut self.audience_ui_com {
            let m = a.receive_osc();
            for mess in m {
                match mess {
                    AudienceUiMessage::ActivateProgram(program) => self.add_active_program(program),
                    AudienceUiMessage::DeactivateProgram(program) => {
                        self.stop_active_program(program)
                    }
                    AudienceUiMessage::ProgramWasActivated(_) => unreachable!(),
                    AudienceUiMessage::ProgramWasDeactivated(_) => unreachable!(),
                    AudienceUiMessage::RequestActivePrograms => {
                        send_all_active_programs = true;
                    }
                    AudienceUiMessage::PlayScore => {
                        self.packet_hq_command_sender
                            .push(RecordingCommand::PlayScore)
                            .ok();
                    }
                    AudienceUiMessage::PlayFreely => {
                        self.packet_hq_command_sender
                            .push(RecordingCommand::PlayRandomMovements)
                            .ok();
                    }
                }
                self.self_activating_mode = false;
                self.last_audience_interaction = Instant::now();
            }
        }
        if let Some(a) = &mut self.audience_ui_com {
            if send_all_active_programs {
                for program in &self.active_programs {
                    a.send_activated_program(program.clone());
                }
            }
        }
        if self.last_audience_interaction.elapsed() > Duration::from_secs(60 * 3) {
            self.self_activating_mode = true;
        }
        if self.self_activating_mode {
            if self.last_self_activation.elapsed() > self.next_self_activation {
                let mut rng = thread_rng();
                let new_program = self.all_program_values.choose(&mut rng);
                if let Some(program) = new_program {
                    self.add_active_program(program.clone());
                }
                if self.active_programs.len() > 1 {
                    // Possibly remove active programs
                    if rng.gen::<f32>() > 0.7 {
                        for _ in 0..rng.gen_range(1..=self.active_programs.len()) {
                            let i = rng.gen_range(0..self.active_programs.len());
                            self.stop_active_program(self.active_programs[i].clone());
                        }
                    }
                }
                let seconds_until_next = rng.gen_range(15..90);
                self.next_self_activation = Duration::from_secs(seconds_until_next);
                self.last_self_activation = Instant::now();
            }
        }
        // Receive messages
        while let Ok(update) = self.egui_update_receiver.pop() {
            match update {
                EguiUpdate::AllRecordings(recordings) => self.recordings = recordings,
                EguiUpdate::StartingPlaybackOfRecording(name) => {
                    if let Some(r) = self.recordings.iter_mut().find(|r| r.uuid == name) {
                        r.playing = true;
                    }
                }
                EguiUpdate::StoppingPlaybackOfRecording(name) => {
                    if let Some(r) = self.recordings.iter_mut().find(|r| r.uuid == name) {
                        r.playing = false;
                        match self.recording_playback_mode {
                            RecordingPlaybackMode::StickyProgramRandom => (),
                            RecordingPlaybackMode::StickyProgramIntensity => (),
                            RecordingPlaybackMode::RandomOnce => {
                                if let Some(i) = self
                                    .active_programs
                                    .iter()
                                    .position(|ap| *ap == r.recorded_packets.main_program)
                                {
                                    self.active_programs.remove(i);
                                }
                            }
                        }
                        self.update_playing_recordings();
                    }
                }
                EguiUpdate::PlaybackUpdate(name, playback_data) => {
                    if let Some(r) = self.recordings.iter_mut().find(|r| r.uuid == name) {
                        r.playing = playback_data.playing;
                        r.current_duration = playback_data.current_timestamp;
                        r.current_packet = playback_data.current_index;
                    }
                }
            }
        }

        egui::SidePanel::left("global_actions").show(ctx, |ui| {
            ui.heading("Intensity setting");
            let mut new_intensity = self.current_intensity;
            egui::DragValue::new(&mut new_intensity).ui(ui);
            if new_intensity != self.current_intensity {
                self.current_intensity = new_intensity;
                self.update_playing_recordings();
            }
            ui.heading("Active programs");
            egui::Grid::new("active_programs")
                .num_columns(2)
                .spacing([40.0, 4.0])
                .striped(true)
                .show(ui, |ui| {
                    let mut index_to_remove = None;
                    for (i, program) in self.active_programs.iter().enumerate() {
                        ui.label(program);
                        if ui.button("x").clicked() {
                            index_to_remove = Some(i);
                        }
                        ui.end_row();
                    }
                    if let Some(i) = index_to_remove {
                        let removed_program = self.active_programs.remove(i);
                        self.stop_active_program(removed_program);
                    }
                });
            egui::ComboBox::from_label("")
                .selected_text(format!("{:?}", &self.selected_program_value))
                .show_ui(ui, |ui| {
                    for possible_program in &self.all_program_values {
                        ui.selectable_value(
                            &mut self.selected_program_value,
                            possible_program.clone(),
                            possible_program,
                        );
                    }
                });
            if ui.button("Add active program").clicked() {
                self.add_active_program(self.selected_program_value.clone());
            }
            ui.separator();
            if ui.button("Analyse metadata").clicked() {
                // Set main program for all recordings
                for rec in &mut self.recordings {
                    rec.recorded_packets.analyse_main_program();
                }
                // Calculate the mean intensity per recording and assign ascending number within each program category
                analyse_recording_intensities(&mut self.recordings);
            }
            egui::Grid::new("settigns")
                .num_columns(2)
                .spacing([40.0, 4.0])
                .striped(true)
                .show(ui, |ui| {
                    ui.label("Cut from start length:");
                    ui.add(egui::DragValue::new(&mut self.cut_from_start_length).speed(0.1));
                    ui.end_row();
                });
        });

        egui::TopBottomPanel::top("my_panel").show(ctx, |ui| {
            menu::bar(ui, |ui| {
                ui.menu_button("File", |ui| {
                    if ui.button("Generate plots").clicked() {
                        generate_plot_data(&self.recordings, &mut self.plots);
                    }
                    if ui.button("Load folder").clicked() {
                        if let Some(folder) = rfd::FileDialog::new().pick_folder() {
                            info!("Loading from folder {folder:?}");
                            self.load_folder(folder);
                        }
                    }
                    if ui.button("Save all to folder").clicked() {
                        if let Some(path) = rfd::FileDialog::new().pick_folder() {
                            info!("Saving to folder {path:?}");
                            for rec in &self.recordings {
                                let mut file_path = path.clone();
                                file_path.push(&format!("{}.postcard", &rec.recorded_packets.name));

                                if let Err(e) = rec.recorded_packets.save_postcard(&file_path) {
                                    error!("Failed to save recording: {e} to path {file_path:?}");
                                }
                            }
                        }
                    }
                });
            });
        });

        egui::CentralPanel::default().show(ctx, |ui| {
            ui.heading("sys|calls data recording editor");
            let mut recordings_to_remove = vec![];
            for (i, recording) in self.recordings.iter_mut().enumerate() {
                let plot = self.plots.get(&recording.recorded_packets.name);
                if let Some(command) =
                    recording_window(ctx, recording, self.cut_from_start_length, plot)
                {
                    if matches!(command, RecordingCommand::CloseRecording(_)) {
                        recordings_to_remove.push(i)
                    }
                    self.packet_hq_command_sender.push(command).ok();
                }
            }
            for i in recordings_to_remove.iter().rev() {
                self.recordings.remove(*i);
            }
        });
        self.all_program_values.clear();
        for r in &self.recordings {
            if !self
                .all_program_values
                .contains(&r.recorded_packets.main_program)
                && !self
                    .active_programs
                    .contains(&r.recorded_packets.main_program)
            {
                self.all_program_values
                    .push(r.recorded_packets.main_program.clone());
            }
        }
        if self.selected_program_value == "" && self.all_program_values.len() > 0 {
            self.selected_program_value = self.all_program_values.first().unwrap().clone();
        }
        ctx.request_repaint_after(Duration::from_millis(200));
    }
    fn on_exit(&mut self, _gl: Option<&eframe::glow::Context>) {
        self.save_persistent_settings();
    }
}

fn generate_plot_data(recordings: &[RecordingPlayback], plots: &mut FxHashMap<String, PlotData>) {
    let timestep = Duration::from_millis(10);
    for rec in recordings {
        let mut time = Duration::ZERO;
        let mut plot_data = PlotData { lines: vec![] };
        let mut line = LineData {
            points: vec![],
            name: String::from("none"),
            color: Color32::RED,
        };
        let mut current_i = 0;

        while time < rec.last_packet_timestamp {
            let mut calls_per_ts = 0;
            while rec.recorded_packets.records[current_i].timestamp < time {
                calls_per_ts += 1;
                current_i += 1;
            }
            line.points.push([time.as_secs_f64(), calls_per_ts as f64]);
            time += timestep;
        }
        plot_data.lines = vec![line];
        plots.insert(rec.recorded_packets.name.clone(), plot_data);
    }
}

fn recording_window(
    ctx: &egui::Context,
    recording: &mut RecordingPlayback,
    cut_length: f32,
    plot: Option<&PlotData>,
) -> Option<RecordingCommand> {
    let mut command = None;
    egui::Window::new(&recording.recorded_packets.name)
        .id(format!("{}", recording.uuid).into())
        // .open(true)
        .resizable(true)
        .default_width(280.0)
        .show(ctx, |ui| {
            egui::Grid::new("recording data")
                .num_columns(2)
                .spacing([40.0, 4.0])
                .striped(true)
                .show(ui, |ui| {
                    ui.label("Name:");
                    let prev_name = recording.recorded_packets.name.clone();
                    ui.text_edit_singleline(&mut recording.recorded_packets.name);
                    if recording.recorded_packets.name != prev_name {
                        info!("New name: {}", recording.recorded_packets.name);
                        command = Some(RecordingCommand::ReplaceRecording(recording.clone()));
                    }
                    ui.end_row();
                    ui.label("Playing:");
                    ui.label(if recording.playing { "yes" } else { "no" });
                    ui.end_row();
                    ui.label("Playhead duration:");
                    ui.label(&humantime::format_duration(recording.current_duration).to_string());
                    ui.end_row();
                    ui.label("Last packet timestamp:");
                    ui.label(
                        &humantime::format_duration(recording.last_packet_timestamp).to_string(),
                    );
                    ui.end_row();
                    ui.label("Intensity:");
                    ui.add(
                        egui::DragValue::new(&mut recording.recorded_packets.intensity).speed(1.0),
                    );
                    ui.end_row();
                    ui.label("Main_program:");
                    ui.text_edit_singleline(&mut recording.recorded_packets.main_program);
                    ui.end_row();
                });
            if ui.button("Trim specified length from start").clicked() {
                recording.trim_from_start(cut_length);
                command = Some(RecordingCommand::ReplaceRecording(recording.clone()));
            }
            if ui.button("Trim start silence").clicked() {
                recording.trim_silence_before();
                command = Some(RecordingCommand::ReplaceRecording(recording.clone()));
            }
            if ui.button("Play").clicked() {
                recording.playing = true;
                command = Some(RecordingCommand::StartPlayback(recording.uuid.clone()));
            }
            if ui.button("Stop").clicked() {
                recording.playing = false;
                command = Some(RecordingCommand::StopPlayback(recording.uuid.clone()));
            }
            if ui.button("Split into programs").clicked() {
                todo!()
            }
            if ui.button("Get main program").clicked() {
                recording.recorded_packets.analyse_main_program();
                command = Some(RecordingCommand::ReplaceRecording(recording.clone()));
            }
            if ui.button("Log debug info").clicked() {
                recording.log_debug_info();
            }
            if ui.button("Close").clicked() {
                command = Some(RecordingCommand::CloseRecording(recording.uuid.clone()));
            }
            let progress = recording.current_duration.as_secs_f32()
                / recording.last_packet_timestamp.as_secs_f32();
            ProgressBar::new(progress)
                .show_percentage()
                .animate(recording.playing)
                .ui(ui);
            if let Some(plot_date) = plot {
                let mut plot = Plot::new("recording plot")
                    .legend(Legend::default())
                    .y_axis_width(4)
                    .show_axes(true)
                    .show_grid(true);
                // if self.square {
                //     plot = plot.view_aspect(1.0);
                // }
                // if self.proportional {
                //     plot = plot.data_aspect(1.0);
                // }
                plot =
                    plot.coordinates_formatter(Corner::LeftBottom, CoordinatesFormatter::default());
                plot.show(ui, |plot_ui| {
                    for line_data in &plot_date.lines {
                        plot_ui.line(((*line_data).clone()).into());
                    }
                });
                // .response
            }
        });
    command
}

fn analyse_recording_intensities(recordings: &mut [RecordingPlayback]) {
    let timestep = Duration::from_millis(50);
    let mut recording_activity = FxHashMap::default();
    for (i, rec) in recordings.iter_mut().enumerate() {
        let activity = rec.recorded_packets.mean_activity(timestep);
        let entry = recording_activity
            .entry(rec.recorded_packets.main_program.clone())
            .or_insert(Vec::new());
        entry.push((activity, i));
    }
    for list in recording_activity.values_mut() {
        list.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap());
        for (intensity, (_activity, index)) in list.iter().enumerate() {
            recordings[*index].recorded_packets.intensity = intensity as u32;
        }
    }
}
