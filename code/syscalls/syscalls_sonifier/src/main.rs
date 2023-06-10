use std::sync::atomic::AtomicBool;
use std::sync::mpsc::Receiver;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use knyst::prelude::*;
use knyst::*;

use anyhow::Result;
use nannou_osc::rosc::OscPacket;
use nannou_osc::{receiver, sender, Connected, Message as OscMessage, Sender, Type};
use peak_binaries::SoundKind;
use rand::seq::SliceRandom;
use rand::{thread_rng, Rng};
use syscalls_shared::SyscallKind;

use crate::direct_categories::DirectCategories;
use crate::direct_functions::DirectFunctions;
use crate::harmony::HarmonicChange;
use crate::peak_binaries::PeakBinaries;
use crate::program_themes::ProgramThemes;
use crate::quantised_categories::QuantisedCategories;

mod direct_categories;
mod direct_functions;
mod harmony;
mod peak_binaries;
mod program_themes;
mod quantised_categories;

fn main() -> Result<()> {
    let mut backend = audio_backend::JackBackend::new("knyst_waveguide_syscalls")?;

    let sample_rate = backend.sample_rate() as f32;
    let block_size = backend.block_size().unwrap_or(64);
    println!("sr: {sample_rate}, block: {block_size}");
    let resources = Resources::new(ResourcesSettings::default());
    let graph: Graph = Graph::new(GraphSettings {
        block_size,
        sample_rate,
        // In JACK we can decide ourselves how many outputs and inputs we want
        num_inputs: 1,
        num_outputs: 16,
        ring_buffer_size: 10000,
        max_node_inputs: 10,
        num_nodes: 2000,
        ..Default::default()
    });
    let stop = Arc::new(AtomicBool::new(false));
    let stop_message = Arc::new(Mutex::new(String::from("Bye!")));
    // `start_processing` is starting a Controller on a separate thread by
    // default. If you want to handle when the Controller updates manually you
    // can use `start_processing_retyrn_controller` instead
    let mut k = {
        let stop = stop.clone();
        let stop_message = stop_message.clone();
        backend.start_processing(graph, resources, RunGraphSettings::default(), move |e| {
            eprintln!("!! Error:{e:?}");
            // *stop_message.lock().unwrap() = format!("{e:?}");
            // stop.store(true, std::sync::atomic::Ordering::SeqCst);
        })?
    };

    let osc_receiver = receiver(7376).unwrap();
    let mut osc_sender = sender().unwrap().connect("127.0.0.1:57120").unwrap();
    let mut current_sonifiers: Vec<Box<dyn Sonifier>> = vec![];
    current_sonifiers = vec![Box::new(DirectCategories::new(1.0, &mut k, sample_rate))];
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
    let mut mvt_id = 0;
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
        k,
        current_harmonic_change,
    };
    // let mut current_chord = 0;
    let mut rng = thread_rng();

    app.change_movement(11, false);
    // main loop
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
                    app.change_movement(new_mvt_id, is_break);
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

    Ok(())
}

struct App {
    current_sonifiers: Vec<Box<dyn Sonifier>>,
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
    k: KnystCommands,
}
impl App {
    pub fn apply_osc_message(&mut self, m: OscMessage) {
        for sonifier in &mut self.current_sonifiers {
            sonifier.apply_osc_message(m.clone());
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
            k,
            current_harmonic_change,
        } = self;
        let change_harmony = if let Some(time_interval) = &chord_change_interval {
            if last_chord_change.elapsed() > *time_interval {
                harmonic_changes[*current_harmonic_change].apply(current_chord, root);
                let addr = "/change_harmony";
                let root = to_freq53(*root, *root_freq);
                let mut args = vec![Type::Float(root)];
                args.push(Type::Int(current_chord.len() as i32));
                for degree in &*current_chord {
                    args.push(Type::Int(*degree));
                }
                osc_sender.send((addr, args)).ok();

                *current_harmonic_change = (*current_harmonic_change + 1) % harmonic_changes.len();
                println!("Changed harmony to scale {current_chord:?}, root: {root}");
                *last_chord_change = Instant::now();
                true
            } else {
                false
            }
        } else {
            false
        };
        for sonifier in &mut *current_sonifiers {
            sonifier.update(osc_sender);
            if change_harmony {
                let root = to_freq53(*root, *root_freq);
                sonifier.change_harmony(&current_chord, root);
            }
        }
    }
    pub fn stop_playing(&mut self) {
        for sonifier in &mut self.current_sonifiers {
            sonifier.free();
        }
        self.k.free_disconnected_nodes();
        self.current_sonifiers.clear();
    }
    pub fn change_movement(&mut self, new_mvt_id: i32, is_break: bool) {
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
            k,
            chord_change_interval,
            current_chord,
            current_harmonic_change,
        } = self;

        *mvt_id = new_mvt_id;

        let sample_rate = *sample_rate;

