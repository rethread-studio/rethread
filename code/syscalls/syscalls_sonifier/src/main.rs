use std::ops::Range;
use std::path::PathBuf;
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant};

use background_noise::BackgroundNoise;
use knyst::envelope::envelope_gen;
use knyst::gen::filter::svf::{svf_dynamic, SvfFilterType};
use knyst::handles::GenericHandle;
use knyst::prelude::*;
use knyst::*;

use anyhow::Result;
use knyst_visualiser::probe;
use nannou_osc::rosc::OscPacket;
use nannou_osc::{receiver, sender, Connected, Message as OscMessage, Sender, Type};
use peak_binaries::SoundKind;
use rand::{thread_rng, Rng};
use sound_effects::SoundEffects;
use syscalls_shared::SyscallKind;

use crate::direct_categories::DirectCategories;
use crate::direct_functions::DirectFunctions;
use crate::harmony::HarmonicChange;
use crate::init_main_effects::init_main_effects;
use crate::peak_binaries::PeakBinaries;
use crate::program_themes::ProgramThemes;
use crate::quantised_categories::QuantisedCategories;

mod background_noise;
mod direct_categories;
mod direct_functions;
mod harmony;
mod init_main_effects;
pub mod note;
mod peak_binaries;
pub mod phrase;
mod program_themes;
mod quantised_categories;
mod sound_effects;

const RUMBLE_RESTART: i32 = 1;
const RUMBLE_STOP: i32 = 2;

static SOUND_PATH: OnceLock<PathBuf> = OnceLock::new();

fn sound_path() -> PathBuf {
    SOUND_PATH
        .get_or_init(|| PathBuf::from("/home/erik/Musik/syscalls/"))
        .clone()
}

