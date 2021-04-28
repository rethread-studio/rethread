use clap::{App, Arg, SubCommand};
use rfd::FileDialog;
use std::fs::{self, File};
use std::io::prelude::*;
use std::{ffi::OsStr, process::Command};
use std::path::PathBuf;

fn main() -> Result<(), std::io::Error> {
    let matches = App::new("JS formatter and analyzer")
        .version("0.1")
        .author("re|thread")
        .about("Formats the javascript in profiler and extracts information from it")
        .arg(
            Arg::with_name("project")
                .short("p")
                .long("project")
                .help("Select a project folder containing many traces")
                .takes_value(false),
        )
        .arg(
            Arg::with_name("path")
                .short("i")
                .long("path")
                .help("Give the path through an argument instead of choosing it manually through a dialog box")
                .takes_value(true),
        )
        .get_matches();

    let folder_path = match matches.value_of("path") {
        Some(path) => PathBuf::from(path),
        None => {
            let working_dir_path = std::env::current_dir().expect("Can't get working directory");
            // Open folder selection dialog
            let dialog_result = FileDialog::new()
                .set_directory(&working_dir_path)
                .pick_folder();
            let dialog_path = dialog_result.expect("No path chosen, exiting!");
            PathBuf::from(dialog_path)
        }
    };

    if matches.is_present("project") {
        println!("Processing folder as project containing many traces");
        process_project(folder_path)?;
    } else {
        println!("Processing folder as trace");
        process_trace(folder_path)?;
    }

    println!("Processing done!");

    Ok(())
}

fn process_trace(folder_path: std::path::PathBuf) -> Result<(), std::io::Error> {
    println!("Path: {}", folder_path.to_str().unwrap());

    let js_ext = OsStr::new("js");

    let mut js_folder_path = folder_path.clone();
    js_folder_path.push("profiling");

    // Get the paths of all files in the directory
    let mut entries = fs::read_dir(js_folder_path)?
        .filter(|r| r.is_ok()) // Get rid of Err variants for Result<DirEntry>
        .map(|r| r.unwrap().path())
        .filter(|r| r.is_file()) // Get rid of folders
        // Only .js files
        .filter_map(|r| match r.extension() {
            Some(js_ext) => Some(r),
            None => None,
        })
        .collect::<Vec<_>>();

    // The order in which `read_dir` returns entries is not guaranteed. If
    // reproducible ordering is required the entries should be explicitly
    // sorted.  However, we want to sort numbers correctly which requires us
    // to convert the number part to a number.
    entries.sort_by_key(|p| {
        p.file_stem()
            .expect("No file stem!")
            .to_str()
            .unwrap()
            .parse::<i32>()
            .unwrap_or(0) // File names that are not a number go first
    });

    let mut full_formatted_source = String::new();

    for entry in entries {
        // Print path
        println!("File: {}", entry.to_str().unwrap());

        // beautify the file and save the result

        let output = Command::new("js-beautify")
            .arg(entry.to_str().unwrap())
            .arg("-t") // Indent with tabs
            .output()
            .expect("failed to execute process");
        let out_str = std::str::from_utf8(&output.stdout)
            .expect("Failed to convert output of js-beautify to string");
        full_formatted_source.push_str(out_str);
    }

    // Write the full source to file
    let mut file_path = folder_path.clone();
    file_path.push("full_source.js");
    let mut file = File::create(file_path)?;
    file.write_all(full_formatted_source.as_bytes())?;

    // Get the indentation profile
    let lines: Vec<_> = full_formatted_source.split('\n').collect();
    let mut outline = Vec::with_capacity(lines.len());
    for line in lines {
        for (i, c) in line.chars().into_iter().enumerate() {
            if c != '\t' {
                outline.push(i);
            }
        }
    }

    // Write the indentation profile to file
    let mut file_path = folder_path.clone();
    file_path.push("indent_profile.csv");
    let mut file = File::create(file_path)?;
    for (i, indent) in outline.iter().enumerate() {
        file.write_all(indent.to_string().as_bytes())?;
        if i != outline.len() - 1 {
            file.write_all(b",")?;
        }
    }

    Ok(())
}

fn process_project(project_path: std::path::PathBuf) -> Result<(), std::io::Error> {
    // Get all subfolders
    let mut entries = fs::read_dir(project_path)?
        .filter(|r| r.is_ok()) // Get rid of Err variants for Result<DirEntry>
        .map(|r| r.unwrap().path())
        .filter(|r| r.is_dir()) // Only keep folders
        .collect::<Vec<_>>();

    for trace_path in entries {
        process_trace(trace_path)?;
    }

    Ok(())
}
