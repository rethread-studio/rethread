use std::collections::HashMap;
use std::iter::repeat;
use std::ops::Range;
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use knyst::controller::schedule_bundle;
use knyst::gen::filter::one_pole::{one_pole_lpf, OnePoleLpfHandle};
use knyst::graph::Time;
use knyst::handles::{AnyNodeHandle, GenericHandle, GraphHandle, HandleData};
use knyst::prelude::*;
use knyst::*;

use anyhow::{anyhow, Result};
use knyst_waveguide2::{waveguide, WaveguideHandle};
use nannou_osc::{Connected, Type};
use rand::seq::SliceRandom;
use rand::{thread_rng, Rng};
use syscalls_shared::SyscallKind;

use crate::sound_effects::SoundEffects;
use crate::{to_freq53, Sonifier};

const SCALE: [i32; 7] = [0 + 5, 17 + 5, 31 + 5, 44 + 5, 53 + 5, 62 + 5, 53 + 17 + 5];

struct Category {
    kind: String,
    syscall_kind: SyscallKind,
    wgs: HashMap<i32, SyscallWaveguide>,
    lpf: Handle<OnePoleLpfHandle>,
    lpf_freq: f32,
    lpf_phase: f32,
    category_bus: Handle<GenericHandle>,
    enabled: bool,
    octave: i32,
    wrap_interval: i32,
    block_counter: usize,
}

