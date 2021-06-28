
pub mod from_web_api;
pub mod coverage;
pub mod profile;

use std::{
    convert::TryInto,
    fs::{self, File},
    io::Read,
    path::PathBuf,
};

use serde::{Deserialize, Serialize};
pub use coverage::Coverage;
pub use profile::{TraceData, Profile};


pub struct Site {
    pub name: String,
    pub trace_datas: Vec<TraceData>,
    pub deepest_tree_depth: u32,
    pub longest_tree: u32,
    pub deepest_indentation: u32,
    pub longest_indentation: u32,
    pub deepest_line_length: u32,
    pub longest_line_length: u32,
    pub longest_coverage_vector: usize,
    pub max_coverage_vector_count: i32,
    pub max_coverage_total_length: i64,
    pub max_profile_tick: f32,
}

pub fn load_site(
    name: &str,
    visits: Vec<String>,
    use_web_api: bool,
    cache_path: &PathBuf,
    recalculate_data: bool,
    max_visits: Option<u32>,
) -> Site {
    let trace_datas = if use_web_api {
        // Filter out the visits here since they wont't be collected from the folder names
        let visits = if let Some(max_visits_num) = max_visits {
            visits
                .into_iter()
                .rev()
                .take(max_visits_num.try_into().unwrap())
                .rev()
                .collect()
        } else {
            visits
        };
        from_web_api::get_trace_data_from_site(name, &visits, cache_path)
    } else {
        load_site_from_disk(name, visits, cache_path, max_visits)
    };

    site_from_trace_datas(name, trace_datas, recalculate_data)
}

fn load_site_from_disk(
    site: &str,
    visits: Vec<String>,
    cache_path: &PathBuf,
    max_visits: Option<u32>,
) -> Vec<TraceData> {
    let root_path = cache_path;
    let mut trace_datas = vec![];

    let mut page_folder = root_path.clone();
    page_folder.push(site);
    // Automatically find all visits
    let trace_paths_in_folder = if visits.len() > 0 {
        // Restrict to max visits
        let visits = if let Some(max_visits_num) = max_visits {
            visits
                .into_iter()
                .rev()
                .take(max_visits_num.try_into().unwrap())
                .rev()
                .collect()
        } else {
            visits
        };
        visits
            .iter()
            .map(|visit| {
                let mut path = page_folder.clone();
                path.push(visit);
                path
            })
            .collect::<Vec<PathBuf>>()
    } else {
        let mut paths = fs::read_dir(page_folder)
            .expect("Failed to open page folder")
            .filter(|r| r.is_ok()) // Get rid of Err variants for Result<DirEntry>
            .map(|r| r.unwrap().path())
            .filter(|r| r.is_dir()) // Only keep folders
            .collect::<Vec<PathBuf>>();
        if let Some(max_visits_num) = max_visits {
            if paths.len() > max_visits_num as usize {
                paths = paths
                    .into_iter()
                    .rev()
                    .take(max_visits_num as usize)
                    .rev()
                    .collect();
            }
        }
        paths
    };
    println!(
        "Found {} visits for site {}",
        trace_paths_in_folder.len(),
        site
    );
    for (_i, p) in trace_paths_in_folder.iter().enumerate() {
        // Create TraceData
        let timestamp: String = if let Some(ts_osstr) = p.iter().last() {
            if let Some(ts) = ts_osstr.to_str() {
                ts.to_owned()
            } else {
                String::from("failed to process folder name")
            }
        } else {
            String::from("unknown timestamp")
        };
        let mut folder_path = p.clone();
        folder_path.push("profile.json");
        let mut trace_data = if let Ok(data) = fs::read_to_string(&folder_path) {
            let profile: Profile = serde_json::from_str(&data).unwrap();
            let graph_data = profile.generate_graph_data();
            TraceData::new(site.to_owned(), timestamp.clone(), graph_data)
        } else {
            eprintln!(
                "Failed to find profile file at {}",
                folder_path.to_str().unwrap()
            );
            continue;
        };
        // Load indentation profile
        folder_path.pop();
        folder_path.push("indent_profile.csv");
        if let Ok(indentation_profile) = fs::read_to_string(&folder_path) {
            if trace_data
                .add_indentation_profile(indentation_profile)
                .is_err()
            {
                eprintln!("Failed to parse {:?}", folder_path);
            }
        }
        // Load line length profile
        folder_path.pop();
        folder_path.push("line_length_profile.csv");
        if let Ok(line_length_profile) = fs::read_to_string(&folder_path) {
            if trace_data
                .add_line_length_profile(line_length_profile)
                .is_err()
            {
                eprintln!("Failed to parse {:?}", folder_path);
            }
        }
        // Load coverage
        folder_path.pop();
        folder_path.push("coverage.min.json");
        if let Ok(data) = fs::read_to_string(&folder_path) {
            let vector: Vec<(i64, i32)> =
                serde_json::from_str(&data).expect("Failed to parse coverage vector data");
            trace_data.coverage = Some(Coverage::from_vector(vector));
        } else {
            eprintln!("Failed to find coverage for {} {}", site, timestamp);
        }

        // Copy screenshots to new location
        folder_path.pop();
        folder_path.push("screenshots");
        // copy_screenshot(&folder_path, &app, pages[model.selected_page], i);

        trace_datas.push(trace_data);
    }
    trace_datas
}

