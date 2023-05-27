// Vary parameters:
// - Trigger timings
// - amplitude falloff
// - damping (creates a steady chord at high cutoff frequency)
//
// Fix: noise in exciter
use std::collections::HashMap;
use std::iter::repeat;
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use knyst::controller::KnystCommands;
use knyst::delay::SampleDelay;
use knyst::envelope::{Envelope, SustainMode};
use knyst::graph::{NodeAddress, NodeChanges, SimultaneousChanges};
use knyst::prelude::*;
use knyst::time::Superseconds;
use knyst::trig::IntervalTrig;
use knyst::wavetable::WavetableOscillatorOwned;
use knyst::*;
use knyst_waveguide::interface::{
    ContinuousWaveguide, MultiVoiceTriggeredSynth, Note, NoteOpt, PluckedWaveguide,
    PluckedWaveguideSettings, SustainedSynth, Synth, TriggeredSynth,
};
use knyst_waveguide::{HalfSineImpulse, OnePole, OnePoleHPF, OnePoleLPF, XorNoise};

use anyhow::Result;
use nannou_osc::receiver;
use rand::rngs::ThreadRng;
use rand::seq::SliceRandom;
use rand::{thread_rng, Rng};
use rtrb::Producer;
use syscalls_shared::SyscallKind;

use crate::Sonifier;
const SCALE: [i32; 7] = [0 + 5, 17 + 5, 31 + 5, 44 + 5, 53 + 5, 62 + 5, 53 + 17 + 5];

