use std::collections::HashMap;
use std::time::{Duration, Instant};

use enum_iterator::cardinality;
use knyst::controller::KnystCommands;
use knyst::graph::{NodeAddress, SimultaneousChanges};
use knyst::prelude::*;
use knyst_waveguide::interface::{ContinuousWaveguide, NoteOpt, SustainedSynth, Synth};
use knyst_waveguide::OnePoleLPF;
use nannou_osc::Connected;
use rtrb::Producer;
use syscalls_shared::SyscallKind;

use crate::{to_freq53, Sonifier};

pub struct DirectCategories {
    continuous_wgs: HashMap<String, SyscallWaveguide>,
    post_fx: NodeAddress,
    sample_duration: Duration,
    last_sample: Instant,
    decrese_sensitivity: Option<f32>,
    block_sender: Producer<f32>,
    block_counter: NodeAddress,
    coeff_mod: f32,
    k: KnystCommands,
}

impl DirectCategories {
    pub fn new(k: &mut KnystCommands, sample_rate: f32) -> Self {
        println!("Creating DirectCategories");
        // This Gen has as only function to communicate when a block has passed on the audio thread
        let (mut block_sender, mut block_receiver) =
            rtrb::RingBuffer::<f32>::new((sample_rate * 0.3) as usize);
        let block_counter = k.push(
            gen(move |ctx, _| {
                let out_buf = ctx.outputs.iter_mut().next().unwrap();
                for o in out_buf.iter_mut() {
                    block_receiver.pop().unwrap_or(0.0);
                    *o = 0.0;
                }
                GenState::Continue
            })
            .output("out"),
            inputs![],
        );
        // Connect to graph out to avoid it being automatically removed
        k.connect(block_counter.to_graph_out());

        let post_fx = k.push(
            gen(|ctx, _| {
                let inp = ctx.inputs.get_channel(0);
                let out = ctx.outputs.iter_mut().next().unwrap();
                for (i, o) in inp.iter().zip(out.iter_mut()) {
                    *o = (i * 0.1).clamp(-1.0, 1.0);
                }
                // dbg!(&inp);
                GenState::Continue
            })
            .input("in")
            .output("sig"),
            inputs![],
        );
        k.connect(post_fx.to_graph_out().channels(4).to_channel(12));

        let mut continuous_wgs = HashMap::new();
        let phase_per_i = 6.28 / cardinality::<SyscallKind>() as f32;
        for (i, syscall_kind) in enum_iterator::all::<SyscallKind>().enumerate() {
            let kind_label = format!("{syscall_kind:?}");

            let (mut sender, mut receiver) =
                rtrb::RingBuffer::<f32>::new((sample_rate * 0.3) as usize);
            for _i in 0..(sample_rate * 0.05) as usize {
                sender.push(0.0).ok();
            }
            let mut value = 0.0;
            let exciter_sig = k.push(
                gen(move |ctx, _| {
                    let in_buf = ctx.inputs.get_channel(0);
                    let out_buf = ctx.outputs.iter_mut().next().unwrap();
                    for (i, o) in in_buf.iter().zip(out_buf.iter_mut()) {
                        let new_value =
                            (receiver.pop().unwrap_or(0.0).clamp(0.0, 500.0) / 500.0).powf(0.125);
                        if value < 0.001 {
                            value += new_value;
                        }
                        value = value.clamp(-1.0, 1.0);
                        *o = value + i;
                        value *= 0.5;
                    }
                    GenState::Continue
                })
                .output("out")
                .input("in"),
                inputs![],
            );
            let mut continuous_wg = ContinuousWaveguide::new(k);
            k.connect(
                exciter_sig
                    .to(continuous_wg.exciter_bus_input())
                    .from_channel(0)
                    .to_channel(0),
            );
            k.connect(Connection::graph_input(&exciter_sig));
            // let sine = k.push(WavetableOscillatorOwned::new(Wavetable::sine()), inputs![]);
            let lpf = k.push(OnePoleLPF::new(), inputs![("cutoff_freq" : 20000.)]);
            k.connect(lpf.to(&post_fx));
            for out in continuous_wg.outputs() {
                k.connect(out.to_node(&lpf));
            }
            let mut changes = SimultaneousChanges::duration_from_now(Duration::ZERO);
            // let to_freq53 = |degree, root| 2.0_f32.powf(degree as f32 / 53.) * root;
            let scale = [0, 17, 31, 48, 53, 53 + 26, 53 + 31];
            let wrap_interval = 53;
            // let freq = 25. * (i + 1).pow(2) as f32;
            let freq = to_freq53(
                scale[i % scale.len()] + wrap_interval * (i / scale.len()) as i32,
                110.,
            );
            continuous_wg.change(
                NoteOpt {
                    freq: Some(freq),
                    amp: Some(1.0),
                    // damping: freq * 7.0,
                    damping: Some(1000. + freq * 4.0),
                    feedback: Some(0.99999 * 1.01),
                    stiffness: Some(0.),
                    hpf: Some(10.),
                    exciter_lpf: Some(2000.),
                    position: Some(0.25),
                },
                &mut changes,
            );
            k.schedule_changes(changes);
            let syscall_waveguide = SyscallWaveguide::new(
                continuous_wg,
                exciter_sig,
                lpf,
                phase_per_i * i as f32,
                sender,
            );
            continuous_wgs.insert(kind_label, syscall_waveguide);
        }

        // let to_freq53 = |degree| 2.0_f32.powf(degree as f32 / 53.) * 220.0;

        let sample_duration = Duration::from_secs_f64(1.0 / sample_rate as f64);
        Self {
            continuous_wgs,
            post_fx,
            k: k.clone(),
            last_sample: Instant::now(),
            sample_duration,
            coeff_mod: 1.0,
            decrese_sensitivity: Some(0.999),
            block_sender,
            block_counter,
        }
    }
}