/// Used to store the data for a site so that it is consistent across single renders
#[derive(Serialize, Deserialize)]
struct SiteData {
    name: String,
    longest_coverage_vector: usize,
    max_coverage_total_length: i64,
    max_coverage_vector_count: i32,
    longest_tree: usize,
    max_profile_tick: i32,
    deepest_tree_depth: i32,
}

pub fn site_from_trace_datas(name: &str, trace_datas: Vec<TraceData>, recalculate: bool) -> Site {
    let mut deepest_tree_depth = 0;
    let mut longest_tree = 0;
    let mut deepest_indentation = 0;
    let mut longest_indentation = 0;
    let mut deepest_line_length = 0;
    let mut longest_line_length = 0;
    let mut longest_coverage_vector = 0;
    let mut max_coverage_vector_count = 0;
    let mut max_coverage_total_length = 0;
    let mut max_profile_tick = 0;

    let site_data_path = PathBuf::from(format!("./assets/vis_data/{}.json", name));
    let mut loaded_data = false;

    if !recalculate {
        let file = File::open(&site_data_path);
        if let Ok(mut file) = file {
            let mut data = String::new();
            file.read_to_string(&mut data).unwrap();
            if let Ok(d) = serde_json::from_str::<SiteData>(&data) {
                loaded_data = true;
                deepest_tree_depth = d.deepest_tree_depth;
                longest_coverage_vector = d.longest_coverage_vector;
                max_coverage_total_length = d.max_coverage_total_length;
                max_coverage_vector_count = d.max_coverage_vector_count;
                longest_tree = d.longest_tree as usize;
                max_profile_tick = d.max_profile_tick;
            } else {
                eprintln!("Failed to deserialize visualisation data, trying to recalculate.");
            }
        } else {
            eprintln!("Failed to open visualisation data file, trying to recalculate.");
        }
    }

    if !loaded_data {
        for td in &trace_datas {
            let gd = &td.graph_data;
            if gd.depth_tree.len() > longest_tree {
                longest_tree = gd.depth_tree.len();
            }
            for node in &gd.depth_tree {
                if node.depth > deepest_tree_depth {
                    deepest_tree_depth = node.depth;
                }
                if node.ticks > max_profile_tick {
                    max_profile_tick = node.ticks;
                }
            }
            if let Some(indentation_profile) = &td.indentation_profile {
                if indentation_profile.len() > longest_indentation {
                    longest_indentation = indentation_profile.len();
                }
                for v in indentation_profile {
                    if *v > deepest_indentation {
                        deepest_indentation = *v;
                    }
                }
            }
            if let Some(line_length_profile) = &td.line_length_profile {
                if line_length_profile.len() > longest_line_length {
                    longest_line_length = line_length_profile.len();
                }
                for v in line_length_profile {
                    if *v > deepest_line_length {
                        deepest_line_length = *v;
                    }
                }
            }
            if let Some(coverage) = &td.coverage {
                if coverage.vector.len() > longest_coverage_vector {
                    longest_coverage_vector = coverage.vector.len();
                }
                let total_length = coverage.total_length;
                if total_length > max_coverage_total_length {
                    max_coverage_total_length = total_length;
                }
                for pair in &coverage.vector {
                    if pair.1 > max_coverage_vector_count {
                        max_coverage_vector_count = pair.1;
                    }
                }
            }
        }
        // Save the data to disk
        let path_parent = site_data_path.parent().unwrap();
        fs::create_dir_all(path_parent).expect("Failed to create directory for screenshots");
        let site_data = SiteData {
            name: name.to_owned(),
            longest_coverage_vector,
            max_coverage_total_length,
            max_coverage_vector_count,
            longest_tree,
            max_profile_tick,
            deepest_tree_depth,
        };
        if let Err(_e) = fs::write(
            &site_data_path,
            serde_json::to_string_pretty(&site_data).unwrap(),
        ) {
            eprintln!(
                "Couldn't save site data to file: {}",
                site_data_path.to_str().unwrap()
            );
        }
        println!(
            "{}:\n
longest_coverage_vector: {}\n
max_coverage_total_length: {}\n
max_coverage_vector_count: {}\n
longest_tree: {}\n
max_profile_tick: {}\n
deepest_tree_depth: {}\n",
            name,
            longest_coverage_vector,
            max_coverage_total_length,
            max_coverage_vector_count,
            longest_tree,
            max_profile_tick,
            deepest_tree_depth
        );
    }

    // println!(
    //     "deepest_indentation: {}, longest_indentation: {}",
    //     deepest_indentation, longest_indentation
    // );

    Site {
        name: name.to_owned(),
        trace_datas,
        deepest_tree_depth: deepest_tree_depth.try_into().unwrap(),
        longest_tree: longest_tree.try_into().unwrap(),
        deepest_indentation,
        longest_indentation: longest_indentation.try_into().unwrap(),
        deepest_line_length,
        longest_line_length: longest_line_length.try_into().unwrap(),
        longest_coverage_vector,
        max_coverage_vector_count,
        max_coverage_total_length,
        max_profile_tick: max_profile_tick as f32,
    }
}
