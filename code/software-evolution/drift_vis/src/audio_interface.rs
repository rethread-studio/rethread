use std::{
    path::Path,
    time::{Duration, Instant},
};

use biquad::{Biquad, Coefficients, ToHertz};
use crossbeam_channel::bounded;
use erael_dsp::dsp::{BufReader, Buffer, LocalSig, Resources};
use erael_dsp::synthesis_node::SynthesisNode;
use erael_dsp::wave_guide;
use erael_dsp::wave_guide::WaveGuide;
use erael_dsp::Sample;
use slotmap::{DefaultKey, HopSlotMap};

const NUM_WAVEGUIDES: usize = 4;

// TODO: Switch to using the basedrop crate instead of crossbeam

/// Contains the callback function `process` that jack calls to generate the
/// audio samples for a given block.
struct LocalProcessHandler {
    out_port_l: jack::Port<jack::AudioOut>,
    out_port_r: jack::Port<jack::AudioOut>,
    synthesis_engine: SynthesisEngine,
    helper_rx: crossbeam_channel::Receiver<EventMsg>,
    helper_tx: crossbeam_channel::Sender<EventMsg>,
    sample_rate: usize,
}

impl LocalProcessHandler {
    fn new(
        out_port_l: jack::Port<jack::AudioOut>,
        out_port_r: jack::Port<jack::AudioOut>,
        helper_rx: crossbeam_channel::Receiver<EventMsg>,
        helper_tx: crossbeam_channel::Sender<EventMsg>,
        sample_rate: usize,
    ) -> Self {
        let frequency = 50.0;
        // let mut fm_synth = FMSynth::new(sample_rate as f64, frequency, 1.0, 1.0, 2.5, 4.0);

        let synthesis_engine = SynthesisEngine::new(sample_rate as Sample);

        LocalProcessHandler {
            out_port_l,
            out_port_r,
            synthesis_engine,
            helper_rx,
            helper_tx,
            sample_rate,
        }
    }
    fn parse_event_msg(&mut self, msg: &mut EventMsg) {
        match msg {
            EventMsg::StringMsg(_) => {}
            EventMsg::Set { index, parameter } => {
                self.synthesis_engine.set_wave_guide(*index, parameter);
            }
            EventMsg::AddSynthesisNode(synthesis_node) => {
                self.synthesis_engine
                    .synthesis_nodes
                    .insert(synthesis_node.take().unwrap());
            }
            EventMsg::DeallocateSynthesisNode(_) => (),
            // This event should never end up here
            EventMsg::Schedule { event_msg, dur } => {
                eprintln!("Error: EventMsg::Schedule on the audio thread.")
            }
        }
    }
}

impl jack::ProcessHandler for LocalProcessHandler {
    fn process(&mut self, _: &jack::Client, process_scope: &jack::ProcessScope) -> jack::Control {
        // Check for new EventMsg
        while let Ok(mut f) = self.helper_rx.try_recv() {
            self.parse_event_msg(&mut f);
            self.helper_tx.send(f).unwrap(); // Send the message back from the audio thread to avoid deallocating on the audio thread
        }
        // Get output buffer
        let out_l = self.out_port_l.as_mut_slice(process_scope);
        let out_r = self.out_port_r.as_mut_slice(process_scope);

        // Write output
        for (l, r) in out_l.iter_mut().zip(out_r.iter_mut()) {
            let mut frame = [0.0; 2];

            let new_frame = self.synthesis_engine.next();
            frame[0] += new_frame[0];
            frame[1] += new_frame[1];

            // Write the sound to the channel buffer
            *l = frame[0] as f32;
            *r = frame[1] as f32;
        }

        // self.fm_synth.control_rate_update();

        // Continue as normal
        jack::Control::Continue
    }
}

/// The outside reference to an audio interface. This struct sets up the audio
/// interface and the sound synthesis engine as well as a helper thread that
/// allows message passing and safe allocation/deallocation away from the audio
/// thread.
pub struct AudioInterface {
    active_client: jack::AsyncClient<(), LocalProcessHandler>,
    out_port_names: Vec<String>,
    pub sample_rate: usize,
    event_msg_tx: crossbeam_channel::Sender<EventMsg>,
}