impl Sonifier for DirectCategories {
    fn apply_osc_message(&mut self, m: nannou_osc::Message) {
        if m.addr == "/syscall" {
            let mut args = m.args.unwrap().into_iter();
            let id = args.next().unwrap().int().unwrap();
            let kind = args.next().unwrap().string().unwrap();
            let mut func_args = [0_i32; 3];
            func_args[0] = args.next().unwrap().int().unwrap();
            func_args[1] = args.next().unwrap().int().unwrap();
            func_args[2] = args.next().unwrap().int().unwrap();
            if let Some(swg) = self.continuous_wgs.get_mut(&kind) {
                swg.register_call(self.coeff_mod, id, func_args);
            }
        }
    }

    fn update(&mut self, osc_sender: &mut nannou_osc::Sender<Connected>) {
        for swg in self.continuous_wgs.values_mut() {
            swg.update(self.coeff_mod, &mut self.k);
        }
        if !self.block_sender.is_full() {
            self.block_sender.push(0.).unwrap();
            if let Some(coeff_mod_decrease) = self.decrese_sensitivity {
                self.coeff_mod *= coeff_mod_decrease;
            }
        }
    }

    fn patch_to_fx_chain(&mut self, fx_chain: usize) {
        self.k
            .connect(Connection::clear_to_graph_outputs(&self.post_fx));
        self.k.connect(
            self.post_fx
                .to_graph_out()
                .channels(4)
                .to_channel(fx_chain * 4),
        );
    }

    fn free(&mut self) {
        for (_kind, wg) in self.continuous_wgs.drain() {
            wg.free(&mut self.k);
        }
        self.k.free_node(self.post_fx.clone());
        self.k.free_node(self.block_counter.clone());
    }

    fn change_harmony(&mut self, scale: &[i32], root: f32) {
        let mut changes = SimultaneousChanges::duration_from_now(Duration::ZERO);
        for (i, syscall_kind) in enum_iterator::all::<SyscallKind>().enumerate() {
            let freq = to_freq53(
                scale[i % scale.len()] + 53 * (i / scale.len()) as i32,
                root * 4.0,
            );
            self.continuous_wgs
                .get_mut(&format!("{:?}", syscall_kind))
                .unwrap()
                .set_freq(freq, &mut changes);
        }
        self.k.schedule_changes(changes);
    }
}

struct SyscallWaveguide {
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

impl SyscallWaveguide {
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