fn main() -> Result<()> {
    let mut backend = audio_backend::JackBackend::new("knyst_waveguide_syscalls")?;

    let stop = Arc::new(AtomicBool::new(false));
    let stop_message = Arc::new(Mutex::new(String::from("Bye!")));
    let sample_rate = backend.sample_rate() as f32;
    let block_size = backend.block_size().unwrap_or(64);
    println!("sr: {sample_rate}, block: {block_size}");
    let _sphere = KnystSphere::start(
        &mut backend,
        SphereSettings {
            num_inputs: 1,
            num_outputs: 24,
            resources_settings: ResourcesSettings {
                max_buffers: 1000,
                ..Default::default()
            },
            scheduling_ring_buffer_capacity: 10000,
            ..Default::default()
        },
        |e| {
            eprintln!("!! Error:{e}");
            // *stop_message.lock().unwrap() = format!("{e:?}");
            // stop.store(true, std::sync::atomic::Ordering::SeqCst);
        },
    );

    let output_bus = bus(24);
    init_main_effects(output_bus);

    let osc_receiver = receiver(7376).unwrap();
    let mut osc_sender = sender().unwrap().connect("127.0.0.1:57120").unwrap();
    let mut current_sonifiers: Vec<Box<dyn Sonifier + Send>> = vec![];
    // current_sonifiers = vec![Box::new(DirectCategories::new(
    //     1.0,
    //     sample_rate,
    //     output_bus,
    // ))];
    // current_sonifiers = vec![Box::new(QuantisedCategories::new(&mut k, sample_rate))];
    // current_sonifier = Some(Box::new(DirectFunctions::new(
    //     &mut k,
    //     sample_rate,
    //     &enum_iterator::all::<SyscallKind>().collect::<Vec<_>>(),
    // )));
    // current_sonifiers = vec![Box::new(DirectFunctions::new(
    //     &mut k,
    //     sample_rate,
    //     &[
    //         SyscallKind::Io,
    //         SyscallKind::WaitForReady,
    //         SyscallKind::Random,
    //         SyscallKind::Permissions,
    //         SyscallKind::SystemInfo,
    //         SyscallKind::Memory,
    //     ],
    //     vec![
    //         SyscallKind::Io,
    //         SyscallKind::Memory,
    //         SyscallKind::WaitForReady,
    //     ],
    // ))];
    // current_sonifiers = vec![Box::new(ProgramThemes::new(&mut k))];
    current_sonifiers = vec![];
    for sonifier in &mut current_sonifiers {
        sonifier.patch_to_fx_chain(1);
    }
    let mut osc_messages = Vec::with_capacity(40);
    let mut last_switch = Instant::now();
    let mut last_chord_change = Instant::now();
    let mut mvt_id = 99998;
    let mut root_freq = 25.;
    let mut root: i32 = 0;
    let chord_maj7sharp11 = vec![0, 17, 31, 48, 53, 53 + 26, 53 + 31];
    let chord_9 = vec![0 + 5, 17 + 5, 31 + 5, 44 + 5, 53 + 5, 62 + 5, 53 + 17 + 5];
    let mut current_chord = chord_maj7sharp11.clone();
    let mut chord_change_interval = Some(Duration::from_secs(8));
    // let chords = [chord_maj7sharp11, chord_9];
    let mut current_harmonic_change = 0;
    let harmonic_changes = vec![
        HarmonicChange::new().transpose(5),
        HarmonicChange::new()
            .new_chord(chord_9.clone())
            .transpose(-5),
        HarmonicChange::new()
            .new_chord(chord_maj7sharp11.clone())
            .transpose(5),
        HarmonicChange::new().transpose(5),
        HarmonicChange::new()
            .new_chord(chord_9.clone())
            .transpose(9),
        HarmonicChange::new().new_chord(chord_maj7sharp11.clone()),
    ];

    let background_noise = BackgroundNoise::new(16, output_bus, sound_path(), root_freq);
    knyst_commands().to_top_level_graph();
    let chord_amp_setter = bus(1).set(0, 1.0).set_mortality(false);
    let chord_amp = ramp(1.0)
        .value(chord_amp_setter)
        .time(0.01)
        .set_mortality(false);
    let mut app = App {
        current_sonifiers,
        current_chord,
        chord_change_interval,
        osc_sender,
        last_switch,
        last_chord_change,
        mvt_id,
        root_freq,
        root,
        harmonic_changes,
        sample_rate,
        current_harmonic_change,
        is_on_break: false,
        transposition_within_octave_guard: true,
        background_noise,
        sound_effects: SoundEffects::new(output_bus).unwrap(),
        peak_binaries: PeakBinaries::new(output_bus, 0)?,
        main_bus: output_bus,
        chord_amp_setter,
        chord_amp,
        current_movement_start: Instant::now(),
        current_movement_duration: Duration::ZERO,
    };
    // let mut current_chord = 0;
    let mut rng = thread_rng();

    // app.peak_binaries.add_trig(3.0, SoundKind::Binary);
    app.change_movement(2, None, false, 300.);
    // app.change_movement(42, None, false, 30.);
    // main loop
    std::thread::spawn(move || {
        loop {
            // Receive OSC messages
            if let Ok(Some(mess)) = osc_receiver.try_recv() {
                mess.0.unfold(&mut osc_messages);
            }
            for m in osc_messages.drain(..) {
                if m.addr == "/new_movement" {
                    if let Some(args) = m.args {
                        let mut args = args.into_iter();
                        let new_mvt_id = args.next().unwrap().int().unwrap();
                        let is_break = args.next().unwrap().bool().unwrap();
                        let description = args.next().unwrap().string().unwrap();
                        let next_mvt_id = args.next().unwrap().int().unwrap();
                        let duration = args.next().unwrap().float().unwrap();
                        let next_mvt_id = if next_mvt_id == -1 {
                            None
                        } else {
                            Some(next_mvt_id)
                        };
                        println!("New movement, {new_mvt_id}, break: {is_break:?}");
                        if is_break {
                            app.sound_effects.play_bell_a();
                        } else {
                            app.sound_effects.play_bell_b();
                        }
                        app.sound_effects.play_movement_voice(new_mvt_id);
                        app.change_movement(new_mvt_id, next_mvt_id, is_break, duration);
                    }
                } else if m.addr == "/score/play" {
                    if let Some(args) = m.args {
                        let mut args = args.into_iter();
                        let val = args.next().unwrap().int().unwrap();
                        if val == 0 {
                            // Score stopped
                            app.stop_playing();
                        }
                    }
                } else {
                    app.apply_osc_message(m);
                }
            }

            osc_messages.clear();

            app.update();

            if last_switch.elapsed() > Duration::from_secs_f32(10.) {
                // if let Some(sonifier) = &mut current_sonifier {
                //     if mvt_id == 5 {
                //         if rng.gen::<f32>() > 0.8 {
                //             sonifier.patch_to_fx_chain(1);
                //         } else {
                //             sonifier.patch_to_fx_chain(2);
                //         }
                //     } else if mvt_id == 0 {
                //         if rng.gen::<f32>() > 0.8 {
                //             sonifier.patch_to_fx_chain(2);
                //         } else {
                //             sonifier.patch_to_fx_chain(1);
                //         }
                //     }
                //     // sonifier.patch_to_fx_chain(rng.gen::<usize>() % 3 + 1);
                // }
                //     let mut old_sonifier = current_sonifier.take().unwrap();
                //     old_sonifier.free();
                //     k.free_disconnected_nodes();
                //     let mut rng = thread_rng();
                //     match rng.gen::<usize>() % 3 {
                //         0 => {
                //             current_sonifier =
                //                 Some(Box::new(QuantisedCategories::new(&mut k, sample_rate)));
                //             println!("QuantisedCat");
                //         }
                //         1 => {
                //             current_sonifier = Some(Box::new(DirectCategories::new(&mut k, sample_rate)));
                //             println!("DirectCat");
                //         }
                //         2 => {
                //             current_sonifier = Some(Box::new(DirectFunctions::new(&mut k, sample_rate)));
                //             println!("DirectFunc");
                //         }
                //         _ => (),
                //     }
                last_switch = Instant::now();
            }
            if stop.load(std::sync::atomic::Ordering::SeqCst) {
                eprintln!("{}", stop_message.lock().unwrap());
                break;
            }
        }
    });

    // Init visualiser
    knyst_visualiser::init_knyst_visualiser();

    Ok(())
}

