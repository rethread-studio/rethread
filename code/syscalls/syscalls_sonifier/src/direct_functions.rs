use std::collections::HashMap;
use std::iter::repeat;
use std::ops::Range;
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use knyst::controller::KnystCommands;
use knyst::graph::{NodeAddress, SimultaneousChanges};
use knyst::prelude::*;
use knyst::*;
use knyst_waveguide::interface::{ContinuousWaveguide, NoteOpt, SustainedSynth, Synth};
use knyst_waveguide::OnePoleLPF;

use nannou_osc::{Connected, Type};
use rand::seq::SliceRandom;
use rand::{thread_rng, Rng};
use syscalls_shared::SyscallKind;

use crate::{to_freq53, Sonifier};

const SCALE: [i32; 7] = [0 + 5, 17 + 5, 31 + 5, 44 + 5, 53 + 5, 62 + 5, 53 + 17 + 5];

struct Category {
    kind: String,
    syscall_kind: SyscallKind,
    wgs: HashMap<i32, SyscallWaveguide>,
    lpf: NodeAddress,
    lpf_freq: f32,
    lpf_phase: f32,
    category_bus: NodeAddress,
    enabled: bool,
    octave: i32,
    wrap_interval: i32,
    block_counter: usize,
}

impl Category {
    pub fn new(
        k: &mut KnystCommands,
        category_bus: NodeAddress,
        octave: i32,
        wrap_interval: i32,
        kind: String,
        syscall_kind: SyscallKind,
        lpf: NodeAddress,
        lpf_phase: f32,
    ) -> Self {
        Self {
            kind,
            syscall_kind,
            wgs: HashMap::new(),
            category_bus,
            enabled: false,
            octave,
            wrap_interval,
            lpf,
            lpf_freq: 20000.,
            lpf_phase,
            block_counter: 0,
        }
    }
    pub fn register_call(
        &mut self,
        sensitivity_coeff: f32,
        id: i32,
        func_args: [i32; 3],
        k: &mut KnystCommands,
    ) {
        if self.enabled {
            match self.wgs.get_mut(&id) {
                Some(wg) => wg.register_call(sensitivity_coeff, id, func_args),
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
                    let mut wg = make_new_waveguide(k, freq, &self.category_bus, self.syscall_kind);
                    wg.register_call(sensitivity_coeff, id, func_args);
                    self.wgs.insert(id, wg);
                }
            }
        }
    }
    pub fn change_harmony(&mut self, scale: &[i32], root: f32, changes: &mut SimultaneousChanges) {
        for (i, swg) in self.wgs.values_mut().enumerate() {
            let freq = to_freq53(
                scale[i % scale.len()]
                    + self.wrap_interval * (i / scale.len()) as i32
                    + 53 * self.octave,
                root,
            );
            swg.set_freq(freq, changes);
        }
    }
    pub fn update(
        &mut self,
        sensitivity_coeff: f32,
        changes: &mut SimultaneousChanges,
        k: &mut KnystCommands,
    ) {
        if self.enabled {
            let mut to_remove = vec![];
            for (id, swg) in self.wgs.iter_mut() {
                if swg.last_call.elapsed() > Duration::from_secs(15) && swg.interface.is_some() {
                    to_remove.push(*id);
                } else {
                    swg.update(changes);
                }
            }
            for id in to_remove {
                // println!("Removed wg {id}");
                if let Some(wg) = self.wgs.get_mut(&id) {
                    wg.despawn(k);
                }
            }
            // Update LPF
            if self.block_counter >= 128 {
                // self.lpf_phase = (self.lpf_phase + 0.001) % 6.28;
                // self.lpf_freq = self.lpf_phase.sin() * 9000. + 9100.;
                // changes.push(self.lpf.change().set("cutoff_freq", self.lpf_freq));
                // self.block_counter = 0;
            }
            self.block_counter += 1;
        }
    }
    pub fn free(mut self, k: &mut KnystCommands) {
        for (_id, mut wg) in self.wgs.drain() {
            wg.despawn(k);
        }
        k.free_node(self.lpf);
        k.free_node(self.category_bus);
    }
    pub fn patch_to(&mut self, out: &NodeAddress, k: &mut KnystCommands) {
        k.connect(Connection::clear_to_nodes(&self.category_bus));
        k.connect(self.category_bus.to(&out).channels(4));
    }
}

