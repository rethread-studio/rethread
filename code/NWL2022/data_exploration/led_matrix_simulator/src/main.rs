use std::{
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    time::Duration,
};

use anyhow::Result;
mod audio;
mod gui;
mod scheduler;
mod websocket;
use audio::AudioEngine;
use bevy::{prelude::*, utils::HashMap};
use scheduler::SchedulerCom;

use parser::deepika2::{self, Call, CallDrawData, Deepika2};
use rand::prelude::*;
use websocket::WebsocketCom;

use crate::scheduler::start_scheduler;

static NUM_LEDS_X: usize = 5;
static NUM_LEDS_Y: usize = 15;

use clap::Parser;

/// Simple program to greet a person
#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    #[arg(long, default_value_t = false)]
    headless: bool,
    #[arg(long, value_name = "FILE")]
    trace: Option<PathBuf>,
}

fn main() {
    let args = Args::parse();
    dbg!(&args);
    if !args.headless {
        gui::run_gui(args.trace);
    } else {
        if args.trace.is_some() {
            // Run in headless mode without a GUI
            let running = Arc::new(AtomicBool::new(true));
            let r = running.clone();

            ctrlc::set_handler(move || {
                r.store(false, Ordering::SeqCst);
            })
            .expect("Error setting Ctrl-C handler");

            // Creating a trace from a real path, i.e. not an empty trace, starts the scheduler
            let mut trace = Trace::new(args.trace);
            // Press play
            if let Some(scheduler_com) = &mut trace.scheduler_com {
                scheduler_com.play_tx.send(true);
            }

            println!("Waiting for Ctrl-C...");
            while running.load(Ordering::SeqCst) {
                std::thread::sleep(Duration::from_millis(2));
            }
            println!("Got it! Exiting...");
            drop(trace); // Not necessary, but gives us a compile time error if
                         // we do something that causes trace to be dropped too soon
        } else {
            println!("No trace given as argument in headless mode, exiting.");
        }
    }
}

pub struct Trace {
    trace: Deepika2,
    scheduler_com: Option<SchedulerCom>,
    current_index: usize,
    current_depth_envelope_index: usize,
    max_depth: i32,
    supplier_index: HashMap<String, usize>,
    // dependency per supplier
    dependency_index: HashMap<String, HashMap<String, usize>>,
    supplier_colors: HashMap<String, Color>,
    dependency_colors: HashMap<String, Color>,
    num_calls_per_supplier: HashMap<String, usize>,
    num_calls_per_dependency: HashMap<String, HashMap<String, usize>>,
    num_calls_per_depth: Vec<usize>,
    lit_leds: Vec<Entity>,
}

