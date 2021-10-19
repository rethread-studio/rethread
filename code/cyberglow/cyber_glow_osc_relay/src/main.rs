use chrono::{DateTime, Utc};
use clap::{App, Arg, SubCommand};
use ctrlc;
use nannou_osc as osc;
use serde::{Deserialize, Serialize};
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

/// This wrapper is only for making sure the data gets saved when the program is stopped
struct MonitorDataWrapper {
    messages: Vec<MonitorMessage>,
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
                .arg(Arg::with_name("output_path").short("o").takes_value(true)),
        )
        .subcommand(
            SubCommand::with_name("play")
                .about("play back data that was previously recorded")
                .arg(
                    Arg::with_name("destination")
                        .help("what ip:port to send the data to")
                        .short("d")
                        .takes_value(true),
                )
                .arg(Arg::with_name("input_path").short("i").takes_value(true))
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
        record_data(save_path, port, quit);
    } else if let Some(matches) = matches.subcommand_matches("play") {
        let input_path = PathBuf::from(
            matches
                .value_of("input_path")
                .unwrap_or("./monitor_data.json"),
        );
        let destination = matches.value_of("destination").unwrap_or("127.0.0.1:57130");
        let osc_addr = matches.value_of("osc_addr").unwrap_or("/cyberglow");
        let messages = load_data(&input_path);
        if let Some(messages) = messages {
            play_back_data(destination, osc_addr, messages, quit);
        } else {
            println!("Failed to load data to play back, exiting.");
        }
    }
}

fn record_data(path: PathBuf, port: u16, quit: Arc<AtomicBool>) {
    let address = "/cyberglow";
    let receiver = osc::receiver(port).unwrap();
    let mut messages = MonitorDataWrapper {
        messages: vec![],
        output_path: path,
    };
    // Move the old save file to a timestamped one
    let now: DateTime<Utc> = Utc::now();
    let old_data_path = PathBuf::from(format!("./monitor_data_{}.json", now.to_rfc3339()));
    if let Err(e) = fs::copy(&messages.output_path, old_data_path) {
        println!("Error copying file to backup: {}", e);
    }
    let mut last_save = Instant::now();
    loop {
        if let Ok(Some((packet, addr))) = receiver.try_recv() {
            for message in packet.into_msgs() {
                println!("{:?}", message);
                if message.addr == address {
                    println!("New message to {}", message.addr);
                    if let Some(args) = message.args {
                        let mut o = None;
                        let mut m = None;
                        let mut a = None;
                        for (i, arg) in args.into_iter().enumerate() {
                            println!("{:?}", arg);
                            match (i, arg) {
                                (0, osc::Type::String(origin)) => o = Some(origin),
                                (1, osc::Type::String(mess)) => m = Some(mess),
                                (2, osc::Type::String(arguments)) => a = Some(arguments),
                                (_, _) => (),
                            }
                        }
                        if o.is_some() && m.is_some() {
                            let now = Utc::now();
                            messages.messages.push(MonitorMessage {
                                origin: o.unwrap(),
                                action: m.unwrap(),
                                arguments: a.unwrap(),
                                timestamp: now.timestamp_millis(),
                            });
                            // Save if enough time has passed
                            if last_save.elapsed().as_secs() > 30 {
                                messages.save_data();
                                last_save = Instant::now();
                            }
                        }
                    }
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

fn load_data(path: &PathBuf) -> Option<Vec<MonitorMessage>> {
    if let Ok(data) = std::fs::read_to_string(path) {
        let deserialized = serde_json::from_str::<Vec<MonitorMessage>>(&data).unwrap();
        Some(deserialized)
    } else {
        None
    }
}

fn play_back_data(destination: &str, osc_addr: &str, mut messages: Vec<MonitorMessage>, quit: Arc<AtomicBool>) {
    // Bind an `osc::Sender` and connect it to the target address.
    let sender = osc::sender().unwrap().connect(destination).unwrap();
    // Assume that the messages are in timestamp order
    let mut accumulated_ts = messages[0].timestamp;
    // Convert the timestamps in the MonitorMessages into the number of milliseconds between messages to make going through them easier
    // This isn't very precise, as sending each message takes some time so there will be drift, but it's negligable for this purpose
    for m in &mut messages {
        m.timestamp -= accumulated_ts;
        accumulated_ts -= m.timestamp;
    }
    'message_loop: for m in messages {
        let mut total_sleep = m.timestamp.try_into().unwrap();
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

        std::thread::sleep(Duration::from_millis(m.timestamp.try_into().unwrap()));

        println!("{:?}", m);
        let args = vec![osc::Type::String(m.origin), osc::Type::String(m.action), osc::Type::String(m.arguments)];
        sender.send((osc_addr, args)).ok();
    }
}
