use std::collections::HashMap;
use std::iter::repeat;
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use knyst::controller::KnystCommands;
use knyst::envelope::{Envelope, SustainMode};
use knyst::graph::{NodeAddress, NodeChanges, SimultaneousChanges};
use knyst::prelude::*;
use knyst::*;
use knyst_waveguide::interface::{
    ContinuousWaveguide, MultiVoiceTriggeredSynth, Note, NoteOpt, PluckedWaveguide,
    PluckedWaveguideSettings, SustainedSynth, Synth, TriggeredSynth,
};
use knyst_waveguide::{OnePole, OnePoleHPF, OnePoleLPF, XorNoise};

use anyhow::Result;
use nannou_osc::receiver;
use rand::seq::SliceRandom;
use rand::{thread_rng, Rng};
use syscalls_shared::SyscallKind;

use crate::{to_freq53, Sonifier};

const SCALE: [i32; 7] = [0 + 5, 17 + 5, 31 + 5, 44 + 5, 53 + 5, 62 + 5, 53 + 17 + 5];
const WRAP_INTERVAL: i32 = 53;

const ACTIVATE_IO: bool = true;
const ACTIVATE_SOCKET_IO: bool = true;
const ACTIVATE_MEMORY: bool = true;
const ACTIVATE_SYNCHRONISATION: bool = true;

struct Category {
    kind: String,
    wgs: HashMap<i32, SyscallWaveguide>,
    enabled: bool,
    octave: i32,
    wrap_interval: i32,
}

impl Category {
    pub fn new(k: &mut KnystCommands, octave: i32, wrap_interval: i32, kind: String) -> Self {
        Self {
            kind,
            wgs: HashMap::new(),
            enabled: true,
            octave,
            wrap_interval,
        }
    }
    pub fn register_call(
        &mut self,
        id: i32,
        func_args: [i32; 3],
        output: &NodeAddress,
        k: &mut KnystCommands,
    ) {
        if self.enabled {
            match self.wgs.get_mut(&id) {
                Some(wg) => wg.register_call(id, func_args),
                None => {
                    let i = self.wgs.len();
                    // let freq = 25. * (i + 1).pow(2) as f32;
                    let freq = to_freq53(
                        SCALE[i % SCALE.len()]
                            + self.wrap_interval * (i / SCALE.len()) as i32
                            + 53 * self.octave,
                        25.,
                    );
                    println!("New wg for {} id {id} freq {freq}, i: {i}", &self.kind);
                    let mut wg = make_new_waveguide(k, freq, output);
                    wg.register_call(id, func_args);
                    self.wgs.insert(id, wg);
                }
            }
        }
    }
    pub fn update(&mut self, changes: &mut SimultaneousChanges) {
        if self.enabled {
            for swg in self.wgs.values_mut() {
                swg.update(changes);
            }
        }
    }
    pub fn free(mut self, k: &mut KnystCommands) {
        for (_id, wg) in self.wgs.drain() {
            wg.free(k);
        }
    }
}

pub struct DirectFunctions {
    categories: HashMap<String, Category>,
    post_fx: NodeAddress,
    sample_duration: Duration,
    last_sample: Instant,
    k: KnystCommands,
}

impl DirectFunctions {
    pub fn new(k: &mut KnystCommands, sample_rate: f32) -> Self {
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
        k.connect(post_fx.to_graph_out().channels(2).to_channel(4));

        // let to_freq53 = |degree| 2.0_f32.powf(degree as f32 / 53.) * 220.0;

        let sample_duration = Duration::from_secs_f64(1.0 / sample_rate as f64);
        let last_sample = Instant::now();
        let mut categories = HashMap::new();

        for (i, syscall_kind) in enum_iterator::all::<SyscallKind>().enumerate() {
            let kind_string = format!("{syscall_kind:?}");
            let mut wrap_interval = 53;
            let mut octave = i as i32;
            if octave > 7 {
                octave -= 4;
            }
            if syscall_kind == SyscallKind::Unknown {
                wrap_interval = 0;
            }
            println!("kind: {kind_string}, octave: {octave}");
            categories.insert(
                kind_string.clone(),
                Category::new(k, octave, wrap_interval, kind_string),
            );
        }
        Self {
            categories,
            post_fx,
            sample_duration,
            last_sample,
            k: k.clone(),
        }
    }
}

impl Sonifier for DirectFunctions {
    fn apply_osc_message(&mut self, m: nannou_osc::Message) {
        if m.addr == "/syscall" {
            let mut args = m.args.unwrap().into_iter();
            let id = args.next().unwrap().int().unwrap();
            let kind = args.next().unwrap().string().unwrap();
            let mut func_args = [0_i32; 3];
            func_args[0] = args.next().unwrap().int().unwrap();
            func_args[1] = args.next().unwrap().int().unwrap();
            func_args[2] = args.next().unwrap().int().unwrap();
            if let Some(category) = self.categories.get_mut(&kind) {
                category.register_call(id, func_args, &self.post_fx, &mut self.k);
            }
        }
    }