pub struct DirectFunctions {
    categories: Vec<(String, Category)>,
    focus_kinds: Vec<SyscallKind>,
    post_fx_foreground: NodeAddress,
    post_fx_background: NodeAddress,
    vary_focus: bool,
    pub decrease_sensitivity: bool,
    sensitivity_coeff: f32,
    tick: Instant,
    sample_duration: Duration,
    last_sample: Instant,
    focused_category: Option<SyscallKind>,
    last_focus_change: Instant,
    time_to_next_focus_change: Duration,
    pub next_focus_time_range: Range<f32>,
    k: KnystCommands,
}

impl DirectFunctions {
    pub fn new(
        amp: f32,
        k: &mut KnystCommands,
        sample_rate: f32,
        enabled_kinds: &[SyscallKind],
        focus_kinds: Vec<SyscallKind>,
    ) -> Self {
        println!("Creating DirectFunctions");
        let post_fx_foreground = k.push(
            gen(move |ctx, _| {
                let inp = ctx.inputs.get_channel(0);
                let out = ctx.outputs.iter_mut().next().unwrap();
                for (i, o) in inp.iter().zip(out.iter_mut()) {
                    *o = (i * 0.2 * amp).clamp(-1.0, 1.0);
                }
                // dbg!(&inp);
                GenState::Continue
            })
            .input("in")
            .output("sig"),
            inputs![],
        );
        k.connect(post_fx_foreground.to_graph_out().channels(4).to_channel(4));
        let post_fx_background = k.push(
            gen(move |ctx, _| {
                let inp = ctx.inputs.get_channel(0);
                let out = ctx.outputs.iter_mut().next().unwrap();
                for (i, o) in inp.iter().zip(out.iter_mut()) {
                    *o = (i * 0.05 * amp).clamp(-1.0, 1.0);
                }
                // dbg!(&inp);
                GenState::Continue
            })
            .input("in")
            .output("sig"),
            inputs![],
        );
        k.connect(post_fx_background.to_graph_out().channels(4).to_channel(8));

        // let to_freq53 = |degree| 2.0_f32.powf(degree as f32 / 53.) * 220.0;

        let sample_duration = Duration::from_secs_f64(1.0 / sample_rate as f64);
        let last_sample = Instant::now();
        let mut categories = Vec::new();

        let phase_per_i = 6.28 / enabled_kinds.len() as f32;
        for (i, syscall_kind) in enum_iterator::all::<SyscallKind>().enumerate() {
            let kind_string = format!("{syscall_kind:?}");
            let mut wrap_interval = 53;
            let mut octave = i as i32;
            if octave > 6 {
                octave -= 5;
            }
            if syscall_kind == SyscallKind::Unknown {
                wrap_interval = 0;
            }
            let category_bus = k.push(graph::Bus(4), inputs![]);
            let lpf = k.push(
                OnePoleLPF::new(),
                inputs![("cutoff_freq" : 20000.), ("sig" ; category_bus.out(0))],
            );
            k.connect(lpf.to(&post_fx_foreground));
            // k.connect(category_bus.to(&post_fx_foreground).channels(2));
            // println!("kind: {kind_string}, octave: {octave}");
            categories.push((
                kind_string.clone(),
                Category::new(
                    k,
                    category_bus,
                    octave,
                    wrap_interval,
                    kind_string,
                    syscall_kind,
                    lpf,
                    phase_per_i * i as f32,
                ),
            ));
        }
        for kind in enabled_kinds {
            let kind_string = format!("{kind:?}");
            let i = categories.iter().position(|v| v.0 == kind_string).unwrap();
            categories[i].1.enabled = true;
        }
        Self {
            categories,
            post_fx_foreground,
            post_fx_background,
            sample_duration,
            vary_focus: focus_kinds.len() > 0,
            last_focus_change: Instant::now(),
            time_to_next_focus_change: Duration::from_secs_f32(10.),
            focused_category: None,
            last_sample,
            k: k.clone(),
            focus_kinds,
            decrease_sensitivity: false,
            next_focus_time_range: 15.0..40.0,
            sensitivity_coeff: 1.0,
            tick: Instant::now(),
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
            if let Some(category) = self
                .categories
                .iter()
                .position(|(list_kind, _)| list_kind == &kind)
            {
                let category = &mut self.categories[category].1;
                category.register_call(self.sensitivity_coeff, id, func_args, &mut self.k);
            }
        }
    }