impl Category {
    pub fn new(
        category_bus: Handle<GenericHandle>,
        octave: i32,
        wrap_interval: i32,
        kind: String,
        syscall_kind: SyscallKind,
        lpf: Handle<OnePoleLpfHandle>,
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
    pub fn register_call(&mut self, sensitivity_coeff: f32, id: i32, func_args: [i32; 3]) {
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
                    let mut wg = make_new_waveguide(freq, self.category_bus, self.syscall_kind);
                    wg.register_call(sensitivity_coeff, id, func_args);
                    self.wgs.insert(id, wg);
                }
            }
        }
    }
    pub fn change_harmony(&mut self, scale: &[i32], root: f32) {
        for (i, swg) in self.wgs.values_mut().enumerate() {
            let freq = to_freq53(
                scale[i % scale.len()]
                    + self.wrap_interval * (i / scale.len()) as i32
                    + 53 * self.octave,
                root,
            );
            swg.set_freq(freq);
        }
    }
    pub fn update(&mut self, sensitivity_coeff: f32) {
        if self.enabled {
            // schedule_bundle(Time::Immediately, || {
            let mut to_remove = vec![];
            for (id, swg) in self.wgs.iter_mut() {
                if swg.last_call.elapsed() > Duration::from_secs(15) && swg.interface.is_some() {
                    to_remove.push(*id);
                } else {
                    swg.update();
                }
            }
            for id in to_remove {
                // println!("Removed wg {id}");
                if let Some(wg) = self.wgs.get_mut(&id) {
                    wg.despawn();
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
            // });
        }
    }
    pub fn free(mut self) {
        for (_id, mut wg) in self.wgs.drain() {
            wg.despawn();
        }
        self.lpf.free();
        self.category_bus.free();
    }
    pub fn patch_to(&mut self, out: &AnyNodeHandle) {
        self.category_bus.clear_output_connections();
        out.set(0, self.category_bus.channels(4));
        // k.connect(self.category_bus.to(&out).channels(4));
    }
}

pub struct DirectFunctions {
    categories: Vec<(String, Category)>,
    focus_kinds: Vec<SyscallKind>,
    post_fx_foreground: Handle<GenericHandle>,
    post_fx_background: Handle<GenericHandle>,
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
    out_bus: Handle<GenericHandle>,
}

impl DirectFunctions {
    pub fn new(
        amp: f32,
        sample_rate: f32,
        enabled_kinds: &[SyscallKind],
        focus_kinds: Vec<SyscallKind>,
        out_bus: Handle<GenericHandle>,
    ) -> Self {
        println!("Creating DirectFunctions");
        knyst_commands().to_top_level_graph();
        let post_fx_foreground = handle(
            gen(move |ctx, _| {
                let inp = ctx.inputs.get_channel(0);
                let out = ctx.outputs.iter_mut().next().expect("channel must exist");
                for (i, o) in inp.iter().zip(out.iter_mut()) {
                    *o = (i * 0.45 * amp).clamp(-1.0, 1.0);
                }
                // dbg!(&inp);
                GenState::Continue
            })
            .name("DF post_fx fore")
            .input("in")
            .output("sig"),
        );
        // graph_output(4, post_fx_foreground.channels(4));
        out_bus.set(4, post_fx_foreground.channels(4));
        let post_fx_background = handle(
            gen(move |ctx, _| {
                let inp = ctx.inputs.get_channel(0);
                let out = ctx.outputs.iter_mut().next().expect("channel must exist");
                for (i, o) in inp.iter().zip(out.iter_mut()) {
                    *o = (i * 0.095 * amp).clamp(-1.0, 1.0);
                }
                // dbg!(&inp);
                GenState::Continue
            })
            .name("DF post_fx back")
            .input("in")
            .output("sig"),
        );
        // graph_output(8, post_fx_background.channels(4));
        out_bus.set(8, post_fx_background.channels(4));

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
            let category_bus = bus(4);
            let lpf = one_pole_lpf().cutoff_freq(20000.).sig(category_bus);
            post_fx_foreground.set(0, lpf);
            // k.connect(category_bus.to(&post_fx_foreground).channels(2));
            // println!("kind: {kind_string}, octave: {octave}");
            categories.push((
                kind_string.clone(),
                Category::new(
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
            if let Some(i) = categories.iter().position(|v| v.0 == kind_string) {
                categories[i].1.enabled = true;
            }
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
            focus_kinds,
            decrease_sensitivity: false,
            next_focus_time_range: 15.0..40.0,
            sensitivity_coeff: 1.0,
            tick: Instant::now(),
            out_bus,
        }
    }
}

fn parse_syscall_osc_message(m: nannou_osc::Message) -> Result<(i32, String, [i32; 3])> {
    if let Some(args) = m.args {
        let mut args = args.into_iter();
        let id = args
            .next()
            .ok_or(anyhow!("Too few arguments"))?
            .int()
            .ok_or(anyhow!("Wrong type"))?;
        let kind = args
            .next()
            .ok_or(anyhow!("Too few arguments"))?
            .string()
            .ok_or(anyhow!("Wrong type"))?;
        let mut func_args = [0_i32; 3];
        func_args[0] = args
            .next()
            .ok_or(anyhow!("Too few arguments"))?
            .int()
            .ok_or(anyhow!("Wrong type"))?;
        func_args[1] = args
            .next()
            .ok_or(anyhow!("Too few arguments"))?
            .int()
            .ok_or(anyhow!("Wrong type"))?;
        func_args[2] = args
            .next()
            .ok_or(anyhow!("Too few arguments"))?
            .int()
            .ok_or(anyhow!("Wrong type"))?;
        return Ok((id, kind, func_args));
    } else {
        return Err(anyhow!("No args in syscall message"));
    }
}

impl Sonifier for DirectFunctions {
    fn apply_osc_message(&mut self, m: nannou_osc::Message) {
        if m.addr == "/syscall" {
            if let Ok((id, kind, func_args)) = parse_syscall_osc_message(m) {
                if let Some(category) = self
                    .categories
                    .iter()
                    .position(|(list_kind, _)| list_kind == &kind)
                {
                    let category = &mut self.categories[category].1;
                    category.register_call(self.sensitivity_coeff, id, func_args);
                }
            }
        }
    }

    fn update(
        &mut self,
        osc_sender: &mut nannou_osc::Sender<Connected>,
        sound_effects: &SoundEffects,
    ) {
        let mut rng = thread_rng();
        // schedule_bundle(Time::Immediately, || {
        if self.tick.elapsed() > Duration::from_millis(10) {
            if self.decrease_sensitivity {
                self.sensitivity_coeff *= 0.99992;
            }
            self.tick = Instant::now();
        }
        for (_, cat) in self.categories.iter_mut() {
            cat.update(self.sensitivity_coeff);
        }
        // });
        if self.vary_focus && self.last_focus_change.elapsed() > self.time_to_next_focus_change {
            self.time_to_next_focus_change =
                Duration::from_secs_f32(rng.gen_range(self.next_focus_time_range.clone()));
            self.last_focus_change = Instant::now();
            if self.focused_category.is_some() {
                // Every category to the foreground
                for (_, cat) in &mut self.categories {
                    cat.patch_to(&self.post_fx_foreground.into());
                }
                self.focused_category = None;
                // let addr = "/voice/focus/disabled";
                // let args = vec![];
                // osc_sender.send((addr, args)).ok();
                sound_effects.play_focus_disabled();
            } else {
                if self.focus_kinds.len() > 0 {
                    // let focused = rng.gen_range(0..self.categories.len());
                    let focused = self
                        .focus_kinds
                        .choose(&mut rng)
                        .expect("We already checked that there are focus_kinds");
                    let focused_string = format!("{focused:?}");
                    for (i, (name, cat)) in &mut self.categories.iter_mut().enumerate() {
                        if *name == focused_string {
                            cat.patch_to(&self.post_fx_foreground.into());
                            // let addr = "/voice/focus/enabled";
                            // let args = vec![Type::String(name.clone())];
                            // osc_sender.send((addr, args)).ok();
                            sound_effects.play_focus_enabled(name.clone());
                        } else {
                            cat.patch_to(&self.post_fx_background.into());
                        }
                    }
                    self.focused_category = Some(*focused);
                }
            }
        }
    }

    fn free(&mut self) {
        for (_kind, cat) in self.categories.drain(..) {
            cat.free();
        }
        self.post_fx_background.free();
        self.post_fx_background.free();
    }

    fn patch_to_fx_chain(&mut self, fx_chain: usize) {
        self.post_fx_foreground.clear_graph_output_connections();
        self.post_fx_foreground.clear_output_connections();
        self.out_bus
            .set(fx_chain * 4, self.post_fx_foreground.channels(4));
        // graph_output(fx_chain * 4, self.post_fx_foreground.channels(4));
    }

    fn change_harmony(&mut self, scale: &[i32], root: f32) {
        schedule_bundle(Time::Immediately, || {
            for (_, cat) in self.categories.iter_mut() {
                cat.change_harmony(scale, root);
            }
        });
    }
}

fn make_new_waveguide(
    freq: f32,
    post_fx: Handle<GenericHandle>,
    category: SyscallKind,
) -> SyscallWaveguide {
    let starting_coeff = match category {
        SyscallKind::Io => 0.001,
        SyscallKind::SocketIo => 0.01,
        SyscallKind::WaitForReady => 0.1,
        _ => 0.3,
    };
    SyscallWaveguide::new(freq, post_fx, category, starting_coeff)
}

struct WgInterface {
    wg: Handle<WaveguideHandle>,
    wg_amp: Handle<GenericHandle>,
    wg_amp_ramp: Handle<RampHandle>,
    inner_graph: Handle<GraphHandle>,
    exciter_sender: rtrb::Producer<f32>,
}

struct SyscallWaveguide {
    interface: Option<WgInterface>,
    freq: f32,
    output: Handle<GenericHandle>,
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
        freq: f32,
        output: Handle<GenericHandle>,
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
            output,
            category,
            last_ramp_change: Instant::now(),
        };
        s.spawn();
        s
    }
    pub fn spawn(&mut self) {
        if self.interface.is_none() {
            let (exciter_sender, mut receiver) =
                rtrb::RingBuffer::<f32>::new((48000. * 0.05) as usize);
            // for _i in 0..(48000. * 0.5) as usize {
            //     exciter_sender.push(0.0).ok();
            // }
            let wg;
            let wg_amp;
            let wg_amp_ramp;
            let mut gs = knyst_commands()
                .default_graph_settings()
                .num_inputs(0)
                .num_outputs(1);
            gs.name = format!("DF wg {:?}", self.category);
            knyst_commands().to_top_level_graph();
            knyst_commands().init_local_graph(gs);
            let mut value = 0.0;
            let exciter = handle(
                gen(move |ctx, _| {
                    let in_buf = ctx.inputs.get_channel(0);
                    let out_buf = ctx.outputs.iter_mut().next().expect("channel must exist");
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
            );

            let exciter_input = bus(1);
            // exciter_input.set(0, graph_input(0, 1));
            exciter_input.set(0, exciter);
            let exciter_filter = one_pole_lpf().sig(exciter_input).cutoff_freq(1500.);
            wg = waveguide()
                .exciter(exciter_filter * 0.5)
                .freq(self.freq)
                .position(0.25)
                .feedback(0.9999)
                .damping(1000. + self.freq * 4.0)
                .lf_damping(10.);
            // let sine = k.push(WavetableOscillatorOwned::new(Wavetable::sine()), inputs![]);
            // let lpf = k.push(OnePoleLPF::new(), inputs![("cutoff_freq" : 20000.)]);
            wg_amp = bus(1).set(0, 0.1);
            wg_amp_ramp = ramp(0.1).value(wg_amp).time(0.1);
            let lpf = one_pole_lpf().cutoff_freq(10000.).sig(wg * wg_amp_ramp);
            graph_output(0, lpf);
            let inner_graph = knyst_commands()
                .upload_local_graph()
                .expect("Nothing could have come between the init and upload of local graph");
            self.output.set(0, inner_graph);

            // old
            // let mut changes = SimultaneousChanges::duration_from_now(Duration::ZERO);
            // continuous_wg.set_amp_ramp_time(0.001, &mut changes);
            // continuous_wg.change(
            //     NoteOpt {
            //         freq: Some(self.freq),
            //         amp: Some(0.1),
            //         // damping: freq * 7.0,
            //         damping: Some(1000. + self.freq * 4.0),
            //         feedback: Some(0.9999),
            //         stiffness: Some(0.),
            //         hpf: Some(10.),
            //         exciter_lpf: Some(1500.),
            //         position: Some(0.25),
            //         exciter_amp: Some(0.2),
            //     },
            //     &mut changes,
            // );
            // self.k.schedule_changes(changes);
            self.interface = Some(WgInterface {
                wg,
                wg_amp,
                wg_amp_ramp,
                inner_graph,
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
    fn set_freq(&mut self, freq: f32) {
        self.freq = freq;
        if let Some(i) = &mut self.interface {
            i.wg.freq(freq);
        }
    }
    fn update(&mut self) {
        if let Some(i) = &mut self.interface {
            if !i.exciter_sender.is_full() {
                if self.last_ramp_change.elapsed() > Duration::from_secs_f32(0.5) {
                    // TODO: This shouldn't be necessary, but it is a workaround for a bug
                    let mut rng = fastrand::Rng::new();
                    i.wg_amp_ramp.time(rng.f32() * 0.001 + 0.001);
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
                    i.exciter_sender.push(self.accumulator).ok();
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
                        + (self.average_iterations_since_trigger as f32 * 0.000001).clamp(0.0, 0.01);
                    i.wg.feedback(feedback);
                    i.wg_amp.set(0, 0.10);
                    self.iterations_since_trigger = 0;
                } else {
                    i.exciter_sender.push(0.0).ok();
                    self.iterations_since_trigger += 1;
                }
                if self.iterations_since_trigger == 1000 {
                    let feedback = 0.99;
                    i.wg.feedback(feedback);
                    i.wg_amp.set(0, 0.20);
                }
            }
        }
    }
    fn despawn(&mut self) {
        if let Some(i) = self.interface.take() {
            i.inner_graph.free();
            // knyst_commands().free_disconnected_nodes(); // This causes removal of too many nodes
        }
    }
}
