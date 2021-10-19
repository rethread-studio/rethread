use clap::{App, Arg};

use std::fs::File;
use std::io::BufReader;
use std::io::prelude::*;

use std::str;
use std::collections::HashMap;

use std::process::Command;
use std::process;

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use std::time::Instant;

use nannou_osc as osc;

struct Model {
    start_timestamp: f64,
}

fn main() -> std::result::Result<(), std::io::Error> {
    // Get command line arguments
    let matches = App::new("ftrace-live")
        .version("0.1")
        .author("Erik Natanael Gustafsson <erik@eriknatanael.com>")
        .about("Reads an active kernel ftrace tracer and passes it on")
        .arg(
            Arg::new("port")
                .short('p')
                .long("port")
                .about("Sets the remote port")
                .takes_value(true),
        )
        .arg(
            Arg::new("event")
                .short('e')
                .long("event")
                .about("Sets the event filter")
                .takes_value(true)
                .multiple(true)
        )
        .arg(
            Arg::new("pid")
                .short('i')
                .long("pid")
                .about("Sets a single process to trace")
                .takes_value(true),
        )
        .arg(
            Arg::new("output")
                .about("Sets an optional output file")
                .index(1),
        )
        .get_matches();

    // You can check the value provided by positional arguments, or option arguments
    let mut port = 57120;
    if let Some(o) = matches.value_of("port") {
        port = o.parse::<i32>().expect("Port received was not a valid number.");
        println!("Value for port: {}", port);
        
    }

    // let mut event_filter = "*:*";

    // if let Some(o) = matches.value_of("event") {
    //     event_filter = &o;
    // }

    let events = matches.values_of("event").unwrap().collect();

    let mut pid = None;

    if let Some(o) = matches.value_of("pid") {
        pid = Some(o.parse::<u32>().expect("pid was not set to an integer"));
    }

    // Setup CTRL+C support
    let running = Arc::new(AtomicBool::new(true));
    let r = running.clone();

    ctrlc::set_handler(move || {
        match r.load(Ordering::SeqCst) {
            true =>  r.store(false, Ordering::SeqCst),
            false => {
                // CTRL+C has already been pressed and the application hasn't shut down
                // exit immediately
                panic!("Forced exit without cleanup!");
            }
        }
       
    }).expect("Error setting Ctrl-C handler");

    println!("My pid is {}", process::id()); // Print OS-assigned PID

    // Set up osc sender
    let target_addr = format!("{}:{}", "127.0.0.1", port);
    let osc_sender = osc::sender()
        .expect("Could not bind to default socket")
        .connect(target_addr)
        .expect("Could not connect to socket at address");

    reset_trace();
    init_trace_options(pid, &events);

    start_tracer();
    send_osc_start_transmission(&osc_sender);
    read_trace_pipe(Arc::clone(&running), osc_sender);

    cleanup_ftrace(&events);

    Ok(())
}


fn reset_trace() {
    set_ftrace_parameter("tracing_on", "0");
    set_ftrace_parameter("current_tracer", "nop");
    // Clear previous trace
    set_ftrace_parameter("trace", "-1");
    // Turn all events off
    set_ftrace_parameter("set_event", "");
}

fn start_tracer() {
    set_ftrace_parameter("tracing_on", "1");
}

fn init_trace_options(pid: Option<u32>, events: &Vec<&str>) {
    // Set tracer to "function"
    // There are several different tracers: hwlat blk mmiotrace function_graph wakeup_dl wakeup_rt wakeup function nop
    set_ftrace_parameter("current_tracer", "function");

    // Set what events to listen for
    // set_event seems to only accept a single event string e.g. tcp:*
    // set_ftrace_parameter("set_event", event_filter);
    for event_name in events {
        enable_event(event_name);
    }


    // Listen to a single pid if one was supplied
    if let Some(process) = pid {
        // Function tracer for only a single process
        set_ftrace_parameter("set_ftrace_pid", &process.to_string());
        // Event tracing for only a single process
        // Note, sched_switch and sched_wake_up will also trace events listed in this file.
        set_ftrace_parameter("set_event_pid", &process.to_string());
    }
    

    // Exclude the current pid from tracing
    // set_event_notrace_pid is not available on my system

}

fn enable_event(name: &str) {
    let mut path: String = String::from("events/");
    path.push_str(name);
    path.push_str("/enable");
    set_ftrace_parameter(&path, "1");
}

fn disable_event(name: &str) {
    let mut path: String = String::from("events/");
    path.push_str(name);
    path.push_str("/enable");
    set_ftrace_parameter(&path, "0");
}

fn set_ftrace_parameter(name: &str, arg: &str) {
    let mut path: String = String::from("/sys/kernel/tracing/");
    path.push_str(name);
    match File::create(path) {
        Ok(mut f) => {
            f.write_all(arg.as_bytes()).expect("Unable to write tracing setting");
        }
        Err(e) => {
            println!("Unable to open file {} because: {}", name, e);
        }
    }
}

