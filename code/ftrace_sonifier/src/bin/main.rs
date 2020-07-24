//! Sonifier for ftrace software trace

use nannou_osc as osc;
use nannou::prelude::*;
use nannou::ui::prelude::*;

use crossbeam_channel::bounded;
extern crate jack;

use std::thread;
use std::io;
use std::str::FromStr;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
type ArcMutex<T> = Arc<Mutex<T>>;

// use ftrace_sonifier::synth::SynthesisEngine;
use ftrace_sonifier::audio_interface::*;

use ftrace_sonifier::event_stats::*;
use ftrace_sonifier::midi_input::MidiDevice;
use ftrace_sonifier::SharedState;

const PORT: u16 = 12345;

// Scheduling model:
// How will the wall-clock timestamp be converted into a sample-based timestamp that the audio thread can use?
// Perhaps as simple as converting wall-clock time to samples and consider wall-clock 0 to equal 0 samples + constant 
// delay in order to have time to send the message before it is scheduled to be played.

struct Ids {
    ring_width: widget::Id,
    max_lines: widget::Id,
    friction: widget::Id,
    force_strength: widget::Id,
}

struct Model {
    _window: window::Id,
    ui: Ui,
    widget_ids: Ids,
    audio_interface: AudioInterface,
    main_event_map: HashMap<&'static str, ArcMutex<HashMap<&'static str, EventStat>>>,
    event_family_map: HashMap<EventFamily, ArcMutex<HashMap<&'static str, EventStat>>>,
    midi_device: MidiDevice,
    shared_state: ArcMutex<SharedState>,
}

struct OSCModel {
    sample_rate: usize,
    /// The timestamp of the first packet received
    first_packet_timing: f64,
}


fn model(app: &App) -> Model {
    let _window = app
        .new_window()
        .size(1024, 1024)
        .view(view)
        .event(window_event)
        .build()
        .unwrap();

    // Audio setup
    let (event_msg_tx, event_msg_rx) = bounded::<EventMsg>(1_000_000);

    let mut audio_interface = AudioInterface::new(event_msg_rx);
    audio_interface.connect_to_system(2);

    let shared_state = Arc::new(Mutex::new(SharedState::new()));

    let midi_device = MidiDevice::new(shared_state.clone());

    // Ui setup

    let mut ui = app.new_ui().build().unwrap();

    let widget_ids = Ids {
        ring_width: ui.generate_widget_id(),
        max_lines: ui.generate_widget_id(),
        friction: ui.generate_widget_id(),
        force_strength: ui.generate_widget_id(),
    };
    let mut event_type_received: HashMap<String, usize> = HashMap::new();
    let (main_event_map, event_family_map) = init_stats();
    // Model setup (general non-realtime thread state)
    let mut osc_model = OSCModel {
        sample_rate: audio_interface.sample_rate,
        first_packet_timing: std::f64::MAX
    };
    // OSC receiver setup
    let mut receiver: osc::Receiver = osc::receiver(PORT).unwrap();
    let mut received_packets: Vec<Option<osc::Packet>> = vec![];
    
    let mut main_map_copy = main_event_map.clone();
    let mut shared_state_copy = shared_state.clone();
    thread::spawn(move || {
        loop {
            update_osc(&mut receiver, &mut received_packets);
            process_packets(&mut received_packets, &mut osc_model, &event_msg_tx, &mut event_type_received, &mut main_map_copy, &mut shared_state_copy);
        }
    });

    let mut model = Model {
        _window,
        ui,
        widget_ids,
        audio_interface,
        main_event_map,
        event_family_map,
        midi_device,
        shared_state
    };
    model
}

fn window_event(_app: &App, model: &mut Model, event: WindowEvent) {
    match event {
        KeyPressed(key) => {
            match key {
                Key::R => {
                   
                }
                Key::Space => {

                }
                _ => (),
            }
        }
        KeyReleased(_key) => {}
        MouseMoved(_pos) => {}
        MousePressed(_button) => {}
        MouseReleased(_button) => {}
        MouseEntered => {}
        MouseExited => {}
        MouseWheel(_amount, _phase) => {}
        Moved(_pos) => {}
        Resized(_size) => {}
        Touch(_touch) => {}
        TouchPressure(_pressure) => {}
        HoveredFile(_path) => {}
        DroppedFile(_path) => {}
        HoveredFileCancelled => {}
        Focused => {}
        Unfocused => {}
        Closed => {}
    }
}

