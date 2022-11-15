use std::thread::spawn;
use std::time::Duration;

use crossbeam::channel::{unbounded, Receiver, Sender};
use log::*;
use serde::Serialize;

use crate::{get_args, websocket::WebsocketCom, AnimationCallData, Trace};
use parser::deepika2::{CallDrawData, DepthEnvelopePoint};
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

#[derive(Clone)]
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

pub fn start_scheduler(mut trace: Trace) -> SchedulerCom {
    let args = get_args();
    // #[cfg(not(target_os = "windows"))]
    let mut osc_communicator = if args.osc {
        Some(OscCommunicator::new())
    } else {
        None
    };
    let ws_communicator = WebsocketCom::default();
    // let mut current_index = 0;
    // let mut current_depth_envelope_index = 0;
    let mut current_section = trace.trace.depth_envelope.sections[0];
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
            // #[cfg(not(target_os = "windows"))]
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
                    let old_index = trace.current_index;
                    let current_marker = trace.trace.draw_trace[trace.current_index].marker.clone();
                    while current_marker == trace.trace.draw_trace[trace.current_index].marker {
                        trace.current_index += 1;
                        if trace.current_index >= trace.trace.draw_trace.len() {
                            trace.current_index = 0;
                        }
                        if trace.current_index == old_index {
                            // We've gone all the way around
                            break;
                        }
                    }
                    index_increase_tx.send(trace.current_index).unwrap();
                }
                Message::JumpPreviousMarker => {
                    let old_index = trace.current_index;
                    let current_marker = trace.trace.draw_trace[trace.current_index].marker.clone();
                    while current_marker == trace.trace.draw_trace[trace.current_index].marker {
                        if trace.current_index == 0 {
                            trace.current_index = trace.trace.draw_trace.len();
                        }
                        trace.current_index -= 1;
                        if trace.current_index == old_index {
                            // We've gone all the way around
                            break;
                        }
                    }
                    index_increase_tx.send(trace.current_index).unwrap();
                }
            }
        }
        if play {
            trace.current_index += 1;
            if trace.current_index >= trace.trace.draw_trace.len() {
                trace.current_index = 0;
            }
            index_increase_tx.send(trace.current_index).unwrap();

            let num_depth_points = trace.trace.depth_envelope.sections.len();
            let _depth_point =
                trace.trace.depth_envelope.sections[trace.current_depth_envelope_index];
            while trace.current_index > current_section.end_index {
                trace.current_depth_envelope_index += 1;
                trace.current_depth_envelope_index %= num_depth_points;
                current_section =
                    trace.trace.depth_envelope.sections[trace.current_depth_envelope_index];
                // #[cfg(not(target_os = "windows"))]
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
                let call = &trace.trace.draw_trace[trace.current_index];
                // #[cfg(not(target_os = "windows"))]
                if let Some(osc_communicator) = &mut osc_communicator {
                    osc_communicator.send_call(call.depth, state);
                }
                let call_json = serde_json::to_string(&Event::Call(call)).unwrap();
                if let Err(e) = ws_communicator.sender.send(call_json) {
                    error!("Unable to send call over websocket: {e:?}");
                }
            }
            {
                let row_data = trace.get_animation_call_data(trace.current_index);
                // #[cfg(not(target_os = "windows"))]
                if let Some(osc_communicator) = &mut osc_communicator {
                    osc_communicator.send_new_row(row_data);
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
    supercollider_sender: nannou_osc::Sender<nannou_osc::Connected>,
    artnet_sender: nannou_osc::Sender<nannou_osc::Connected>,
}
impl OscCommunicator {
    pub fn new() -> Self {
        let sender = nannou_osc::sender()
            .unwrap()
            .connect("localhost:57120")
            .unwrap();
        let artnet_sender = nannou_osc::sender()
            .unwrap()
            .connect("localhost:57122")
            .unwrap();
        Self {
            supercollider_sender: sender,
            artnet_sender,
        }
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
        if let Err(e) = self.supercollider_sender.send((addr, args)) {
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
        if let Err(e) = self.supercollider_sender.send((addr, args)) {
            warn!("OSC error: failed to send call: {e:?}");
        }
    }
    pub fn send_speed(&mut self, time_between_events: f32) {
        use nannou_osc::Type;
        let addr = "/speed";
        let args = vec![Type::Float(time_between_events)];
        if let Err(e) = self.supercollider_sender.send((addr, args)) {
            warn!("OSC error: failed to send: {e:?}");
        }
    }
    pub fn send_new_row(&mut self, data: AnimationCallData) {
        use nannou_osc::Type;
        let AnimationCallData {
            num_leds,
            left_color,
            right_color,
        } = data;
        let addr = "/row";
        let mut args = vec![Type::Int(num_leds as i32)];
        for col in [left_color, right_color].iter() {
            let c = col.as_rgba_f32();
            let c: Vec<u8> = c.iter().map(|v| (v * 255.) as u8).collect();
            args.push(Type::Color(nannou_osc::Color {
                red: c[0],
                green: c[1],
                blue: c[2],
                alpha: 255,
            }));
        }

        if let Err(e) = self.artnet_sender.send((addr, args)) {
            warn!("OSC error: failed to send to artnet: {e:?}");
        }
    }
}
