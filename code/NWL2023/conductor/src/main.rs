use std::time::{Duration, Instant};

use config::Config;
use log::{error, info};
use nannou_osc::{Connected, Sender, Type};
mod config;
use rand::thread_rng;
use rand::Rng;
use simple_logger::SimpleLogger;

fn main() {
    SimpleLogger::new().init().unwrap();
    let num_movements = 8;
    let mut rng = thread_rng();
    let break_time = Duration::from_secs(30);
    let num_pulses_per_movement = 32;
    let movement_time = Duration::from_secs(60);
    let mut movement_start = Instant::now();
    let mut pulse_counter = 0;
    let settings = if let Ok(settings) = Config::load_from_file() {
        settings
    } else {
        error!("Failed to load configuration");
        Config::empty()
    };
    let mut sender = OscSender::new(&settings);
    sender.send_start_new_movement(0);

    loop {
        sender.send_pulse(pulse_counter);
        if movement_start.elapsed() >= movement_time {
            sender.send_break();
            std::thread::sleep(break_time);
            sender.send_start_new_movement(rng.gen_range(0..num_movements));
            movement_start = Instant::now();
            pulse_counter = 0;
        } else {
            std::thread::sleep(movement_time / num_pulses_per_movement);
            pulse_counter += 1;
        }
    }
}

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

    pub fn send_pulse(&mut self, num: i32) {
        info!("Send pulse {}", num);
        for sender in &mut self.senders {
            let addr = "/pulse";
            let args = vec![Type::Int(num)];
            sender.send((addr, args)).ok();
        }
    }
    pub fn send_break(&mut self) {
        info!("Send break ");
        for sender in &mut self.senders {
            let addr = "/break";
            let args = vec![];
            sender.send((addr, args)).ok();
        }
    }
    pub fn send_start_new_movement(&mut self, num: i32) {
        info!("Send new movement: {num}");
        for sender in &mut self.senders {
            let addr = "/start";
            let args = vec![Type::Int(num)];
            sender.send((addr, args)).ok();
        }
    }
}
