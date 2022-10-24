use std::time::Duration;
use std::{net::TcpListener, thread::spawn};

use crossbeam::channel::{unbounded, Receiver, Sender};

use crate::audio::AudioEngine;
use crate::websocket::WebsocketCom;
use parser::deepika2::Deepika2;
//
// Send to GUI:
// - index increases
//
// Send to Scheduler:
// - time between events
// - play/pause

pub struct SchedulerCom {
    pub index_increase_rx: Receiver<usize>,
    pub play_tx: Sender<bool>,
    pub event_duration_tx: Sender<f32>,
}

pub fn start_scheduler(trace: Deepika2) -> SchedulerCom {
    let mut osc_communicator = OscCommunicator::new();
    let mut ws_communicator = WebsocketCom::default();
    let mut current_index = 0;
    let mut current_depth_envelope_index = 0;
    let mut current_section = trace.depth_envelope.sections[0];
    let mut seconds_between_calls = 0.025;
    let mut play = false;
    // let mut audio_engine = AudioEngine::new();

    let (index_increase_tx, index_increase_rx) = unbounded();
    let (event_duration_tx, event_duration_rx) = unbounded();
    let (play_tx, play_rx) = unbounded();

    let server = TcpListener::bind("127.0.0.1:3012").unwrap();

    spawn(move || loop {
        while let Ok(new_duration) = event_duration_rx.try_recv() {
            seconds_between_calls = new_duration;
            osc_communicator.send_speed(new_duration);
        }
        while let Ok(new_play) = play_rx.try_recv() {
            play = new_play;
        }
        if play {
            current_index += 1;
            if current_index >= trace.draw_trace.len() {
                current_index = 0;
            }
            index_increase_tx.send(current_index).unwrap();

            let num_depth_points = trace.depth_envelope.sections.len();
            let mut depth_point = trace.depth_envelope.sections[current_depth_envelope_index];
            while current_index > current_section.end_index {
                current_depth_envelope_index += 1;
                current_depth_envelope_index %= num_depth_points;
                current_section = trace.depth_envelope.sections[current_depth_envelope_index];
                osc_communicator.send_section(current_section);
                let section_json = serde_json::to_string(&current_section).unwrap();
                ws_communicator.sender.send(section_json);
            }
            let state = current_section.state;
            // audio_engine.spawn_sine(
            //     trace.draw_trace[current_index].depth as f32 * 10.0 + 20.0,
            //     0.5,
            // );
            // Send osc message to SuperCollider
            {
                let call = &trace.draw_trace[current_index];
                osc_communicator.send_call(call.depth, state);
            }
        }
        std::thread::sleep(Duration::from_secs_f32(seconds_between_calls));
    });
    SchedulerCom {
        index_increase_rx,
        event_duration_tx,
        play_tx,
    }
}

struct OscCommunicator {
    sender: nannou_osc::Sender<nannou_osc::Connected>,
}
impl OscCommunicator {
    pub fn new() -> Self {
        let sender = nannou_osc::sender()
            .unwrap()
            .connect("localhost:57120")
            .unwrap();
        Self { sender }
    }
    pub fn send_section(&mut self, section: parser::deepika2::DepthEnvelopePoint) {
        use nannou_osc::Type;
        let addr = "/section";
        let args = vec![
            Type::Int(section.min_depth),
            Type::Int(section.max_depth),
            Type::Int(section.num_suppliers as i32),
            Type::Int(section.num_dependencies as i32),
            Type::Float(section.supplier_dist_evenness),
            Type::Float(section.dependency_dist_evenness),
        ];
        self.sender.send((addr, args)).ok();
    }
    pub fn send_call(&mut self, depth: i32, state: parser::deepika2::DepthState) {
        use nannou_osc::Type;
        let state = match state {
            parser::deepika2::DepthState::Stable => 0,
            parser::deepika2::DepthState::Increasing => 1,
            parser::deepika2::DepthState::Decreasing => -1,
        };
        let addr = "/call";
        let args = vec![Type::Int(depth), Type::Int(state)];
        self.sender.send((addr, args)).ok();
    }
    pub fn send_speed(&mut self, time_between_events: f32) {
        use nannou_osc::Type;
        let addr = "/speed";
        let args = vec![Type::Float(time_between_events)];
        self.sender.send((addr, args)).ok();
    }
}