        for sonifier in &mut *current_sonifiers {
            sonifier.free();
        }
        k.free_disconnected_nodes();
        current_sonifiers.clear();
        if !is_break {
            // let tags = description.split(",");
            // println!("tags: {:?}", tags.clone().collect::<Vec<_>>());
            match new_mvt_id {
                0 => {
                    *current_sonifiers = vec![Box::new(DirectCategories::new(0.5, k, sample_rate))];
                    for s in current_sonifiers.iter_mut() {
                        s.patch_to_fx_chain(1);
                    }
                }
                100 => {
                    // interlude
                    *chord_change_interval = None;
                    *current_sonifiers = vec![Box::new(DirectCategories::new(0.5, k, sample_rate))];
                    for s in current_sonifiers.iter_mut() {
                        s.patch_to_fx_chain(1);
                    }
                }
                2 => {
                    *chord_change_interval = None;
                    *current_sonifiers = vec![Box::new(DirectFunctions::new(
                        1.0,
                        k,
                        sample_rate,
                        &enum_iterator::all::<SyscallKind>().collect::<Vec<_>>(),
                        vec![],
                    ))];
                    for s in current_sonifiers.iter_mut() {
                        s.patch_to_fx_chain(1);
                    }
                }
                102 => {
                    // interlude
                    *chord_change_interval = None;
                    let mut sonifier = DirectFunctions::new(
                        1.0,
                        k,
                        sample_rate,
                        &enum_iterator::all::<SyscallKind>().collect::<Vec<_>>(),
                        vec![],
                    );
                    sonifier.decrease_sensitivity = true;
                    *current_sonifiers = vec![Box::new(sonifier)];
                    for s in current_sonifiers.iter_mut() {
                        s.patch_to_fx_chain(1);
                    }
                }
                4 => {
                    *current_sonifiers = vec![Box::new(QuantisedCategories::new(k, sample_rate))];
                    for s in current_sonifiers.iter_mut() {
                        s.patch_to_fx_chain(1);
                    }
                }
                104 => {
                    // Interlude
                    *current_sonifiers = vec![Box::new(QuantisedCategories::new(k, sample_rate))];

                    for s in current_sonifiers.iter_mut() {
                        s.patch_to_fx_chain(1);
                    }
                }
                6 => {
                    *chord_change_interval = Some(Duration::from_secs(8));
                    *current_sonifiers = vec![Box::new(DirectFunctions::new(
                        1.0,
                        k,
                        sample_rate,
                        &enum_iterator::all::<SyscallKind>().collect::<Vec<_>>(),
                        vec![
                            SyscallKind::Io,
                            SyscallKind::Memory,
                            SyscallKind::WaitForReady,
                        ],
                    ))];
                    for s in current_sonifiers.iter_mut() {
                        s.patch_to_fx_chain(3);
                    }
                }
                106 => {
                    *chord_change_interval = Some(Duration::from_secs(8));
                    let mut sonifier = DirectFunctions::new(
                        1.0,
                        k,
                        sample_rate,
                        &enum_iterator::all::<SyscallKind>().collect::<Vec<_>>(),
                        vec![
                            SyscallKind::Io,
                            SyscallKind::Memory,
                            SyscallKind::WaitForReady,
                        ],
                    );
                    sonifier.patch_to_fx_chain(3);
                    sonifier.next_focus_time_range = 5.0..15.0;
                    *current_sonifiers = vec![Box::new(sonifier)];
                }
                5 => {
                    *chord_change_interval = None;
                    let mut qc = QuantisedCategories::new(k, sample_rate);
                    qc.patch_to_fx_chain(2);
                    *current_sonifiers = vec![Box::new(qc), Box::new(PeakBinaries::new(k))];
                }
                10 => {
                    *chord_change_interval = Some(Duration::from_secs(12));
                    let mut pb = PeakBinaries::new(k);
                    pb.threshold = 5.0;
                    pb.sound_kind = SoundKind::FilteredNoise;
                    *current_sonifiers = vec![Box::new(ProgramThemes::new(0.5, k)), Box::new(pb)];
                    current_sonifiers
                        .iter_mut()
                        .for_each(|s| s.patch_to_fx_chain(1));
                }
                110 => {
                    *chord_change_interval = None;
                    let mut pt = ProgramThemes::new(0.5, k);
                    pt.patch_to_fx_chain(1);
                    let mut dc = DirectCategories::new(0.2, k, sample_rate);
                    dc.patch_to_fx_chain(2);
                    dc.set_lpf(4000.);
                    *current_sonifiers = vec![Box::new(pt), Box::new(dc)];
                }
                11 => {
                    *chord_change_interval = None;
                    let mut pb = PeakBinaries::new(k);
                    pb.threshold = 1.0;
                    *current_sonifiers = vec![Box::new(pb)];
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
        } else {
            println!("Break");

            let addr = "/break_voice";
            let args = vec![Type::Int(*mvt_id as i32)];
            osc_sender.send((addr, args)).ok();
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
    fn update(&mut self, osc_sender: &mut nannou_osc::Sender<Connected>);
    /// Removes all the nodes making sound so that a new sonifier can be started
    fn free(&mut self);
}

pub fn to_freq53(degree: i32, root: f32) -> f32 {
    2.0_f32.powf(degree as f32 / 53.) * root
}
