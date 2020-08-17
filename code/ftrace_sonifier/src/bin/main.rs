//! Sonifier for ftrace software trace

use nannou_osc as osc;
use nannou::prelude::*;
use nannou::ui::prelude::*;

use crossbeam_channel::bounded;
use crossbeam_channel::{Sender, Receiver};
extern crate jack;

use std::thread;
use std::io;
use std::str::FromStr;
use std::collections::HashMap;
use std::cell::RefCell;
use std::sync::{Arc, Mutex, MutexGuard};
type ArcMutex<T> = Arc<Mutex<T>>;

// use ftrace_sonifier::synth::SynthesisEngine;
use ftrace_sonifier::audio_interface::*;

use ftrace_sonifier::event_stats::*;
use ftrace_sonifier::midi_input::MidiDevice;
use ftrace_sonifier::{SharedState, SelectionMode};

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

struct GraphicTrigger {
    position: Point2,
    velocity: Vector2,
    hue: f32,
    outside: bool,
    lifetime: f32,
}

impl GraphicTrigger {
    pub fn new(position: Point2, velocity: Vector2, hue: f32) -> Self {
        GraphicTrigger {
            position,
            velocity,
            hue,
            outside: false,
            lifetime: 1.0,
        }
    }
    pub fn update(&mut self) {
        self.position += self.velocity;
        self.lifetime -= 0.01;
        if self.position.x > 1.0 || self.position.x < -1.0 || self.position.y > 1.0 || self.position.y < -1.0 {
            self.outside = true;
        }
        if self.lifetime <= 0.0 {
            self.outside = true;
        }
    }
}

struct Model {
    _window: window::Id,
    ui: Ui,
    widget_ids: Ids,
    audio_interface: AudioInterface,
    family_map: HashMap<EventFamily, ArcMutex<EventStat>>,
    event_to_family_map: HashMap<String, EventFamily>,
    midi_device: MidiDevice,
    shared_state: ArcMutex<SharedState>,
    info_event_stat: RefCell<Option<EventStat>>, // A copy of the event_stat to be visualised
    graphic_triggers: Vec<GraphicTrigger>,
    graphic_trigger_rx: Receiver<GraphicTrigger>,
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
    let (mut event_msg_tx, event_msg_rx) = bounded::<EventMsg>(1_000_000);

    let (tick_msg_tx, tick_msg_rx) = bounded::<EventMsg>(1_000_000);

    let (mut graphic_trigger_tx, graphic_trigger_rx) = bounded::<GraphicTrigger>(1_000_000);

    let (mut trigger_msg_tx, trigger_msg_rx) = bounded::<usize>(1000000);

    let mut audio_interface = AudioInterface::new(tick_msg_rx, event_msg_rx, trigger_msg_rx);
    audio_interface.connect_to_system(2);

    let shared_state = Arc::new(Mutex::new(SharedState::new()));
    {
        let mut locked_shared_state = shared_state.lock().unwrap();
        locked_shared_state.num_textures = audio_interface.num_textures;
        locked_shared_state.num_single_pitches = audio_interface.num_single_pitches;
    }
    

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
    let (family_map, event_to_family_map) = init_stats();
    // Model setup (general non-realtime thread state)
    let mut osc_model = OSCModel {
        sample_rate: audio_interface.sample_rate,
        first_packet_timing: std::f64::MAX
    };
    // OSC receiver setup
    let mut receiver: osc::Receiver = osc::receiver(PORT).unwrap();
    let mut received_packets: Vec<Option<osc::Packet>> = vec![];
    
    let mut family_map_clone = family_map.clone();
    let mut event_to_family_map_clone = event_to_family_map.clone();
    let mut shared_state_copy = shared_state.clone();
    thread::spawn(move || {
        loop {
            update_osc(&mut receiver, &mut received_packets);
            process_packets(
                &mut received_packets, 
                &mut osc_model, 
                &mut event_type_received, 
                &mut family_map_clone,
                &mut event_to_family_map_clone,
                &mut shared_state_copy, 
                &mut event_msg_tx, 
                &mut graphic_trigger_tx,
                &mut trigger_msg_tx,
            );
        }
    });

    start_synthesis_tick(tick_msg_tx, family_map.clone(), shared_state.clone());

    let mut model = Model {
        _window,
        ui,
        widget_ids,
        audio_interface,
        family_map,
        event_to_family_map,
        midi_device,
        shared_state,
        info_event_stat: RefCell::new(None),
        graphic_triggers: vec![],
        graphic_trigger_rx,
    };
    model
}

