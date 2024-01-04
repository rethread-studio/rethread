// Vary parameters:
// - Trigger timings
// - amplitude falloff
// - damping (creates a steady chord at high cutoff frequency)
//
// Fix: noise in exciter
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use knyst::controller::{schedule_bundle, KnystCommands};
use knyst::envelope::{Envelope, SustainMode};
use knyst::gen::delay::{sample_delay, SampleDelayHandle};
use knyst::gen::filter::one_pole::{one_pole_lpf, OnePoleLpfHandle};
use knyst::graph::Time;
use knyst::handles::{GenericHandle, HandleData};
use knyst::prelude::*;
use knyst::time::Superseconds;
use knyst::trig::{interval_trig, IntervalTrig, IntervalTrigHandle};
use knyst::*;

use anyhow::Result;
use knyst_waveguide2::{half_sine_wt, waveguide, HalfSineWtHandle, Waveguide, WaveguideHandle};
use nannou_osc::{receiver, Connected};
use rand::rngs::ThreadRng;
use rand::{thread_rng, Rng};
use rtrb::Producer;
use syscalls_shared::SyscallKind;

use crate::sound_effects::SoundEffects;
use crate::{pan_mono_to_quad, to_freq53, PanMonoToQuad, PanMonoToQuadHandle, Sonifier};
const SCALE: [i32; 7] = [0 + 5, 17 + 5, 31 + 5, 44 + 5, 53 + 5, 62 + 5, 53 + 17 + 5];

