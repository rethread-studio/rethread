use std::{
    collections::HashMap,
    sync::{atomic::AtomicBool, Arc, Mutex},
};

use color_eyre::eyre::Result;
use knyst::{graph::SimultaneousChanges, prelude::*};
use knyst_waveguide::{
    interface::{
        ContinuousWaveguide, MultiVoiceTriggeredSynth, NoteOpt, PluckedWaveguide, SustainedSynth,
        Synth,
    },
    OnePoleLPF,
};

mod asm_data;

fn main() -> Result<()> {
    color_eyre::install()?;
    let mut backend = knyst::audio_backend::JackBackend::new("knyst_waveguide_syscalls")?;

    let sample_rate = backend.sample_rate() as f32;
    let block_size = backend.block_size().unwrap_or(64);
    println!("sr: {sample_rate}, block: {block_size}");
    let resources = Resources::new(ResourcesSettings::default());
    let graph: Graph = Graph::new(GraphSettings {
        block_size,
        sample_rate,
        // In JACK we can decide ourselves how many outputs and inputs we want
        num_inputs: 1,
        num_outputs: 16,
        ring_buffer_size: 40000,
        max_node_inputs: 10,
        num_nodes: 2000,
        ..Default::default()
    });
    let stop = Arc::new(AtomicBool::new(false));
    let stop_message = Arc::new(Mutex::new(String::from("Bye!")));
    // `start_processing` is starting a Controller on a separate thread by
    // default. If you want to handle when the Controller updates manually you
    // can use `start_processing_retyrn_controller` instead
    let mut k = {
        let stop = stop.clone();
        let stop_message = stop_message.clone();
        backend.start_processing(graph, resources, RunGraphSettings::default(), move |e| {
            eprintln!("!! Error:{e:?}");
            // *stop_message.lock().unwrap() = format!("{e:?}");
            // stop.store(true, std::sync::atomic::Ordering::SeqCst);
        })?
    };
    let mut sonifier = Sonifier::new(&mut k);

    // Load assembly data

    Ok(())
}

struct Sonifier {
    plucked_wg: MultiVoiceTriggeredSynth<PluckedWaveguide>,
    continuous_wgs: HashMap<String, Waveguide>,
    post_fx: NodeAddress,
    lpf: NodeAddress,
    k: KnystCommands,
}
impl Sonifier {
    pub fn new(k: &mut KnystCommands) -> Self {
        let mut k = k.clone();
        let amp = 1.0;
        let plucked_wg = PluckedWaveguide::voices(&mut k, 5, true);
        let post_fx = k.push(
            gen(move |ctx, _| {
                let inp = ctx.inputs.get_channel(0);
                let out = ctx.outputs.iter_mut().next().unwrap();
                for (i, o) in inp.iter().zip(out.iter_mut()) {
                    *o = (i * 0.1 * amp).clamp(-1.0, 1.0);
                }
                // dbg!(&inp);
                GenState::Continue
            })
            .input("in")
            .output("sig"),
            inputs![],
        );
        for out in plucked_wg.outputs() {
            k.connect(out.to_node(&post_fx));
        }
        let lpf = k.push(
            OnePoleLPF::new(),
            inputs![("sig" ; post_fx.out(0)), ("cutoff_freq" : 20000.)],
        );
        k.connect(lpf.to_graph_out().channels(4).to_channel(12));
        Self {
            plucked_wg,
            continuous_wgs: HashMap::new(),
            post_fx,
            lpf,
            k,
        }
    }
}

struct Waveguide {
    wg: ContinuousWaveguide,
    exciter: NodeAddress,
    lpf: NodeAddress,
    lpf_freq: f32,
    lpf_phase: f32,
    exciter_sender: rtrb::Producer<f32>,
    accumulator: f32,
    coeff: f32,
    iterations_since_trigger: usize,
    average_iterations_since_trigger: f32,
    block_counter: usize,
}

impl Waveguide {
    pub fn new(
        wg: ContinuousWaveguide,
        exciter: NodeAddress,
        lpf: NodeAddress,
        lpf_phase: f32,
        exciter_sender: rtrb::Producer<f32>,
    ) -> Self {
        Self {
            wg,
            exciter,
            exciter_sender,
            lpf,
            lpf_phase,
            lpf_freq: 20000.,
            accumulator: 0.0,
            coeff: 1.0,
            iterations_since_trigger: 1000,
            average_iterations_since_trigger: 1000.,
            block_counter: 0,
        }
    }
    fn register_call(&mut self, coeff_mod: f32, id: i32, args: [i32; 3]) {
        self.accumulator += id as f32 * self.coeff * coeff_mod;
        self.accumulator += self.coeff;
    }
    fn set_freq(&mut self, freq: f32, changes: &mut SimultaneousChanges) {
        self.wg.change(
            NoteOpt {
                freq: Some(freq),
                ..Default::default()
            },
            changes,
        );
    }
    fn update(&mut self, coeff_mod: f32, k: &mut KnystCommands) {
        if !self.exciter_sender.is_full() {
            // if self.accumulator > 500. {
            //     self.coeff *= 0.9;
            // }
            // if self.accumulator < 10.0 {
            //     self.coeff *= 1.00001;
            // }
            // self.coeff = self.coeff.clamp(0.0001, 2.0);
            let mut changes = SimultaneousChanges::now();
            if self.accumulator > 300. {
                self.exciter_sender.push(self.accumulator).unwrap();
                self.accumulator = 0.0;
                self.average_iterations_since_trigger = self.average_iterations_since_trigger * 0.9
                    + self.iterations_since_trigger as f32 * 0.1;
                if self.iterations_since_trigger < (48000 / 20) {
                    self.coeff *= 0.99;
                }
                let feedback = 0.999
                    + (self.average_iterations_since_trigger as f32 * 0.00001).clamp(0.0, 0.5);
                self.wg.change(
                    NoteOpt {
                        amp: Some(0.1),
                        feedback: Some(feedback),
                        ..Default::default()
                    },
                    &mut changes,
                );
                self.iterations_since_trigger = 0;
            } else {
                self.exciter_sender.push(0.0).unwrap();
                self.iterations_since_trigger += 1;
            }
            if self.iterations_since_trigger == 2000 {
                let feedback = 0.999;
                self.wg.change(
                    NoteOpt {
                        amp: Some(0.5),
                        feedback: Some(feedback),
                        ..Default::default()
                    },
                    &mut changes,
                );
            }
            if self.block_counter >= 128 {
                self.lpf_phase = (self.lpf_phase + 0.001) % 6.28;
                self.lpf_freq = self.lpf_phase.sin() * 9000. + 9100.;
                changes.push(self.lpf.change().set("cutoff_freq", self.lpf_freq));
                self.block_counter = 0;
            }
            self.block_counter += 1;
            k.schedule_changes(changes);
        }
    }
    fn free(self, k: &mut KnystCommands) {
        k.free_node(self.exciter);
        self.wg.free(k);
    }
}
