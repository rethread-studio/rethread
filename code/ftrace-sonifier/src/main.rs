//! Sonifier for ftrace software trace

use nannou_osc as osc;

use std::sync::mpsc::channel;
use crossbeam_channel::bounded;
use std::collections::VecDeque;
extern crate jack;
extern crate sample;

use std::io;
use std::str::FromStr;

use sample::{signal, Signal};

const PORT: u16 = 12345;

// Scheduling model:
// How will the wall-clock timestamp be converted into a sample-based timestamp that the audio thread can use?
// Perhaps as simple as converting wall-clock time to samples and consider wall-clock 0 to equal 0 samples + constant 
// delay in order to have time to send the message before it is scheduled to be played.

// we modulo the schedule timestamp around this number not to risk accidental overflows
// The audio thread has to do the modulo at every increment of the sample counter clock
const SCHED_MAX: usize = 192000 * 60;

struct Model {
    sample_rate: usize,
    /// The timestamp of the first packet received
    first_packet_timing: f64,
}

/// The struct for an event sent from the receiving OSC thread to the audio processing thread
struct EventMsg {
    /// Timestamp in samples % SCHED_MAX for when this event should be played
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

#[derive(Copy, Clone)]
struct FMSynth {
    sample_rate: f64,
    freq: f64,
    m_ratio: f64,
    c_ratio: f64,
    m_index: f64,
    c_phase: f64,
    c_phase_step: f64,
    m_phase: f64,
    m_phase_step: f64,
    lfo_freq: f64,
    lfo_amp: f64,
    lfo_add: f64,
    lfo_phase: f64,
    amp: f64,
    number_of_triggers: f64,
}

impl FMSynth {
    fn new(sample_rate: f64, freq: f64, amp: f64, m_ratio: f64, c_ratio: f64, m_index: f64) -> Self {

        // let mod_freq = signal::gen(|| [freq * m_ratio]);
        // let modulator = signal::rate(sample_rate).hz(mod_freq).sine();
        // let car_freq = signal::gen(|| [freq * c_ratio]).add_amp(modulator);
        // let carrier = signal::rate(sample_rate).hz(car_freq).sine();

        let mut synth = FMSynth {
            sample_rate,
            freq,
            m_ratio,
            c_ratio,
            m_index,
            c_phase: 0.0,
            c_phase_step: 0.0,
            m_phase: 0.0,
            m_phase_step: 0.0,
            lfo_freq: 3.0,
            lfo_amp: 4.0,
            lfo_add: 5.0,
            lfo_phase: 0.0,
            amp,
            number_of_triggers: 0.0,
        };
        synth
    }
    fn next_stereo(&mut self) -> [f64; 2] {
        // LFO
        self.lfo_phase += (2.0 * std::f64::consts::PI * self.lfo_freq) / self.sample_rate;
        let lfo = self.lfo_phase.sin() * self.lfo_amp + self.lfo_add;
        self.m_index = lfo;

        // Modulator
        self.m_phase_step = (2.0 * std::f64::consts::PI * self.freq * self.m_ratio) / self.sample_rate;
        self.m_phase += self.m_phase_step;
        let m_sample = self.m_phase.sin() * self.freq * self.m_index;

        // Carrier
        // The frequency depends on the modulator so the phase step has to be calculated every step
        let c_freq = self.freq * self.c_ratio + m_sample;
        self.c_phase_step = (2.0 * std::f64::consts::PI * c_freq * self.c_ratio) / self.sample_rate;
        self.c_phase += self.c_phase_step;

        // The carrier output is the output of the synth
        let c_sample = self.c_phase.sin() * self.amp;

        // Reset number of triggers
        self.number_of_triggers = 0.0;
        
        [c_sample, c_sample]
    }
    fn set_freq(&mut self, freq: f64) {
        self.freq = freq;
    }
    fn control_rate_update(&mut self) {
        self.amp *= 0.92;
    }
    fn trigger(&mut self, freq: f64, amp: f64) {
        self.number_of_triggers += 1.0;
        // Set the new frequency
        // Set it so that it is an average of all triggers
        self.freq = (self.freq * (self.number_of_triggers-1.0)/self.number_of_triggers) + 
                    (freq * (1.0/self.number_of_triggers));
                    
        // Setting the amplitude triggers an attack
        self.amp = amp;
        // Reset all phases
        // self.lfo_phase = 0.0; // You may or may not want to reset the lfo phase based on how you use it
        // self.m_phase = 0.0;
        // self.c_phase = 0.0;
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
                *l = frame[0] as f32;
                *r = frame[1] as f32;
                time_cursor = (time_cursor + 1) % SCHED_MAX;
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
            if message.addr == "/ftrace" {
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
                                let sample_ts = sample_ts % SCHED_MAX;
                                msg.timestamp = sample_ts;
                            },
                            (1, osc::Type::String(event)) => {
                                // The formula for calculating pitch is very important to the overall sound
                                // Basing it on pitch in frequency leads to a noisier result
                                // msg.freq = (((event.len() * 1157)) % 10000) as f64 + 100.0;
                                // Different "generating" intervals can be used for very different sound
                                // Pythagorean intervals such as a 3/2 or 9/8 seem to do well for a consonant sound
                                msg.freq = degree_to_freq(((event.len() as f64 * 17.0) % (53.0 * 7.0)) + 53.0);
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