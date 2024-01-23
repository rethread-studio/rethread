use std::{
    ffi::OsStr,
    time::{Duration, Instant},
};

use enum_iterator::{all, cardinality};
use knyst::{
    controller::upload_graph,
    envelope::envelope_gen,
    gen::{
        buffer_reader,
        filter::svf::{svf_filter, SvfFilterType},
        pan_mono_to_stereo,
    },
    handles::{GenericHandle, Handle},
    knyst_commands,
    prelude::*,
    prelude::{Buffer, KnystCommands},
    resources::BufferId,
};
use nannou_osc::Type;
use rand::{seq::SliceRandom, thread_rng, Rng};
use syscalls_shared::SyscallKind;

use anyhow::{anyhow, Result};

use crate::{pan_mono_to_quad, sound_effects::SoundEffects, sound_path, to_freq53, Sonifier};

pub enum SoundKind {
    Binary,
    /// param is number of different pitches from the chord to choose from
    FilteredNoise(usize),
}

struct PeakTrigger {
    pub threshold: f32,
    pub sound_kind: SoundKind,
}
impl PeakTrigger {
    pub fn new(threshold: f32, sound_kind: SoundKind) -> Self {
        Self {
            threshold,
            sound_kind,
        }
    }
}

pub struct PeakBinaries {
    sound_files: Vec<BufferId>,
    category_peaks: Vec<(String, f32)>,
    peak_triggers: Vec<PeakTrigger>,
    chord: Vec<i32>,
    root_freq: f32,
    out_bus: Handle<GenericHandle>,
    output_start_index: usize,
    last_filtered_noise: Instant,
}

impl PeakBinaries {
    pub fn new(out_bus: Handle<GenericHandle>, output_start_index: usize) -> Result<Self> {
        println!("Creating PeakBinaries");
        let mut sound_path = sound_path();
        sound_path.push("binaries/");
        let mut sound_files = Vec::new();
        let Ok(read_dir) = std::fs::read_dir(sound_path.clone()) else {
            return Err(anyhow!("Failed to open {:?}", sound_path));
        };
        for entry in read_dir {
            let entry = entry?;
            let path = entry.path();
            if let Some("wav") = path.extension().and_then(OsStr::to_str) {
                let sound_file = Buffer::from_sound_file(path)?;
                let buf = knyst_commands().insert_buffer(sound_file);
                sound_files.push(buf);
            }
        }
        // Load sound files
        // let thunderbird =
        //     Buffer::from_sound_file("/home/erik/Musik/syscalls_binaries/thunderbird_8bit.wav");
        // let category_peaks = vec![0.; cardinality::<SyscallKind>()];
        let category_peaks = all::<SyscallKind>()
            .map(|k| (format!("{k:?}"), 0.0))
            .collect();
        Ok(Self {
            sound_files,
            category_peaks,
            peak_triggers: vec![],
            root_freq: 25.,
            chord: vec![0],
            out_bus,
            output_start_index,
            last_filtered_noise: Instant::now(),
        })
    }
    pub fn clear_triggers(&mut self) {
        self.peak_triggers.clear();
    }
    pub fn add_trig(&mut self, threshold: f32, sound_kind: SoundKind) {
        self.peak_triggers
            .push(PeakTrigger::new(threshold, sound_kind));
    }
}

impl Sonifier for PeakBinaries {
    fn apply_osc_message(&mut self, m: nannou_osc::Message) {
        if m.addr == "/syscall_analysis/category_peak" {
            let mut args = m.args.unwrap().into_iter();
            let kind = args.next().unwrap().string().unwrap();
            let peak = args.next().unwrap().float().unwrap();

            for (k, value) in self.category_peaks.iter_mut() {
                if *k == kind {
                    *value = peak;
                }
            }
        }
    }

    fn patch_to_fx_chain(&mut self, fx_chain: usize) {
        // Does nothing for now
    }

    fn change_harmony(&mut self, scale: &[i32], root: f32) {
        // Does nothing
        self.root_freq = root;
        self.chord = scale.iter().cloned().collect();
    }

