use std::{path::PathBuf, thread::spawn, time::Duration};

use knyst::{
    controller::schedule_bundle,
    envelope::{envelope_gen, Curve, EnvelopeGen},
    gen::{
        filter::{
            one_pole::{one_pole_hpf, one_pole_lpf},
            svf::{svf_dynamic, svf_filter, SvfFilterType},
        },
        random::random_lin,
    },
    graph::Time,
    handles::GenericHandle,
    knyst_commands,
    prelude::*,
    resources::BufferId,
};
use knyst_visualiser::probe;
use rand::{thread_rng, Rng};

use crate::Sonifier;

pub struct BackgroundNoise {
    noise_buffers: Vec<BufferId>,
    amp: Handle<GenericHandle>,
    amp_ramp_time: Handle<GenericHandle>,
    root_freq: Handle<GenericHandle>,
    root_freq_ramp_time: Handle<GenericHandle>,
    resonant_filters_mix: Handle<GenericHandle>,
    lpf_freq: Handle<GenericHandle>,
    hpf_freq: Handle<GenericHandle>,
    buf_reader: Handle<BufferReaderMultiHandle>,
    out_bus: Handle<GenericHandle>,
}

impl BackgroundNoise {
    /// Load all the required buffers etc to prepare to start the background noise, then start the noise.
    pub fn new(
        start_channel: usize,
        output_bus: Handle<GenericHandle>,
        mut sounds_path: PathBuf,
        root_freq: f32,
    ) -> Self {
        sounds_path.push("noise/");
        let noise_sound_files = ["noise_4ch_0.wav", "noise_4ch_1.wav", "noise_4ch_2.wav"];
        let noise_buffers: Vec<_> = noise_sound_files
            .into_iter()
            .filter_map(|filename| {
                let mut path = sounds_path.clone();
                path.push(filename);
                if let Ok(sound_buffer) = Buffer::from_sound_file(path.clone()) {
                    let channels = sound_buffer.num_channels();
                    if channels != 4 {
                        eprintln!("Noise buffer was not 4 channels, but {channels}");
                    }
                    let buffer = knyst_commands().insert_buffer(sound_buffer);
                    Some(buffer)
                } else {
                    eprintln!("Noise buffer at path {:?} could not be loaded", path);
                    None
                }
            })
            .collect();
        knyst_commands().init_local_graph(
            knyst_commands()
                .default_graph_settings()
                .num_inputs(0)
                .num_outputs(4),
        );
        let amp = bus(1).set(0, 0.2);
        let amp_ramp_time = bus(1).set(0, 5.0);
        let root_freq_bus = bus(1).set(0, root_freq);
        let root_freq_ramp_time = bus(1).set(0, 1.0);
        let ramped_root_freq = ramp(root_freq)
            .time(root_freq_ramp_time)
            .value(root_freq_bus);
        // probe().input(ramped_root_freq);
        let resonant_filters_mix = bus(1).set(0, 0.0);
        resonant_filters_mix.set(0, random_lin().freq(0.25));
        let buf_reader = BufferReaderMulti::new(noise_buffers[1], 1.0, StopAction::FreeSelf)
            .channels(4)
            .looping(true)
            .upload();
        let sig = buf_reader * ramp(0.2).value(amp).time(amp_ramp_time);
        let mut freq_sigs = vec![];
        // let q = 600.;
        for mul in [4, 8, 12, 16] {
            let q = random_lin().freq(0.5) * 10000. + 100.;
            let detune = (random_lin().freq(2.7) * 0.01 - 0.005) + 1.0;
            let f_sig = svf_dynamic(SvfFilterType::Band)
                .cutoff_freq(ramped_root_freq * mul as f32 * detune)
                .q(q)
                .gain(0.0)
                .input(sig.out(0) * 0.01);
            nan_fuse().input(f_sig);
            freq_sigs.push(f_sig);
        }
        let freq_sigs = freq_sigs[0] + freq_sigs[1] + freq_sigs[2] + freq_sigs[3];
        let sig =
            sig * (1.0 - resonant_filters_mix) + (freq_sigs.channels(4) * resonant_filters_mix);
        // let sig = sig + freq_sigs.channels(4);
        let sig = sig * 0.1;
        let lpf_freq_bus = bus(1).set(0, 20000.);
        let hpf_freq_bus = bus(1).set(0, 20.);
        let mut sigs = vec![];
        for i in 0..4 {
            let s = one_pole_hpf()
                .cutoff_freq(hpf_freq_bus)
                .sig(one_pole_lpf().cutoff_freq(lpf_freq_bus).sig(sig.out(i)));
            sigs.push(s);
        }
        for i in 0..4 {
            graph_output(i, sigs[i]);
        }
        let g = knyst_commands().upload_local_graph().unwrap();
        graph_output(start_channel, g);
        // let output_channels = sig.out_channels().count();
        // println!("Output channels from sig: {output_channels}");
        // for i in 0..4 {
        //     output_bus.set(start_channel + i, sig.out(i));
        // }
        Self {
            noise_buffers,
            amp,
            amp_ramp_time,
            resonant_filters_mix,
            buf_reader,
            out_bus: output_bus,
            root_freq: root_freq_bus,
            root_freq_ramp_time,
            lpf_freq: lpf_freq_bus,
            hpf_freq: hpf_freq_bus,
        }
    }
    pub fn change_harmony(&mut self, root: f32) {
        self.root_freq.set(0, root);
    }
    pub fn fade_in(&mut self, duration: f32, amp: f32) {
        schedule_bundle(Time::Immediately, || {
            self.amp_ramp_time.set(0, duration);
            self.amp.set(0, amp);
        });
    }
    pub fn fade_out(&mut self, duration: f32) {
        schedule_bundle(Time::Immediately, || {
            self.amp_ramp_time.set(0, duration);
            self.amp.set(0, 0.0);
        });
    }
    pub fn fade_out_then_in(&mut self, duration_out: f32, wait: f32, duration_in: f32) {
        {
            let amp_ramp_time = self.amp_ramp_time;
            let amp = self.amp;
            schedule_bundle(Time::Immediately, || {
                self.amp_ramp_time.set(0, duration_out);
                self.amp.set(0, 0.0);
            });
            std::thread::spawn(move || {
                std::thread::sleep(Duration::from_secs_f32(wait + duration_out));
                schedule_bundle(Time::Immediately, || {
                    amp_ramp_time.set(0, duration_in);
                    amp.set(0, 0.2);
                });
            });
        }
    }
    /// For the end of the piece
    pub fn end_ramp_to_max_then_zero(&mut self) {
        schedule_bundle(Time::Immediately, || {
            // 12 seconds

            // q from max to 0.1 in 9s
            // pitch_mix to 0.0 in 10s
            self.resonant_filters_mix.set(0, 0.0);
            // LPF on everything from 10 to 15000 hz in 10s (with some randomness added in)
            self.lpf_freq.clear_input_connections();
            self.lpf_freq.set(0, 0.);
            self.lpf_freq.set(
                0,
                exp_line_segment(10., 15000., Seconds::from_seconds_f64(10.)),
            );
            // HPF on everything from 200 to 10hz in 8s
            self.hpf_freq.clear_input_connections();
            self.hpf_freq.set(0, 0.);
            self.hpf_freq.set(
                0,
                exp_line_segment(200., 10., Seconds::from_seconds_f64(8.)),
            );
            // amp of everything is XLine.kr(0.1, 0.20, 12.0);
            let amp_env = EnvelopeGen::new(
                0.1,
                vec![(0.2, 12.), (0., 0.02)],
                knyst::envelope::SustainMode::NoSustain,
                StopAction::Continue,
            )
            .curves(vec![Curve::Exponential(2.), Curve::Linear])
            .upload();
            self.amp.clear_input_connections();
            self.amp.set(0, 0.);
            self.amp.set(
                0, amp_env, // exp_line_segment(0.1, 0.2, Seconds::from_seconds_f64(12.)),
            );
        });
    }
}

pub struct NanFuse;
#[impl_gen]
impl NanFuse {
    fn new() -> Self {
        Self
    }
    pub fn process(&mut self, input: &[Sample]) -> GenState {
        for v in input {
            if v.is_nan() {
                panic!();
            }
        }
        GenState::Continue
    }
}

pub struct StderrDump;
#[impl_gen]
impl StderrDump {
    fn new() -> Self {
        Self
    }
    pub fn process(&mut self, input: &[Sample]) -> GenState {
        eprintln!("{input:?}");
        GenState::Continue
    }
}