    fn update(&mut self, osc_sender: &mut nannou_osc::Sender<Connected>) {
        let mut rng = thread_rng();
        let mut changes = SimultaneousChanges::duration_from_now(Duration::ZERO);
        if self.tick.elapsed() > Duration::from_millis(10) {
            if self.decrease_sensitivity {
                self.sensitivity_coeff *= 0.99992;
            }
            self.tick = Instant::now();
        }
        for (_, cat) in self.categories.iter_mut() {
            cat.update(self.sensitivity_coeff, &mut changes, &mut self.k);
        }
        self.k.schedule_changes(changes);
        if self.vary_focus && self.last_focus_change.elapsed() > self.time_to_next_focus_change {
            self.time_to_next_focus_change =
                Duration::from_secs_f32(rng.gen_range(self.next_focus_time_range.clone()));
            self.last_focus_change = Instant::now();
            if self.focused_category.is_some() {
                // Every category to the foreground
                for (_, cat) in &mut self.categories {
                    cat.patch_to(&self.post_fx_foreground, &mut self.k);
                }
                self.focused_category = None;
                let addr = "/voice/focus/disabled";
                let args = vec![];
                osc_sender.send((addr, args)).ok();
            } else {
                if self.focus_kinds.len() > 0 {
                    // let focused = rng.gen_range(0..self.categories.len());
                    let focused = self.focus_kinds.choose(&mut rng).unwrap();
                    let focused_string = format!("{focused:?}");
                    for (i, (name, cat)) in &mut self.categories.iter_mut().enumerate() {
                        if *name == focused_string {
                            cat.patch_to(&self.post_fx_foreground, &mut self.k);
                            let addr = "/voice/focus/enabled";
                            let args = vec![Type::String(name.clone())];
                            osc_sender.send((addr, args)).ok();
                        } else {
                            cat.patch_to(&self.post_fx_background, &mut self.k);
                        }
                    }
                    self.focused_category = Some(*focused);
                }
            }
        }
    }

    fn free(&mut self) {
        for (_kind, cat) in self.categories.drain(..) {
            cat.free(&mut self.k);
        }
        self.k.free_node(self.post_fx_foreground.clone());
        self.k.free_node(self.post_fx_background.clone());
    }

    fn patch_to_fx_chain(&mut self, fx_chain: usize) {
        self.k
            .connect(Connection::clear_to_graph_outputs(&self.post_fx_foreground));
        self.k.connect(
            self.post_fx_foreground
                .to_graph_out()
                .channels(4)
                .to_channel(fx_chain * 4),
        );
    }

    fn change_harmony(&mut self, scale: &[i32], root: f32) {
        let mut changes = SimultaneousChanges::duration_from_now(Duration::ZERO);
        for (_, cat) in self.categories.iter_mut() {
            cat.change_harmony(scale, root, &mut changes);
        }
        self.k.schedule_changes(changes);
    }
}

fn make_new_waveguide(
    k: &mut KnystCommands,
    freq: f32,
    post_fx: &NodeAddress,
    category: SyscallKind,
) -> SyscallWaveguide {
    let starting_coeff = match category {
        SyscallKind::Io => 0.001,
        SyscallKind::SocketIo => 0.01,
        SyscallKind::WaitForReady => 0.1,
        _ => 0.3,
    };
    SyscallWaveguide::new(k, freq, post_fx.clone(), category, starting_coeff)
}

struct WgInterface {
    wg: ContinuousWaveguide,
    exciter: NodeAddress,
    exciter_sender: rtrb::Producer<f32>,
}

struct SyscallWaveguide {
    interface: Option<WgInterface>,
    freq: f32,
    k: KnystCommands,
    output: NodeAddress,
    category: SyscallKind,
    accumulator: f32,
    coeff: f64,
    iterations_since_trigger: usize,
    average_iterations_since_trigger: f32,
    pub last_call: Instant,
    pub last_ramp_change: Instant,
}