impl AudioInterface {
    pub fn new() -> Self {
        // 1. open a client
        let client_name = "bot_trace_sonifier";
        let (client, _status) =
            jack::Client::new(client_name, jack::ClientOptions::NO_START_SERVER).unwrap();

        // 2. register port
        let mut out_port_l = client
            .register_port("out_l", jack::AudioOut::default())
            .unwrap();
        let mut out_port_r = client
            .register_port("out_r", jack::AudioOut::default())
            .unwrap();

        // The ports are consumed when starting the client, but we want to keep their names in order to connect them to inputs later
        let mut out_port_names = vec![];
        out_port_names.push(String::from(out_port_l.name().unwrap()));
        out_port_names.push(String::from(out_port_r.name().unwrap()));

        // 3. define process callback handler
        let sample_rate = client.sample_rate();

        // Channels between the application and the helper thread
        let (event_msg_tx, event_msg_rx) = bounded(1_000_000);
        // Channels between the audio thread and the helper thread
        let (audio_thread_tx, helper_rx) = bounded(1_000_000);
        let (helper_tx, audio_thread_rx) = bounded(1_000_000);

        let process =
            LocalProcessHandler::new(out_port_l, out_port_r, helper_rx, helper_tx, sample_rate);

        // Set up helper thread that does any allocation/deallocation needed for the synthesis engine while it's running.
        std::thread::spawn(move || helper_thread(event_msg_rx, audio_thread_tx, audio_thread_rx));

        // 4. activate the client
        let active_client = client.activate_async((), process).unwrap();

        AudioInterface {
            active_client,
            out_port_names,
            sample_rate,
            event_msg_tx,
        }
    }

    /// Connect to the standard system outputs in jack, system:playback_1 and
    /// system:playback_2 It seems like this has to be done after the client is
    /// activated, doing it just after creating the ports doesn't work.
    pub fn connect_to_system(&mut self, offset: usize) {
        // Get the system ports
        let system_ports = self.active_client.as_client().ports(
            Some("system:playback_.*"),
            None,
            jack::PortFlags::empty(),
        );

        // Connect outputs from this client to the system playback inputs

        for i in 0..self.out_port_names.len() {
            if i + offset >= system_ports.len() {
                println!("Unable to connect to port {}, it doesn't exist", i + offset);
                break;
            }
            match self
                .active_client
                .as_client()
                .connect_ports_by_name(&self.out_port_names[i], &system_ports[i + offset])
            {
                Ok(_) => (),
                Err(e) => println!("Unable to connect to port with error {}", e),
            }
        }
    }

    pub fn connect_to_calf(&mut self, effect: &str) {
        // Get the system ports
        let system_ports = self.active_client.as_client().ports(
            Some(&format!("Calf Studio Gear:{} .*", effect)),
            None,
            jack::PortFlags::empty(),
        );

        // Connect outputs from this client to the system playback inputs

        for i in 0..self.out_port_names.len() {
            if i >= system_ports.len() {
                break;
            }
            match self
                .active_client
                .as_client()
                .connect_ports_by_name(&self.out_port_names[i], &system_ports[i])
            {
                Ok(_) => (),
                Err(e) => println!("Unable to connect to port with error {}", e),
            }
        }
    }

    /// Send an EventMsg from the application to the helper thread
    pub fn send(&mut self, event_msg: EventMsg) {
        self.event_msg_tx.send(event_msg).unwrap();
    }
    pub fn schedule(&mut self, event_msg: EventMsg, dur: Duration) {
        self.event_msg_tx
            .send(EventMsg::Schedule {
                event_msg: Box::new(event_msg),
                dur,
            })
            .unwrap();
    }
}

pub struct SynthesisEngine {
    // TODO: switch to slotmap
    pub synthesis_nodes: HopSlotMap<DefaultKey, SynthesisNode>, // include a closure
    deallocation_keys: Vec<DefaultKey>,
    wave_guides: Vec<WaveGuide>,
    current_wave_guide: usize,
    resources: Resources,
    sample_rate: Sample,
    output_frame: [Sample; 2],
    dc_blockers: [biquad::DirectForm1<f32>; 2],
}

