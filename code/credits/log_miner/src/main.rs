use std::{
    collections::HashSet,
    io::{self, Read},
};

fn main() {
    let mut authors = HashSet::new();

    loop {
        let mut input = String::new();
        match io::stdin().read_line(&mut input) {
            Ok(len) => {
                if len == 0 {
                    break;
                } else {
                    authors.insert(input.trim().clone());
                    // println!("{}", input);
                }
            }
            Err(error) => {
                eprintln!("error: {}", error);
                break;
            }
        }
    }
    dbg!(&authors);
    println!("Num authors: {}", authors.len());
}
