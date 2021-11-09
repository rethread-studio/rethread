use chrono::{DateTime, Utc};
use clap::{App, Arg, SubCommand};
use ctrlc;
use nannou_osc as osc;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::convert::TryInto;
use std::fs;
use std::fs::File;
use std::io::prelude::*;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

#[derive(Serialize, Deserialize, Debug)]
struct MonitorMessage {
    origin: String,
    action: String,
    arguments: String,
    timestamp: i64,
}

#[derive(Serialize, Deserialize, Debug)]
struct FtraceMessage {
    data: String,
    timestamp: i64,
}

#[derive(Serialize, Deserialize, Debug)]
enum Message {
    Monitor(MonitorMessage),
    Ftrace(FtraceMessage),
}

impl Message {
    pub fn ts(&self) -> i64 {
        match self {
            Message::Monitor(m) => m.timestamp,
            Message::Ftrace(m) => m.timestamp,
        }
    }
    fn send(self, sender: &osc::Sender<osc::Connected>) {
        match self {
            Message::Monitor(m) => {
                let args = vec![
                    osc::Type::String(m.origin),
                    osc::Type::String(m.action),
                    osc::Type::String(m.arguments),
                ];
                sender.send(("/cyberglow", args)).ok();
            }
            Message::Ftrace(m) => {
                let args = vec![osc::Type::String(m.data)];
                sender.send(("/ftrace", args)).ok();
            }
        }
    }
}

/// This wrapper is only for making sure the data gets saved when the program is stopped
struct MonitorDataWrapper {
    messages: Vec<Message>,
    output_path: PathBuf,
}
impl MonitorDataWrapper {
    pub fn save_data(&self) {
        // Move old save data file to path.bak
        let mut bak_path = self.output_path.clone();
        bak_path.set_extension("json.bak");
        if let Err(e) = fs::copy(&self.output_path, bak_path) {
            println!("Error copying file to backup: {}", e);
        }
        // Save a new file with the data
        // Never panic
        let new_data = serde_json::to_string(&self.messages).unwrap();

        if let Ok(mut output) = File::create(&self.output_path) {
            if let Err(e) = output.write_all(&new_data.into_bytes()) {
                println!("Error writing data: {}", e);
            }
        }

        println!("Data saved");
    }
}

fn main() {
    let quit = Arc::new(AtomicBool::new(false));

    let ctrl_c_quit = quit.clone();
    ctrlc::set_handler(move || {
        println!("received Ctrl+C!");

        if ctrl_c_quit.load(Ordering::Relaxed) {
            // If ctrl+c was already pressed once
            panic!("Failed to quit gracefully");
        } else {
            ctrl_c_quit.store(true, Ordering::Relaxed);
        }
    })
    .expect("Error setting Ctrl-C handler");

    let matches = App::new("cyberglow monitor monitor")
        .version("1.0")
        .author("re|thread")
        .about("Records or plays back monitor data for the cyberglow installation")
        .subcommand(
            SubCommand::with_name("record")
                .about("records data")
                .arg(Arg::with_name("port").short("p").takes_value(true))
                .arg(Arg::with_name("output_path").short("o").takes_value(true))
                .arg(Arg::with_name("passthrough").long("passthrough").short("t")),
        )
        .subcommand(
            SubCommand::with_name("play")
                .about("play back data that was previously recorded")
                .arg(
                    Arg::with_name("destination")
                        .help("what ip:port to send the data to")
                        .long("destination")
                        .short("d")
                        .takes_value(true),
                )
                .arg(
                    Arg::with_name("analyze")
                        .help("only print analysis of data")
                        .long("analyze")
                        .short("a"),
                )
                .arg(
                    Arg::with_name("skip_ms")
                        .short("s")
                        .long("skip")
                        .value_name("SKIP_MS")
                        .help("Skips SKIP_MS milliseconds into the recorded data.")
                        .takes_value(true),
                )
                .arg(
                    Arg::with_name("input_path")
                        .short("i")
                        .long("input")
                        .takes_value(true),
                )
                .arg(Arg::with_name("osc_addr").short("a").takes_value(true)),
        )
        .get_matches();

    if let Some(matches) = matches.subcommand_matches("record") {
        let port = matches
            .value_of("port")
            .unwrap_or("57130")
            .parse::<u16>()
            .unwrap_or(57130);
        let save_path = PathBuf::from(
            matches
                .value_of("output_path")
                .unwrap_or("./monitor_data.json"),
        );
        let passthrough = matches.is_present("passthrough");
        record_data(save_path, port, quit, passthrough);
    } else if let Some(matches) = matches.subcommand_matches("play") {
        let input_path = PathBuf::from(
            matches
                .value_of("input_path")
                .unwrap_or("./monitor_data.json"),
        );
        let skip_ms = matches
            .value_of("skip_ms")
            .unwrap_or("0")
            .parse::<i64>()
            .unwrap_or(0);
        let destination = matches.value_of("destination").unwrap_or("127.0.0.1:57130");
        let osc_addr = matches.value_of("osc_addr").unwrap_or("/cyberglow");
        let messages = load_data(&input_path);
        if let Some(messages) = messages {
            if matches.is_present("analyze") {
                print_all_message_types(&messages);
            } else {
                play_back_data(destination, osc_addr, messages, quit, skip_ms);
            }
        } else {
            println!("Failed to load data to play back, exiting.");
        }
    }
}

