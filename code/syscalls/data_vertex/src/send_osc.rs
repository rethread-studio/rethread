use std::time::Duration;

use anyhow::{anyhow, Result};
use log::error;
use nannou_osc::{Connected, Sender, Type};
use syscalls_shared::score::Movement;
use syscalls_shared::Syscall;
use tracing::info;

use crate::config::Config;
pub struct WebsocketSender {
    pub message_tx: tokio::sync::broadcast::Sender<String>,
}

enum OscMessage {
    Syscall(Syscall),
    SyscallAnalysis {
        num_packets: usize,
        num_errors: usize,
        packets_per_kind_last_interval: Vec<i32>,
    },
    CategoryPeak {
        kind: String,
        ratio: f32,
    },
    Movement {
        m: Movement,
        next_mvt: Option<Movement>,
    },
    ScoreStart {
        random_order: bool,
    },
    ScoreStop,
    StartRecordingPlayback(String),
    StopRecordingPlayback(String),
}

impl WebsocketSender {}

pub struct OscSender {
    // senders: Vec<Sender<Connected>>,
    senders: Vec<std::sync::mpsc::Sender<OscMessage>>,
    websocket_senders: Option<WebsocketSender>,
}

impl OscSender {
    pub fn new(settings: &Config) -> Self {
        // dbg!(&settings.osc_receivers);
        info!("OSC receivers from settings: {:?}", settings.osc_receivers);
        let mut senders = Vec::new();
        for recv_settings in settings.osc_receivers.values() {
            match osc_instance(&recv_settings.ip, recv_settings.port) {
                Ok(sender) => senders.push(sender),
                Err(e) => error!("{e}"),
            }
            // if let Ok(sender) = nannou_osc::sender() {
            //     if let Ok(sender) =
            //         sender.connect(format!("{}:{}", recv_settings.ip, recv_settings.port))
            //     {
            //         senders.push(sender);
            //     } else {
            //         error!("Failed to connect to osc {:?}", recv_settings);
            //     }
            // } else {
            //     error!("Failed to create osc sender");
            // }
        }
        Self {
            senders,
            websocket_senders: None,
        }
    }
    pub fn register_websocket_senders(&mut self, ws: WebsocketSender) {
        self.websocket_senders = Some(ws);
    }
    pub fn send_syscall(&mut self, syscall: &Syscall) {
        for sender in &mut self.senders {
            match sender.send(OscMessage::Syscall(syscall.clone())) {
                Ok(_) => (),
                Err(e) => error!("Failed to send to osc instance: {e}"),
            }
        }

        // for sender in &mut self.senders {
        //     let addr = "/syscall";
        //     let args = vec![
        //         Type::Int(syscall.syscall_id as i32),
        //         Type::String(syscall.kind.to_string()),
        //         Type::Int(syscall.args[0] as i32),
        //         Type::Int(syscall.args[1] as i32),
        //         Type::Int(syscall.args[2] as i32),
        //         Type::Int(syscall.return_value as i32),
        //         Type::Bool(syscall.returns_error),
        //         Type::String(syscall.command.clone()),
        //     ];
        //     sender.send((addr, args)).ok();
        // }
        // if let Some(ws) = &mut self.websocket_senders {
        //     let m = format!(
        //         "s:{},{},{},{},{}",
        //         syscall.syscall_id, syscall.kind, syscall.args[0], syscall.args[1], syscall.args[2]
        //     );
        //     if let Ok(ok) = ws.message_tx.send(m) {
        //         // info!("Sending syscall to {ok} receivers");
        //     }
        // }
    }
    pub fn send_syscall_analysis(
        &mut self,
        num_packets: usize,
        num_errors: usize,
        packets_per_kind_last_interval: &[i32],
    ) {
        for sender in &mut self.senders {
            match sender.send(OscMessage::SyscallAnalysis {
                num_errors,
                num_packets,
                packets_per_kind_last_interval: packets_per_kind_last_interval.to_vec(),
            }) {
                Ok(_) => (),
                Err(e) => error!("Failed to send to osc instance: {e}"),
            }
        }
        // for sender in &mut self.senders {
        //     let addr = "/syscall_analysis";
        //     let args = vec![Type::Int(num_packets as i32), Type::Int(num_errors as i32)];
        //     sender.send((addr, args)).ok();
        //     let addr = "/syscall_analysis/per_kind_interval";
        //     let args = packets_per_kind_last_interval
        //         .iter()
        //         .map(|v| Type::Int(*v))
        //         .collect();
        //     sender.send((addr, args)).ok();
        // }
        // if let Some(ws) = &mut self.websocket_senders {
        //     let m = format!("/syscall_analysis:{},{}", num_packets, num_errors);
        //     if let Ok(ok) = ws.message_tx.send(m) {
        //         // info!("Sending syscall to {ok} receivers");
        //     }
        //     let mut m = format!("/syscall_analysis/per_kind_interval:");
        //     m.extend(
        //         packets_per_kind_last_interval
        //             .iter()
        //             .map(|v| format!("{v},")),
        //     );
        //     if let Ok(ok) = ws.message_tx.send(m) {
        //         // info!("Sending syscall to {ok} receivers");
        //     }
        // }
    }
    pub fn send_category_peak(&mut self, kind: String, ratio: f32) {
        for sender in &mut self.senders {
            match sender.send(OscMessage::CategoryPeak {
                kind: kind.clone(),
                ratio,
            }) {
                Ok(_) => (),
                Err(e) => error!("Failed to send to osc instance: {e}"),
            }
        }
        // for sender in &mut self.senders {
        //     let addr = "/syscall_analysis/category_peak";
        //     let args = vec![Type::String(kind.clone()), Type::Float(ratio)];
        //     sender.send((addr, args)).ok();
        // }

        // if let Some(ws) = &mut self.websocket_senders {
        //     let m = format!("/syscall_analysis/category_peak:{},{}", kind.clone(), ratio,);
        //     if let Ok(ok) = ws.message_tx.send(m) {
        //         // info!("Sending syscall to {ok} receivers");
        //     }
        // }
    }
    pub fn send_movement(&mut self, m: &Movement, next_mvt: Option<Movement>) {
        for sender in &mut self.senders {
            match sender.send(OscMessage::Movement {
                m: m.clone(),
                next_mvt: next_mvt.clone(),
            }) {
                Ok(_) => (),
                Err(e) => error!("Failed to send to osc instance: {e}"),
            }
        }
        // for _ in 0..5 {
        // for sender in &mut self.senders {
        //     let addr = "/new_movement";
        //     let args = vec![
        //         Type::Int(m.id as i32),
        //         Type::Bool(m.is_break),
        //         Type::String(m.description.clone()),
        //         Type::Int(if let Some(m) = next_mvt.clone() {
        //             m.id as i32
        //         } else {
        //             -1
        //         }),
        //         Type::Float(m.duration.as_secs_f32()),
        //     ];
        //     sender.send((addr, args)).ok();
        //     let addr = "/break";
        //     let args = vec![Type::Int(if m.is_break { 1 } else { 0 })];
        //     sender.send((addr, args)).ok();
        // }
        // // }
        // if let Some(ws) = &mut self.websocket_senders {
        //     let mess = format!(
        //         "/new_movement:{},{},{},{}",
        //         m.id,
        //         m.is_break,
        //         next_mvt.map(|mvt| mvt.id as i32).unwrap_or(-1),
        //         m.duration.as_millis()
        //     );
        //     if let Ok(ok) = ws.message_tx.send(mess) {
        //         // info!("Sending syscall to {ok} receivers");
        //     }
        //     let mess = format!("/break:{}", if m.is_break { 1 } else { 0 },);
        //     if let Ok(ok) = ws.message_tx.send(mess) {
        //         // info!("Sending syscall to {ok} receivers");
        //     }
        // }
    }
    pub fn send_start_recording_playback(&mut self, name: String) {
        for sender in &mut self.senders {
            match sender.send(OscMessage::StartRecordingPlayback(name.clone())) {
                Ok(_) => (),
                Err(e) => error!("Failed to send to osc instance: {e}"),
            }
        }
        // for sender in &mut self.senders {
        //     let addr = "/start_recording_playback";
        //     let args = vec![Type::String(name.clone())];
        //     sender.send((addr, args)).ok();
        // }
        // if let Some(ws) = &mut self.websocket_senders {
        //     let mess = format!("/start_recording_playback:{}", name.clone());
        //     if let Ok(ok) = ws.message_tx.send(mess) {
        //         // info!("Sending syscall to {ok} receivers");
        //     }
        // }
    }
    pub fn send_stop_recording_playback(&mut self, name: String) {
        for sender in &mut self.senders {
            match sender.send(OscMessage::StopRecordingPlayback(name.clone())) {
                Ok(_) => (),
                Err(e) => error!("Failed to send to osc instance: {e}"),
            }
        }
        // for sender in &mut self.senders {
        //     let addr = "/stop_recording_playback";
        //     let args = vec![Type::String(name.clone())];
        //     sender.send((addr, args)).ok();
        // }
        // if let Some(ws) = &mut self.websocket_senders {
        //     let mess = format!("/stop_recording_playback:{}", name.clone());
        //     if let Ok(ok) = ws.message_tx.send(mess) {
        //         // info!("Sending syscall to {ok} receivers");
        //     }
        // }
    }
    pub fn send_score_stop(&mut self) {
        for sender in &mut self.senders {
            match sender.send(OscMessage::ScoreStop) {
                Ok(_) => (),
                Err(e) => error!("Failed to send to osc instance: {e}"),
            }
        }
        // for sender in &mut self.senders {
        //     let addr = "/score/play";
        //     let args = vec![Type::Int(0)];
        //     sender.send((addr, args)).ok();
        // }
        // if let Some(ws) = &mut self.websocket_senders {
        //     let m = format!("/score/play:false",);
        //     if let Ok(ok) = ws.message_tx.send(m) {
        //         // info!("Sending syscall to {ok} receivers");
        //     }
        // }
    }
    pub fn send_score_start(&mut self, random_order: bool) {
        for sender in &mut self.senders {
            match sender.send(OscMessage::ScoreStart { random_order }) {
                Ok(_) => (),
                Err(e) => error!("Failed to send to osc instance: {e}"),
            }
        }
        // for sender in &mut self.senders {
        //     let addr = "/score/play";
        //     let args = vec![Type::Int(if random_order { 2 } else { 1 })];
        //     sender.send((addr, args)).ok();
        // }
        // if let Some(ws) = &mut self.websocket_senders {
        //     let m = format!("/score/play:true",);
        //     if let Ok(ok) = ws.message_tx.send(m) {
        //         // info!("Sending syscall to {ok} receivers");
        //     }
        // }
    }
    // TODO: Send continuous analysis of individual categories and individual syscalls
}

