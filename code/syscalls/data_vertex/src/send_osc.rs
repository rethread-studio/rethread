use log::error;
use nannou_osc::{Connected, Sender, Type};
use syscalls_shared::score::Movement;
use syscalls_shared::Syscall;
use tracing::info;

use crate::config::Config;
pub struct WebsocketSender {
    pub message_tx: tokio::sync::broadcast::Sender<String>,
}

impl WebsocketSender {}

pub struct OscSender {
    senders: Vec<Sender<Connected>>,
    websocket_senders: Option<WebsocketSender>,
}

impl OscSender {
    pub fn new(settings: &Config) -> Self {
        // dbg!(&settings.osc_receivers);
        info!("OSC receivers from settings: {:?}", settings.osc_receivers);
        let mut senders = Vec::new();
        for recv_settings in settings.osc_receivers.values() {
            if let Ok(sender) = nannou_osc::sender() {
                if let Ok(sender) =
                    sender.connect(format!("{}:{}", recv_settings.ip, recv_settings.port))
                {
                    senders.push(sender);
                } else {
                    error!("Failed to connect to osc {:?}", recv_settings);
                }
            } else {
                error!("Failed to create osc sender");
            }
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
            let addr = "/syscall";
            let args = vec![
                Type::Int(syscall.syscall_id as i32),
                Type::String(syscall.kind.to_string()),
                Type::Int(syscall.args[0] as i32),
                Type::Int(syscall.args[1] as i32),
                Type::Int(syscall.args[2] as i32),
                Type::Int(syscall.return_value as i32),
                Type::Bool(syscall.returns_error),
                Type::String(syscall.command.clone()),
            ];
            sender.send((addr, args)).ok();
        }
        if let Some(ws) = &mut self.websocket_senders {
            let m = format!(
                "s:{},{},{},{},{}",
                syscall.syscall_id, syscall.kind, syscall.args[0], syscall.args[1], syscall.args[2]
            );
            if let Ok(ok) = ws.message_tx.send(m) {
                // info!("Sending syscall to {ok} receivers");
            }
        }
    }
    pub fn send_syscall_analysis(
        &mut self,
        num_packets: usize,
        num_errors: usize,
        packets_per_kind_last_interval: &[i32],
    ) {
        for sender in &mut self.senders {
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
        if let Some(ws) = &mut self.websocket_senders {
            let m = format!("/syscall_analysis:{},{}", num_packets, num_errors);
            if let Ok(ok) = ws.message_tx.send(m) {
                // info!("Sending syscall to {ok} receivers");
            }
            let mut m = format!("/syscall_analysis/per_kind_interval:");
            m.extend(
                packets_per_kind_last_interval
                    .iter()
                    .map(|v| format!("{v},")),
            );
            if let Ok(ok) = ws.message_tx.send(m) {
                // info!("Sending syscall to {ok} receivers");
            }
        }
    }
    pub fn send_category_peak(&mut self, kind: String, ratio: f32) {
        for sender in &mut self.senders {
            let addr = "/syscall_analysis/category_peak";
            let args = vec![Type::String(kind.clone()), Type::Float(ratio)];
            sender.send((addr, args)).ok();
        }

        if let Some(ws) = &mut self.websocket_senders {
            let m = format!("/syscall_analysis/category_peak:{},{}", kind.clone(), ratio,);
            if let Ok(ok) = ws.message_tx.send(m) {
                // info!("Sending syscall to {ok} receivers");
            }
        }
    }
    pub fn send_movement(&mut self, m: &Movement, next_mvt: Option<Movement>) {
        // for _ in 0..5 {
        for sender in &mut self.senders {
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
        // }
        if let Some(ws) = &mut self.websocket_senders {
            let mess = format!(
                "/new_movement:{},{},{},{}",
                m.id,
                m.is_break,
                next_mvt.map(|mvt| mvt.id as i32).unwrap_or(-1),
                m.duration.as_millis()
            );
            if let Ok(ok) = ws.message_tx.send(mess) {
                // info!("Sending syscall to {ok} receivers");
            }
            let mess = format!("/break:{}", if m.is_break { 1 } else { 0 },);
            if let Ok(ok) = ws.message_tx.send(mess) {
                // info!("Sending syscall to {ok} receivers");
            }
        }
    }
    pub fn send_start_recording_playback(&mut self, name: String) {
        for sender in &mut self.senders {
            let addr = "/start_recording_playback";
            let args = vec![Type::String(name.clone())];
            sender.send((addr, args)).ok();
        }
        if let Some(ws) = &mut self.websocket_senders {
            let mess = format!("/start_recording_playback:{}", name.clone());
            if let Ok(ok) = ws.message_tx.send(mess) {
                // info!("Sending syscall to {ok} receivers");
            }
        }
    }
    pub fn send_stop_recording_playback(&mut self, name: String) {
        for sender in &mut self.senders {
            let addr = "/stop_recording_playback";
            let args = vec![Type::String(name.clone())];
            sender.send((addr, args)).ok();
        }
        if let Some(ws) = &mut self.websocket_senders {
            let mess = format!("/stop_recording_playback:{}", name.clone());
            if let Ok(ok) = ws.message_tx.send(mess) {
                // info!("Sending syscall to {ok} receivers");
            }
        }
    }
    pub fn send_score_stop(&mut self) {
        for sender in &mut self.senders {
            let addr = "/score/play";
            let args = vec![Type::Int(0)];
            sender.send((addr, args)).ok();
        }
        if let Some(ws) = &mut self.websocket_senders {
            let m = format!("/score/play:false",);
            if let Ok(ok) = ws.message_tx.send(m) {
                // info!("Sending syscall to {ok} receivers");
            }
        }
    }
    pub fn send_score_start(&mut self) {
        for sender in &mut self.senders {
            let addr = "/score/play";
            let args = vec![Type::Int(1)];
            sender.send((addr, args)).ok();
        }
        if let Some(ws) = &mut self.websocket_senders {
            let m = format!("/score/play:true",);
            if let Ok(ok) = ws.message_tx.send(m) {
                // info!("Sending syscall to {ok} receivers");
            }
        }
    }
    // TODO: Send continuous analysis of individual categories and individual syscalls
}