impl SynthesisEngine {
    pub fn new(sample_rate: Sample) -> Self {
        let dc_blocker_coeffs = Coefficients::<f32>::from_params(
            biquad::Type::HighPass,
            sample_rate.hz(),
            30.hz(),
            biquad::Q_BUTTERWORTH_F32,
        )
        .unwrap();
        let dc_blocker = biquad::DirectForm1::<f32>::new(dc_blocker_coeffs);
        let mut resources = Resources::new(sample_rate);
        // Load all the buffers we want into resources
        // let buf_path = Path::new("/home/erik/Dokument/KTH/software_evolution/js indentation sonification/raw_bufs/bing01-12-2020_16_06.wav");
        // //let buf_path = Path::new("/home/erik/Musik/06. Displaced.wav");
        // let buf_i = resources
        //     .push_buffer(Buffer::from_file(buf_path))
        //     .expect("Failed to push buffer into resources");

        // let buf_i = resources
        //     .push_buffer(Buffer::from_file(Path::new(
        //         "/home/erik/Musik/sounds/127751__149203__hammer-17-16bit_mono.wav",
        //     )))
        //     .expect("Failed to push buffer into resources");
        // let buf_i = resources
        //     .push_buffer(Buffer::from_file(Path::new(
        //         "/home/erik/Musik/sounds/148773__daphne-in-wonderland__piano-pedal-sustain-2_mono.wav",
        //     )))
        //     .expect("Failed to push buffer into resources");
        let wave_guides = vec![WaveGuide::new(sample_rate); NUM_WAVEGUIDES];
        Self {
            synthesis_nodes: HopSlotMap::with_capacity(1000),
            deallocation_keys: Vec::with_capacity(1000),
            wave_guides,
            current_wave_guide: 0,
            resources,
            sample_rate,
            output_frame: [0.0; 2],
            dc_blockers: [dc_blocker; 2],
        }
    }
    pub fn next(&mut self) -> [Sample; 2] {
        // Reset the output to 0.0
        let mut amp = 0.0;
        for sample in self.output_frame.iter_mut() {
            *sample = 0.0;
        }

        for wg in &mut self.wave_guides {
            amp += wg.next(&mut self.resources);
        }

        // Add synthesis nodes to output:

        for (key, sn) in self.synthesis_nodes.iter_mut() {
            sn.process(&mut self.resources, &mut self.output_frame);
            if sn.has_finished() {
                // TODO: Deallocate safely
                self.deallocation_keys.push(key);
            }
        }

        // Deallocate the finished synthesis nodes
        for key in &self.deallocation_keys {
            self.synthesis_nodes.remove(*key);
        }
        self.deallocation_keys.clear();

        self.output_frame[0] += amp;
        self.output_frame[1] += amp;

        // Block DC
        self.output_frame[0] = self.dc_blockers[0].run(self.output_frame[0]);
        self.output_frame[1] = self.dc_blockers[1].run(self.output_frame[1]);

        // Brickwall limit/clamp
        self.output_frame[0] = self.output_frame[0].clamp(-1.0, 1.0);
        self.output_frame[1] = self.output_frame[1].clamp(-1.0, 1.0);
        self.output_frame
    }

    pub fn set_wave_guide(&mut self, index: usize, parameter_change: &mut ParameterChange) {
        // let index = self.current_wave_guide;
        match parameter_change {
            ParameterChange::Float { name, value } => {
                match name.as_str() {
                    "feedback_lp_filter_freq" => {
                        for wg in &mut self.wave_guides {
                            wg.feedback_filter_freq(*value);
                        }
                    }
                    "feedback_lp_filter_level" => {
                        for wg in &mut self.wave_guides {
                            wg.lp_level(*value);
                        }
                    }
                    "feedback_bp_filter_freq" => {
                        for wg in &mut self.wave_guides {
                            wg.feedback_bp_filter_freq(*value);
                        }
                    }
                    "feedback_bp_filter_level" => {
                        for wg in &mut self.wave_guides {
                            wg.bp_level(*value);
                        }
                    }
                    "exciter_filter_freq" => {
                        for wg in &mut self.wave_guides {
                            wg.exciter_filter_freq(*value);
                        }
                    }
                    "exciter_attack" => {
                        for wg in &mut self.wave_guides {
                            wg.exciter_attack(*value as f64);
                        }
                    }
                    "exciter_release" => {
                        for wg in &mut self.wave_guides {
                            wg.exciter_release(*value as f64);
                        }
                    }
                    "feedback_level" => {
                        for wg in &mut self.wave_guides {
                            wg.feedback_level(*value);
                        }
                    }
                    "start" => {
                        self.wave_guides[self.current_wave_guide].release();
                        // increase voice pointer
                        self.current_wave_guide =
                            (self.current_wave_guide + 1) % self.wave_guides.len();
                        self.wave_guides[self.current_wave_guide].start(*value);
                    }
                    _ => {
                        eprintln!("Received unknown command: {}", name);
                    }
                }
            }
            ParameterChange::EnableDCBlocker(state) => {
                for wg in &mut self.wave_guides {
                    wg.set_dc_blocker(*state);
                }
            }
            ParameterChange::EnableBPFilter(state) => {
                for wg in &mut self.wave_guides {
                    wg.set_bp_filter(*state);
                }
            }
            // TODO: This might be allocating/deallocating
            ParameterChange::ReplaceExciter(exciter) => {
                // Put the old exciter into this ParameterChange message for deallocation
                let taken_exciter = exciter.take();
                if let Some(e) = taken_exciter {
                    let old_exciter = self.wave_guides[index].replace_exciter(e);
                    *exciter = Some(old_exciter);
                }
            }
        }
    }
}

