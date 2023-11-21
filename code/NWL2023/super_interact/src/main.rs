use std::io::{self, BufRead};

fn main() {
    let sender = nannou_osc::sender()
        .unwrap()
        .connect(format!("{}:{}", "127.0.0.1", 57103))
        .unwrap();
    println!("Interact with the reinverse supervisor. This utility needs to be run on localhost.");
    println!("1. Restart\n2. Recompile");

    let mut line = String::new();
    let stdin = io::stdin();
    stdin
        .lock()
        .read_line(&mut line)
        .expect("Could not read line");
    println!("{}", line);
    match line.trim() {
        "1" => {
            let addr = "/restart";
            let args = vec![];
            sender.send((addr, args)).ok();
        }
        "2" => {
            let addr = "/recompile";
            let args = vec![];
            sender.send((addr, args)).ok();
        }
        _ => println!("Unknown input"),
    }
}
