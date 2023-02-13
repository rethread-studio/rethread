use anyhow::Result;
use serde::Serialize;
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::{BufRead, BufReader};
use walkdir::WalkDir;

#[derive(Serialize, Debug, Clone)]
struct Word {
    word: String,
    occurrences: usize,
}

#[derive(Serialize, Debug, Clone)]
struct SuperColliderCodeStats {
    all_words: Vec<Word>,
    unit_generators: Vec<Word>,
    inline_synth_parameters: Vec<Word>,
    num_files: usize,
    lines_of_code: usize,
    num_synth_definitions: usize,
    file_names: Vec<String>,
    mean_word_frequency: f32,
    median_word_frequency: f32,
}

fn main() -> Result<()> {
    let mut word_map = HashMap::new();
    let mut num_files = 0;
    let mut num_lines = 0;
    let mut file_names: Vec<String> = vec![];

    for entry in WalkDir::new("../.")
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let f_name = entry.file_name().to_string_lossy();
        let sec = entry.metadata()?.modified()?;

        if f_name.ends_with(".scd") {
            num_files += 1;
            println!("{}", f_name);
            file_names.push(f_name.into());
            let input = File::open(entry.path())?;
            let buffered = BufReader::new(input);

            for line in buffered.lines() {
                num_lines += 1;
                if let Ok(line) = line {
                    let words: Vec<_> = line
                        .split(
                            [
                                ' ', ':', '{', '}', '(', ')', '[', ']', '\t', ',', '/', '\"', '+',
                                ';', '=',
                            ]
                            .as_ref(),
                        )
                        .collect();
                    for word in words {
                        if word != "" {
                            *word_map.entry(word.to_owned()).or_insert(0) += 1;
                        }
                    }
                }
            }
        }
    }
    let num_synths = word_map["SynthDef"];
    let mut word_list: Vec<_> = word_map
        .into_iter()
        .map(|(word, count)| Word {
            word,
            occurrences: count,
        })
        .collect();
    word_list.sort_by_key(|word| word.occurrences);

    let mean_word_freq = word_list.iter().map(|word| word.occurrences).sum::<usize>() as f64
        / word_list.len() as f64;
    let median_word_freq = word_list[word_list.len() / 2].occurrences;

    let synth_variables: Vec<_> = word_list
        .iter()
        .filter(|word| word.word.chars().next().unwrap() == '\\')
        .cloned()
        .collect();
    let synth_ugens: Vec<_> = word_list
        .iter()
        .filter(|word| {
            let word = &word.word;
            (word.contains(".ar") || word.contains(".kr") || word.contains(".ir"))
                && word.chars().next().unwrap() != '\\'
                && word.len() > 3
        })
        .cloned()
        .collect();

    println!("{word_list:?}");
    // dbg!(synth_variables);
    // dbg!(synth_ugens);
    println!("\nnum_files: {num_files}");
    println!("num_lines: {num_lines}");
    println!("num_synths: {num_synths}");
    println!("num \"words\": {}", word_list.len());
    println!("mean word frequency: {mean_word_freq}");
    println!("median word frequency: {median_word_freq}");

    let stats = SuperColliderCodeStats {
        all_words: word_list.clone(),
        unit_generators: synth_ugens.clone(),
        inline_synth_parameters: synth_variables,
        num_files,
        lines_of_code: num_lines,
        num_synth_definitions: num_synths,
        file_names,
        mean_word_frequency: mean_word_freq as f32,
        median_word_frequency: median_word_freq as f32,
    };
    let json = serde_json::to_string(&stats)?;

    fs::write("supercollider_stats.json", json.as_bytes())?;

    Ok(())
}