impl SyscallWaveguide {
    pub fn new(
        k: &mut KnystCommands,
        freq: f32,
        output: NodeAddress,
        category: SyscallKind,
        starting_coeff: f32,
    ) -> Self {
        let mut s = Self {
            accumulator: 0.0,
            coeff: starting_coeff as f64,
            iterations_since_trigger: 1000,
            average_iterations_since_trigger: 100.,
            last_call: Instant::now(),
            interface: None,
            freq,
            k: k.clone(),
            output,
            category,
            last_ramp_change: Instant::now(),
        };
        s.spawn();
        s
    }
    pub fn spawn(&mut self) {
        if self.interface.is_none() {
            let (mut exciter_sender, mut receiver) =
                rtrb::RingBuffer::<f32>::new((48000. * 0.05) as usize);
            // for _i in 0..(48000. * 0.5) as usize {
            //     exciter_sender.push(0.0).ok();
            // }
            let mut value = 0.0;
            let exciter = self.k.push(
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
                        value *= 0.7;
                    }
                    GenState::Continue
                })
                .output("out")
                .input("in"),
                inputs![],
            );
            let mut continuous_wg = ContinuousWaveguide::new(&mut self.k);
            self.k.connect(
                exciter
                    .to(continuous_wg.exciter_bus_input())
                    .from_channel(0)
                    .to_channel(0),
            );
            self.k.connect(Connection::graph_input(&exciter));
            for out in continuous_wg.outputs() {
                self.k.connect(out.to_node(&self.output));
            }
            let mut changes = SimultaneousChanges::duration_from_now(Duration::ZERO);
            continuous_wg.set_amp_ramp_time(0.001, &mut changes);
            continuous_wg.change(
                NoteOpt {
                    freq: Some(self.freq),
                    amp: Some(0.1),
                    // damping: freq * 7.0,
                    damping: Some(1000. + self.freq * 4.0),
                    feedback: Some(0.9999),
                    stiffness: Some(0.),
                    hpf: Some(10.),
                    exciter_lpf: Some(1500.),
                    position: Some(0.25),
                },
                &mut changes,
            );
            self.k.schedule_changes(changes);
            self.interface = Some(WgInterface {
                wg: continuous_wg,
                exciter,
                exciter_sender,
            })
        }
    }
    fn register_call(&mut self, sensitivity_coeff: f32, _id: i32, _args: [i32; 3]) {
        // self.accumulator += id as f32 * self.coeff;
        self.accumulator += self.coeff as f32 * 200. * sensitivity_coeff;
        self.last_call = Instant::now();
        if self.interface.is_none() {
            self.spawn();
        }
    }
    fn set_freq(&mut self, freq: f32, changes: &mut SimultaneousChanges) {
        self.freq = freq;
        if let Some(i) = &mut self.interface {
            i.wg.change(
                NoteOpt {
                    freq: Some(freq),
                    ..Default::default()
                },
                changes,
            );
        }
    }
    fn update(&mut self, changes: &mut SimultaneousChanges) {
        if let Some(i) = &mut self.interface {
            if !i.exciter_sender.is_full() {
                if self.last_ramp_change.elapsed() > Duration::from_secs_f32(0.5) {
                    // TODO: This shouldn't be necessary, but it is a workaround for a bug
                    let rng = fastrand::Rng::new();
                    i.wg.set_amp_ramp_time(rng.f32() * 0.001 + 0.001, changes);
                    self.last_ramp_change = Instant::now();
                }
                // if self.accumulator > 500. {
                //     self.coeff *= 0.9;
                // }
                // if self.accumulator < 10.0 {
                //     self.coeff *= 1.00001;
                // }
                // self.coeff = self.coeff.clamp(0.0001, 2.0);
                if self.accumulator > 200. {
                    i.exciter_sender.push(self.accumulator).unwrap();
                    self.accumulator = 0.0;
                    self.average_iterations_since_trigger = self.average_iterations_since_trigger
                        * 0.9
                        + self.iterations_since_trigger as f32 * 0.1;
                    if self.iterations_since_trigger < (48000 / 4) {
                        self.coeff *= 0.9;
                    }
                    if self.iterations_since_trigger > (48000) {
                        self.coeff *= 1.10;
                    }
                    self.coeff = self.coeff.clamp(0.0001, 1.0);
                    let feedback = 0.999
                        + (self.average_iterations_since_trigger as f32 * 0.00001).clamp(0.0, 0.1);
                    i.wg.change(
                        NoteOpt {
                            feedback: Some(feedback),
                            amp: Some(0.05),
                            ..Default::default()
                        },
                        changes,
                    );
                    self.iterations_since_trigger = 0;
                } else {
                    i.exciter_sender.push(0.0).unwrap();
                    self.iterations_since_trigger += 1;
                }
                if self.iterations_since_trigger == 1500 {
                    let feedback = 0.99;
                    i.wg.change(
                        NoteOpt {
                            feedback: Some(feedback),

                            amp: Some(0.10),
                            ..Default::default()
                        },
                        changes,
                    );
                }
            }
        }
    }
    fn despawn(&mut self, k: &mut KnystCommands) {
        if let Some(i) = self.interface.take() {
            k.free_node(i.exciter);
            i.wg.free(k);
        }
    }
}
