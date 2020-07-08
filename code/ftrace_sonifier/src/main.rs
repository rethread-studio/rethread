//! Sonifier for ftrace software trace

use nannou_osc as osc;

use std::sync::mpsc::channel;
use crossbeam_channel::bounded;
use std::collections::VecDeque;
extern crate jack;
extern crate sample;

use std::io;
use std::str::FromStr;

use std::f64::consts::PI;

use sample::{signal, Signal};

use ftrace_sonifier::{FMSynth, Delay, HighPassFilter, LowPassFilter, BiquadFilter};

const PORT: u16 = 12345;

// Scheduling model:
// How will the wall-clock timestamp be converted into a sample-based timestamp that the audio thread can use?
// Perhaps as simple as converting wall-clock time to samples and consider wall-clock 0 to equal 0 samples + constant 
// delay in order to have time to send the message before it is scheduled to be played.

struct Model {
    sample_rate: usize,
    /// The timestamp of the first packet received
    first_packet_timing: f64,
}

/// The struct for an event sent from the receiving OSC thread to the audio processing thread
struct EventMsg {
    /// Timestamp in samples for when this event should be played
    timestamp: usize,
    has_been_parsed: bool, /// If the event has been parsed by the audio scheduler and should be removed
    /// Other values that can be sent to the audio thread
    freq: f64,
    event_type: usize,
    pid: i32,
    cpu: i32,
}

impl EventMsg {
    pub fn is_time(&self, time_cursor: usize) -> bool {
        if time_cursor >= self.timestamp {
            true
        } else {
            false
        }
    }
}