    fn update(
        &mut self,
        osc_sender: &mut nannou_osc::Sender<nannou_osc::Connected>,
        _sound_effects: &SoundEffects,
    ) {
        let mut rng = fastrand::Rng::new();
        for (_kind, peak_value) in &mut self.category_peaks {
            for trig in &self.peak_triggers {
                if *peak_value > trig.threshold {
                    match trig.sound_kind {
                        SoundKind::Binary => {
                            let length = ((*peak_value - trig.threshold) * 0.002)
                                .clamp(0.0, 1.0)
                                .powf(0.5)
                                * (rng.f32().powi(2) * 0.8 + 0.4)
                                + 0.01;
                            // let addr = "/peak_binary";
                            // let args = vec![Type::Float(length)];
                            // osc_sender.send((addr, args)).ok();
                            // Play random binary file
                            let buffer = self.sound_files[rng.usize(..self.sound_files.len())];
                            play_binary_sound(
                                buffer,
                                length,
                                self.out_bus,
                                self.output_start_index,
                            );
                        }
                        SoundKind::FilteredNoise(num_pitches_from_chord) => {
                            if self.last_filtered_noise.elapsed() > Duration::from_secs_f32(0.5) {
                                let length = (*peak_value * 0.2).clamp(1.0, 3.0);
                                let degree_index =
                                    rng.usize(0..(num_pitches_from_chord.min(self.chord.len())));
                                let degree = self.chord[degree_index];
                                let mut freq = to_freq53(degree, self.root_freq);
                                while freq < 750. {
                                    freq *= 2.;
                                }
                                // let addr = "/background_noise";
                                // let args = vec![Type::Float(length), Type::Float(freq)];
                                // osc_sender.send((addr, args)).ok();
                                // Find the variation of the root closest to 1000Hz
                                // let freq = find_variation_closest_to_1000(freq);
                                spawn_filtered_noise(freq, length, self.out_bus);
                                self.last_filtered_noise = Instant::now();
                            }
                        }
                    }
                }
            }
        }
        for (_kind, peak_value) in &mut self.category_peaks {
            *peak_value = 0.0;
        }
    }

    fn free(&mut self) {
        // Does nothing for now
    }
}

fn play_binary_sound(
    buffer: BufferId,
    length: f32,
    out_bus: Handle<GenericHandle>,
    start_index: usize,
) {
    knyst_commands().to_top_level_graph();
    // Start time [0, 0.5] * buffer length
    // front_back_mix 0 -> 1.0
    let amp = 0.035;
    let mut rng = thread_rng();
    let bin_graph = upload_graph(
        knyst_commands()
            .default_graph_settings()
            .num_inputs(0)
            .num_outputs(4),
        || {
            let front_back_pan = envelope_gen(
                -1.0,
                vec![(1.0, length)],
                knyst::envelope::SustainMode::NoSustain,
                knyst::gen::StopAction::Continue,
            );
            let env = envelope_gen(
                0.0,
                vec![(amp, 0.005), (amp, length), (0.0, 0.001)],
                knyst::envelope::SustainMode::NoSustain,
                knyst::gen::StopAction::FreeGraph,
            );
            let start_time = buffer.duration() * rng.gen_range(0.0f64..0.5);
            // TODO: Start in the middle
            let buf = BufferReader::new(buffer, 1.0, false, knyst::gen::StopAction::Continue)
                .start_at(start_time)
                .upload();
            let sig = buf * env;
            graph_output(
                0,
                pan_mono_to_quad()
                    .input(sig)
                    .pan_x(rng.gen::<f32>() * 2.0 - 1.0)
                    .pan_y(front_back_pan),
            );
        },
    );
    out_bus.set(start_index, bin_graph);
}

fn spawn_filtered_noise(freq: f32, length: f32, out_bus: Handle<GenericHandle>) {
    let mut rng = thread_rng();
    knyst_commands().to_top_level_graph();
    let front_back_mix = rng.gen_range(-1.0..1.0);
    let filtered_noise = upload_graph(
        knyst_commands()
            .default_graph_settings()
            .num_inputs(0)
            .num_outputs(4),
        || {
            let env = envelope_gen(
                0.0,
                vec![
                    (1.0, rng.gen_range(0.7..1.9)),
                    (0.5, length * 0.34),
                    (0.0, length * 0.66),
                ],
                knyst::envelope::SustainMode::NoSustain,
                StopAction::FreeGraph,
            );
            let source = pink_noise();
            let sig = svf_filter(
                SvfFilterType::Band,
                freq,
                rng.gen_range(2000.0..10000.),
                0.0,
            )
            .input(source);
            let sig = sig * env * 0.001;
            graph_output(
                0,
                pan_mono_to_quad()
                    .pan_x(0.0)
                    .pan_y(front_back_mix)
                    .input(sig),
            );
        },
    );
    out_bus.set(8, filtered_noise);
}

fn find_variation_closest_to_1000(root: f32) -> f32 {
    let linear_1000 = 1000.0f32.log2().fract();
    let mut best_match = 1.0;
    let mut chosen_freq = root;
    for interval in [1., 5. / 4., 3. / 2.] {
        let linear_interval = (root * interval).log2().fract();
        let comp = (linear_interval - linear_1000).abs();
        if comp < best_match {
            chosen_freq = root * interval;
            best_match = comp;
        }
    }
    while chosen_freq * 2. < 1500. {
        chosen_freq *= 2.;
    }
    chosen_freq
}
