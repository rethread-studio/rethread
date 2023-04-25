use anyhow::Result;
use std::{
    collections::{HashMap, HashSet},
    io::{self, Read},
};

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
struct Author {
    name: String,
    email_addresses: Vec<String>,
}
impl Author {
    pub fn new(name: String) -> Self {
        Self {
            name,
            email_addresses: Vec::new(),
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
struct Data {
    authors: Vec<Author>,
}

fn main() -> Result<()> {
    let mut authors = HashMap::new();

    loop {
        let mut input = String::new();
        match io::stdin().read_line(&mut input) {
            Ok(len) => {
                if len == 0 {
                    break;
                } else {
                    let trimmed = input.trim();
                    let mut it = trimmed.split(";");
                    let author = it.next().unwrap();
                    let entry = authors
                        .entry(author.to_string())
                        .or_insert(Author::new(author.to_string()));
                    for email in it {
                        let s = email.to_string();
                        if !entry.email_addresses.contains(&s) {
                            entry.email_addresses.push(s);
                        }
                    }
                    // println!("{}", input);
                }
            }
            Err(error) => {
                eprintln!("error: {}", error);
                break;
            }
        }
    }
    // dbg!(&emails);
    // println!("Num authors: {}", emails.len());
    let authors = authors.values().cloned().collect();
    let data = Data { authors };
    let json = serde_json::to_string_pretty(&data)?;
    println!("{json}");
    Ok(())
}
