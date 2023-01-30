use anyhow::Result;
use std::collections::HashMap;
use std::fs::File;
use std::io::{BufRead, BufReader, Error, Write};
use walkdir::WalkDir;

fn main() -> Result<()> {
    let mut word_map = HashMap::new();
    let mut num_files = 0;
    let mut num_lines = 0;
    let mut num_synths = 0;

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
            let input = File::open(entry.path())?;
            let buffered = BufReader::new(input);

            for line in buffered.lines() {
                num_lines += 1;
                if let Ok(line) = line {
                    let words: Vec<_> = line
                        .split(
                            [
                                ' ', ':', '{', '}', '(', ')', '[', ']', '\t', ',', '/', '\"', '+',
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
    num_synths = word_map["SynthDef"];
    let mut word_list: Vec<_> = word_map
        .into_iter()
        .map(|(word, count)| (word, count))
        .collect();
    word_list.sort_by_key(|(_word, count)| *count);

    let mean_word_freq =
        word_list.iter().map(|(_word, count)| *count).sum::<i32>() as f64 / word_list.len() as f64;
    let median_word_freq = word_list[word_list.len() / 2].1;

    let synth_variables: Vec<_> = word_list
        .iter()
        .filter(|(word, _count)| word.chars().next().unwrap() == '\\')
        .collect();
    let synth_ugens: Vec<_> = word_list
        .iter()
        .filter(|(word, _count)| {
            (word.contains(".ar") || word.contains(".kr") || word.contains(".ir"))
                && word.chars().next().unwrap() != '\\'
        })
        .collect();

    println!("{word_list:?}");
    dbg!(synth_variables);
    dbg!(synth_ugens);
    println!("\nnum_files: {num_files}");
    println!("num_lines: {num_lines}");
    println!("num_synths: {num_synths}");
    println!("num \"words\": {}", word_list.len());
    println!("mean word frequency: {mean_word_freq}");
    println!("median word frequency: {median_word_freq}");

    Ok(())
}
