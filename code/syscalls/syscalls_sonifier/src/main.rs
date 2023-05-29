use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use knyst::prelude::*;
use knyst::*;

use anyhow::Result;
use nannou_osc::{receiver, Message as OscMessage};
use rand::{thread_rng, Rng};

use crate::direct_categories::DirectCategories;
use crate::direct_functions::DirectFunctions;
use crate::quantised_categories::QuantisedCategories;

mod direct_categories;
mod direct_functions;
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
    let mut current_sonifier: Option<Box<dyn Sonifier>> = None;
    // current_sonifier = Some(DirectCategories::new(&mut k, sample_rate));
    current_sonifier = Some(Box::new(QuantisedCategories::new(&mut k, sample_rate)));
    // current_sonifier = Some(Box::new(DirectFunctions::new(&mut k, sample_rate)));
    let mut osc_messages = Vec::with_capacity(40);
    let mut last_switch = Instant::now();
    // main loop
    loop {
        // Receive OSC messages
        if let Ok(Some(mess)) = osc_receiver.try_recv() {
            mess.0.unfold(&mut osc_messages);
        }
        if let Some(sonifier) = &mut current_sonifier {
            for m in osc_messages.drain(..) {
                sonifier.apply_osc_message(m);
            }
            sonifier.update();
        }
        osc_messages.clear();

        if last_switch.elapsed() > Duration::from_secs_f32(2.) {
            let mut old_sonifier = current_sonifier.take().unwrap();
            old_sonifier.free();
            k.free_disconnected_nodes();
            let mut rng = thread_rng();
            match rng.gen::<usize>() % 3 {
                0 => {
                    current_sonifier =
                        Some(Box::new(QuantisedCategories::new(&mut k, sample_rate)));
                    println!("QuantisedCat");
                }
                1 => {
                    current_sonifier = Some(Box::new(DirectCategories::new(&mut k, sample_rate)));
                    println!("DirectCat");
                }
                2 => {
                    current_sonifier = Some(Box::new(DirectFunctions::new(&mut k, sample_rate)));
                    println!("DirectFunc");
                }
                _ => (),
            }
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
    /// Run an update cycle from the main loop
    fn update(&mut self);
    /// Removes all the nodes making sound so that a new sonifier can be started
    fn free(&mut self);
}

pub fn to_freq53(degree: i32, root: f32) -> f32 {
    2.0_f32.powf(degree as f32 / 53.) * root
}