fn window_event(_app: &App, model: &mut Model, event: WindowEvent) {
    match event {
        KeyPressed(key) => {
            match key {
                Key::P => {
                    model.shared_state.lock().unwrap().set_synthesis_type_pitch = Some(true);
                }
                Key::T => {
                    model.shared_state.lock().unwrap().set_synthesis_type_texture = Some(true);
                }
                Key::B => {
                    model.shared_state.lock().unwrap().set_synthesis_type_bass = Some(true);
                }
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

    // Update GraphicTriggers
    for gt in &mut model.graphic_triggers {
        gt.update();
    }

    // Remove triggers that have disappeared
    model.graphic_triggers.retain(|gt| !gt.outside );

    // Receive GraphicTriggers
    while let Ok(gt) = model.graphic_trigger_rx.try_recv() {
        model.graphic_triggers.push(gt);
    }

    // 

    // println!("fps: {}, points: {}", app.fps(), model.points.len());
}

fn view(app: &App, model: &Model, frame: Frame) {
    // Prepare to draw.
    let draw = app.draw();

    draw.background().color(hsl(0.0, 0.0, 1.0));

    // let zoom;
    // let focus_point;
    // let decay_coeff_change;
    // let amp_coeff_change;
    // let mute;
    // let param0;
    // let param1;
    // let param2;
    // let num_textures;
    // let num_single_pitches;
    // let set_synthesis_type_texture;
    // let set_synthesis_type_pitch;
    // let set_synthesis_type_bass;
    // let density_approach;
    let local_shared_state;

    {
        let mut locked_shared_state = model.shared_state.lock().unwrap();

        local_shared_state = locked_shared_state.clone();
        locked_shared_state.reset();
    }

    let zoom = local_shared_state.zoom;

    // Draw selection
    draw.rect()
        .no_fill()
        .stroke(BLACK)
        .stroke_weight(2.0)
        .w_h( frame.rect().w() * local_shared_state.zoom * 2.0, frame.rect().h() * local_shared_state.zoom * 2.0)
        .x_y(local_shared_state.focus_point.x * frame.rect().w(), local_shared_state.focus_point.y * frame.rect().h());

    let mouse_pos = app.mouse.position();
    let mut hover_found = false;

    for (event_name, event_stat_mutex) in model.family_map.iter() {
        let mut event_stat = event_stat_mutex.lock().unwrap();
        // Check if the event is inside of the selection
        let adjusted_pos = event_stat.pos - local_shared_state.focus_point;
        let is_selected = match local_shared_state.selection_mode {
            SelectionMode::Square => {
                adjusted_pos.x.abs() <= zoom && adjusted_pos.y.abs() <= zoom
            },
            SelectionMode::EventFamily => {
                event_stat.event_family == local_shared_state.select_family
            }
        };
        let lightness = if is_selected {
            0.2
        } else {
            0.6
        };
        let hue = if event_stat.mute {
            0.5
        } else {
            0.0
        };
        // let size = event_stat.density.sqrt() as f32 * 2.0 + 2.0;
        let size = match local_shared_state.density_approach {
            DensityApproach::Density => event_stat.density.sqrt() as f32 * 2.0 + 5.0,
            DensityApproach::LpfDensity => event_stat.lpf_density.sqrt() as f32 * 2.0 + 5.0,
            DensityApproach::DensityChange => event_stat.density_change.sqrt() as f32 * 10.0 + 5.0,
        };
        // let x = (event_stat.pos.x * frame.rect().w()) * zoom - focus_point.x;
        // let y = (event_stat.pos.y * frame.rect().h()) * zoom - focus_point.y;
        let x = event_stat.pos.x * frame.rect().w();
        let y = event_stat.pos.y * frame.rect().h();
        draw.rect()
            .color(hsl(hue, 0.8, lightness))
            .w_h( size, size)
            .x_y(x, y);
        // Assign new values that were changed with the midi controller is the event is inside the "selection"
        if is_selected  {
            if let Some(new_decay) = &local_shared_state.decay_coeff_change {
                event_stat.decay_coeff = *new_decay;
            }
            if let Some(new_amp) = &local_shared_state.amp_coeff_change {
                event_stat.amp_coeff = *new_amp;
            }
            if let Some(mute) = &local_shared_state.mute {
                event_stat.mute = *mute;
            }
            if let Some(do_set_texture) = local_shared_state.set_synthesis_type_texture {
                if let None = event_stat.synth_texture {
                    event_stat.synth_texture = Some(SynthesisType::Texture{index: 0, amp: 0.1, decay: 0.5})
                } else {
                    event_stat.synth_texture = None;
                }
            }
            if let Some(do_set_pitch) = local_shared_state.set_synthesis_type_pitch {
                if let None = event_stat.synth_pitch {
                    event_stat.synth_pitch = Some(SynthesisType::SinglePitch{index: (random::<f64>() * local_shared_state.num_single_pitches as f64) as usize, energy: 0.5})
                } else {
                    event_stat.synth_pitch = None;
                }
            }
            // if let Some(do_set_pitch) = set_synthesis_type_bass {
            //     event_stat.synthesis_type = Some(SynthesisType::Bass{amp: 0.5, decay: 0.5, index: 0})
            // }

            // Change synthesis type
            if let Some(synthesis_type) = &mut event_stat.synth_texture {
                if let SynthesisType::Texture{ ref mut index, ref mut amp, ref mut decay} = synthesis_type {
                    if let Some(p0) = &local_shared_state.param0 {
                        // Have to rescale to max 0.999 to not hit index == num_textures
                        *index = (p0 * 0.999 * local_shared_state.num_textures as f64) as usize;
                    }
                    if let Some(p1) = local_shared_state.param1 {
                        *amp = p1;
                    }
                    if let Some(p2) = local_shared_state.param2 {
                        *decay = p2.powi(2);
                    }
                }
            }
            if let Some(synthesis_type) = &mut event_stat.synth_pitch {
                if let SynthesisType::SinglePitch{ ref mut index, ref mut energy} = synthesis_type {
                    if let Some(p0) = &local_shared_state.param0 {
                        // Have to rescale to max 0.999 to not hit index == num_textures
                        *index = (p0 * 0.999 * local_shared_state.num_single_pitches as f64) as usize;
                    }
                    if let Some(p1) = local_shared_state.param1 {
                        *energy = p1;
                    }
                }
            }
        }

        // Check if we're hovering over the event_stat
        if (x - mouse_pos.x).abs() < size && (y - mouse_pos.y).abs() < size {
            *model.info_event_stat.borrow_mut() = Some(event_stat.clone());
            hover_found = true;
        }
    }

    // Draw GraphicTriggers
    for gt in &model.graphic_triggers {
        draw.ellipse()
            .color(hsla(gt.hue, 0.5, 0.5, gt.lifetime))
            .radius(6.0)
            .x_y(gt.position.x * frame.rect().w(), gt.position.y * frame.rect().h());
    }

    if !hover_found {
        *model.info_event_stat.borrow_mut() = None;
    }

    // Draw info on the selected/hovered over 
    // info box
    if let Some(info_event_stat) = &*model.info_event_stat.borrow() {
        let box_width = frame.rect().w() * 0.2;
        let box_lines = 10.0;
        let line_height = 32.0;
        let mut y = mouse_pos.y;
        let mut x = mouse_pos.x;

        y = y.min(frame.rect().top() - box_lines*line_height*0.5).max(frame.rect().bottom() - box_lines*line_height*0.5);

        draw.rect()
            .no_fill()
            .stroke(BLACK)
            .stroke_weight(2.0)
            .w_h( box_width, line_height * box_lines)
            .x_y(x, y);

        y += line_height * (box_lines-1.0) * 0.5;
        
        draw.text(info_event_stat.event_family.str())
            .color(BLACK)
            .w_h(box_width, 100.0)
            .x_y(x, y);

        y -= line_height;
        draw.text(&info_event_stat.name)
            .color(BLACK)
            .w_h(box_width, 100.0)
            .x_y(x, y);

        y -= line_height;
        draw.text(&format!("density: {}", info_event_stat.density))
            .color(BLACK)
            .w_h(box_width, 100.0)
            .x_y(x, y);
        y -= line_height;
        draw.text(&format!("lpf_density: {}", info_event_stat.lpf_density))
            .color(BLACK)
            .w_h(box_width, 100.0)
            .x_y(x, y);
        y -= line_height;
        draw.text(&format!("density_change: {}", info_event_stat.density_change))
            .color(BLACK)
            .w_h(box_width, 100.0)
            .x_y(x, y);
        y -= line_height;
        draw.text(&format!("amp_coeff: {}", info_event_stat.amp_coeff))
            .color(BLACK)
            .w_h(box_width, 100.0)
            .x_y(x, y);
        y -= line_height;
        draw.text(&format!("decay_coeff: {}", info_event_stat.decay_coeff))
            .color(BLACK)
            .w_h(box_width, 100.0)
            .x_y(x, y);
        y -= line_height;
        draw.text(&format!("mute: {}", info_event_stat.mute))
            .color(BLACK)
            .w_h(box_width, 100.0)
            .x_y(x, y);
        if let Some(synthesis_type) = info_event_stat.synth_texture {
            draw.text(&format!("synthesis_type: {}", synthesis_type))
                .color(BLACK)
                .w_h(box_width, 100.0)
                .x_y(x, y);
        }
        if let Some(synthesis_type) = info_event_stat.synth_pitch {
            draw.text(&format!("synthesis_type: {}", synthesis_type))
                .color(BLACK)
                .w_h(box_width, 100.0)
                .x_y(x, y);
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
    event_type_received: &mut HashMap<String, usize>,
    family_map: &mut HashMap<EventFamily, ArcMutex<EventStat>>,
    event_to_family_map: &mut HashMap<String, EventFamily>,
    shared_state: &mut ArcMutex<SharedState>,
    tx: &mut Sender<EventMsg>,
    graphic_trigger_tx: &mut Sender<GraphicTrigger>,
    trigger_msg_tx: &mut Sender<usize>,
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
                        synthesis_type: vec![],
                    };
                    let mut do_send_message = false;
                    
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
                                    msg.timestamp = *timestamp;
                                },
                                (1, osc::Type::String(event)) => {
                                    // The formula for calculating pitch is very important to the overall sound
                                    // Basing it on pitch in frequency leads to a noisier result
                                    // msg.freq = (((event.len() * 1157)) % 10000) as f64 + 100.0;
                                    // Different "generating" intervals can be used for very different sound
                                    // Pythagorean intervals such as a 3/2 or 9/8 seem to do well for a consonant sound
                                    let event_length = event.len();
                                    
                                    
                                    // Extract the type
                                    let event_type = event.split(':').into_iter().next().unwrap_or("default");

                                    if let Some(event_family) = event_to_family_map.get(event_type) {
                                        // if let Some(event_stat_mutex) = main_map.get(event_type) {
                                        if let Some(family_event_stat_mutex) = family_map.get(event_family) {
                                            let mut family_event_stat = family_event_stat_mutex.lock().unwrap();
                                            
                                            // if msg.timestamp - event_stat.last_triggered_timestamp < 0.01 {
                                            //     do_send_message = false;
                                            // } else {
                                            //     event_stat.last_triggered_timestamp = msg.timestamp;
                                            // }
                                            
                                            // Check how far down the 
                                            let mut event_stat = if family_event_stat.do_expand_children {
                                                if let Some(event_stat_mutex) = family_event_stat.children.get(event_type) {
                                                    event_stat_mutex.lock().unwrap()
                                                } else {
                                                    family_event_stat
                                                }
                                            } else {
                                                family_event_stat
                                            };

                                            event_stat.register_occurrence();

                                            // Do trigger
                                            let triggered;
                                            {
                                                let mut locked_shared_state = shared_state.lock().unwrap();
                                                triggered = locked_shared_state.triggers[event_stat.index].activate();
                                            }
                                            if triggered {
                                                // Send trigger to the sound and audio systems
                                                let angle = random_f32() * PI * 2.0;
                                                let speed = 0.003;
                                                let vel = vec2(angle.cos() * speed, angle.sin() * speed);
                                                graphic_trigger_tx.send(
                                                    GraphicTrigger::new(event_stat.pos.clone(), vel, 
                                                    event_stat.index as f32 * 73.5732 % 1.0)).unwrap();
                                                trigger_msg_tx.send(event_stat.index); // Send to sound synthesis
                                            }

                                            if let Some(synthesis_type) = event_stat.synth_texture {
                                                let mut synth_texture = synthesis_type.clone();
                                                do_send_message = true;
                                                match synth_texture {
                                                    SynthesisType::Texture{ ref mut index, ref mut amp, ref mut decay} => {
                                                        *amp *= (event_stat.density * 0.1).min(10.0) * event_stat.amp_coeff;
                                                    }
                                                    _ => ()
                                                }
                                                msg.synthesis_type.push(synth_texture);
                                            }

                                            if event_stat.mute {
                                                do_send_message = false;
                                            }
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
                                    // msg.pid = *pid;
                                }
                                (3, osc::Type::Int(cpu)) => {
                                    // msg.cpu = *cpu;
                                }
                                _ => ()
                            }
                        }
                        if do_send_message {
                            tx.send(msg);
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

fn start_synthesis_tick(
    tx: crossbeam_channel::Sender<EventMsg>,
    family_map: HashMap<EventFamily, ArcMutex<EventStat>>,
    shared_state: ArcMutex<SharedState>
) {
    const DENSITY_DECAY: f64 = 0.97;

    thread::spawn(move || {
        loop {
            let tick_length;
            {
                let mut locked_shared_state = shared_state.lock().unwrap();
                tick_length = locked_shared_state.tick_length;
                // update triggers
                for trig in &mut locked_shared_state.triggers {
                    trig.update();
                }
            }

            let density_decay = 0.99311604842093.powi(tick_length.as_millis() as i32);
        
            for (_event_family, family_event_stat_mutex) in &family_map {
                let mut family_event_stat = family_event_stat_mutex.lock().unwrap();
                if family_event_stat.do_expand_children {
                    for (_, event_stat_mutex) in &family_event_stat.children {
                        let mut event_stat = family_event_stat_mutex.lock().unwrap();
                        perform_synthesis_tick_on_event_stat(&mut event_stat, &tx, density_decay);
                    }
                } else {
                    perform_synthesis_tick_on_event_stat(&mut family_event_stat, &tx, density_decay);
                }
                
            }
            thread::sleep(tick_length);
        }
    });   
}

fn perform_synthesis_tick_on_event_stat(event_stat: &mut MutexGuard<EventStat>, tx: &crossbeam_channel::Sender<EventMsg>, density_decay: f64) {
    let mut msg = EventMsg {
        timestamp: 0.0,
        event_type: 0,
        has_been_parsed: false,
        pid: 0,
        cpu: 0,
        synthesis_type: vec![],
    };
    let mut do_send_message = !event_stat.mute;

    // Set the synthesis message parameters
    let freq = degree_to_freq((event_stat.density.floor()) % (53.0 * 8.0));
    // let freq = 40.0 * (event_stat.density + 100.0) as f64;
    // let freq = (((event.len() * 1157)) % 10000) as f64 + 100.0;
    let mut decay = 200.0/freq;
    let mut amp = (event_stat.density_change.sqrt() * 0.1).min(1.0);
    amp *= event_stat.amp_coeff;
    decay *= event_stat.decay_coeff;
    msg.event_type = 0;
    // match event_stat.event_family  {
    //     EventFamily::TCP => {
    //         let index = random_range(0, 16);
    //         let decay = 2.0 * event_stat.decay_coeff;
    //         msg.synthesis_type.push(SynthesisType::Bass{amp, decay, index});
    //     }
    //     EventFamily::RANDOM => {
    //         let freq = random::<f64>() * 5000.0 + 9000.0;
    //         amp *= 0.5;
    //         decay *= 0.5;
    //         msg.synthesis_type.push(SynthesisType::Frequency{freq, amp, decay});
    //     }
    //     EventFamily::FS => {
    //         // let mut freq = freq;
    //         // while freq > 800.0 { freq *= 0.5 }
    //         msg.synthesis_type.push(SynthesisType::Texture{index: 0, amp, decay: decay*0.5});
    //     }
    //     EventFamily::EXCEPTIONS => {
    //         let mut freq = freq;
    //         while freq < 800.0 { freq *= 2.0 }
    //         msg.synthesis_type.push(SynthesisType::Frequency{freq, amp, decay: decay*0.5});
    //     }
    //     _ => ()
    // }
    if let Some(pitch_synthesis_type) = event_stat.synth_pitch {
        let mut synth_copy = pitch_synthesis_type;
        match synth_copy {
            SynthesisType::SinglePitch{ ref mut index, ref mut energy} => {
                *index = event_stat.index;
                *energy *= ((event_stat.density_change).min(200.0) * event_stat.amp_coeff) / 200.0;

            }
            _ => ()
        }
        msg.synthesis_type.push(synth_copy);
    }

    // Send the event to the audio thread.
    if do_send_message {
        tx.send(msg).expect("Error sending to audio thread");
    }

    event_stat.decay_density(density_decay);  
}


/// Converts from 53edo degree to hz
fn degree_to_freq(degree: f64) -> f64 {
    // The root frequency is midinote 24
    const ROOT_FREQ: f64 = 32.703195662575;
    ROOT_FREQ * 2.0_f64.powf(degree/53.0)
}