fn record_data(path: PathBuf, port: u16, quit: Arc<AtomicBool>, passthrough: bool) {
    let receiver = osc::receiver(port).unwrap();
    let mut messages = MonitorDataWrapper {
        messages: vec![],
        output_path: path,
    };
    let sender = osc::sender().unwrap().connect("127.0.0.1:57131").unwrap();
    // Move the old save file to a timestamped one
    let now: DateTime<Utc> = Utc::now();
    let old_data_path = PathBuf::from(format!("./monitor_data_{}.json", now.to_rfc3339()));
    if let Err(e) = fs::copy(&messages.output_path, old_data_path) {
        println!("Error copying file to backup: {}", e);
    }
    let mut last_save = Instant::now();
    loop {
        if let Ok(Some((packet, _addr))) = receiver.try_recv() {
            for message in packet.into_msgs() {
                if message.addr == "/cyberglow" {
                    println!("{:?}", message);
                    // println!("New message to {}", message.addr);
                    if let Some(args) = message.args {
                        let mut o = None;
                        let mut m = None;
                        let mut a = None;
                        for (i, arg) in args.into_iter().enumerate() {
                            match (i, arg) {
                                (0, osc::Type::String(origin)) => o = Some(origin),
                                (1, osc::Type::String(mess)) => m = Some(mess),
                                (2, osc::Type::String(arguments)) => a = Some(arguments),
                                (_, _) => (),
                            }
                        }
                        if o.is_some() && m.is_some() {
                            let now = Utc::now();
                            let new_message = Message::Monitor(MonitorMessage {
                                origin: o.unwrap(),
                                action: m.unwrap(),
                                arguments: a.unwrap(),
                                timestamp: now.timestamp_millis(),
                            });
                            if passthrough {
                                pass_through_message(&sender, &new_message);
                            }
                            messages.messages.push(new_message);
                            // Save if enough time has passed
                            if last_save.elapsed().as_secs() > 30 {
                                messages.save_data();
                                last_save = Instant::now();
                            }
                        }
                    }
                } else if message.addr == "/ftrace" {
                    // println!("{:?}", message);
                    // if let Some(args) = message.args {
                    //     if let osc::Type::String(data) = &args[0] {
                    //         let new_message = Message::Ftrace(FtraceMessage {
                    //             data: data.clone(),
                    //             timestamp: now.timestamp_millis(),
                    //         });

                    //         if passthrough {
                    //             pass_through_message(&sender, &new_message);
                    //         }
                    //         messages.messages.push(new_message);
                    //     }
                    // }
                }
            }
        }
        // Check if CTRL+C was pressed
        if quit.load(Ordering::Relaxed) {
            messages.save_data();
            break;
        }
    }
}

fn load_data(path: &PathBuf) -> Option<Vec<Message>> {
    if let Ok(data) = std::fs::read_to_string(path) {
        let deserialized = serde_json::from_str::<Vec<Message>>(&data).unwrap();
        println!("Loaded {} messages!", deserialized.len());
        Some(deserialized)
    } else {
        None
    }
}

fn play_back_data(
    destination: &str,
    osc_addr: &str,
    mut messages: Vec<Message>,
    quit: Arc<AtomicBool>,
    skip_ms: i64,
) {
    // Bind an `osc::Sender` and connect it to the target address.
    let sender = osc::sender().unwrap().connect(destination).unwrap();
    // Assume that the messages are in timestamp order
    let mut accumulated_ts = messages[0].ts() + skip_ms;
    // Convert the timestamps in the MonitorMessages into the number of milliseconds between messages to make going through them easier
    // This isn't very precise, as sending each message takes some time so there will be drift, but it's negligable for this purpose
    for m in &mut messages {
        match m {
            Message::Monitor(m) => m.timestamp = (m.timestamp - accumulated_ts).min(300),
            Message::Ftrace(m) => m.timestamp -= accumulated_ts,
        }

        accumulated_ts += m.ts().max(0);
    }
    'message_loop: for m in messages.into_iter().filter(|m| m.ts() >= 0) {
        println!("Sleeping for {}", m.ts());
        let mut total_sleep = m.ts().try_into().unwrap();
        while total_sleep > 0 {
            // Check if CTRL+C was pressed
            if quit.load(Ordering::Relaxed) {
                println!("Quitting!");
                break 'message_loop;
            }
            if total_sleep > 100 {
                std::thread::sleep(Duration::from_millis(100));
                total_sleep -= 100;
            } else {
                std::thread::sleep(Duration::from_millis(total_sleep));
                total_sleep = 0;
            }
        }

        println!("{:?}", m);
        m.send(&sender);
    }
}

fn print_all_message_types(messages: &Vec<Message>) {
    let mut map = HashMap::new();
    for m in messages {
        match m {
            Message::Monitor(m) => {
                let origin_map = map.entry(m.origin.clone()).or_insert(HashMap::new());
                *origin_map.entry(m.action.clone()).or_insert(1) += 1;
            }
            Message::Ftrace(_m) => {}
        }
    }
    for (origin, map) in map {
        for (action, num) in map {
            println!("{}: {}, {}", origin, action, num);
        }
    }
}

fn pass_through_message(sender: &osc::Sender<osc::Connected>, message: &Message) {
    match message {
        Message::Monitor(m) => {
            let args = vec![
                osc::Type::String(m.origin.clone()),
                osc::Type::String(m.action.clone()),
                osc::Type::String(m.arguments.clone()),
            ];
            sender.send(("/cyberglow", args)).ok();
        }
        Message::Ftrace(m) => {
            let args = vec![osc::Type::String(m.data.clone())];
            sender.send(("/ftrace", args)).ok();
        }
    }
}
