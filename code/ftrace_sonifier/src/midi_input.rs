use midi_control::consts;
use midi_control::sysex::USysExDecoder;
use midi_control::vendor::arturia;
use midi_control::{MidiMessage, ControlEvent};

use std::sync::mpsc::{channel, Sender, Receiver};
use std::sync::{Arc, Mutex};
type ArcMutex<T> = Arc<Mutex<T>>;

use super::SharedState;


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
                match msg {
                    MidiMessage::ControlChange(_, ctrl_event) => {
                        match ctrl_event {
                            // Slider 1
                            ControlEvent{control: 0, value} => {
                                shared_state.lock().unwrap().focus_point.x = (value as f32 - 63.0) / 127.0;
                            }
                            // Slider 2
                            ControlEvent{control: 1, value} => {
                                shared_state.lock().unwrap().focus_point.y = (value as f32 - 63.0) / 127.0;
                            }
                            // Knob 1
                            ControlEvent{control: 16, value} => {
                                shared_state.lock().unwrap().zoom = (1.0 - (value as f32) / 127.0).powi(2);
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