fn update(app: &App, model: &mut Model, _update: Update) {
    {
        // Calling `set_widgets` allows us to instantiate some widgets.
        let ui = &mut model.ui.set_widgets();

        fn slider(val: f32, min: f32, max: f32) -> widget::Slider<'static, f32> {
            widget::Slider::new(val, min, max)
                .w_h(200.0, 30.0)
                .label_font_size(15)
                .rgb(0.3, 0.3, 0.3)
                .label_rgb(1.0, 1.0, 1.0)
                .border(1.0)
        }

        // for value in slider(model.friction, 0.0, 1.0)
        //     .top_left_with_margin(20.0)
        //     .label(&format!("Friction: {}", model.friction))
        //     .set(model.widget_ids.friction, ui)
        // {
        //     model.friction = value;
        // }
    }

    // println!("fps: {}, points: {}", app.fps(), model.points.len());
}

fn view(app: &App, model: &Model, frame: Frame) {
    // Prepare to draw.
    let draw = app.draw();

    draw.background().color(hsl(0.0, 0.0, 1.0));
    const decay: f64 = 0.97;

    let zoom;
    let focus_point;

    {
        let locked_shared_state = model.shared_state.lock().unwrap();

        zoom = 1.0 / locked_shared_state.zoom;
        focus_point = locked_shared_state.focus_point * frame.rect().wh() * zoom;
    }

    for (family_enum, family_map) in &model.event_family_map {
        let mut locked_family_map = family_map.lock().unwrap();
        for (event_name, event_stat) in locked_family_map.iter_mut() {
            let size = event_stat.density.sqrt() as f32 * 2.0 + 2.0;
            draw.rect()
                .color(BLACK)
                .w_h( size, size)
                .x_y((event_stat.pos.x * frame.rect().w()) * zoom - focus_point.x, (event_stat.pos.y * frame.rect().h()) * zoom - focus_point.y);
            event_stat.decay_density(decay, 1.0);
        }
    }

    // Draw text
    // How many points have been infected
    // How many points were "isolated" model.isolated_points.len()
    // draw.text()
    // Write to the window frame.
    draw.to_frame(app, &frame).unwrap();

    // Draw the state of the `Ui` to the frame.
    model.ui.draw_to_frame(app, &frame).unwrap();

}

fn main() {
    nannou::app(model).update(update).run();
}

/// Attempt to read a frequency from standard in. Will block until there is
/// user input. `None` is returned if there was an error reading from standard
/// in, or the retrieved string wasn't a compatible u16 integer.
fn read_freq() -> Option<[f64; 4]> {
    let mut user_input = String::new();
    match io::stdin().read_line(&mut user_input) {
        Ok(_) => {
            let mut values: [f64; 4] = [220.0, 1.0, 1.0, 1.0];
            let strings: Vec<&str> = user_input.split(" ").collect();
            for (i, string) in strings.into_iter().enumerate() {
                values[i] = f64::from_str(string.trim()).unwrap();
            }
            Some(values)
        },
        Err(_) => None,
    }
}

fn update_osc(receiver: &mut osc::Receiver, received_packets: &mut Vec<Option<osc::Packet>>) {
    // Clear the vector since its last use
    received_packets.clear();

    // Receive any pending osc packets.
    for (packet, addr) in receiver.try_iter() {
        // println!("Packet: {:?}", packet);
        received_packets.push(Some(packet));
    }
}