pub struct QuantisedCategories {
    continuous_wgs: HashMap<String, SyscallKindQuantisedWaveguide>,
    post_fx: NodeAddress,
    sender: Producer<f32>,
    k: KnystCommands,
}
impl QuantisedCategories {
    pub fn new(k: &mut KnystCommands, sample_rate: f32) -> Self {
        let to_freq53 = |degree, root| 2.0_f32.powf(degree as f32 / 53.) * root;

        let (mut sender, mut receiver) = rtrb::RingBuffer::<f32>::new(16);
        for _ in 0..16 {
            sender.push(0.0).unwrap();
        }

        let post_fx = k.push(
            gen(move |ctx, _| {
                receiver.pop().unwrap();
                let in0 = ctx.inputs.get_channel(0);
                let in1 = ctx.inputs.get_channel(1);
                let mut outputs = ctx.outputs.iter_mut();
                let out0 = outputs.next().unwrap();
                let out1 = outputs.next().unwrap();
                for (((i0, i1), o0), o1) in in0
                    .iter()
                    .zip(in1)
                    .zip(out0.iter_mut())
                    .zip(out1.iter_mut())
                {
                    *o0 = (i0 * 0.5).clamp(-1.0, 1.0);
                    *o1 = (i1 * 0.5).clamp(-1.0, 1.0);
                }
                // dbg!(&inp);
                GenState::Continue
            })
            .input("in_left")
            .input("in_right")
            .output("sig_left")
            .output("sig_right"),
            inputs![],
        );
        k.connect(post_fx.to_graph_out().channels(2).to_channel(4));

        // let scale = [-53, 0, 9, 13, 31, 36, 44];
        // let scale = [0, 9, 14, 31, 36, 45];
        // let scale = [0, 14, 31, 36, 45];
        // let scale = [0, 17, 31, 48, 53, 53 + 26, 53 + 31];
        // let scale = [0, 17, 31, 44, 53, 62, 53 + 17].map(|v| v + 5);
        // let scale = [0, 9, 17, 31, 39, 48];
        // let scale = [0, 9, 17, 31, 39, 48, 53];
        let wrap_interval = 53;
        // let wrap_interval = 53 + 14;
        // let wrap_interval = 62;

        let mut continuous_wgs = HashMap::new();
        let num_syscall_kinds = enum_iterator::all::<SyscallKind>()
            .collect::<Vec<_>>()
            .len() as f32;
        for (i, syscall_kind) in enum_iterator::all::<SyscallKind>().enumerate() {
            let kind_label = format!("{syscall_kind:?}");
            let freq = to_freq53(
                SCALE[i % SCALE.len()] + wrap_interval * (i / SCALE.len()) as i32,
                110.,
            );
            let (mut sender, mut receiver) =
                rtrb::RingBuffer::<f32>::new((sample_rate * 0.3) as usize);
            for _i in 0..(sample_rate * 0.05) as usize {
                sender.push(0.0).ok();
            }

            // Switch between these two sets for very different rhythmic timings
            let trig_interval = 1.5 / ((i + 1) as f32);
            let delay_time = 0.0;
            // let trig_interval = 0.25;
            // let delay_time = ((i) % num_syscall_kinds as usize) as f32 * 0.25 / num_syscall_kinds;

            // let mut graph_settings = k.default_graph_settings();
            // graph_settings.num_outputs = 4;
            // let graph = Graph::new(graph_settings);
            // let graph_id = graph.id();
            // let graph = k.push(graph, inputs![]);
            // let k = k.to_graph(graph_id);

            let impulse = k.push(
                IntervalTrig::new(),
                inputs![("interval": trig_interval)],
                // inputs![("interval" : 1.0 / (((i%8)+1) as f32))],
            );
            let trig_delay = k.push(
                SampleDelay::new(Superseconds::from_seconds_f64(2.)),
                inputs![("signal" ; impulse.out(0)), ("delay_time" : delay_time)],
            );
            let exciter = k.push(
                HalfSineImpulse::new(),
                inputs![("freq" : 1000.), ("amp" : 0.2), ("restart_trig" ; trig_delay.out(0))],
            );

            let sine = k.push(
                WavetableOscillatorOwned::new(Wavetable::sine()),
                inputs![("freq": freq * 4.0)],
            );
            let sine_env = Envelope {
                // Points are given in the format (value, time_to_reach_value)
                points: vec![
                    // (0.05 * (1.0 / ((i + 1) as f32)).powf(0.5), 0.01),
                    (0.05, 0.01),
                    (0.0, 0.3),
                ],
                ..Default::default()
            };
            let sine_env = k.push(
                sine_env.to_gen(),
                inputs!(("restart_trig" ; trig_delay.out(0))),
            );
            let sine_mult0 = k.push(Mult, inputs![(0 ; sine.out(0)), (1 ; sine_env.out(0))]);
            let sine_amp = k.push(Mult, inputs![(0 ; sine_mult0.out(0)), (1 : 0.25)]);
            let mut continuous_wg = ContinuousWaveguide::new(k);

            k.connect(
                exciter
                    .to(continuous_wg.exciter_bus_input())
                    .from_channel(0)
                    .to_channel(0),
            );
            let mut value = 0.0;

            let pan = k.push(
            PanMonoToStereo,
            inputs![("signal" ; sine_amp.out(0)), ("pan": ((i/2) as f32 / (num_syscall_kinds/2.0))* (-1.0_f32).powi(i as i32))],
        );
            for out in continuous_wg.outputs() {
                k.connect(out.to_node(&pan));
            }
            k.connect(pan.to(&post_fx).channels(2));
            let mut changes = SimultaneousChanges::duration_from_now(Duration::ZERO);
            continuous_wg.change(
                NoteOpt {
                    freq: Some(freq),
                    amp: Some(0.1),
                    // damping: freq * 7.0,
                    // damping: Some(1000. + freq * 4.0),
                    // damping: Some(850. + freq * 4.0),
                    damping: Some(9000. + freq * 4.0),
                    feedback: Some(0.999 * 1.005),
                    stiffness: Some(0.0),
                    hpf: Some(10.),
                    exciter_lpf: Some(200.),
                    position: Some(0.35),
                },
                &mut changes,
            );
            k.schedule_changes(changes);
            let syscall_waveguide =
                SyscallKindQuantisedWaveguide::new(freq, continuous_wg, sine_amp, exciter, sender);
            continuous_wgs.insert(kind_label, syscall_waveguide);
        }
        Self {
            continuous_wgs,
            post_fx,
            sender,
            k: k.clone(),
        }
    }
}

