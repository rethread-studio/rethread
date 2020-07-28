use midi_control::consts;
use midi_control::sysex::USysExDecoder;
use midi_control::vendor::arturia;
use midi_control::{MidiMessage, ControlEvent};

use std::sync::mpsc::{channel, Sender, Receiver};
use std::sync::{Arc, Mutex};
type ArcMutex<T> = Arc<Mutex<T>>;

use super::{SharedState, SelectionMode};
use super::event_stats::*;


/// String to look for when enumerating the MIDI devices
const NANO_DEVICE: &str = "nanoKONTROL2";


pub struct MidiDevice {
    midi_in_port: midir::MidiInputPort,
    receiver: Receiver<MidiMessage>,
    input_connection: midir::MidiInputConnection<Sender<MidiMessage>>,
}

impl MidiDevice {
    pub fn new(shared_state: ArcMutex<SharedState>) -> Self {
        let midi_input = midir::MidiInput::new("ftrace_sonifier_midi").unwrap();

        let mut midi_in_port: Option<midir::MidiInputPort> = None;
        let available_ports = midi_input.ports();
        for port in available_ports {
            if let Ok(port_name) = midi_input.port_name(&port) {
                if port_name.contains(NANO_DEVICE) {
                    midi_in_port = Some(port);
                    break;
                }
            }
        }
        if midi_in_port.is_none() {
            // TODO: Return a Result instead
            panic!("Device not found!");
        }

        let (sender, receiver) = channel::<MidiMessage>();

        let midi_in_port = midi_in_port.unwrap();
        let connect_in = midi_input.connect(
            &midi_in_port,
            NANO_DEVICE,
            move |timestamp, data, sender| {
                let msg = MidiMessage::from(data);
                println!("{}: received {:?} => {:?}", timestamp, data, msg);
                let selection_mode;
                {
                    selection_mode = shared_state.lock().unwrap().selection_mode;
                }
                match msg {
                    MidiMessage::ControlChange(_, ctrl_event) => {
                        match selection_mode {
                            SelectionMode::Square => {
                                match ctrl_event {
                                    // Slider 1
                                    ControlEvent{control: 0, value} => {
                                        shared_state.lock().unwrap().focus_point.x = (value as f32 - 63.0) / 127.0;
                                    }
                                    // Slider 2
                                    ControlEvent{control: 1, value} => {
                                        shared_state.lock().unwrap().focus_point.y = (value as f32 - 63.0) / 127.0;
                                    }
                                    // Slider 3
                                    ControlEvent{control: 2, value} => {
                                        shared_state.lock().unwrap().amp_coeff_change = Some((value as f64) / 64.0);
                                    }
                                    // Slider 4
                                    ControlEvent{control: 3, value} => {
                                        shared_state.lock().unwrap().decay_coeff_change = Some(((value as f64) / 64.0).powi(4));
                                    }
                                    // Slider 5
                                    ControlEvent{control: 4, value} => {
                                        shared_state.lock().unwrap().param0 = Some((value as f64) / 127.0);
                                    }
                                    // Slider 6
                                    ControlEvent{control: 5, value} => {
                                        shared_state.lock().unwrap().param1 = Some((value as f64) / 127.0);
                                    }
                                    // Slider 7
                                    ControlEvent{control: 6, value} => {
                                        shared_state.lock().unwrap().param2 = Some((value as f64) / 127.0);
                                    }
                                    // Slider 8
                                    ControlEvent{control: 7, value} => {
                                        shared_state.lock().unwrap().tick_length = std::time::Duration::from_millis(60000/((value as u64 + 3) * 40));
                                    }
                                    // Knob 1
                                    ControlEvent{control: 16, value} => {
                                        shared_state.lock().unwrap().zoom = (1.0 - (value as f32) / 127.0).powi(2) * 0.5;
                                    }
                                    // S button 5 down
                                    ControlEvent{control: 36, value: 127} => {
                                        shared_state.lock().unwrap().set_synthesis_type_texture = Some(true);
                                    }
                                    // S button 6 down
                                    ControlEvent{control: 37, value: 127} => {
                                        shared_state.lock().unwrap().set_synthesis_type_pitch = Some(true);
                                    }
                                    // S button 7 down
                                    ControlEvent{control: 38, value: 127} => {
                                        shared_state.lock().unwrap().set_synthesis_type_bass = Some(true);
                                    }
                                    
                                    _ => ()
                                }
                            },
                            SelectionMode::EventFamily => {
                                match ctrl_event {
                                    // S button 1 down
                                    ControlEvent{control: 32, value: 127} => {
                                        shared_state.lock().unwrap().select_family = EventFamily::TCP;
                                    }
                                    // S button 2 down
                                    ControlEvent{control: 33, value: 127} => {
                                        shared_state.lock().unwrap().select_family = EventFamily::FS;
                                    }
                                    // S button 3 down
                                    ControlEvent{control: 34, value: 127} => {
                                        shared_state.lock().unwrap().select_family = EventFamily::RANDOM;
                                    }
                                    // S button 4 down
                                    ControlEvent{control: 35, value: 127} => {
                                        shared_state.lock().unwrap().select_family = EventFamily::DRM;
                                    }
                                    // S button 5 down
                                    ControlEvent{control: 36, value: 127} => {
                                        shared_state.lock().unwrap().select_family = EventFamily::IRQ;
                                    }
                                    // S button 6 down
                                    ControlEvent{control: 37, value: 127} => {
                                        shared_state.lock().unwrap().select_family = EventFamily::EXCEPTIONS;
                                    }
                                    // // S button 7 down
                                    // ControlEvent{control: 32, value: 127} => {
                                    //     shared_state.lock().unwrap().select_family = Some(EventFamily::TCP);
                                    // }
                                    // // S button 8 down
                                    // ControlEvent{control: 32, value: 127} => {
                                    //     shared_state.lock().unwrap().select_family = Some(EventFamily::TCP);
                                    // }
                                    _ => ()
                                }

                            }
                        }
                        match ctrl_event {
                            // Play button down
                            ControlEvent{control: 40, value: 127} => {
                                shared_state.lock().unwrap().mute = Some(false);
                            }
                            // Stop button down
                            ControlEvent{control: 42, value: 127} => {
                                shared_state.lock().unwrap().mute = Some(true);
                            }
                            // set button down
                            ControlEvent{control: 60, value: 127} => {
                                let mut locked_shared_state = shared_state.lock().unwrap();
                                locked_shared_state.density_approach = locked_shared_state.density_approach.next();
                            }
                            // marker left down
                            ControlEvent{control: 61, value: 127} => {
                                shared_state.lock().unwrap().selection_mode = SelectionMode::Square;
                            }
                            // marker right down
                            ControlEvent{control: 62, value: 127} => {
                                shared_state.lock().unwrap().selection_mode = SelectionMode::EventFamily;
                            }
                            _ => ()
                        }
                    }
                    _ => ()
                    
                }
            },
            sender,
        );

        MidiDevice {
            midi_in_port,
            receiver,
            input_connection: connect_in.unwrap()
        }

    }
}