use std::thread::spawn;
use std::time::Duration;

use crossbeam::channel::{unbounded, Receiver, Sender};
use log::*;
use serde::Serialize;

use crate::{get_args, websocket::WebsocketCom};
use parser::deepika2::{CallDrawData, Deepika2, DepthEnvelopePoint};
//
// Send to GUI:
// - index increases
//
// Send to Scheduler:
// - time between events
// - play/pause
//

pub enum Message {
    JumpNextMarker,
    JumpPreviousMarker,
}

pub struct SchedulerCom {
    pub index_increase_rx: Receiver<usize>,
    pub play_tx: Sender<bool>,
    pub event_duration_tx: Sender<f32>,
    pub message_tx: Sender<Message>,
}

impl SchedulerCom {
    pub fn jump_to_next_marker(&mut self) {
        self.message_tx.send(Message::JumpNextMarker).unwrap()
    }
    pub fn jump_to_previous_marker(&mut self) {
        self.message_tx.send(Message::JumpPreviousMarker).unwrap()
    }
}

#[derive(Clone, Debug, Serialize)]
enum Event<'a> {
    Section(&'a DepthEnvelopePoint),
    Call(&'a CallDrawData),
}

pub fn start_scheduler(trace: Deepika2) -> SchedulerCom {
    let args = get_args();
    #[cfg(not(target_os = "windows"))]
    let mut osc_communicator = if args.osc {
        Some(OscCommunicator::new())
    } else {
        None
    };
    let ws_communicator = WebsocketCom::default();
    let mut current_index = 0;
    let mut current_depth_envelope_index = 0;
    let mut current_section = trace.depth_envelope.sections[0];
    let mut seconds_between_calls = 0.025;
    let mut play = false;
    // let mut audio_engine = AudioEngine::new();

    let (index_increase_tx, index_increase_rx) = unbounded();
    let (event_duration_tx, event_duration_rx) = unbounded();
    let (play_tx, play_rx) = unbounded();
    let (message_tx, message_rx) = unbounded();

    spawn(move || loop {
        while let Ok(new_duration) = event_duration_rx.try_recv() {
            seconds_between_calls = new_duration;
            #[cfg(not(target_os = "windows"))]
            if let Some(osc_communicator) = &mut osc_communicator {
                osc_communicator.send_speed(new_duration);
            }
        }
        while let Ok(new_play) = play_rx.try_recv() {
            play = new_play;
        }
        while let Ok(new_message) = message_rx.try_recv() {
            match new_message {
                Message::JumpNextMarker => {
                    let old_index = current_index;
                    let current_marker = trace.draw_trace[current_index].marker.clone();
                    while current_marker == trace.draw_trace[current_index].marker {
                        current_index += 1;
                        if current_index >= trace.draw_trace.len() {
                            current_index = 0;
                        }
                        if current_index == old_index {
                            // We've gone all the way around
                            break;
                        }
                    }
                    index_increase_tx.send(current_index).unwrap();
                }
                Message::JumpPreviousMarker => {
                    let old_index = current_index;
                    let current_marker = trace.draw_trace[current_index].marker.clone();
                    while current_marker == trace.draw_trace[current_index].marker {
                        if current_index == 0 {
                            current_index = trace.draw_trace.len();
                        }
                        current_index -= 1;
                        if current_index == old_index {
                            // We've gone all the way around
                            break;
                        }
                    }
                    index_increase_tx.send(current_index).unwrap();
                }
            }
        }
        if play {
            current_index += 1;
            if current_index >= trace.draw_trace.len() {
                current_index = 0;
            }
            index_increase_tx.send(current_index).unwrap();

            let num_depth_points = trace.depth_envelope.sections.len();
            let _depth_point = trace.depth_envelope.sections[current_depth_envelope_index];
            while current_index > current_section.end_index {
                current_depth_envelope_index += 1;
                current_depth_envelope_index %= num_depth_points;
                current_section = trace.depth_envelope.sections[current_depth_envelope_index];
                #[cfg(not(target_os = "windows"))]
                if let Some(osc_communicator) = &mut osc_communicator {
                    osc_communicator.send_section(current_section);
                }
                let section_json =
                    serde_json::to_string(&Event::Section(&current_section)).unwrap();
                if let Err(e) = ws_communicator.sender.send(section_json) {
                    error!("Unable to send section over websocket: {e:?}");
                }
            }
            let state = current_section.state;
            // audio_engine.spawn_sine(
            //     trace.draw_trace[current_index].depth as f32 * 10.0 + 20.0,
            //     0.5,
            // );
            // Send osc message to SuperCollider
            {
                let call = &trace.draw_trace[current_index];
                #[cfg(not(target_os = "windows"))]
                if let Some(osc_communicator) = &mut osc_communicator {
                    osc_communicator.send_call(call.depth, state);
                }
                let call_json = serde_json::to_string(&Event::Call(call)).unwrap();
                if let Err(e) = ws_communicator.sender.send(call_json) {
                    error!("Unable to send call over websocket: {e:?}");
                }
            }
        }
        std::thread::sleep(Duration::from_secs_f32(seconds_between_calls));
    });
    SchedulerCom {
        index_increase_rx,
        event_duration_tx,
        play_tx,
        message_tx,
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
            Type::Float(section.average),
            Type::Float(section.shannon_wiener_diversity_index),
        ];
        if let Err(e) = self.sender.send((addr, args)) {
            warn!("OSC error: failed to send: {e:?}");
        }
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
        if let Err(e) = self.sender.send((addr, args)) {
            warn!("OSC error: failed to send: {e:?}");
        }
    }
    pub fn send_speed(&mut self, time_between_events: f32) {
        use nannou_osc::Type;
        let addr = "/speed";
        let args = vec![Type::Float(time_between_events)];
        if let Err(e) = self.sender.send((addr, args)) {
            warn!("OSC error: failed to send: {e:?}");
        }
    }
}
