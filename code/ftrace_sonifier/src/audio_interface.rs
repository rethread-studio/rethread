
use super::shared_wavetable_synth::SynthesisEngine;
use super::event_stats::{EventMsg, SynthesisType};
use crossbeam_channel::bounded;

struct LocalProcessHandler {
    out_port_l: jack::Port<jack::AudioOut>,
    out_port_r: jack::Port<jack::AudioOut>,
    synthesis_engine: SynthesisEngine,
    tick_msg_rx: crossbeam_channel::Receiver<EventMsg>,
    event_msg_rx: crossbeam_channel::Receiver<EventMsg>,
    sample_rate: usize,
    pub num_textures: usize,
    pub num_single_pitches: usize,
}

impl LocalProcessHandler {
    fn new(
        out_port_l: jack::Port<jack::AudioOut>,
        out_port_r: jack::Port<jack::AudioOut>,
        tick_msg_rx: crossbeam_channel::Receiver<EventMsg>,
        event_msg_rx: crossbeam_channel::Receiver<EventMsg>,
        sample_rate: usize,
    ) -> Self {
        let frequency = 50.0;
        // let mut fm_synth = FMSynth::new(sample_rate as f64, frequency, 1.0, 1.0, 2.5, 4.0);
        
        let synthesis_engine = SynthesisEngine::new(sample_rate as f64);
        let num_textures = synthesis_engine.num_textures();
        let num_single_pitches = synthesis_engine.num_single_pitches();

        LocalProcessHandler {
            out_port_l,
            out_port_r,
            synthesis_engine,
            tick_msg_rx,
            event_msg_rx,
            sample_rate,
            num_textures,
            num_single_pitches,
        }
    }
    fn parse_event_msg(&mut self, msg: EventMsg) {
        for synth in msg.synthesis_type {
            match synth {
                SynthesisType::Frequency{freq, amp, decay} => {
                    self.synthesis_engine.trigger_oscillator(freq, amp, decay);
                }
                SynthesisType::Bass{amp, decay, index} => {
                    self.synthesis_engine.trigger_bass(amp, decay, index);
                }
                SynthesisType::Texture{index, amp, decay} => {
                    self.synthesis_engine.trigger_texture(index, (msg.timestamp * 1000000.0) as usize, amp, decay);
                }
                SynthesisType::SinglePitch{index, energy} => {
                    self.synthesis_engine.add_energy_to_pitch(index, energy);
                }
                _ => ()
            }
        }
        
    }
}

impl jack::ProcessHandler for LocalProcessHandler {
    fn process(&mut self, _: &jack::Client, process_scope: &jack::ProcessScope) -> jack::Control {
        // Check for new EventMsg
        while let Ok(f) = self.event_msg_rx.try_recv() {
            self.parse_event_msg(f);            
        }
        while let Ok(f) = self.tick_msg_rx.try_recv() {
            self.parse_event_msg(f);            
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

pub struct AudioInterface {
    active_client: jack::AsyncClient<(), LocalProcessHandler>,
    out_port_names: Vec<String>,
    next_free_synth: usize,
    amp_changes: Vec<(usize, f32)>,
    freq_changes: Vec<(usize, f64)>,
    pub sample_rate: usize,
    pub num_textures: usize,
    pub num_single_pitches: usize,
}

impl AudioInterface {
    pub fn new(tick_msg_rx: crossbeam_channel::Receiver<EventMsg>, event_msg_rx: crossbeam_channel::Receiver<EventMsg>) -> Self {
        // 1. open a client
        let client_name = "rust_jack";
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
        let mut frequency = 220.0;
        let sample_rate = client.sample_rate();
        let frame_t = 1.0 / sample_rate as f64;
        let mut time = 0.0;

        // FMSynth setup

        let mut counter = 0;

        let process = LocalProcessHandler::new(out_port_l, out_port_r, tick_msg_rx, event_msg_rx, sample_rate);
        let num_textures = process.num_textures;
        let num_single_pitches = process.num_single_pitches;

        // 4. activate the client
        let active_client = client.activate_async((), process).unwrap();

        AudioInterface {
            active_client,
            out_port_names,
            next_free_synth: 0,
            amp_changes: vec![],
            freq_changes: vec![],
            sample_rate,
            num_textures,
            num_single_pitches,
        }
    }

    /// Connect to the standard system outputs in jack, system:playback_1 and system:playback_2
    /// It seems like this has to be done after the client is activated, doing it just after creating the ports doesn't work.
    pub fn connect_to_system(&mut self, offset: usize) {
        // Get the system ports
        let system_ports = self.active_client.as_client().ports(
            Some("system:playback_.*"),
            None,
            jack::PortFlags::empty(),
        );

        // Connect outputs from this client to the system playback inputs

        for i in 0..self.out_port_names.len() {
            if i >= system_ports.len() {
                break;
            }
            match self.active_client
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
            match self.active_client
                .as_client()
                .connect_ports_by_name(&self.out_port_names[i], &system_ports[i])
            {
                Ok(_) => (),
                Err(e) => println!("Unable to connect to port with error {}", e),
            }
        }
    }
}