fn osc_instance(ip: &str, port: u16) -> Result<std::sync::mpsc::Sender<OscMessage>> {
    let (tx, rx) = std::sync::mpsc::channel();

    if let Ok(sender) = nannou_osc::sender() {
        if let Ok(mut sender) = sender.connect(format!("{}:{}", ip, port)) {
            std::thread::spawn(move || loop {
                while let Ok(m) = rx.try_recv() {
                    match m {
                        OscMessage::Syscall(syscall) => send_syscall(&mut sender, syscall),
                        OscMessage::SyscallAnalysis {
                            num_packets,
                            num_errors,
                            packets_per_kind_last_interval,
                        } => send_syscall_analysis(
                            &mut sender,
                            num_packets,
                            num_errors,
                            &packets_per_kind_last_interval,
                        ),
                        OscMessage::Movement { m, next_mvt } => {
                            send_movement(&mut sender, &m, next_mvt)
                        }
                        OscMessage::ScoreStart { random_order } => {
                            send_score_start(&mut sender, random_order)
                        }
                        OscMessage::ScoreStop => send_score_stop(&mut sender),
                        OscMessage::StartRecordingPlayback(name) => {
                            send_start_recording_playback(&mut sender, name)
                        }
                        OscMessage::StopRecordingPlayback(name) => {
                            send_stop_recording_playback(&mut sender, name)
                        }
                        OscMessage::CategoryPeak { kind, ratio } => {
                            send_category_peak(&mut sender, kind, ratio)
                        }
                    }
                }
                std::thread::sleep(Duration::from_millis(1));
            });
            Ok(tx)
        } else {
            Err(anyhow!("Failed to connect to osc {:?}", ip))
        }
    } else {
        Err(anyhow!("Failed to create osc sender"))
    }
}