impl Trace {
    pub fn new(path: Option<PathBuf>) -> Self {
        // let trace = Deepika2::open_or_parse("/home/erik/Hämtningar/nwl2022/data-imagej-copy-paste")
        //     .unwrap();

        let mut empty_trace = true;
        let trace = if let Some(path) = path {
            empty_trace = false;
            deepika2::Deepika2::open_or_parse(path).unwrap()
        } else {
            deepika2::Deepika2::empty_trace()
        };

        // Show data about the trace
        // - number of calls per marker
        // - first appearence of marker
        // - last appearance of marker
        let mut calls_per_marker = HashMap::new();
        let mut first_appearance_of_marker = HashMap::new();
        let mut last_appearance_of_marker = HashMap::new();

        let mut num_calls_per_depth = vec![0; trace.max_depth as usize + 1];
        let mut supplier_index = HashMap::new();
        let mut supplier_colors = HashMap::new();
        let mut dependency_colors = HashMap::new();
        let mut dependency_index = HashMap::new();
        let mut num_calls_per_supplier = HashMap::new();
        let mut num_calls_per_dependency = HashMap::new();
        let mut max_depth = 0;
        for (i, call) in trace.draw_trace.iter().enumerate() {
            if call.depth > max_depth {
                max_depth = call.depth;
            }
            if let Some(marker) = &call.marker {
                *calls_per_marker.entry(marker.clone()).or_insert(0) += 1;
                first_appearance_of_marker
                    .entry(marker.clone())
                    .or_insert(i);
                *last_appearance_of_marker.entry(marker.clone()).or_insert(0) = i;
            }
            if let Some(supplier) = &call.supplier {
                num_calls_per_depth[call.depth as usize] += 1;
                let new_index = supplier_index.len();
                supplier_index.entry(supplier.clone()).or_insert(new_index);
                *(num_calls_per_supplier.entry(supplier.clone()).or_insert(0)) += 1;
                if let Some(dependency) = &call.dependency {
                    let dependency_map = dependency_index
                        .entry(supplier.clone())
                        .or_insert(HashMap::new());
                    let new_index = dependency_map.len();
                    dependency_map
                        .entry(dependency.clone())
                        .or_insert(new_index);

                    let mut calls_per_dep = num_calls_per_dependency
                        .entry(supplier.clone())
                        .or_insert(HashMap::new());
                    *calls_per_dep.entry(dependency.clone()).or_insert(0) += 1;
                } else {
                    let dependency_map = dependency_index
                        .entry(supplier.clone())
                        .or_insert(HashMap::new());
                    let new_index = dependency_map.len();
                    dependency_map.entry(String::new()).or_insert(new_index);
                }
            }
        }
        let mut marker_width = vec![];
        for (marker, first_index) in &first_appearance_of_marker {
            let last_index = last_appearance_of_marker.get(marker).unwrap();
            marker_width.push((marker.clone(), last_index - first_index));
        }

        // Generate the supplier and dependency colors
        for (supplier, index) in supplier_index.iter() {
            let mut supplier_hue = (*index as f32 * 17.7) % 360.0;
            supplier_colors.insert(supplier.clone(), Color::hsl(supplier_hue, 1.0, 0.5));
            if let Some(dependencies) = dependency_index.get(supplier) {
                for (dependency, dep_index) in dependencies.iter() {
                    supplier_hue += 2.0;
                    dependency_colors
                        .insert(dependency.clone(), Color::hsl(supplier_hue, 1.0, 0.5));
                }
            }
        }

        let scheduler_com = if empty_trace {
            None
        } else {
            let scheduler_com = start_scheduler(trace.clone());
            Some(scheduler_com)
        };
        println!(
            "Opened and initialised new trace with {} calls",
            trace.draw_trace.len()
        );
        dbg!(calls_per_marker);
        dbg!(first_appearance_of_marker);
        dbg!(last_appearance_of_marker);
        dbg!(marker_width);
        dbg!(&num_calls_per_supplier);
        dbg!(&num_calls_per_dependency);

        Self {
            trace,
            current_index: 0,
            current_depth_envelope_index: 0,
            max_depth,
            supplier_index,
            dependency_index,
            lit_leds: Vec::new(),
            num_calls_per_supplier,
            num_calls_per_dependency,
            num_calls_per_depth,
            scheduler_com,
            supplier_colors,
            dependency_colors,
        }
    }
    pub fn get_animation_call_data(&self, call_index: usize) -> AnimationCallData {
        let call = &self.trace.draw_trace[call_index];
        let num_leds = ((call.depth as f32 / self.max_depth as f32).powf(0.3)
            * (NUM_LEDS_X as i32 - 1) as f32) as usize
            + 1;
        let left_color = if let Some(supplier) = &call.supplier {
            self.supplier_colors.get(supplier).unwrap().clone()
        } else {
            Color::hsl(0.0, 1.0, 1.0)
        };
        let right_color = if let Some(dependency) = &call.dependency {
            self.dependency_colors.get(dependency).unwrap().clone()
        } else {
            Color::hsl(0.5, 1.0, 1.0)
        };
        AnimationCallData {
            num_leds: num_leds as usize,
            left_color,
            right_color,
        }
    }

    pub fn get_new_index(&mut self) -> Option<usize> {
        if let Some(scheduler_com) = &mut self.scheduler_com {
            if let Ok(new_index) = scheduler_com.index_increase_rx.try_recv() {
                self.current_index = new_index;
                Some(new_index)
            } else {
                None
            }
        } else {
            None
        }
    }
    pub fn jump_to_next_marker(&mut self) {
        if let Some(scheduler_com) = &mut self.scheduler_com {
            scheduler_com.jump_to_next_marker();
        }
    }
    pub fn jump_to_previous_marker(&mut self) {
        if let Some(scheduler_com) = &mut self.scheduler_com {
            scheduler_com.jump_to_previous_marker();
        }
    }
}

pub struct AnimationCallData {
    num_leds: usize,
    left_color: Color,
    right_color: Color,
}
