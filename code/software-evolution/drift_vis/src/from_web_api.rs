use std::{collections::HashMap, fs, path::PathBuf};

use crate::coverage::*;
use crate::profile::*;

pub fn get_all_sites() -> Result<Vec<String>, Box<dyn std::error::Error>> {
    let sites =
        reqwest::blocking::get("https://drift.durieux.me/api/sites")?.json::<Vec<String>>()?;
    println!("Retrieved all sites: {:?}", sites);
    Ok(sites)
}

pub fn get_trace_data_from_site(
    site: &str,
    visits: &Vec<String>,
    cache_path: &PathBuf,
) -> Vec<TraceData> {
    println!("Starting to download site: {:?}", site);
    let mut trace_datas = vec![];
    // let coverages = match get_all_coverages_for_site(site) {
    //     Ok(c) => c,
    //     Err(e) => {
    //         eprintln!("Failed to retrieve coverages for {}: {:?}", site, e);
    //         HashMap::new()
    //     }
    // };

    for visit in visits {
        // Make sure the cache folder exists
        let mut cached_visit_path: PathBuf = cache_path.to_path_buf();
        cached_visit_path.push(site);
        cached_visit_path.push(visit);
        if let Err(e) = fs::create_dir_all(cached_visit_path) {
            eprintln!("Failed to create cache directory: {:?}", e);
        }
        match get_profile_for_visit(site, visit, cache_path) {
            Ok(profile) => {
                let graph_data = profile.generate_graph_data();
                let mut trace_data = TraceData::new(site.to_owned(), visit.to_owned(), graph_data);

                // Optional elements of the TraceData
                match get_coverage_for_visit(site, visit, cache_path) {
                    Ok(coverage) => trace_data.coverage = Some(coverage),
                    Err(e) => {
                        eprintln!("Failed to load coverage for {} {}: {}", site, visit, e)
                    }
                }
                trace_datas.push(trace_data);
            }
            Err(e) => eprintln!("Failed to retrieve profile for {} {}: {:?}", site, visit, e),
        }
    }
    trace_datas
}

pub fn get_all_visits() -> Result<Vec<String>, Box<dyn std::error::Error>> {
    let url = "https://drift.durieux.me/api/times";
    let visits = reqwest::blocking::get(url)?.json::<Vec<String>>()?;
    Ok(visits)
}

pub fn get_visits_for_site(site: &str) -> Result<Vec<String>, Box<dyn std::error::Error>> {
    let url = format!(
        "http://130.237.224.22:8080/api/site/{site_name}/visits",
        site_name = site
    );
    let visits = reqwest::blocking::get(url)?.json::<Vec<String>>()?;
    println!("Retrieved all visits for {}: {:}", site, visits.len());
    Ok(visits)
}

pub fn get_profile_for_visit(
    site: &str,
    visit: &str,
    cache_path: &PathBuf,
) -> Result<Profile, Box<dyn std::error::Error>> {
    // Try to get the profile from the cache
    let mut path = cache_path.to_path_buf();
    path.push(site);
    path.push(visit);
    path.push("profile.json");
    let profile = match fs::read_to_string(&path) {
        Ok(ref data) => {
            let profile: Profile = serde_json::from_str(data)?;
            profile
        }
        Err(_) => {
            let url = format!(
                "https://drift.durieux.me/api/time/{visit_ts}/{site_name}/profile",
                site_name = site,
                visit_ts = visit
            );
            let data = reqwest::blocking::get(url)?.text()?;

            let profile: Profile = serde_json::from_str(&data)?;
            println!("Retrieved profile for {}:{}", site, visit);
            // Save to cache
            fs::write(path, data.as_bytes())?;
            profile
        }
    };

    Ok(profile)
}

pub fn get_coverage_for_visit(
    site: &str,
    visit: &str,
    cache_path: &PathBuf,
) -> Result<Coverage, Box<dyn std::error::Error>> {
    // Try to get the profile from the cache
    let mut path = cache_path.clone();
    path.push(site);
    path.push(visit);
    path.push("coverage.json");
    let coverage = match fs::read_to_string(&path) {
        Ok(ref data) => {
            let vector: Vec<(i64, i32)> = serde_json::from_str(data)?;
            Coverage::from_vector(vector)
        }
        Err(_) => {
            let url = format!(
                "https://drift.durieux.me/api/time/{visit_ts}/{site_name}/coverage/js",
                site_name = site,
                visit_ts = visit
            );
            let data = reqwest::blocking::get(url)?.text()?;

            let vector: Vec<(i64, i32)> = serde_json::from_str(&data)?;
            println!("Retrieved coverage for {}:{}", site, visit);
            // Save to cache
            fs::write(path, data.as_bytes())?;
            Coverage::from_vector(vector)
        }
    };

    Ok(coverage)
}

pub fn _get_all_coverages_for_site(
    site: &str,
) -> Result<HashMap<String, Vec<(i64, i32)>>, Box<dyn std::error::Error>> {
    // Try to get the

    let url = format!(
        "http://130.237.224.22:8080/api/site/{site_name}/coverages/js",
        site_name = site,
    );
    let coverages = reqwest::blocking::get(url)?.json::<HashMap<String, Vec<(i64, i32)>>>()?;
    println!("Retrieved all coverages for {}: {:}", site, coverages.len());
    Ok(coverages)
}