pub enum EventMsg {
    StringMsg(String),
    Set {
        index: usize,
        parameter: ParameterChange,
    },
    AddSynthesisNode(Option<SynthesisNode>),
    DeallocateSynthesisNode(Option<SynthesisNode>),
    // Tell the helper thread to send the EventMsg when some time has passed
    Schedule {
        event_msg: Box<EventMsg>,
        dur: Duration,
    },
}

// TODO: Change into enum with all parameter changes for the wave guide (contained in the wave_guide module). That way, different parameters can have different parameter types. Even better would be a macro that automatically generates this from setter functions or something like that...
pub enum ParameterChange {
    Float { name: String, value: Sample },
    EnableDCBlocker(bool),
    EnableBPFilter(bool),
    ReplaceExciter(Option<wave_guide::Exciter>),
}

struct Trigger {
    interval: Duration,
    counter: Duration,
}

impl Trigger {
    pub fn from_interval(interval: Duration) -> Self {
        Self {
            interval,
            counter: Duration::from_secs(0),
        }
    }
    pub fn set_interval(&mut self, interval: Duration) {
        self.interval = interval;
    }
    /// Adds the time delta to the counter and returns true if it triggers
    pub fn add_delta_and_trigger(&mut self, delta: Duration) -> bool {
        self.counter += delta;
        if self.counter >= self.interval {
            self.counter -= self.interval;
            true
        } else {
            false
        }
    }
}

fn helper_thread(
    event_msg_rx: crossbeam_channel::Receiver<EventMsg>,
    audio_thread_tx: crossbeam_channel::Sender<EventMsg>,
    audio_thread_rx: crossbeam_channel::Receiver<EventMsg>,
) {
    let mut note_trigger = Trigger::from_interval(Duration::from_millis(200));
    let mut message_queue: Vec<(EventMsg, Duration)> = Vec::with_capacity(1000);
    let zero_dur = Duration::from_millis(0);

    let mut last_iteration = Instant::now();
    loop {
        let now = Instant::now();
        let delta = now - last_iteration;
        last_iteration = now;

        // Handle queued messages
        // Note: This can be made faster and more elegant using
        // Vec::drain_filter, but that is nightly only
        // This explicit indexing is necessary because the length of
        // the Vec will change during iteration.
        let mut i = 0;
        while i < message_queue.len() {
            let sub_result = message_queue[i].1.checked_sub(delta);

            if sub_result.is_none() {
                // It's time to send the message
                let (event_msg, dur) = message_queue.remove(i);
                audio_thread_tx.send(event_msg).unwrap();
            } else {
                message_queue[i].1 = sub_result.unwrap_or(zero_dur.clone());
                i += 1;
            }
        }

        while let Ok(event_msg) = audio_thread_rx.try_recv() {
            // In the future we'll probably want to do expensive operations such as coeffidient
            // calculations here
            // For now, just drop (potentially deallocating) the message
        }
        while let Ok(event_msg) = event_msg_rx.try_recv() {
            // In the future we might want to catch certain messages and convert them to other more efficient messages here.

            match event_msg {
                // If it's a scheduled message, add it to the queue
                // Dereferencing a Box gives the value
                EventMsg::Schedule { event_msg, dur } => message_queue.push((*event_msg, dur)),
                _ => audio_thread_tx.send(event_msg).unwrap(),
            }
        }
        // Sleep for a while to avoid maxing out the cpu
        std::thread::sleep(Duration::from_micros(50));
    }
}
