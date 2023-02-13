use once_cell::sync::OnceCell;
use std::{
    fs::File,
    io::{self, BufRead},
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    time::Duration,
};

mod gui;
mod scheduler;
mod websocket;

use anyhow::Result;
use bevy::{prelude::Color, utils::HashMap};
use log::*;
use scheduler::{SchedulerCom, SchedulerMessage};

use parser::deepika2::{self, Deepika2, DepthState};

use crate::scheduler::start_scheduler;

static NUM_LEDS_X: usize = 5;
static NUM_LEDS_Y: usize = 15;

use clap::Parser;

/// Simple program to greet a person
#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
pub struct Args {
    #[arg(long, default_value_t = false)]
    headless: bool,
    #[arg(long, default_value_t = false)]
    osc: bool,
    #[arg(long, value_name = "FILE")]
    trace: Option<PathBuf>,
}

pub fn get_args() -> &'static Args {
    static ARGS: OnceCell<Args> = OnceCell::new();
    ARGS.get_or_init(|| Args::parse())
}

fn main() {
    let args = get_args();
    info!("Arguments: {args:#?}");
    if !args.headless {
        gui::run_gui();
    } else {
        if args.trace.is_some() {
            // Set up logging
            simple_logger::SimpleLogger::new()
                .with_level(log::LevelFilter::max())
                // .env()
                .with_colors(true)
                .init()
                .unwrap();
            log::info!("Starting headless");
            // Run in headless mode without a GUI
            let running = Arc::new(AtomicBool::new(true));
            let r = running.clone();

            ctrlc::set_handler(move || {
                r.store(false, Ordering::SeqCst);
            })
            .expect("Error setting Ctrl-C handler");

            // Creating a trace from a real path, i.e. not an empty trace, starts the scheduler
            let mut trace = Trace::new(&args.trace);
            // Press play
            if let Some(scheduler_com) = &mut trace.scheduler_com {
                if let Err(e) = scheduler_com.play_tx.send(true) {
                    error!("Failed to set scheduler play to true: {e:?}");
                }
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

#[derive(Clone)]
pub struct Trace {
    trace: Deepika2,
    scheduler_com: Option<SchedulerCom>,
    current_index: usize,
    current_depth_envelope_index: usize,
    max_depth: i32,
    _supplier_index: HashMap<String, usize>,
    // dependency per supplier
    _dependency_index: HashMap<String, HashMap<String, usize>>,
    supplier_colors: HashMap<String, Color>,
    dependency_colors: HashMap<String, Color>,
    num_calls_per_supplier: HashMap<String, usize>,
    num_calls_per_dependency: HashMap<String, HashMap<String, usize>>,
    num_calls_per_depth: Vec<usize>,
}

impl Trace {
    pub fn new(path: &Option<PathBuf>) -> Self {
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

                    let calls_per_dep = num_calls_per_dependency
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

        // Load supplier and dependency colors from .csv files
        let (supplier_colors, dependency_colors) = {
            if let Some(path) = path {
                let file_name = path.file_stem().unwrap().to_str().unwrap().to_string();
                let mut supplier_filename = file_name.clone();
                supplier_filename.push_str("_supplier_colors");
                let mut supplier_path = path.clone();
                supplier_path.set_file_name(supplier_filename);
                supplier_path.set_extension("csv");
                let mut dependency_filename = file_name.clone();
                dependency_filename.push_str("_dependency_colors");
                let mut dependency_path = path.clone();
                dependency_path.set_file_name(dependency_filename);
                dependency_path.set_extension("csv");
                match (
                    read_colors_from_csv(supplier_path.clone()),
                    read_colors_from_csv(dependency_path.clone()),
                ) {
                    (Ok(sc), Ok(dc)) => (sc, dc),
                    (Err(e), Err(_)) | (Ok(_), Err(e)) | (Err(e), Ok(_)) => {
                        warn!(
                            "Failed to read supplier colors from csv: {e:?}, will generate colors"
                        );
                        warn!("Supplier colors path: {supplier_path:?}");
                        warn!("Dependency colors path: {dependency_path:?}");
                        let mut supplier_colors = HashMap::new();
                        let mut dependency_colors = HashMap::new();
                        // Generate the supplier and dependency colors
                        for (supplier, index) in supplier_index.iter() {
                            let mut supplier_hue = (*index as f32 * 17.7) % 360.0;
                            supplier_colors
                                .insert(supplier.clone(), Color::hsl(supplier_hue, 1.0, 0.5));
                            if let Some(dependencies) = dependency_index.get(supplier) {
                                for (dependency, _dep_index) in dependencies.iter() {
                                    supplier_hue += 2.0;
                                    dependency_colors.insert(
                                        dependency.clone(),
                                        Color::hsl(supplier_hue, 1.0, 0.5),
                                    );
                                }
                            }
                        }
                        (supplier_colors, dependency_colors)
                    }
                }
            } else {
                (HashMap::new(), HashMap::new())
            }
        };

        println!(
            "Opened and initialised new trace with {} calls",
            trace.draw_trace.len()
        );
        // dbg!(calls_per_marker);
        // dbg!(first_appearance_of_marker);
        // dbg!(last_appearance_of_marker);
        // dbg!(marker_width);
        // dbg!(&num_calls_per_supplier);
        // dbg!(&num_calls_per_dependency);

        let mut s = Self {
            trace,
            current_index: 0,
            current_depth_envelope_index: 0,
            max_depth,
            _supplier_index: supplier_index,
            _dependency_index: dependency_index,
            num_calls_per_supplier,
            num_calls_per_dependency,
            num_calls_per_depth,
            scheduler_com: None,
            supplier_colors,
            dependency_colors,
        };
        let scheduler_com = if empty_trace {
            None
        } else {
            let scheduler_com = start_scheduler(s.clone());
            Some(scheduler_com)
        };
        s.scheduler_com = scheduler_com;
        s
    }
    pub fn find_deepest_section(&self, min_length: usize) -> (usize, usize) {
        let mut max_depth = 0;
        let mut index = 0;
        for (i, section) in self.trace.depth_envelope.sections.iter().enumerate() {
            if section.end_index - section.start_index > min_length
                && matches!(section.state, DepthState::Stable)
            {
                if section.max_depth - section.min_depth > max_depth {
                    max_depth = section.max_depth - section.min_depth;
                    index = i;
                }
            }
        }
        (self.trace.depth_envelope.sections[index].start_index, index)
    }
    pub fn find_shallowest_section(&self, min_length: usize) -> (usize, usize) {
        let mut min_depth = i32::MAX;
        let mut index = 0;
        for (i, section) in self.trace.depth_envelope.sections.iter().enumerate() {
            if section.end_index - section.start_index > min_length
                && matches!(section.state, DepthState::Stable)
            {
                if section.max_depth - section.min_depth < min_depth {
                    min_depth = section.max_depth - section.min_depth;
                    index = i;
                }
            }
        }
        (self.trace.depth_envelope.sections[index].start_index, index)
    }
    pub fn find_most_diverse_section(&self, min_length: usize) -> (usize, usize) {
        let mut max_diversity = 0.;
        let mut index = 0;
        for (i, section) in self.trace.depth_envelope.sections.iter().enumerate() {
            if section.end_index - section.start_index > min_length
                && matches!(section.state, DepthState::Stable)
            {
                if section.shannon_wiener_diversity_index > max_diversity {
                    max_diversity = section.shannon_wiener_diversity_index;
                    index = i;
                }
            }
        }
        (self.trace.depth_envelope.sections[index].start_index, index)
    }
    pub fn find_least_diverse_section(&self, min_length: usize) -> (usize, usize) {
        let mut min_diversity = f32::MAX;
        let mut index = 0;
        for (i, section) in self.trace.depth_envelope.sections.iter().enumerate() {
            if section.end_index - section.start_index > min_length
                && matches!(section.state, DepthState::Stable)
            {
                if section.shannon_wiener_diversity_index < min_diversity {
                    min_diversity = section.shannon_wiener_diversity_index;
                    index = i;
                }
            }
        }
        (self.trace.depth_envelope.sections[index].start_index, index)
    }
    pub fn get_animation_call_data(&self, call_index: usize) -> AnimationCallData {
        let call = &self.trace.draw_trace[call_index];
        // num leds from global depth
        // let num_leds = ((call.depth as f32 / self.max_depth as f32).powf(0.3)
        //     * (NUM_LEDS_X as i32 - 1) as f32) as usize
        //     + 1;
        // num leds from section depth
        let depth_point = self.trace.depth_envelope.sections[self.current_depth_envelope_index];
        let num_leds =
            (((call.depth - depth_point.min_depth) as f32 / depth_point.max_depth as f32).powf(0.3)
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
    pub fn send_scheduler_message(&mut self, message: SchedulerMessage) {
        if let Some(scheduler_com) = &mut self.scheduler_com {
            scheduler_com.send_message(message);
        }
    }
}

#[derive(Debug)]
pub struct AnimationCallData {
    pub num_leds: usize,
    pub left_color: Color,
    pub right_color: Color,
}

pub fn read_colors_from_csv(path: impl Into<PathBuf>) -> Result<HashMap<String, Color>> {
    let mut m = HashMap::new();
    let file = File::open(path.into())?;
    let lines = io::BufReader::new(file).lines();
    for line in lines.skip(1) {
        match line {
            Ok(line) => {
                let mut parts = line.split(',');
                let name = parts.next().unwrap().to_string();
                let hex_color = parts.next().unwrap();
                let c = Color::hex(&hex_color[1..])?;
                m.insert(name, c);
            }
            Err(e) => {
                return Err(e.into());
            }
        }
    }
    Ok(m)
}