pub fn send_syscall(sender: &mut nannou_osc::Sender<Connected>, syscall: Syscall) {
    let addr = "/syscall";
    let args = vec![
        Type::Int(syscall.syscall_id as i32),
        Type::String(syscall.kind.to_string()),
        Type::Int(syscall.args[0] as i32),
        Type::Int(syscall.args[1] as i32),
        Type::Int(syscall.args[2] as i32),
        Type::Int(syscall.return_value as i32),
        Type::Bool(syscall.returns_error),
        Type::String(syscall.command),
    ];
    sender.send((addr, args)).ok();
}
pub fn send_syscall_analysis(
    sender: &mut nannou_osc::Sender<Connected>,
    num_packets: usize,
    num_errors: usize,
    packets_per_kind_last_interval: &[i32],
) {
    let addr = "/syscall_analysis";
    let args = vec![Type::Int(num_packets as i32), Type::Int(num_errors as i32)];
    sender.send((addr, args)).ok();
    let addr = "/syscall_analysis/per_kind_interval";
    let args = packets_per_kind_last_interval
        .iter()
        .map(|v| Type::Int(*v))
        .collect();
    sender.send((addr, args)).ok();
}
pub fn send_category_peak(sender: &mut nannou_osc::Sender<Connected>, kind: String, ratio: f32) {
    let addr = "/syscall_analysis/category_peak";
    let args = vec![Type::String(kind.clone()), Type::Float(ratio)];
    sender.send((addr, args)).ok();
}
pub fn send_movement(
    sender: &mut nannou_osc::Sender<Connected>,
    m: &Movement,
    next_mvt: Option<Movement>,
) {
    let addr = "/new_movement";
    let args = vec![
        Type::Int(m.id as i32),
        Type::Bool(m.is_break),
        Type::String(m.description.clone()),
        Type::Int(if let Some(m) = next_mvt.clone() {
            m.id as i32
        } else {
            -1
        }),
        Type::Float(m.duration.as_secs_f32()),
    ];
    sender.send((addr, args)).ok();
    let addr = "/break";
    let args = vec![Type::Int(if m.is_break { 1 } else { 0 })];
    sender.send((addr, args)).ok();
}
pub fn send_start_recording_playback(sender: &mut nannou_osc::Sender<Connected>, name: String) {
    let addr = "/start_recording_playback";
    let args = vec![Type::String(name.clone())];
    sender.send((addr, args)).ok();
}
pub fn send_stop_recording_playback(sender: &mut nannou_osc::Sender<Connected>, name: String) {
    let addr = "/stop_recording_playback";
    let args = vec![Type::String(name.clone())];
    sender.send((addr, args)).ok();
}
pub fn send_score_stop(sender: &mut nannou_osc::Sender<Connected>) {
    let addr = "/score/play";
    let args = vec![Type::Int(0)];
    sender.send((addr, args)).ok();
}
pub fn send_score_start(sender: &mut nannou_osc::Sender<Connected>, random_order: bool) {
    let addr = "/score/play";
    let args = vec![Type::Int(if random_order { 2 } else { 1 })];
    sender.send((addr, args)).ok();
}