struct App {
    current_sonifiers: Vec<Box<dyn Sonifier + Send>>,
    current_chord: Vec<i32>,
    chord_change_interval: Option<Duration>,
    // osc_receiver: Receiver<Connected>,
    osc_sender: Sender<Connected>,
    last_switch: Instant,
    last_chord_change: Instant,
    mvt_id: i32,
    root_freq: f32,
    root: i32,
    harmonic_changes: Vec<HarmonicChange>,
    current_harmonic_change: usize,
    sample_rate: f32,
    is_on_break: bool,
    transposition_within_octave_guard: bool,
    background_noise: BackgroundNoise,
    peak_binaries: PeakBinaries,
    sound_effects: SoundEffects,
    main_bus: Handle<GenericHandle>,
    chord_amp_setter: Handle<GenericHandle>,
    chord_amp: Handle<RampHandle>,
    current_movement_start: Instant,
    current_movement_duration: Duration,
}
impl App {
    pub fn apply_osc_message(&mut self, m: OscMessage) {
        for sonifier in &mut self.current_sonifiers {
            sonifier.apply_osc_message(m.clone());
        }
        self.peak_binaries.apply_osc_message(m.clone());
        match m.addr.as_ref() {
            "/syscall"
            | "/syscall_analysis/per_kind_interval"
            | "/syscall_analysis"
            | "/syscall_analysis/category_peak" => (),
            _ => {
                dbg!(m);
            }
        }
    }
    pub fn update(&mut self) {
        let App {
            current_sonifiers,
            current_chord,
            chord_change_interval,
            osc_sender,
            last_switch,
            last_chord_change,
            mvt_id,
            root_freq,
            root,
            harmonic_changes,
            sample_rate,
            current_harmonic_change,
            is_on_break,
            transposition_within_octave_guard,
            background_noise,
            peak_binaries,
            main_bus,
            sound_effects,
            chord_amp,
            current_movement_start,
            current_movement_duration,
            chord_amp_setter,
        } = self;
        let change_harmony = if current_movement_start.elapsed() < *current_movement_duration {
            if let Some(time_interval) = &chord_change_interval {
                if last_chord_change.elapsed() > *time_interval && !*is_on_break {
                    harmonic_changes[*current_harmonic_change].apply(
                        current_chord,
                        root,
                        *transposition_within_octave_guard,
                    );
                    // let addr = "/change_harmony";
                    let root = to_freq53(*root, *root_freq);
                    // let mut args = vec![Type::Float(root)];
                    // args.push(Type::Int(current_chord.len() as i32));
                    // for degree in &*current_chord {
                    //     args.push(Type::Int(*degree));
                    // }
                    // osc_sender.send((addr, args)).ok();
                    let chord_freqs: Vec<_> = current_chord
                        .iter()
                        .map(|degree| to_freq53(*degree, root) * 8.)
                        .collect();
                    let length_max = 14.0f32.min(time_interval.as_secs_f32() * 3.0);
                    let length_min = 6.0f32.min(length_max * 0.5);
                    changed_harmony_chord(&chord_freqs, *chord_amp, length_min, length_max);
                    background_noise.change_harmony(root);

                    *current_harmonic_change =
                        (*current_harmonic_change + 1) % harmonic_changes.len();
                    println!("Changed harmony to scale {current_chord:?}, root: {root}");
                    *last_chord_change = Instant::now();
                    true
                } else {
                    false
                }
            } else {
                false
            }
        } else {
            false
        };
        for sonifier in &mut *current_sonifiers {
            sonifier.update(osc_sender, &sound_effects);
            if change_harmony {
                let root = to_freq53(*root, *root_freq);
                sonifier.change_harmony(&current_chord, root);
            }
        }
        peak_binaries.update(osc_sender, &self.sound_effects);
    }
    pub fn stop_playing(&mut self) {
        for sonifier in &mut self.current_sonifiers {
            sonifier.free();
        }
        self.chord_change_interval = None;
        knyst_commands().free_disconnected_nodes();
        self.current_sonifiers.clear();
    }
    pub fn change_movement(
        &mut self,
        new_mvt_id: i32,
        next_mvt_id: Option<i32>,
        is_break: bool,
        duration: f32,
    ) {
        let App {
            current_sonifiers,
            // osc_receiver,
            osc_sender,
            last_switch,
            last_chord_change,
            mvt_id,
            root_freq,
            root,
            harmonic_changes,
            sample_rate,
            chord_change_interval,
            current_chord,
            current_harmonic_change,
            is_on_break,
            transposition_within_octave_guard,
            background_noise,
            peak_binaries,
            main_bus,
            sound_effects,
            chord_amp,
            current_movement_start,
            current_movement_duration,
            chord_amp_setter,
        } = self;

        if new_mvt_id != *mvt_id {
            *current_movement_start = Instant::now();
            *current_movement_duration = Duration::from_secs_f32(duration);
            peak_binaries.clear_triggers();
            let sample_rate = *sample_rate;

            for sonifier in &mut *current_sonifiers {
                sonifier.free();
            }
            let mut k = knyst_commands();
            k.free_disconnected_nodes();
            current_sonifiers.clear();
            *is_on_break = is_break;
            *transposition_within_octave_guard = true;
            if new_mvt_id != 99 {
                chord_amp_setter.set(0, 1.0);
            }
            let mut background_ramp = None;
            let mut rumble_change = None;
            if !is_break {
                // let tags = description.split(",");
                // println!("tags: {:?}", tags.clone().collect::<Vec<_>>());
                match new_mvt_id {
                    0 => {
                        background_ramp = Some(BackgroundRamp {
                            bwr_low: 0.01..0.1,
                            bwr_high: 0.5..1.5,
                            lpf_low: 50.0..200.0,
                            lpf_high: 2000.0..10000.0,
                        });
                        *chord_change_interval = None;
                        *current_sonifiers =
                            vec![Box::new(DirectCategories::new(0.5, sample_rate, *main_bus))];
                        for s in current_sonifiers.iter_mut() {
                            s.patch_to_fx_chain(1);
                        }
                        rumble_change = Some(RUMBLE_STOP);
                    }
                    100 => {
                        // interlude
                        background_ramp = Some(BackgroundRamp {
                            bwr_low: 0.01..0.04,
                            bwr_high: 0.5..0.5,
                            lpf_low: 200.0..200.0,
                            lpf_high: 10000.0..2000.0,
                        });
                        *chord_change_interval = None;
                        *current_sonifiers =
                            vec![Box::new(DirectCategories::new(0.5, sample_rate, *main_bus))];
                        for s in current_sonifiers.iter_mut() {
                            s.patch_to_fx_chain(1);
                        }
                        rumble_change = Some(RUMBLE_RESTART);
                    }
                    40 => {
                        background_ramp = Some(BackgroundRamp {
                            bwr_low: 0.04..0.04,
                            bwr_high: 0.8..0.8,
                            lpf_low: 100.0..100.0,
                            lpf_high: 20000.0..200.0,
                        });
                        *chord_change_interval = None;

                        peak_binaries.add_trig(2.0, SoundKind::Binary);
                        peak_binaries.add_trig(5.0, SoundKind::FilteredNoise(8));
                        *current_sonifiers = vec![];
                        for s in current_sonifiers.iter_mut() {
                            s.patch_to_fx_chain(1);
                        }
                    }
                    2 => {
                        background_ramp = Some(BackgroundRamp {
                            bwr_low: 0.004..0.008,
                            bwr_high: 0.5..0.8,
                            lpf_low: 200.0..200.0,
                            lpf_high: 2000.0..1000.0,
                        });
                        *chord_change_interval = None;
                        *current_sonifiers = vec![Box::new(DirectFunctions::new(
                            1.0,
                            sample_rate,
                            &enum_iterator::all::<SyscallKind>().collect::<Vec<_>>(),
                            vec![],
                            *main_bus,
                        ))];
                        for s in current_sonifiers.iter_mut() {
                            s.patch_to_fx_chain(1);
                        }
                        rumble_change = Some(RUMBLE_RESTART);
                    }
                    102 => {
                        // interlude
                        background_ramp = Some(BackgroundRamp {
                            bwr_low: 0.14..0.02,
                            bwr_high: 0.9..0.7,
                            lpf_low: 200.0..200.0,
                            lpf_high: 2000.0..5000.0,
                        });
                        *chord_change_interval = None;
                        let mut sonifier = DirectFunctions::new(
                            1.0,
                            sample_rate,
                            &enum_iterator::all::<SyscallKind>().collect::<Vec<_>>(),
                            vec![],
                            *main_bus,
                        );
                        sonifier.decrease_sensitivity = true;
                        peak_binaries.add_trig(2.0, SoundKind::FilteredNoise(5));
                        *current_sonifiers = vec![Box::new(sonifier)];
                        for s in current_sonifiers.iter_mut() {
                            s.patch_to_fx_chain(1);
                        }
                        rumble_change = Some(RUMBLE_STOP);
                    }
                    4 => {
                        background_ramp = Some(BackgroundRamp {
                            bwr_low: 0.014..0.012,
                            bwr_high: 0.9..1.5,
                            lpf_low: 200.0..2000.0,
                            lpf_high: 2000.0..12000.0,
                        });
                        *current_sonifiers = vec![Box::new(QuantisedCategories::new(
                            1.3,
                            sample_rate,
                            *main_bus,
                        ))];
                        for s in current_sonifiers.iter_mut() {
                            s.patch_to_fx_chain(1);
                        }
                        rumble_change = Some(RUMBLE_RESTART);
                    }
                    104 => {
                        // Interlude
                        background_ramp = Some(BackgroundRamp {
                            bwr_low: 0.04..0.001,
                            bwr_high: 0.9..0.8,
                            lpf_low: 200.0..20.0,
                            lpf_high: 12000.0..12000.0,
                        });
                        // TODO: Much louder quantised categories
                        *current_sonifiers = vec![Box::new(QuantisedCategories::new(
                            2.0, // prev: 10
                            sample_rate,
                            *main_bus,
                        ))];

                        for s in current_sonifiers.iter_mut() {
                            s.patch_to_fx_chain(1);
                        }
                    }
                    6 => {
                        background_ramp = Some(BackgroundRamp {
                            bwr_low: 0.14..0.101,
                            bwr_high: 1.0..1.8,
                            lpf_low: 200.0..20.0,
                            lpf_high: 12000.0..5000.0,
                        });
                        *chord_change_interval = Some(Duration::from_secs(8));
                        let mut df = DirectFunctions::new(
                            1.0,
                            sample_rate,
                            &enum_iterator::all::<SyscallKind>().collect::<Vec<_>>(),
                            vec![
                                SyscallKind::Io,
                                SyscallKind::Memory,
                                SyscallKind::WaitForReady,
                            ],
                            *main_bus,
                        );
                        df.decrease_sensitivity = true;
                        *current_sonifiers = vec![Box::new(df)];
                        for s in current_sonifiers.iter_mut() {
                            s.patch_to_fx_chain(3);
                        }
                    }
                    106 => {
                        background_ramp = Some(BackgroundRamp {
                            bwr_low: 0.34..0.101,
                            bwr_high: 1.2..1.0,
                            lpf_low: 200.0..200.0,
                            lpf_high: 500.0..5000.0,
                        });
                        *chord_change_interval = Some(Duration::from_secs(8));
                        let mut sonifier = DirectFunctions::new(
                            1.0,
                            sample_rate,
                            &enum_iterator::all::<SyscallKind>().collect::<Vec<_>>(),
                            vec![
                                SyscallKind::Io,
                                SyscallKind::Memory,
                                SyscallKind::WaitForReady,
                            ],
                            *main_bus,
                        );
                        sonifier.decrease_sensitivity = true;
                        sonifier.patch_to_fx_chain(3);
                        sonifier.next_focus_time_range = 5.0..15.0;
                        *current_sonifiers = vec![Box::new(sonifier)];
                    }
                    5 => {
                        background_ramp = Some(BackgroundRamp {
                            bwr_low: 0.05..0.101,
                            bwr_high: 1.2..0.8,
                            lpf_low: 200.0..100.0,
                            lpf_high: 500.0..1000.0,
                        });
                        *chord_change_interval = None;
                        let mut qc = QuantisedCategories::new(1.0, sample_rate, *main_bus);
                        qc.patch_to_fx_chain(2);
                        peak_binaries.add_trig(3.0, SoundKind::Binary);
                        *current_sonifiers = vec![Box::new(qc)];
                        rumble_change = Some(RUMBLE_STOP);
                    }
                    10 => {
                        background_ramp = Some(BackgroundRamp {
                            bwr_low: 0.05..0.101,
                            bwr_high: 0.8..0.9,
                            lpf_low: 20.0..20.0,
                            lpf_high: 1000.0..7000.0,
                        });
                        *chord_change_interval = Some(Duration::from_secs(12));
                        peak_binaries.add_trig(5.0, SoundKind::FilteredNoise(3));
                        *current_sonifiers = vec![Box::new(ProgramThemes::new(0.1, *main_bus))];
                        current_sonifiers
                            .iter_mut()
                            .for_each(|s| s.patch_to_fx_chain(1));
                        rumble_change = Some(RUMBLE_RESTART);
                    }
                    111 => {
                        background_ramp = None;
                        *chord_change_interval = Some(Duration::from_secs(12));
                        peak_binaries.add_trig(3.0, SoundKind::Binary);
                        // pb.sound_kind = SoundKind::FilteredNoise(3);
                        *current_sonifiers = vec![Box::new(ProgramThemes::new(0.1, *main_bus))];
                        current_sonifiers
                            .iter_mut()
                            .for_each(|s| s.patch_to_fx_chain(1));
                    }
                    112 => {
                        background_ramp = None;
                        *chord_change_interval = Some(Duration::from_secs(12));
                        peak_binaries.add_trig(5.0, SoundKind::FilteredNoise(3));
                        *current_sonifiers = vec![Box::new(ProgramThemes::new(0.1, *main_bus))];
                        current_sonifiers
                            .iter_mut()
                            .for_each(|s| s.patch_to_fx_chain(1));
                    }
                    113 => {
                        background_ramp = None;
                        *chord_change_interval = Some(Duration::from_secs(6));
                        peak_binaries.add_trig(3.0, SoundKind::Binary);
                        *current_sonifiers = vec![Box::new(ProgramThemes::new(0.1, *main_bus))];
                        current_sonifiers
                            .iter_mut()
                            .for_each(|s| s.patch_to_fx_chain(1));
                    }
                    110 => {
                        background_ramp = Some(BackgroundRamp {
                            bwr_low: 0.15..0.101,
                            bwr_high: 0.8..0.9,
                            lpf_low: 20.0..20.0,
                            lpf_high: 1000.0..7000.0,
                        });
                        *chord_change_interval = None;
                        let mut pt = ProgramThemes::new(0.1, *main_bus);
                        pt.patch_to_fx_chain(1);
                        let mut dc = DirectCategories::new(0.08, sample_rate, *main_bus);
                        dc.patch_to_fx_chain(2);
                        dc.set_lpf(3000.);
                        *current_sonifiers = vec![Box::new(pt), Box::new(dc)];
                    }
                    122 => {
                        // interlude
                        *chord_change_interval = None;
                        let mut sonifier = DirectFunctions::new(
                            1.0,
                            sample_rate,
                            &enum_iterator::all::<SyscallKind>().collect::<Vec<_>>(),
                            vec![],
                            *main_bus,
                        );
                        sonifier.decrease_sensitivity = false;
                        peak_binaries.add_trig(2.0, SoundKind::FilteredNoise(3));
                        *current_sonifiers = vec![Box::new(sonifier)];
                        for s in current_sonifiers.iter_mut() {
                            s.patch_to_fx_chain(1);
                        }
                    }
                    11 => {
                        background_ramp = Some(BackgroundRamp {
                            bwr_low: 0.35..0.701,
                            bwr_high: 1.8..1.9,
                            lpf_low: 20.0..20.0,
                            lpf_high: 1000.0..7000.0,
                        });
                        *chord_change_interval = None;
                        let mut sonifier = DirectFunctions::new(
                            0.3,
                            sample_rate,
                            &enum_iterator::all::<SyscallKind>().collect::<Vec<_>>(),
                            vec![],
                            *main_bus,
                        );
                        sonifier.decrease_sensitivity = false;
                        sonifier.patch_to_fx_chain(2);
                        peak_binaries.add_trig(2.0, SoundKind::Binary);
                        *current_sonifiers = vec![Box::new(sonifier)];
                        rumble_change = Some(RUMBLE_STOP);
                    }
                    42 => {
                        *chord_change_interval = Some(Duration::from_secs_f32(0.42));
                        *harmonic_changes = vec![HarmonicChange::new().transpose(-1)];
                        *current_harmonic_change = 0;
                        *transposition_within_octave_guard = false;

                        // let addr = "/end_movement";
                        // let args = vec![];
                        // osc_sender.send((addr, args)).ok();

                        // let mut pb = PeakBinaries::new(k);
                        // pb.threshold = 1.0;
                        // *current_sonifiers = vec![Box::new(pb)];
                        //
                        sound_effects.play_end_movement_effects(duration);
                        background_noise.fade_out(10.);
                        peak_binaries.add_trig(2.0, SoundKind::Binary);
                        let mut pt = ProgramThemes::new(0.1, *main_bus);
                        pt.patch_to_fx_chain(1);

                        peak_binaries.add_trig(5.0, SoundKind::FilteredNoise(3));
                        let mut dc = DirectCategories::new(0.08, sample_rate, *main_bus);
                        dc.patch_to_fx_chain(2);
                        dc.set_lpf(3000.);
                        *current_sonifiers = vec![Box::new(pt), Box::new(dc)];
                        {
                            let chord_amp = *chord_amp_setter;
                            std::thread::spawn(move || {
                                std::thread::sleep(Duration::from_secs_f32(duration));
                                chord_amp.set(0, 0.0);
                            });
                        }
                    }
                    _ => {
                        eprintln!("!! Unhandled movement:");
                        dbg!(&mvt_id);
                    }
                };
                if current_sonifiers.len() > 0 {
                    *root = 0; // Reset root every movement
                }
                for sonifier in current_sonifiers {
                    let root = to_freq53(*root, *root_freq);
                    sonifier.change_harmony(current_chord, root);
                    *last_chord_change = Instant::now();
                }
                if let Some(background_ramp) = background_ramp {
                    background_ramp.send_osc(duration, osc_sender);
                }
                if let Some(rumble_change) = rumble_change {
                    // let addr = "/rumble_change";
                    // let args = vec![Type::Int(rumble_change as i32)];
                    // osc_sender.send((addr, args)).ok();
                    match rumble_change {
                        0 => (),
                        // Fade out over 20s, wait 5s then fade in over 10s
                        RUMBLE_RESTART => background_noise.fade_out_then_in(20., 5., 10.),
                        // Fade out over 20s
                        RUMBLE_STOP => background_noise.fade_out(20.),
                        _ => (),
                    }
                }
            } else {
                println!("Break");
                if let Some(next_mvt_id) = next_mvt_id {
                    println!("Sending break voice for id {next_mvt_id}");
                    let addr = "/break_voice";
                    let args = vec![Type::Int(next_mvt_id as i32)];
                    osc_sender.send((addr, args)).ok();
                }
            }

            *mvt_id = new_mvt_id;
        }
    }
}