    fn update(&mut self) {
        let mut changes = SimultaneousChanges::duration_from_now(Duration::ZERO);
        for cat in self.categories.values_mut() {
            cat.update(&mut changes);
        }
        self.k.schedule_changes(changes);
    }

    fn free(&mut self) {
        for (_kind, cat) in self.categories.drain() {
            cat.free(&mut self.k);
        }
        self.k.free_node(self.post_fx.clone());
    }
}

fn make_new_waveguide(k: &mut KnystCommands, freq: f32, post_fx: &NodeAddress) -> SyscallWaveguide {
    let (mut sender, mut receiver) = rtrb::RingBuffer::<f32>::new((48000. * 0.5) as usize);
    for _i in 0..(48000. * 0.5) as usize {
        sender.push(0.0).ok();
    }
    let mut value = 0.0;
    let exciter_sig = k.push(
        gen(move |ctx, _| {
            let in_buf = ctx.inputs.get_channel(0);
            let out_buf = ctx.outputs.iter_mut().next().unwrap();
            for (i, o) in in_buf.iter().zip(out_buf.iter_mut()) {
                let new_value = (receiver.pop().unwrap().clamp(0.0, 500.0) / 500.0).powf(0.125);
                if value < 0.001 {
                    value += new_value;
                }
                value = value.clamp(-1.0, 1.0);
                *o = value + i;
                value *= 0.7;
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
    for out in continuous_wg.outputs() {
        k.connect(out.to_node(post_fx));
    }
    let mut changes = SimultaneousChanges::duration_from_now(Duration::ZERO);
    continuous_wg.change(
        NoteOpt {
            freq: Some(freq),
            amp: Some(0.1),
            // damping: freq * 7.0,
            damping: Some(1000. + freq * 4.0),
            feedback: Some(0.99),
            stiffness: Some(0.),
            hpf: Some(10.),
            exciter_lpf: Some(2000.),
            position: Some(0.25),
        },
        &mut changes,
    );
    k.schedule_changes(changes);
    SyscallWaveguide::new(continuous_wg, exciter_sig, sender)
}

struct SyscallWaveguide {
    wg: ContinuousWaveguide,
    exciter: NodeAddress,
    exciter_sender: rtrb::Producer<f32>,
    accumulator: f32,
    coeff: f32,
    iterations_since_trigger: usize,
    average_iterations_since_trigger: f32,
}

impl SyscallWaveguide {
    pub fn new(
        wg: ContinuousWaveguide,
        exciter: NodeAddress,
        exciter_sender: rtrb::Producer<f32>,
    ) -> Self {
        Self {
            wg,
            exciter,
            exciter_sender,
            accumulator: 0.0,
            coeff: 1.0,
            iterations_since_trigger: 1000,
            average_iterations_since_trigger: 100.,
        }
    }
    fn register_call(&mut self, id: i32, args: [i32; 3]) {
        // self.accumulator += id as f32 * self.coeff;
        self.accumulator += self.coeff * 300.;
    }
    fn update(&mut self, changes: &mut SimultaneousChanges) {
        if !self.exciter_sender.is_full() {
            // if self.accumulator > 500. {
            //     self.coeff *= 0.9;
            // }
            // if self.accumulator < 10.0 {
            //     self.coeff *= 1.00001;
            // }
            // self.coeff = self.coeff.clamp(0.0001, 2.0);
            if self.accumulator > 300. {
                self.exciter_sender.push(self.accumulator).unwrap();
                self.accumulator = 0.0;
                self.average_iterations_since_trigger = self.average_iterations_since_trigger * 0.9
                    + self.iterations_since_trigger as f32 * 0.1;
                if self.iterations_since_trigger < (48000 / 20) {
                    self.coeff *= 0.99;
                }
                let feedback = 0.999
                    + (self.average_iterations_since_trigger as f32 * 0.00001).clamp(0.0, 0.3);
                self.wg.change(
                    NoteOpt {
                        feedback: Some(feedback),
                        ..Default::default()
                    },
                    changes,
                );
                self.iterations_since_trigger = 0;
            } else {
                self.exciter_sender.push(0.0).unwrap();
                self.iterations_since_trigger += 1;
            }
            if self.iterations_since_trigger == 2000 {
                let feedback = 0.99;
                self.wg.change(
                    NoteOpt {
                        feedback: Some(feedback),
                        ..Default::default()
                    },
                    changes,
                );
            }
        }
    }
    fn free(self, k: &mut KnystCommands) {
        k.free_node(self.exciter);
        self.wg.free(k);
    }
}