fn process_packets(
    received_packets: &mut Vec<Option<osc::Packet>>, 
    osc_model: &mut OSCModel, 
    tx: &crossbeam_channel::Sender<EventMsg>, 
    event_type_received: &mut HashMap<String, usize>,
    main_map: &mut HashMap<&'static str, ArcMutex<HashMap<&'static str, EventStat>>>,
    shared_state: &mut ArcMutex<SharedState>
) {
    // The osc::Packet can be a bundle containing several messages. Therefore we can use into_msgs to get all of them.
    for packet in received_packets {
        let owned_packet = packet.take();
        // Each packet should only ever be parsed once. If the unwrap fails something is wrong.
        for message in owned_packet.expect("Each Packet should only be parsed once").into_msgs() {
            match message.addr.as_ref() {
                "/ftrace" => {
                    let mut msg = EventMsg {
                        timestamp: 0.0,
                        event_type: 0,
                        has_been_parsed: false,
                        pid: 0,
                        cpu: 0,
                        synthesis_type: SynthesisType::NoSynthesis,
                    };
                    let mut do_send_message = true;
                    if let Some(args) = message.args {
                        // Parse the arguments
                        for arg in args.iter().enumerate() {
                            match arg {
                                (0, osc::Type::Double(timestamp)) => {
                                    // Convert a microsecond timestamp into a sample based one
                                    // Set the first packet timing the first time a packet is received
                                    if osc_model.first_packet_timing == std::f64::MAX {
                                        osc_model.first_packet_timing = *timestamp;
                                    }
                                    // Convert wall-clock time to samples depending on sample rate
                                    msg.timestamp = *timestamp / 1000000.0;
                                },
                                (1, osc::Type::String(event)) => {
                                    // The formula for calculating pitch is very important to the overall sound
                                    // Basing it on pitch in frequency leads to a noisier result
                                    // msg.freq = (((event.len() * 1157)) % 10000) as f64 + 100.0;
                                    // Different "generating" intervals can be used for very different sound
                                    // Pythagorean intervals such as a 3/2 or 9/8 seem to do well for a consonant sound
                                    let event_length = event.len();
                                    let freq = degree_to_freq(((event.len() as f64 * 31.0) % (53.0 * 8.0)));
                                    // let freq = (((event.len() * 1157)) % 10000) as f64 + 100.0;
                                    let decay = 200.0/freq;
                                    msg.synthesis_type = SynthesisType::Frequency{freq, decay};
                                    msg.event_type = 0;
                                    // Extract the type
                                    let event_type = event.split(':').into_iter().next().unwrap_or("default");

                                    if let Some(family) = main_map.get(event_type) {
                                        let mut locked_family = family.lock().unwrap();
                                        let mut event_stat = locked_family.get_mut(event_type).unwrap();

                                        match event_stat.event_family  {
                                            EventFamily::TCP => {
                                                let index = event_length % 4;
                                                let decay = 2.0;
                                                msg.synthesis_type = SynthesisType::Bass{index, decay};
                                            }
                                            EventFamily::RANDOM => {
                                                let freq = random::<f64>() * 5000.0 + 9000.0;
                                                msg.synthesis_type = SynthesisType::Frequency{freq, decay};
                                            }
                                            EventFamily::FS => {
                                                let mut freq = freq;
                                                while freq > 800.0 { freq *= 0.5 }
                                                msg.synthesis_type = SynthesisType::Frequency{freq, decay: decay*0.5};
                                            }
                                            EventFamily::EXCEPTIONS => {
                                                let mut freq = freq;
                                                while freq < 800.0 { freq *= 2.0 }
                                                msg.synthesis_type = SynthesisType::Frequency{freq, decay: decay*0.5};
                                            }
                                            _ => ()
                                        }
                                        
                                        if msg.timestamp - event_stat.last_triggered_timestamp < 0.01 {
                                            do_send_message = false;
                                        } else {
                                            event_stat.last_triggered_timestamp = msg.timestamp;
                                        }
                                        event_stat.register_occurrence();
                                        let locked_shared_state = shared_state.lock().unwrap();
                                        let zoom = locked_shared_state.zoom;
                                        let focus_point = locked_shared_state.focus_point;
                                        let adjusted_pos = event_stat.pos - focus_point;
                                        if adjusted_pos.x.abs() > zoom || adjusted_pos.y.abs() > zoom {
                                            do_send_message = false;
                                        }
                                    }

                                    // Find all of the event types used
                                    // let event_copy = String::from(event_type);
                                    // if !event_type_received.contains_key(&event_copy) {
                                    //     println!("{}", event_copy);
                                    //     event_type_received.insert(event_copy, 1);
                                    // } else {
                                    //     let count = event_type_received.entry(event_copy).or_insert(1);
                                    //     *count += 1;
                                    // }
                                },
                                (2, osc::Type::Int(pid)) => {
                                    msg.pid = *pid;
                                }
                                (3, osc::Type::Int(cpu)) => {
                                    msg.cpu = *cpu;
                                }
                                _ => ()
                            }
                        }
                        // Send the event to the audio thread.
                        if do_send_message {
                            tx.send(msg).expect("Error sending to audio thread");
                        }
                        
                    }
                },
                "/start_transmission" => {
                    // A new transmission has started, reset

                    // Set the first packet timing to the max value in order for it to be reset at the first ftrace event
                    osc_model.first_packet_timing = std::f64::MAX;
                },
                _ => ()
            }
        }
    }
}

/// Converts from 53edo degree to 
fn degree_to_freq(degree: f64) -> f64 {
    // The root frequency is midinote 24
    const ROOT_FREQ: f64 = 32.703195662575;
    ROOT_FREQ * 2.0_f64.powf(degree/53.0)
}