/// Initialise an event for use in this trace
fn init_event(event_name: &str) {
    // disable tracing the current process

}

fn cleanup_ftrace(events: &Vec<&str>) {
    for event_name in events {
        disable_event(event_name);
    }
    reset_trace();
}



fn read_trace_pipe(running: Arc<AtomicBool>, osc_sender: osc::Sender<osc::Connected>) {
    // Set up state
    let mut state = Model{ start_timestamp: 0.0 };

    // Set up file reader
    let file = File::open("/sys/kernel/tracing/trace_pipe").unwrap();
    let mut buf_reader = BufReader::new(file);
    let mut contents = String::new();

    let mut num_events = 0_u64;
    let mut total_num_events = 0_u64;
    let mut num_events_per_second = 0_u64;

    let mut last_second = Instant::now();

    // The system call to read the file can be interrupted by CTRL+C in which case we want to break out of the loop.
    while running.load(Ordering::SeqCst) {
        
        // Read from the file using fill_buf which will read a little bit at a time and then return
        // ca 165000 events per second
        match buf_reader.fill_buf() {
            Ok(buffer) => {
                let buffer_str = match str::from_utf8(buffer) {
                    Ok(v) => v,
                    Err(e) => panic!("Invalid UTF-8 sequence"),
                };
                for line in buffer_str.lines() {
                    num_events += 1;
                    total_num_events += 1;
                    num_events_per_second += 1;
                    if total_num_events % 10000 == 0 {
                        // println!("{}", num_events);
                        // println!("{}", line);
                    }
                    // println!("{}", line);
                    // Lines are sometimes printed that are not part of the trace data. These are filtered out here if they are too short to contain the data.
                    if line.len() > 49 {
                        // Parse the line
                        let (timestamp, event_string, pid, cpu) = parse_line(line, &mut state);
                        send_osc_message(&osc_sender, timestamp, event_string, pid, cpu);
                    }
                }
                // ensure the bytes we worked with aren't returned again later
                let length = buffer.len();
                buf_reader.consume(length);  
                // println!("Finished reading!");
                if num_events != 0 {
                    // println!("num: {}", num_events);
                }
                num_events = 0;
            },
            Err(e) => {
                println!("{}", e);
                break;
            }
        }

        if last_second.elapsed().as_millis() >= 1000 {
            last_second = Instant::now();
            println!("Events per second: {}", num_events_per_second);
            num_events_per_second = 0;
        }
    }
}

fn send_osc_message(osc_sender: &osc::Sender<osc::Connected>, timestamp: f64, event_string: String, pid: i32, cpu: i32) {
    let osc_addr = "/ftrace".to_string();
    // message format: timestamp, event_type
    let args = vec![osc::Type::Double(timestamp), osc::Type::String(event_string), osc::Type::Int(pid), osc::Type::Int(cpu)];
    let packet = (osc_addr, args);
    // println!("{:?}", packet);

    osc_sender.send(packet).expect("Unable to send osc message!");
}

fn send_osc_start_transmission(osc_sender: &osc::Sender<osc::Connected>) {
    let osc_addr = "/start_transmission".to_string();
    let args = vec![];
    let packet = (osc_addr, args);
    osc_sender.send(packet).expect("Unable to send osc message!");
}

// TODO: The amount of whitespace seems to be variable between systems. Find a more clever way of parsing this
fn parse_line(line: &str, state: &mut Model) -> (f64, String, i32, i32) {
    let _process = &line[0..16];
    // pid can be 5 or 6 characters on my system
    let pid_str = &line[17..23];
    let pid_offset = if line[23..24].eq(" ") {
        6
    } else if line[23..24].eq("[") {
        5
    } else {
        panic!("Wrong pid index");
    };
    let cpu_str = &line[20+pid_offset..22+pid_offset];
    let _irq = &line[25+pid_offset..29+pid_offset];
    let timestamp = &line[30+pid_offset..41+pid_offset];
    // shave of last : of timestamp
    // timestamp = &timestamp[..timestamp.len()-1];
    // println!("ts: {}, line: {}", timestamp, line);
    let timestamp_float = timestamp.parse::<f64>().unwrap();
    let event = &line[43+pid_offset..line.len()];
    // Ignore the whitespace after the number by taking the first element in the string split by whitespace, e.g. Some("4827"), and unwrap
    let pid = pid_str.split_ascii_whitespace().next().unwrap().parse::<i32>().expect(&format!("Pid string wrong: {}, line: {}, process: {}", pid_str, line, _process));
    let cpu = cpu_str.parse::<i32>().expect(&format!("cpu string wrong: {}", cpu_str));
    // First event
    if state.start_timestamp == 0.0 {
        state.start_timestamp = timestamp_float;
    }
    let timestamp_int = (timestamp_float - state.start_timestamp) * 1000000.0;
    (timestamp_int, event.to_owned(), pid, cpu)
}
