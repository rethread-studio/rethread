use anyhow::{anyhow, Result};
use std::collections::HashMap;
use std::time::{Duration, Instant};

use enum_iterator::cardinality;
use knyst::controller::{schedule_bundle, KnystCommands};
use knyst::gen::filter::one_pole::{one_pole_lpf, OnePoleLpfHandle};
use knyst::graph::{NodeId, Time};
use knyst::handles::{GenericHandle, HandleData};
use knyst::{knyst_commands, prelude::*};
use knyst_waveguide2::waveguide;
use knyst_waveguide2::WaveguideHandle;
use nannou_osc::Connected;
use rtrb::Producer;
use syscalls_shared::{Syscall, SyscallKind};

use crate::sound_effects::SoundEffects;
use crate::{to_freq53, Sonifier};

pub struct DirectCategories {
    continuous_wgs: HashMap<String, SyscallWaveguide>,
    post_fx: Handle<GenericHandle>,
    lpf: Handle<OnePoleLpfHandle>,
    sample_duration: Duration,
    last_sample: Instant,
    decrese_sensitivity: Option<f32>,
    block_sender: Producer<f32>,
    block_counter: Handle<GenericHandle>,
    coeff_mod: f32,
    out_bus: Handle<GenericHandle>,
}

impl DirectCategories {
    pub fn new(amp: f32, sample_rate: f32, out_bus: Handle<GenericHandle>) -> Self {
        println!("Creating DirectCategories");
        knyst_commands().to_top_level_graph();
        // This Gen has as only function to communicate when a block has passed on the audio thread
        let (block_sender, mut block_receiver) =
            rtrb::RingBuffer::<f32>::new((sample_rate * 0.3) as usize);
        let block_counter = handle(
            gen(move |ctx, _| {
                let out_buf = ctx.outputs.iter_mut().next().expect("channel to exist");
                for o in out_buf.iter_mut() {
                    block_receiver.pop().unwrap_or(0.0);
                    *o = 0.0;
                }
                GenState::Continue
            })
            .output("out"),
        );
        // Connect to graph out to avoid it being automatically removed
        graph_output(0, block_counter);

        let post_fx = handle(
            gen(move |ctx, _| {
                let inp = ctx.inputs.get_channel(0);
                let out = ctx.outputs.iter_mut().next().expect("channel to exist");
                for (i, o) in inp.iter().zip(out.iter_mut()) {
                    *o = (i * 0.2 * amp).clamp(-1.0, 1.0);
                }
                // dbg!(&inp);
                GenState::Continue
            })
            .input("in")
            .output("sig")
            .name("DC_postfx"),
        );
        let lpf = one_pole_lpf().sig(post_fx).cutoff_freq(19000.);
        out_bus.set(12, lpf.repeat_outputs(3));
        // k.connect(lpf.to_graph_out().channels(4).to_channel(12));

        let mut continuous_wgs = HashMap::new();
        let phase_per_i = 6.28 / cardinality::<SyscallKind>() as f32;
        for (i, syscall_kind) in enum_iterator::all::<SyscallKind>().enumerate() {
            let kind_label = format!("{syscall_kind:?}");

            let (sender, mut receiver) =
                rtrb::RingBuffer::<f32>::new((sample_rate * 0.05) as usize);
            // for _i in 0..(sample_rate * 0.05) as usize {
            //     sender.push(0.0).ok();
            // }
            let mut value = 0.0;
            let exciter_sig = handle(
                gen(move |ctx, _| {
                    let in_buf = ctx.inputs.get_channel(0);
                    let out_buf = ctx.outputs.iter_mut().next().expect("channel to exist");
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
            );
            let scale = [0, 17, 31, 48, 53, 53 + 26, 53 + 31];
            let wrap_interval = 53;
            // let freq = 25. * (i + 1).pow(2) as f32;
            let freq = to_freq53(
                scale[i % scale.len()] + wrap_interval * (i / scale.len()) as i32,
                110.,
            );
            // let mut changes = SimultaneousChanges::duration_from_now(Duration::ZERO);
            let exciter_input = bus(1);
            // exciter_input.set(0, graph_input(0, 1));
            // exciter_input.set(0, pink_noise() * 0.1); // Snyggt, men behöver moduleras
            exciter_input.set(0, exciter_sig);
            let exciter_filter = one_pole_lpf().sig(exciter_input).cutoff_freq(2000.);
            let wg = waveguide()
                .exciter(exciter_filter)
                .freq(freq)
                .position(0.25)
                .feedback(0.95)
                .damping(1000. + freq * 4.0)
                .lf_damping(10.);
            // let sine = k.push(WavetableOscillatorOwned::new(Wavetable::sine()), inputs![]);
            // let lpf = k.push(OnePoleLPF::new(), inputs![("cutoff_freq" : 20000.)]);
            let wg_amp = bus(1).set(0, 0.5);
            let wg_lpf = one_pole_lpf()
                .cutoff_freq(20000.)
                .sig(wg * ramp(0.).value(wg_amp).time(0.1));
            post_fx.set(0, wg_lpf);
            // let to_freq53 = |degree, root| 2.0_f32.powf(degree as f32 / 53.) * root;
            // continuous_wg.change(
            //     NoteOpt {
            //         freq: Some(freq),
            //         amp: Some(0.5),
            //         // damping: freq * 7.0,
            //         damping: Some(1000. + freq * 4.0),
            //         feedback: Some(0.99999 * 1.01),
            //         stiffness: Some(0.),
            //         hpf: Some(10.),
            //         exciter_lpf: Some(2000.),
            //         position: Some(0.25),
            //         exciter_amp: Some(0.2),
            //     },
            //     &mut changes,
            // );
            // k.schedule_changes(changes);
            let syscall_waveguide = SyscallWaveguide::new(
                wg,
                exciter_input,
                wg_lpf,
                wg_amp,
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
            last_sample: Instant::now(),
            sample_duration,
            coeff_mod: 1.0,
            decrese_sensitivity: Some(0.999),
            block_sender,
            block_counter,
            lpf,
            out_bus,
        }
    }
    pub fn set_lpf(&mut self, freq: f32) {
        self.lpf.cutoff_freq(freq);
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

impl Sonifier for DirectCategories {
    fn apply_osc_message(&mut self, m: nannou_osc::Message) {
        if m.addr == "/syscall" {
            if let Ok((id, kind, func_args)) = parse_syscall_osc_message(m) {
                if let Some(swg) = self.continuous_wgs.get_mut(&kind) {
                    swg.register_call(self.coeff_mod, id, func_args);
                }
            }
        }
    }

    fn update(
        &mut self,
        osc_sender: &mut nannou_osc::Sender<Connected>,
        _sound_effects: &SoundEffects,
    ) {
        for swg in self.continuous_wgs.values_mut() {
            swg.update(self.coeff_mod);
        }
        if !self.block_sender.is_full() {
            self.block_sender.push(0.).ok();
            if let Some(coeff_mod_decrease) = self.decrese_sensitivity {
                self.coeff_mod *= coeff_mod_decrease;
            }
        }
    }

    fn patch_to_fx_chain(&mut self, fx_chain: usize) {
        self.lpf.clear_graph_output_connections();
        self.lpf.clear_output_connections();
        self.out_bus.set(fx_chain * 4, self.lpf.channels(4));
    }

    fn free(&mut self) {
        for (_kind, wg) in self.continuous_wgs.drain() {
            wg.free();
        }
        self.post_fx.free();
        self.block_counter.free();
    }

    fn change_harmony(&mut self, scale: &[i32], root: f32) {
        schedule_bundle(Time::Immediately, || {
            for (i, syscall_kind) in enum_iterator::all::<SyscallKind>().enumerate() {
                let freq = to_freq53(
                    scale[i % scale.len()] + 53 * (i / scale.len()) as i32,
                    root * 4.0,
                );
                if let Some(wg) = self.continuous_wgs.get_mut(&format!("{:?}", syscall_kind)) {
                    wg.set_freq(freq);
                }
            }
        });
    }
}

struct SyscallWaveguide {
    wg: Handle<WaveguideHandle>,
    exciter: Handle<GenericHandle>,
    lpf: Handle<OnePoleLpfHandle>,
    amp: Handle<GenericHandle>,
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
        wg: Handle<WaveguideHandle>,
        exciter: Handle<GenericHandle>,
        lpf: Handle<OnePoleLpfHandle>,
        amp: Handle<GenericHandle>,
        lpf_phase: f32,
        exciter_sender: rtrb::Producer<f32>,
    ) -> Self {
        Self {
            wg,
            exciter,
            amp,
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
    fn set_freq(&mut self, freq: f32) {
        self.wg.freq(freq);
    }
    fn update(&mut self, coeff_mod: f32) {
        if !self.exciter_sender.is_full() {
            // if self.accumulator > 500. {
            //     self.coeff *= 0.9;
            // }
            // if self.accumulator < 10.0 {
            //     self.coeff *= 1.00001;
            // }
            // self.coeff = self.coeff.clamp(0.0001, 2.0);
            if self.accumulator > 300. {
                self.exciter_sender.push(self.accumulator).ok();
                self.accumulator = 0.0;
                self.average_iterations_since_trigger = self.average_iterations_since_trigger * 0.9
                    + self.iterations_since_trigger as f32 * 0.1;
                if self.iterations_since_trigger < (48000 / 20) {
                    self.coeff *= 0.99;
                }
                let feedback = 0.999
                    + (self.average_iterations_since_trigger as f32 * 0.000001).clamp(0.0, 0.1);
                self.wg.feedback(feedback);
                self.amp.set(0, 0.1);
                self.iterations_since_trigger = 0;
            } else {
                self.exciter_sender.push(0.0).ok();
                self.iterations_since_trigger += 1;
            }
            if self.iterations_since_trigger == 2000 {
                let feedback = 0.999;
                self.wg.feedback(feedback);
                self.amp.set(0, 0.5);
            }
            if self.block_counter >= 128 {
                self.lpf_phase = (self.lpf_phase + 0.001) % 6.28;
                self.lpf_freq = self.lpf_phase.sin() * 9000. + 9100.;
                self.lpf.cutoff_freq(self.lpf_freq);
                self.block_counter = 0;
            }
            self.block_counter += 1;
        }
    }
    fn free(self) {
        self.exciter.free();
        self.wg.free();
        self.lpf.free();
    }
}