pub struct QuantisedCategories {
    continuous_wgs: HashMap<String, SyscallKindQuantisedWaveguide>,
    post_fx: Handle<GenericHandle>,
    sender: Producer<f32>,
    lpf: Vec<Handle<OnePoleLpfHandle>>,
    out_bus: Handle<GenericHandle>,
}
impl QuantisedCategories {
    pub fn new(amp: f32, sample_rate: f32, out_bus: Handle<GenericHandle>) -> Self {
        println!("Creating QuantisedCategories");
        knyst_commands().to_top_level_graph();
        // let to_freq53 = |degree, root| 2.0_f32.powf(degree as f32 / 53.) * root;

        let (mut sender, mut receiver) = rtrb::RingBuffer::<f32>::new(16);
        for _ in 0..16 {
            sender.push(0.0).unwrap();
        }

        let post_fx = handle(
            gen(move |ctx, _| {
                receiver.pop().unwrap();
                let in0 = ctx.inputs.get_channel(0);
                let in1 = ctx.inputs.get_channel(1);
                let in2 = ctx.inputs.get_channel(2);
                let in3 = ctx.inputs.get_channel(3);
                let mut outputs = ctx.outputs.iter_mut();
                let out0 = outputs.next().unwrap();
                let out1 = outputs.next().unwrap();
                let out2 = outputs.next().unwrap();
                let out3 = outputs.next().unwrap();
                for (((((((i0, i1), i2), i3), o0), o1), o2), o3) in in0
                    .iter()
                    .zip(in1)
                    .zip(in2)
                    .zip(in3)
                    .zip(out0.iter_mut())
                    .zip(out1.iter_mut())
                    .zip(out2.iter_mut())
                    .zip(out3.iter_mut())
                {
                    *o0 = (i0 * 2.5 * amp).clamp(-1.0, 1.0);
                    *o1 = (i1 * 2.5 * amp).clamp(-1.0, 1.0);
                    *o2 = (i2 * 2.5 * amp).clamp(-1.0, 1.0);
                    *o3 = (i3 * 2.5 * amp).clamp(-1.0, 1.0);
                }
                // dbg!(&inp);
                GenState::Continue
            })
            .input("in0")
            .input("in1")
            .input("in2")
            .input("in3")
            .output("sig0")
            .output("sig1")
            .output("sig2")
            .output("sig3"),
        );
        // k.connect(post_fx.to_graph_out().channels(4).to_channel(12));

        for i in 0..4 {
            // graph_output(3 * 4 + i, post_fx.out(i));
            out_bus.set(3 * 4 + i, post_fx.out(i));
        }

        let lpf: Vec<_> = (0..4)
            .map(|i| {
                let lpfna = one_pole_lpf().cutoff_freq(7000.);
                post_fx.set(i, lpfna);
                lpfna
            })
            .collect();

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
            // let trig_interval = 1.5 / ((i + 1) as f32);
            // let delay_time = 0.0;
            let trig_interval = 0.8;
            let delay_position = ((i) % num_syscall_kinds as usize) as f32 / num_syscall_kinds;
            let delay_time = trig_interval * delay_position;

            // let mut graph_settings = k.default_graph_settings();
            // graph_settings.num_outputs = 4;
            // let graph = Graph::new(graph_settings);
            // let graph_id = graph.id();
            // let graph = k.push(graph, inputs![]);
            // let k = k.to_graph(graph_id);

            let impulse = interval_trig().interval(trig_interval);
            let trig_delay = sample_delay(Superseconds::from_seconds_f64(2.))
                .signal(impulse)
                .delay_time(delay_time);
            let exciter = half_sine_wt().freq(3000.).amp(0.2).restart(trig_delay);

            let sine = oscillator(WavetableId::cos()).freq(freq * 2.0);
            let sine_env = Envelope {
                // Points are given in the format (value, time_to_reach_value)
                points: vec![
                    // (0.05 * (1.0 / ((i + 1) as f32)).powf(0.5), 0.01),
                    (0.03, 0.01),
                    (0.0, 0.2),
                ],
                ..Default::default()
            }
            .to_gen()
            .upload();
            sine_env.restart(trig_delay);
            let sine_mult0 = sine * sine_env;
            let sine_amp = bus(1).set(0, 0.25);

            let exciter_input = bus(1);
            exciter_input.set(0, exciter);
            let exciter_filter = one_pole_lpf().sig(exciter_input).cutoff_freq(200.);
            let wg = waveguide()
                .exciter(exciter_filter * 0.2)
                .freq(freq)
                .position(0.35)
                .feedback(0.999 * 1.005)
                .damping(9000. + freq * 4.0)
                .lf_damping(10.);
            // let sine = k.push(WavetableOscillatorOwned::new(Wavetable::sine()), inputs![]);
            // let lpf = k.push(OnePoleLPF::new(), inputs![("cutoff_freq" : 20000.)]);
            let wg_amp = bus(1).set(0, 0.1);
            let wg_amp_ramp = ramp().value(wg_amp).time(0.1);

            let mut value = 0.0;

            //     let pan = k.push(
            //     PanMonoToStereo,
            //     inputs![ ("pan": ((i/2) as f32 / (num_syscall_kinds/2.0))* (-1.0_f32).powi(i as i32))],
            // );
            let (pan_x, pan_y) = match i % 4 {
                0 => (-1., -1.),
                1 => (-1., 1.),
                2 => (1., 1.),
                3 => (1., -1.),
                _ => (0., 0.),
            };
            // let (pan_x, pan_y) = (0.0, 0.0);
            let pan = pan_mono_to_quad().pan_x(pan_x).pan_y(pan_y);
            if i > 7 {
                pan.input(sine_mult0 * sine_amp);
            } else {
                pan.input(wg * wg_amp_ramp);
            }
            // k.connect(pan.to(&post_fx).channels(1));
            for i in 0..4 {
                lpf[i].sig(pan.out(i));
                // k.connect(pan.to(&lpf[i]).channels(1).from_channel(i).to_channel(0));
            }
            let syscall_waveguide = SyscallKindQuantisedWaveguide::new(
                freq,
                wg,
                sine,
                sine_amp,
                exciter,
                pan,
                impulse,
                trig_delay,
                sender,
                delay_position,
            );
            continuous_wgs.insert(kind_label, syscall_waveguide);
        }
        Self {
            continuous_wgs,
            post_fx,
            sender,
            lpf,
            out_bus,
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
    fn patch_to_fx_chain(&mut self, fx_chain: usize) {
        self.post_fx.clear_graph_output_connections();
        // self.k
        //     .connect(Connection::clear_to_graph_outputs(&self.post_fx));
        for i in 0..4 {
            // graph_output(fx_chain * 4 + i, self.post_fx.out(i));
            self.out_bus.set(fx_chain * 4 + i, self.post_fx.out(i));
        }
        // self.k.connect(
        //     self.post_fx
        //         .to_graph_out()
        //         .channels(4)
        //         .to_channel(fx_chain * 4),
        // );
    }

    fn update(
        &mut self,
        osc_sender: &mut nannou_osc::Sender<Connected>,
        _sound_effecs: &SoundEffects,
    ) {
        if !self.sender.is_full() {
            schedule_bundle(Time::Immediately, || {
                let mut rng = thread_rng();
                self.sender.push(0.0).unwrap();
                for swg in self.continuous_wgs.values_mut() {
                    swg.update(&mut rng);
                }
                // TODO: Set new interval
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
            });
        }
    }

    fn free(&mut self) {
        for (_kind, wg) in self.continuous_wgs.drain() {
            wg.free();
        }
        self.post_fx.free();
        for na in self.lpf.drain(..) {
            na.free()
        }
    }

    fn change_harmony(&mut self, scale: &[i32], root: f32) {
        schedule_bundle(Time::Immediately, || {
            for (i, syscall_kind) in enum_iterator::all::<SyscallKind>().enumerate() {
                let freq = to_freq53(
                    scale[i % scale.len()] + 53 * (i / scale.len()) as i32,
                    root * 4.,
                );

                self.continuous_wgs
                    .get_mut(&format!("{:?}", syscall_kind))
                    .unwrap()
                    .set_freq(freq);
            }
        });
    }
}

struct SyscallKindQuantisedWaveguide {
    freq: f32,
    wg: Handle<WaveguideHandle>,
    exciter: Handle<HalfSineWtHandle>,
    sine_amp: Handle<GenericHandle>,
    sine: Handle<OscillatorHandle>,
    pan: Handle<PanMonoToQuadHandle>,
    impulse: Handle<IntervalTrigHandle>,
    trig_delay: Handle<SampleDelayHandle>,
    exciter_sender: rtrb::Producer<f32>,
    accumulator: f32,
    coeff: f32,
    amp: f32,
    position: f32,
    damping: f64,
    delay_position: f32,
    last_coeff_change: Instant,
}

impl SyscallKindQuantisedWaveguide {
    pub fn new(
        freq: f32,
        wg: Handle<WaveguideHandle>,
        sine: Handle<OscillatorHandle>,
        sine_amp: Handle<GenericHandle>,
        exciter: Handle<HalfSineWtHandle>,
        pan: Handle<PanMonoToQuadHandle>,
        impulse: Handle<IntervalTrigHandle>,
        trig_delay: Handle<SampleDelayHandle>,
        exciter_sender: rtrb::Producer<f32>,
        delay_position: f32,
    ) -> Self {
        Self {
            freq,
            wg,
            exciter,
            sine,
            sine_amp,
            exciter_sender,
            accumulator: 0.0,
            coeff: 0.025,
            amp: 0.0,
            position: 0.1,
            damping: 0.0,
            pan,
            impulse,
            trig_delay,
            last_coeff_change: Instant::now(),
            delay_position,
        }
    }
    fn register_call(&mut self, id: i32, args: [i32; 3]) {
        // self.accumulator += id as f32 * self.coeff;
        self.accumulator += self.coeff;
        self.amp += 0.0000002 * self.coeff;
        self.amp *= 1.0 + self.coeff;
        self.position += id as f32 * 0.001;
        self.damping = (self.damping + 0.00001).clamp(0.0, 1.0);
        if self.position > 0.4 {
            self.position = 0.4;
        }
        if self.amp > 0.4 {
            self.amp = 0.4;
            if self.last_coeff_change.elapsed() > Duration::from_secs_f32(0.1) {
                self.coeff *= 0.98;
                self.last_coeff_change = Instant::now();
            }
        }
    }
    fn set_new_timing(&mut self, interval: f32) {
        let delay_time = interval * self.delay_position;
        self.trig_delay.delay_time(delay_time);
        self.impulse.interval(interval);
    }
    fn update(&mut self, rng: &mut ThreadRng) {
        // let feedback =
        //     1.01 - (1.0 - (self.amp * 3.2).clamp(0.0, 1.0).powf(1. / 4.)).clamp(0.0, 0.5);
        // let feedback = 0.9999 - (1.0 - (self.amp * 2.5).clamp(0.0, 1.0)).clamp(0.0, 0.9);
        let feedback = 0.9999;
        self.amp *= 0.999 - (self.amp * 0.15);
        if self.amp < 0.1 && self.last_coeff_change.elapsed() > Duration::from_secs_f32(0.2) {
            self.coeff *= 1.01;
            self.last_coeff_change = Instant::now();
        }
        self.damping *= 0.995;
        self.position *= 0.9985;
        if self.position < 0.1 {
            self.position = 0.1;
        }
        let applied_amp = self.amp.powi(2);
        self.exciter.amp(applied_amp);
        self.sine_amp.set(0, applied_amp * 0.5);
        self.wg
            .feedback(feedback)
            .position(0.1 + self.position)
            .damping(self.damping.powf(2.) as f32 * 2000. + 100. + self.freq * 7.);
    }
    fn set_freq(&mut self, freq: f32) {
        self.freq = freq;
        self.sine.freq(freq * 2.0);
        self.wg.freq(freq);
    }
    fn free(self) {
        self.exciter.free();
        self.sine.free();
        self.sine_amp.free();
        self.pan.free();
        self.impulse.free();
        self.trig_delay.free();
        self.wg.free();
    }
}
