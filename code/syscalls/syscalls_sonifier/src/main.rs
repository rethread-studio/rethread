use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use knyst::prelude::*;
use knyst::*;

use anyhow::Result;
use nannou_osc::{receiver, sender, Connected, Message as OscMessage, Type};
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
    // current_sonifier = Some(Box::new(DirectCategories::new(&mut k, sample_rate)));
    // current_sonifier = Some(Box::new(QuantisedCategories::new(&mut k, sample_rate)));
    // current_sonifier = Some(Box::new(DirectFunctions::new(
    //     &mut k,
    //     sample_rate,
    //     &enum_iterator::all::<SyscallKind>().collect::<Vec<_>>(),
    // )));
    // current_sonifier = Some(Box::new(DirectFunctions::new(
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
    // )));
    current_sonifiers = vec![Box::new(ProgramThemes::new(&mut k))];
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
    // let mut current_chord = 0;
    let mut rng = thread_rng();
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
                    mvt_id = args.next().unwrap().int().unwrap();
                    let is_break = args.next().unwrap().bool().unwrap();
                    let description = args.next().unwrap().string().unwrap();
                    for sonifier in &mut current_sonifiers {
                        sonifier.free();
                    }
                    k.free_disconnected_nodes();
                    current_sonifiers.clear();
                    if !is_break {
                        let tags = description.split(",");
                        println!("tags: {:?}", tags.clone().collect::<Vec<_>>());
                        let start_channels = match mvt_id {
                            0 => {
                                current_sonifiers =
                                    vec![Box::new(DirectCategories::new(&mut k, sample_rate))];
                                1
                            }
                            100 => {
                                // interlude
                                chord_change_interval = None;
                                current_sonifiers =
                                    vec![Box::new(DirectCategories::new(&mut k, sample_rate))];
                                1
                            }
                            2 => {
                                chord_change_interval = None;
                                current_sonifiers = vec![Box::new(DirectFunctions::new(
                                    &mut k,
                                    sample_rate,
                                    &enum_iterator::all::<SyscallKind>().collect::<Vec<_>>(),
                                    vec![],
                                ))];
                                1
                            }
                            102 => {
                                // interlude
                                chord_change_interval = None;
                                let mut sonifier = DirectFunctions::new(
                                    &mut k,
                                    sample_rate,
                                    &enum_iterator::all::<SyscallKind>().collect::<Vec<_>>(),
                                    vec![],
                                );
                                sonifier.decrease_sensitivity = true;
                                current_sonifiers = vec![Box::new(sonifier)];
                                1
                            }
                            4 => {
                                current_sonifiers =
                                    vec![Box::new(QuantisedCategories::new(&mut k, sample_rate))];
                                1
                            }
                            104 => {
                                // Interlude
                                current_sonifiers =
                                    vec![Box::new(QuantisedCategories::new(&mut k, sample_rate))];
                                1
                            }
                            6 => {
                                chord_change_interval = Some(Duration::from_secs(8));
                                current_sonifiers = vec![Box::new(DirectFunctions::new(
                                    &mut k,
                                    sample_rate,
                                    &enum_iterator::all::<SyscallKind>().collect::<Vec<_>>(),
                                    vec![
                                        SyscallKind::Io,
                                        SyscallKind::Memory,
                                        SyscallKind::WaitForReady,
                                    ],
                                ))];
                                3
                            }
                            5 => {
                                chord_change_interval = None;
                                current_sonifiers = vec![
                                    Box::new(QuantisedCategories::new(&mut k, sample_rate)),
                                    Box::new(PeakBinaries::new(&mut k)),
                                ];
                                2
                            }
                            10 => {
                                chord_change_interval = Some(Duration::from_secs(12));
                                current_sonifiers = vec![Box::new(ProgramThemes::new(&mut k))];
                                1
                            }
                            110 => {
                                chord_change_interval = None;
                                current_sonifiers = vec![
                                    Box::new(ProgramThemes::new(&mut k)),
                                    Box::new(DirectCategories::new(&mut k, sample_rate)),
                                ];
                                // TODO: Different fx chains for the different sonifiers
                                2
                            }
                            _ => {
                                eprintln!("!! Unhandled movement:");
                                dbg!(&mvt_id, tags);
                                0
                            }
                        };
                        if current_sonifiers.len() > 0 {
                            root = 0; // Reset root every movement
                        }
                        for sonifier in &mut current_sonifiers {
                            sonifier.patch_to_fx_chain(start_channels);
                            let root = to_freq53(root, root_freq);
                            sonifier.change_harmony(&mut current_chord, root);
                            last_chord_change = Instant::now();
                        }
                        // if tags.position(|s| s == "direct").is_some() {
                        //     if tags.position(|s| s == "categories").is_some() {
                        //         current_sonifier =
                        //             Some(Box::new(DirectCategories::new(&mut k, sample_rate)));
                        //     } else if tags.position(|s| s == "function calls").is_some() {
                        //         current_sonifier =
                        //             Some(Box::new(DirectFunctions::new(&mut k, sample_rate)));
                        //     }
                        // } else if tags.position(|s| s == "quantised").is_some() {
                        //     current_sonifier =
                        //         Some(Box::new(QuantisedCategories::new(&mut k, sample_rate)));
                        // }
                    } else {
                        println!("Break");

                        let addr = "/break_voice";
                        let args =
                            vec![Type::Int(mvt_id as i32), Type::String(description.clone())];
                        osc_sender.send((addr, args)).ok();
                    }
                }
            } else {
                for sonifier in &mut current_sonifiers {
                    sonifier.apply_osc_message(m.clone());
                }
            }
        }
        let change_harmony = if let Some(time_interval) = &chord_change_interval {
            if last_chord_change.elapsed() > *time_interval {
                harmonic_changes[current_harmonic_change].apply(&mut current_chord, &mut root);
                current_harmonic_change = (current_harmonic_change + 1) % harmonic_changes.len();
                println!("Changed harmony to scale {current_chord:?}, root: {root}");
                last_chord_change = Instant::now();
                true
            } else {
                false
            }
        } else {
            false
        };
        for sonifier in &mut current_sonifiers {
            sonifier.update(&mut osc_sender);
            if change_harmony {
                let root = to_freq53(root, root_freq);
                sonifier.change_harmony(&current_chord, root);
            }
        }

        osc_messages.clear();

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
