use log::error;
use nannou_osc::{Connected, Sender, Type};
use syscalls_shared::score::Movement;
use syscalls_shared::Syscall;
use tracing::info;

use crate::config::Config;

pub struct OscSender {
    senders: Vec<Sender<Connected>>,
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
        Self { senders }
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
                Type::Bool(syscall.returns_error()),
                Type::String(syscall.command.clone()),
            ];
            sender.send((addr, args)).ok();
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
    }
    pub fn send_category_peak(&mut self, kind: String, ratio: f32) {
        for sender in &mut self.senders {
            let addr = "/syscall_analysis/category_peak";
            let args = vec![Type::String(kind.clone()), Type::Float(ratio)];
            sender.send((addr, args)).ok();
        }
    }
    pub fn send_movement(&mut self, m: &Movement, next_mvt: Option<Movement>) {
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
    }
    pub fn send_score_stop(&mut self) {
        for sender in &mut self.senders {
            let addr = "/score/play";
            let args = vec![Type::Int(0)];
            sender.send((addr, args)).ok();
        }
    }
    pub fn send_score_start(&mut self) {
        for sender in &mut self.senders {
            let addr = "/score/play";
            let args = vec![Type::Int(1)];
            sender.send((addr, args)).ok();
        }
    }
    // TODO: Send continuous analysis of individual categories and individual syscalls
}