pub trait Sonifier {
    fn apply_osc_message(&mut self, m: OscMessage);
    /// Patch the output of the whole sonifier to a certain fx chain not
    /// including the number of channels per chain (0, 1, 2, 3 etc.)
    fn patch_to_fx_chain(&mut self, fx_chain: usize);
    fn change_harmony(&mut self, scale: &[i32], root: f32);
    /// Run an update cycle from the main loop
    fn update(
        &mut self,
        osc_sender: &mut nannou_osc::Sender<Connected>,
        sound_effects: &SoundEffects,
    );
    /// Removes all the nodes making sound so that a new sonifier can be started
    fn free(&mut self);
}

pub fn to_freq53(degree: i32, root: f32) -> f32 {
    2.0_f32.powf(degree as f32 / 53.) * root
}

struct BackgroundRamp {
    bwr_low: Range<f32>,
    bwr_high: Range<f32>,
    lpf_low: Range<f32>,
    lpf_high: Range<f32>,
}
impl BackgroundRamp {
    pub fn send_osc(&self, fade_duration: f32, osc_sender: &mut Sender<Connected>) {
        let addr = "/background_ramp";
        let args = vec![
            Type::Float(fade_duration),
            Type::Float(self.bwr_low.start),
            Type::Float(self.bwr_low.end),
            Type::Float(self.bwr_high.start),
            Type::Float(self.bwr_high.end),
            Type::Float(self.lpf_low.start),
            Type::Float(self.lpf_low.end),
            Type::Float(self.lpf_high.start),
            Type::Float(self.lpf_high.end),
        ];
        osc_sender.send((addr, args)).ok();
    }
}

