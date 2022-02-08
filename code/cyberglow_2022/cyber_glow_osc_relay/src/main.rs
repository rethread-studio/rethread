use chrono::{DateTime, Utc};
use clap::Parser;
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

#[derive(Serialize, Deserialize, Debug, Clone)]
struct MonitorMessage {
    origin: String,
    action: String,
    arguments: String,
    timestamp: i64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct FtraceMessage {
    data: String,
    timestamp: i64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
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

/// Monitors, records, plays back, analyses and sonifies data for the cyber|glow v2 installation
#[derive(Parser, Debug)]
#[clap(author, version, about, long_about = None)]
struct Args {
    #[clap(short, long)]
    record: bool,
    #[clap(short, long)]
    play_back: bool,
    #[clap(short, long)]
    sonify: bool,
    #[clap(short, long)]
    listen: bool,
    #[clap(short, long, default_value_t = 57130)]
    listen_port: u16,
    #[clap(short, long)]
    save_path: Option<String>,
    // Path of the input data
    #[clap(short, long)]
    load_path: Option<String>,
    // The number of milliseconds to skip when playing back recorded data
    #[clap(short, long, default_value_t = 0)]
    skip_forward_ms: i64,
    #[clap(short, long, default_value_t = String::from("127.0.0.1:57130"))]
    osc_destination: String,
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

    let args = Args::parse();

    main_loop(args, quit);
}

fn move_old_save_file(save_path: &PathBuf) {
    // Move the old save file to a timestamped one
    let now: DateTime<Utc> = Utc::now();
    let old_data_path = PathBuf::from(format!("./monitor_data_{}.json", now.to_rfc3339()));
    if let Err(e) = fs::copy(save_path, old_data_path) {
        println!("Error copying file to backup: {}", e);
    }
}

fn load_data(path: &PathBuf, skip_ms: i64) -> Option<Vec<Message>> {
    if let Ok(data) = std::fs::read_to_string(path) {
        let mut messages = serde_json::from_str::<Vec<Message>>(&data).unwrap();
        println!("Loaded {} messages!", messages.len());
        // Edit timestamps to be relative to the first first message and move `skip_ms` milliseconds into the stream
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
        Some(messages)
    } else {
        None
    }
}

fn main_loop(mut args: Args, quit: Arc<AtomicBool>) {
    let save_path = PathBuf::from(args.save_path.unwrap_or("./monitor_data.json".to_string()));
    let load_path = PathBuf::from(args.load_path.unwrap_or("./monitor_data.json".to_string()));
    let receiver = osc::receiver(args.listen_port).unwrap();

    let sender = osc::sender()
        .unwrap()
        .connect(args.osc_destination)
        .unwrap();

    let playback_messages = if args.play_back {
        if let Some(messages) = load_data(&load_path, args.skip_forward_ms) {
            messages
        } else {
            eprintln!("Unable to load messages at path {load_path:?}, stopping playback");
            args.play_back = false;
            vec![]
        }
    } else {
        vec![]
    };

    let mut last_save = Instant::now();
    let mut recorded_messages = MonitorDataWrapper {
        messages: vec![],
        output_path: save_path,
    };
    if args.record {
        move_old_save_file(&recorded_messages.output_path);
    }

    let mut message_index = 0;
    // Skip the negative ts messages
    while playback_messages[message_index].ts() < 0 {
        message_index += 1;
    }
    let mut last_message_time = Instant::now();
    'main_loop: loop {
        if args.record {
            if let Ok(Some((packet, _addr))) = receiver.try_recv() {
                for message in packet.into_msgs() {
                    // Parse message
                    let new_message = if message.addr == "/cyberglow" {
                        // println!("New message to {}", message.addr);
                        if let Some(mess_args) = message.args {
                            let mut o = None;
                            let mut m = None;
                            let mut a = None;
                            for (i, arg) in mess_args.into_iter().enumerate() {
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
                                Some(new_message)
                            } else {
                                None
                            }
                        } else {
                            None
                        }
                    } else if message.addr == "/ftrace" {
                        if let Some(args) = message.args {
                            if let osc::Type::String(data) = &args[0] {
                                let now = Utc::now();
                                let new_message = Message::Ftrace(FtraceMessage {
                                    data: data.clone(),
                                    timestamp: now.timestamp_millis(),
                                });
                                Some(new_message)
                            } else {
                                None
                            }
                        } else {
                            None
                        }
                    };
                    // Do something with the message
                    if let Some(new_message) = new_message {
                        if args.listen {
                            pass_through_message(&sender, &new_message);
                        }
                        if args.record {
                            recorded_messages.messages.push(new_message);
                            // Save if enough time has passed
                            if last_save.elapsed().as_secs() > 30 {
                                recorded_messages.save_data();
                                last_save = Instant::now();
                            }
                        }
                        if args.sonify {
                            sonify_message(&new_message);
                        }
                    }
                }
            }
        }
        if args.play_back {
            if last_message_time.elapsed().as_millis()
                >= playback_messages[message_index].ts() as u128
            {
                playback_messages[message_index].clone().send(&sender);
                last_message_time = Instant::now();
                message_index += 1;
                if message_index >= playback_messages.len() {
                    println!("Finished playing all events!");
                    if !args.record && !args.listen {
                        break 'main_loop;
                    }
                }
            }
        }
        if quit.load(Ordering::Relaxed) {
            println!("Quitting!");
            if args.record {
                recorded_messages.save_data();
            }
            break 'main_loop;
        }
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

fn sonify_message(message: &Message) {
    match message {
        Message::Monitor(_monitor_message) => {
            // do nothing for now
        }
        Message::Ftrace(ftrace_message) => {
            let _ftrace_kind = parse_ftrace(&ftrace_message.data);
        }
    }
}

fn parse_ftrace<T: AsRef<str>>(data: T) -> FtraceKind {
    /*
           string event_copy = event;
           vector<string> tokens;
           string delimiter = ";";
           auto i = event.find(delimiter);
           while(i != string::npos) {
               tokens.push_back(event.substr(0, i));
               event.erase(0, i+delimiter.size());
               i = event.find(delimiter);
           }
           tokens.push_back(event); // add the last token

           string event_type;
           i = tokens[2].find("(");
           if(i != string::npos) {
               event_type = tokens[2].substr(0, i);
           } else {
               i = tokens[2].find(" ");
               event_type = tokens[2].substr(0, i);
           }
    */
    let data = data.as_ref();
    let tokens: Vec<&str> = data.split(';').collect();
    let event_type = if let Some(index) = tokens[2].find('(') {
        &tokens[2][..index]
    } else if let Some(index) = tokens[2].find(' ') {
        &tokens[2][..index]
    } else {
        ""
    };
    let event_prefix = if let Some(index) = event_type.find('_') {
        &event_type[..index]
    } else {
        ""
    };
    let ftrace_kind = match event_prefix {
        "random" | "dd" | "redit" => FtraceKind::Random,
        "sys" | "ys" => FtraceKind::Syscall,
        "tcp" | "cp" => FtraceKind::Tcp,
        "irq_matrix" | "ix" => FtraceKind::IrqMatrix,
        _ => FtraceKind::Unknown,
    };
    println!("{ftrace_kind:?}");
    ftrace_kind
    // if event_prefix == "random" || event_prefix == "dd" || event_prefix == "redit" {
    //     // random type
    // } else if event_prefix == "ys" {
    //     // syscall type
    // } else if event_prefix == "cp" {
    //     // tcp type
    // } else if event_prefix == "ix" {
    //     // irq_matrix type
    // } else {
    // }
}

#[derive(Debug, Clone, Copy)]
enum FtraceKind {
    Random,
    Syscall,
    Tcp,
    IrqMatrix,
    Unknown,
}