fn main() {
    // OSC receiver setup
    let mut receiver: osc::Receiver = osc::receiver(PORT).unwrap();
    let mut received_packets: Vec<Option<osc::Packet>> = vec![];

    // 1. open a client
    let (client, _status) =
        jack::Client::new("ftrace_sonifier", jack::ClientOptions::NO_START_SERVER).unwrap();

    // 2. register port
    let mut out_port_l = client
        .register_port("out_l", jack::AudioOut::default())
        .unwrap();
    let mut out_port_r = client
        .register_port("out_r", jack::AudioOut::default())
        .unwrap();

    let mut output_port_names = vec![];
    output_port_names.push(out_port_l.name().unwrap());
    output_port_names.push(out_port_r.name().unwrap());
    // Double just because the headphone output is channels 3 and 4 on my system
    output_port_names.push(out_port_l.name().unwrap());
    output_port_names.push(out_port_r.name().unwrap());

        
    // 3. define process callback handler
    let sample_rate = client.sample_rate();
    // let (tx, rx) = channel::<EventMsg>();
    let (tx, rx) = bounded::<EventMsg>(1_000_000);

    // VecDeque is implemented as a growable ring buffer
    let mut event_queue = Vec::with_capacity(100000);
    let mut time_cursor: usize = 0;

    // FMSynth setup
    // let mut fm_synth = FMSynth::new(sample_rate as f64, 200.0, 1.0, 2.0, 1.0, 4.0);
    let mut fm_synths = vec![FMSynth::new(sample_rate as f64, 200.0, 0.0, 2.0, 1.0, 4.0); 100];
    let mut drone = FMSynth::new(sample_rate as f64, degree_to_freq(0.0), 0.05, 2.0, 1.0, 2.0);
    let mut hp_filters = vec![HighPassFilter::new(); 2];
    let mut lp_filters = vec![LowPassFilter::new(0.5); 2];
    let mut res_filters = vec![BiquadFilter::new(sample_rate as f64, 500.0, 3.0); 2];
    let mut counter = 0;
    let mut synth_index: usize = 0;
    let trig_amp = 0.5 / fm_synths.len() as f64;

    // Model setup (general non-realtime thread state)
    let mut model = Model {
        sample_rate: sample_rate,
        first_packet_timing: std::f64::MAX
    };

    let process = jack::ClosureProcessHandler::new(
        move |_: &jack::Client, ps: &jack::ProcessScope| -> jack::Control {
            // This gets called once for every block

            // Update resonant filter frequencies
            let res_freq = (((time_cursor as f64 / sample_rate as f64)).sin() * 0.5 + 0.5).powf(2.0) * 10000.0 + 200.0;
            for filter in res_filters.iter_mut() {
                filter.calculate_coefficients(sample_rate as f64, res_freq, 10.0);
            }

            // Get output buffer
            let out_l = out_port_l.as_mut_slice(ps);
            let out_r = out_port_r.as_mut_slice(ps);

            // Check for new event messages
            while let Ok(msg) = rx.try_recv() {
                // Add the EventMsg to the message queue
                event_queue.push(msg);
            }

            // Write output
            for (l, r) in out_l.iter_mut().zip(out_r.iter_mut()) {
                // Process the events
                for event in &mut event_queue {
                    if event.is_time(time_cursor) {
                        fm_synths[synth_index].freq = event.freq;
                        fm_synths[synth_index].m_ratio = (event.pid % 16) as f64;
                        fm_synths[synth_index].m_index = (event.cpu + 1) as f64;
                        fm_synths[synth_index].trigger(event.freq, trig_amp);
                        event.has_been_parsed = true;
                        synth_index = (synth_index + 1) % fm_synths.len();
                    }
                }
                event_queue.retain(|e| !e.has_been_parsed);

                let mut frame = [0.0; 2];
                for synth in &mut fm_synths {
                    let new_frame = synth.next_stereo();
                    frame[0] += new_frame[0];
                    frame[1] += new_frame[1];
                }
                // Mix in the drone
                let new_frame = drone.next_stereo();
                frame[0] += new_frame[0];
                frame[1] += new_frame[1];

                // Apply filters
                // frame[0] = hp_filters[0].next(frame[0]);
                // frame[1] = hp_filters[1].next(frame[1]);
                // frame[0] = lp_filters[0].next(frame[0]);
                // frame[1] = lp_filters[1].next(frame[1]);
                frame[0] = res_filters[0].next(frame[0]);
                frame[1] = res_filters[1].next(frame[1]);

                // Write the sound to the channel buffer
                *l = frame[0] as f32;
                *r = frame[1] as f32;
                time_cursor += 1;
            }

            for synth in &mut fm_synths {
                synth.control_rate_update();
            }

            // Continue as normal
            jack::Control::Continue
        },
    );

    // 4. activate the client
    let async_client = client.activate_async((), process).unwrap();
    // processing starts here

    // Get the system ports
    let system_ports = async_client.as_client().ports(
        Some("system:playback_.*"),
        None,
        jack::PortFlags::empty(),
    );

    // Connect outputs from this client to the system playback inputs
    for i in 0..output_port_names.len() {
        if i >= system_ports.len() {
            break;
        }
        match async_client
            .as_client()
            .connect_ports_by_name(&output_port_names[i], &system_ports[i])
        {
            Ok(_) => (),
            Err(e) => println!("Unable to connect to port with error {}", e),
        }
    }

    // Loop to receive OSC packets and send the relevant data on to the audio thread
    loop {
        update_osc(&mut receiver, &mut received_packets);
        process_packets(&mut received_packets, &mut model, &tx);
    }

    // 6. Optional deactivate. Not required since active_client will deactivate on
    // drop, though explicit deactivate may help you identify errors in
    // deactivate.
    async_client.deactivate().unwrap();
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

fn process_packets(received_packets: &mut Vec<Option<osc::Packet>>, model: &mut Model, tx: &crossbeam_channel::Sender<EventMsg>) {
    // The osc::Packet can be a bundle containing several messages. Therefore we can use into_msgs to get all of them.
    for packet in received_packets {
        let owned_packet = packet.take();
        // Each packet should only ever be parsed once. If the unwrap fails something is wrong.
        for message in owned_packet.expect("Each Packet should only be parsed once").into_msgs() {
            match message.addr.as_ref() {
                "/ftrace" => {
                    let mut msg = EventMsg {
                        timestamp: 0,
                        event_type: 0,
                        freq: 0.0,
                        has_been_parsed: false,
                        pid: 0,
                        cpu: 0,
                    };
                    if let Some(args) = message.args {
                        // Parse the arguments
                        for arg in args.iter().enumerate() {
                            match arg {
                                (0, osc::Type::Double(timestamp)) => {
                                    // Convert a microsecond timestamp into a sample based one
                                    // Set the first packet timing the first time a packet is received
                                    if model.first_packet_timing == std::f64::MAX {
                                        model.first_packet_timing = *timestamp;
                                    }
                                    // Convert wall-clock time to samples depending on sample rate
                                    let sample_ts: usize = ((*timestamp - model.first_packet_timing) / 1000000.0) as usize * model.sample_rate;
                                    let sample_ts = sample_ts; 
                                    msg.timestamp = sample_ts;
                                },
                                (1, osc::Type::String(event)) => {
                                    // The formula for calculating pitch is very important to the overall sound
                                    // Basing it on pitch in frequency leads to a noisier result
                                    // msg.freq = (((event.len() * 1157)) % 10000) as f64 + 100.0;
                                    // Different "generating" intervals can be used for very different sound
                                    // Pythagorean intervals such as a 3/2 or 9/8 seem to do well for a consonant sound
                                    msg.freq = degree_to_freq(((event.len() as f64 * 17.0) % (53.0 * 7.0)));
                                    msg.event_type = 0;
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
                        tx.send(msg).expect("Failed to send message to audio thread");
                    }
                },
                "/start_transmission" => {
                    // A new transmission has started, reset

                    // Set the first packet timing to the max value in order for it to be reset at the first ftrace event
                    model.first_packet_timing = std::f64::MAX;
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