impl Sonifier for QuantisedCategories {
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
                swg.register_call(id, func_args);
            }
        }
    }

    fn update(&mut self) {
        if !self.sender.is_full() {
            let mut changes = SimultaneousChanges::duration_from_now(Duration::ZERO);
            let mut rng = thread_rng();
            self.sender.push(0.0).unwrap();
            for swg in self.continuous_wgs.values_mut() {
                swg.update(&mut changes, &mut rng);
            }
            // freq_change_counter += 1;
            // if freq_change_counter > 1000 {
            //     let transposition = scale.choose(&mut rng).unwrap();
            //     for (i, wg) in continuous_wgs.values_mut().enumerate() {
            //         let freq = to_freq53(
            //             scale[i % scale.len()]
            //                 + wrap_interval * (i / scale.len()) as i32
            //                 + transposition,
            //             root,
            //         );
            //         wg.set_freq(freq, &mut changes)
            //     }
            //     freq_change_counter = 0;
            // }
            self.k.schedule_changes(changes);
        }
    }

    fn free(&mut self) {
        for (_kind, wg) in self.continuous_wgs.drain() {
            wg.free(&mut self.k);
        }
        self.k.free_node(self.post_fx.clone());
    }
}

struct SyscallKindQuantisedWaveguide {
    freq: f32,
    wg: ContinuousWaveguide,
    exciter: NodeAddress,
    sine_amp: NodeAddress,
    exciter_sender: rtrb::Producer<f32>,
    accumulator: f32,
    coeff: f32,
    amp: f32,
    position: f32,
    damping: f64,
}

impl SyscallKindQuantisedWaveguide {
    pub fn new(
        freq: f32,
        wg: ContinuousWaveguide,
        sine_amp: NodeAddress,
        exciter: NodeAddress,
        exciter_sender: rtrb::Producer<f32>,
    ) -> Self {
        Self {
            freq,
            wg,
            exciter,
            sine_amp,
            exciter_sender,
            accumulator: 0.0,
            coeff: 0.25,
            amp: 0.0,
            position: 0.25,
            damping: 0.0,
        }
    }
    fn register_call(&mut self, id: i32, args: [i32; 3]) {
        // self.accumulator += id as f32 * self.coeff;
        self.accumulator += self.coeff;
        self.amp += self.coeff;
        self.position += id as f32 * 0.001;
        self.damping = (self.damping + 0.00001).clamp(0.0, 1.0);
        if self.position > 0.4 {
            self.position = 0.4;
        }
        if self.amp > 0.4 {
            self.amp = 0.4;
            self.coeff *= 0.98;
        }
    }
    fn update(&mut self, changes: &mut SimultaneousChanges, rng: &mut ThreadRng) {
        self.amp *= 0.99 - (self.amp * 0.2);
        self.damping *= 0.99999999;
        // self.amp *= 0.95;
        self.position *= 0.985;
        let mut new_freq = None;
        if self.amp > 0.35 {
            new_freq = Some(
                self.freq
                    * [1.0_f32, 3.0 / 2.0, 2.0, 3.0, 4.0 / 3.0, 4.0]
                        .choose(rng)
                        .unwrap(),
            );
        }
        changes.push(self.exciter.change().set("amp", self.amp));
        changes.push(self.sine_amp.change().set(1, self.amp));
        self.wg.change(
            NoteOpt {
                freq: new_freq,
                position: Some(0.1 + self.position),
                damping: Some(self.damping.powf(2.) as f32 * 9000. + 100. + self.freq * 4.),
                ..Default::default()
            },
            changes,
        );
    }
    fn set_freq(&mut self, freq: f32, changes: &mut SimultaneousChanges) {
        self.freq = freq;
        self.wg.change(
            NoteOpt {
                freq: Some(freq),
                ..Default::default()
            },
            changes,
        );
    }
    fn free(self, k: &mut KnystCommands) {
        k.free_node(self.exciter);
        k.free_node(self.sine_amp);
        self.wg.free(k);
    }
}