/// Pan to quad as two stereo pairs (0: front left, 1: front right, 2: rear left, 3: rear right)
/// *inputs*
/// 0: "signal"
/// 1: "pan_x"
/// 2: "pan_y"
pub struct PanMonoToQuad;
#[impl_gen]
impl PanMonoToQuad {
    pub fn new() -> Self {
        PanMonoToQuad
    }
    pub fn process(
        &mut self,
        input: &[Sample],
        pan_x: &[Sample],
        pan_y: &[Sample],
        front_left: &mut [Sample],
        front_right: &mut [Sample],
        rear_left: &mut [Sample],
        rear_right: &mut [Sample],
        block_size: BlockSize,
    ) -> GenState {
        for i in 0..*block_size {
            let signal = input[i];
            // The equation needs pan to be in the range [0, 1]
            let pan_x = pan_x[i].clamp(-1., 1.0) * 0.5 + 0.5;
            let pan_y = pan_y[i].clamp(-1.0, 1.0) * 0.5 + 0.5;
            // let pan_x_radians = pan_x * std::f32::consts::FRAC_PI_2;
            // let pan_y_radians = pan_y * std::f32::consts::FRAC_PI_2;
            // let left_gain = fastapprox::fast::cos(pan_x_radians);
            // let right_gain = fastapprox::fast::sin(pan_x_radians);
            // let front_gain = fastapprox::fast::cos(pan_y_radians);
            // let rear_gain = fastapprox::fast::sin(pan_y_radians);
            let left_gain = 1.0 - pan_x;
            let right_gain = pan_x;
            let front_gain = 1.0 - pan_y;
            let rear_gain = pan_y;

            front_left[i] = (signal * left_gain * front_gain);
            front_right[i] = (signal * right_gain * front_gain);
            rear_left[i] = (signal * left_gain * rear_gain);
            rear_right[i] = (signal * right_gain * rear_gain);
        }
        GenState::Continue
    }
}
fn changed_harmony_chord(
    new_chord: &[f32],
    amp: Handle<RampHandle>,
    length_min: f32,
    length_max: f32,
) {
    knyst_commands().to_top_level_graph();
    let mut rng = thread_rng();
    if rng.gen::<f32>() > 0.4 {
        println!("Playing harmony change chord");
        for f in new_chord {
            let length = rng.gen_range(length_min..length_max);
            let speaker = rng.gen_range(0..4);
            let filtered_noise = upload_graph(knyst_commands().default_graph_settings(), || {
                let env = envelope_gen(
                    0.0,
                    vec![(1.0, 3.), (1.0, length - 5.), (0.0, 2.)],
                    knyst::envelope::SustainMode::NoSustain,
                    StopAction::FreeGraph,
                );
                let source = white_noise();
                let mut sigs = vec![];
                for i in 0..5 {
                    let freq_detune = [1.0, 1.001, 0.999, 1.002, 0.998][i];
                    let q_env = envelope_gen(
                        1.0 / rng.gen_range(0.001..0.008),
                        vec![(1. / 0.0003, length)],
                        knyst::envelope::SustainMode::NoSustain,
                        StopAction::Continue,
                    );

                    let sig = svf_dynamic(SvfFilterType::Band)
                        .cutoff_freq(f * freq_detune)
                        .q(q_env)
                        .gain(0.0)
                        .input(source);
                    sigs.push(sig);
                }
                let sig = sigs[0] + sigs[1] + sigs[2] + sigs[3] + sigs[4];
                let sig = sig * env * 0.0005;
                graph_output(speaker, sig);
            });
            graph_output(0, filtered_noise * amp);
        }
    }
}
