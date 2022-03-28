use chrono::{DateTime, Utc};
use clap::Parser;
use crossterm::{
    event::{self, DisableMouseCapture, EnableMouseCapture, Event, KeyCode},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use nannou_osc as osc;
use num_format::{SystemLocale, ToFormattedString};
use once_cell::sync::Lazy;
use osc::Connected;
use serde::{Deserialize, Serialize};
use std::fs;
use std::fs::File;
use std::io;
use std::io::prelude::*;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use std::{collections::HashMap, sync::atomic::AtomicU64};
use tui::{
    backend::CrosstermBackend,
    layout::{Alignment, Constraint, Direction, Layout},
    style::{Modifier, Style},
    text::{Span, Spans},
    widgets::{Block, BorderType, Borders, List, ListItem, Paragraph, Widget},
    Terminal,
};

static SYSCALL_MAP: Lazy<Mutex<HashMap<String, usize>>> = Lazy::new(|| Mutex::new(HashMap::new()));
static NUM_FTRACE_EVENTS: Lazy<AtomicU64> = Lazy::new(|| AtomicU64::new(0));
static NUM_MONITOR_EVENTS: Lazy<AtomicU64> = Lazy::new(|| AtomicU64::new(0));
#[derive(Serialize, Deserialize, Debug, Clone)]
struct MonitorMessage {
    origin: String,
    action: String,
    arguments: String,
    timestamp: i64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct FtraceMessage {
    kind: FtraceKind,
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
    fn send(&self, sender: &osc::Sender<osc::Connected>) {
        match self {
            Message::Monitor(m) => {
                let args = vec![
                    osc::Type::String(m.origin.clone()),
                    osc::Type::String(m.action.clone()),
                    osc::Type::String(m.arguments.clone()),
                ];
                sender.send(("/cyberglow", args)).ok();
            }
            Message::Ftrace(m) => {
                let args = vec![osc::Type::String(format!("{:?}", m.kind))];
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
    #[clap(short, long, default_value_t = String::from("127.0.0.1:57131"))]
    osc_destination: String,
}

enum TerminalEvent {
    Input(event::KeyEvent),
    Tick,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let quit = Arc::new(AtomicBool::new(false));

    let ctrl_c_quit = quit.clone();
    // ctrlc::set_handler(move || {
    //     println!("received Ctrl+C!");

    //     if ctrl_c_quit.load(Ordering::Relaxed) {
    //         // If ctrl+c was already pressed once
    //         panic!("Failed to quit gracefully");
    //     } else {
    //         ctrl_c_quit.store(true, Ordering::Relaxed);
    //     }
    // })
    // .expect("Error setting Ctrl-C handler");

    let args = Args::parse();
    println!("Args: {:?}", args);

    let (stats_tx, stats_rx): (
        crossbeam::channel::Sender<FtraceStats>,
        crossbeam::channel::Receiver<FtraceStats>,
    ) = crossbeam::channel::unbounded();

    // input loop
    let (tx, rx) = crossbeam::channel::unbounded();
    let tick_rate = Duration::from_millis(200);
    std::thread::spawn(move || {
        let mut last_tick = Instant::now();
        loop {
            let timeout = tick_rate
                .checked_sub(last_tick.elapsed())
                .unwrap_or_else(|| Duration::from_secs(0));

            if event::poll(timeout).expect("poll works") {
                if let Event::Key(key) = event::read().expect("can read events") {
                    tx.send(TerminalEvent::Input(key)).expect("can send events");
                }
            }

            if last_tick.elapsed() >= tick_rate {
                if let Ok(_) = tx.send(TerminalEvent::Tick) {
                    last_tick = Instant::now();
                }
            }
        }
    });

    let stdout = io::stdout();
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    // setup terminal
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    let locale = SystemLocale::default().unwrap();

    // terminal draw loop
    std::thread::spawn(move || {
        let mut ftrace_stats = None;
        loop {
            // Get new stats to display from the channel
            while let Ok(new_stats) = stats_rx.try_recv() {
                ftrace_stats = Some(new_stats);
            }

            terminal
                .draw(|f| {
                    use tui::style::Color;
                    use tui::widgets::{Row, Table};
                    let chunks = Layout::default()
                        .direction(Direction::Vertical)
                        .margin(1)
                        .constraints(
                            [
                                Constraint::Percentage(10),
                                Constraint::Percentage(80),
                                Constraint::Percentage(10),
                            ]
                            .as_ref(),
                        )
                        .split(f.size());

                    let main_area_chunks = Layout::default()
                        .direction(Direction::Horizontal)
                        .margin(1)
                        .constraints(
                            [Constraint::Percentage(50), Constraint::Percentage(50)].as_ref(),
                        )
                        .split(chunks[1]);
                    // Overall stats
                    {
                        let num_ftrace = NUM_FTRACE_EVENTS.load(Ordering::SeqCst);
                        let num_monitor = NUM_MONITOR_EVENTS.load(Ordering::SeqCst);
                        let home = Paragraph::new(vec![
                            Spans::from(vec![
                                Span::raw("ftrace: "),
                                Span::styled(
                                    num_ftrace.to_formatted_string(&locale),
                                    // format!("{num_ftrace}"),
                                    Style::default().fg(Color::Red).add_modifier(Modifier::BOLD),
                                ),
                            ]),
                            Spans::from(vec![
                                Span::raw("monitor: "),
                                Span::styled(
                                    num_monitor.to_formatted_string(&locale),
                                    // format!("{num_monitor}"),
                                    Style::default().fg(Color::Red).add_modifier(Modifier::BOLD),
                                ),
                            ]),
                        ])
                        .alignment(Alignment::Left)
                        .block(
                            Block::default()
                                .borders(Borders::ALL)
                                .style(Style::default().fg(Color::White))
                                .title("cyber|glow message parsing stats")
                                .border_type(BorderType::Plain),
                        );
                        f.render_widget(home, chunks[0]);
                    }
                    // Syscall table
                    let syscall_data: Vec<_> = {
                        let map = SYSCALL_MAP.lock().unwrap();
                        let mut syscall_vec = map
                            .keys()
                            .zip(map.values())
                            .map(|(key, value)| (key.clone(), *value))
                            .collect::<Vec<_>>();

                        syscall_vec.sort_unstable_by(|a, b| b.1.cmp(&a.1));
                        syscall_vec
                            .into_iter()
                            .map(|(key, value)| Row::new(vec![key, format!("{value}")]))
                            .collect()
                    };
                    let syscall_table = Table::new(syscall_data)
                        // You can set the style of the entire Table.
                        .style(Style::default().fg(Color::White))
                        // It has an optional header, which is simply a Row always visible at the top.
                        .header(
                            Row::new(vec!["Syscall", "Count"])
                                .style(Style::default().fg(Color::Yellow))
                                // If you want some space between the header and the rest of the rows, you can always
                                // specify some margin at the bottom.
                                .bottom_margin(1),
                        )
                        // As any other widget, a Table can be wrapped in a Block.
                        .block(
                            Block::default()
                                .title("Syscall table")
                                .borders(Borders::ALL),
                        )
                        // Columns widths are constrained in the same way as Layout...
                        .widths(&[Constraint::Length(30), Constraint::Length(10)])
                        // ...and they can be separated by a fixed spacing.
                        .column_spacing(1)
                        // If you wish to highlight a row in any specific way when it is selected...
                        .highlight_style(Style::default().add_modifier(Modifier::BOLD))
                        // ...and potentially show a symbol in front of the selection.
                        .highlight_symbol(">>");
                    f.render_widget(syscall_table, main_area_chunks[0]);
                    // Display ftrace_stats
                    if let Some(ftrace_stats) = &ftrace_stats {
                        let constraints = vec![Constraint::Percentage(25); 4];
                        let stats_chunks = Layout::default()
                            .direction(Direction::Vertical)
                            .margin(1)
                            .constraints(constraints)
                            .split(main_area_chunks[1]);
                        let stats_vec = vec![
                            (&ftrace_stats.syscall, "Syscall"),
                            (&ftrace_stats.random, "Random"),
                            (&ftrace_stats.tcp, "Tcp"),
                            (&ftrace_stats.irq_matrix, "IrqMatrix"),
                        ];
                        for (i, stats_pair) in stats_vec.iter().enumerate() {
                            let stats = stats_pair.0;
                            let mut stats_data = Vec::new();
                            stats_data.push(Row::new(vec![
                                "rolling_average:".to_owned(),
                                format!("{}", stats.rolling_average),
                            ]));
                            stats_data.push(Row::new(vec![
                                "min_rolling_average:".to_owned(),
                                format!("{}", stats.min_rolling_average),
                            ]));
                            stats_data.push(Row::new(vec![
                                "max_rolling_average:".to_owned(),
                                format!("{}", stats.max_rolling_average),
                            ]));
                            stats_data.push(Row::new(vec![
                                "trig/s:".to_owned(),
                                format!(
                                    "{}",
                                    stats.rolling_average_triggers_per_second.unwrap_or(0.)
                                ),
                            ]));
                            let stats_table = Table::new(stats_data)
                                // You can set the style of the entire Table.
                                .style(Style::default().fg(Color::Blue))
                                // As any other widget, a Table can be wrapped in a Block.
                                .block(
                                    Block::default()
                                        .title(format!("{} stats", stats_pair.1))
                                        .borders(Borders::ALL),
                                )
                                // Columns widths are constrained in the same way as Layout...
                                .widths(&[Constraint::Length(15), Constraint::Length(10)])
                                // ...and they can be separated by a fixed spacing.
                                .column_spacing(1);
                            f.render_widget(stats_table, stats_chunks[i]);
                        }
                    }
                })
                .expect("terminal draw function to work without error");
            match rx
                .recv()
                .expect("terminal event loop to receive message from input channel")
            {
                TerminalEvent::Input(event) => match event.code {
                    KeyCode::Char('q') => {
                        ctrl_c_quit.store(true, Ordering::Relaxed);
                        break;
                    }
                    _ => {}
                },
                TerminalEvent::Tick => {}
            }
            if ctrl_c_quit.load(Ordering::Relaxed) {
                // some other part of the program requested shutdown
                break;
            }
        }

        // restore terminal when the loop is broken
        disable_raw_mode().expect("able to disable raw mode");
        execute!(
            terminal.backend_mut(),
            LeaveAlternateScreen,
            DisableMouseCapture
        )
        .expect("able to execute terminal exctions");
        terminal.show_cursor().expect("able to show cursor");
    });

    // let new_quit = quit.clone();
    // std::thread::spawn(move || {
    //     std::thread::sleep(Duration::from_secs(10));
    //     new_quit.store(true, Ordering::Relaxed);
    //     println!("ftrace: {}", NUM_FTRACE_EVENTS.load(Ordering::SeqCst));
    // });

    main_loop(args, quit, stats_tx);

    // Give everything some time to properly clean up before exiting
    std::thread::sleep(Duration::from_millis(300));
    Ok(())
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

fn main_loop(
    mut args: Args,
    quit: Arc<AtomicBool>,
    stats_tx: crossbeam::channel::Sender<FtraceStats>,
) {
    let save_path = PathBuf::from(args.save_path.unwrap_or("./monitor_data.json".to_string()));
    let load_path = PathBuf::from(args.load_path.unwrap_or("./monitor_data.json".to_string()));
    let receiver = osc::receiver(args.listen_port).unwrap();

    let mut sonifier = if args.sonify {
        Some(Sonifier::new("127.0.0.1:57120"))
    } else {
        None
    };

    let mut ftrace_stats = FtraceStats::new();

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
    if playback_messages.len() > 0 {
        // Skip the negative ts messages
        while playback_messages[message_index].ts() < 0 {
            message_index += 1;
        }
    }
    let mut last_message_time = Instant::now();
    let mut last_stats_update_time = Instant::now();
    let mut last_time_stats_tx = Instant::now();
    'main_loop: loop {
        while let Ok(Some((packet, _addr))) = receiver.try_recv() {
            if args.record || args.listen || args.sonify {
                for message in packet.into_msgs() {
                    // Parse message
                    let new_message = if message.addr == "/cyberglow" {
                        NUM_MONITOR_EVENTS.fetch_add(1, Ordering::SeqCst);
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
                        NUM_FTRACE_EVENTS.fetch_add(1, Ordering::SeqCst);
                        if let Some(args) = message.args {
                            if let osc::Type::String(data) = &args[0] {
                                let now = Utc::now();
                                if let Some(ftrace_kind) = parse_ftrace(data) {
                                    let new_message = Message::Ftrace(FtraceMessage {
                                        kind: ftrace_kind,
                                        timestamp: now.timestamp_millis(),
                                    });
                                    Some(new_message)
                                } else {
                                    None
                                }
                            } else {
                                None
                            }
                        } else {
                            None
                        }
                    } else {
                        None
                    };
                    // Do something with the message
                    if let Some(new_message) = new_message {
                        if args.listen {
                            new_message.send(&sender);
                        }
                        if let Some(ref mut sonifier) = &mut sonifier {
                            sonify_message(sonifier, &mut ftrace_stats, &new_message);
                        }
                        if args.record {
                            recorded_messages.messages.push(new_message);
                            // Save if enough time has passed
                            if last_save.elapsed().as_secs() > 30 {
                                recorded_messages.save_data();
                                last_save = Instant::now();
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
            if last_stats_update_time.elapsed().as_millis() > 10 {
                let dt = last_stats_update_time.elapsed().as_secs_f64();
                ftrace_stats.update(dt);
                last_stats_update_time = Instant::now();
                // Send a stats update
                if let Some(ref mut sonifier) = sonifier {
                    sonifier.send_stats_update(&ftrace_stats);
                }
            }
            if last_time_stats_tx.elapsed().as_millis() > 100 {
                stats_tx
                    .send(ftrace_stats.clone())
                    .expect("no error when sending ftrace_stats to gui thread");
                last_time_stats_tx = Instant::now();
            }

            if quit.load(Ordering::Relaxed) {
                println!("Quitting!");
                if args.record {
                    recorded_messages.save_data();
                }
                break 'main_loop;
            }
        }
        // Sleep a little if the message queue is empty so we don't run at 100% CPU usage all the time
        // This seems to maintain full throughput, but it is hard to verify
        // std::thread::sleep(Duration::from_micros(1));
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

fn sonify_message(sonifier: &mut Sonifier, ftrace_stats: &mut FtraceStats, message: &Message) {
    match message {
        Message::Monitor(monitor_message) => {
            // do nothing for now
            // println!("Received monitor message: {monitor_message:?}");
            sonifier.send_monitor_message(monitor_message.clone());
        }
        Message::Ftrace(ftrace_message) => {
            let ftrace_kind = ftrace_message.kind;
            if ftrace_stats.register_event(ftrace_kind) {
                let stats = ftrace_stats.get_stats(ftrace_kind);
                // there was a trigger
                sonifier.send_ftrace_message(
                    ftrace_kind,
                    stats.rolling_average as f32,
                    stats.average_events_per_second as f32,
                )
            }
        }
    }
}

fn parse_ftrace<T: AsRef<str>>(data: T) -> Option<FtraceKind> {
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
        "random" | "dd" | "redit" | "mix" | "add" | "credit" | "prandom" | "urandom" | "et"
        | "get" => Some(FtraceKind::Random),
        "sys" | "ys" => Some(FtraceKind::Syscall),
        "tcp" | "cp" => Some(FtraceKind::Tcp),
        "irq_matrix" | "ix" => Some(FtraceKind::IrqMatrix),
        _ => None,
    };
    if let None = ftrace_kind {
        println!("Unknown ftrace:\n\"{}\"", event_type);
    } // println!("{ftrace_kind:?}");

    if matches!(ftrace_kind, Some(FtraceKind::Syscall)) {
        let mut map = SYSCALL_MAP.lock().unwrap();
        *map.entry(event_type.to_string()).or_insert(0) += 1;
        print_map_stats(map);
    }

    ftrace_kind
}

fn print_map_stats(map: std::sync::MutexGuard<HashMap<String, usize>>) {}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
enum FtraceKind {
    Random,
    Syscall,
    Tcp,
    IrqMatrix,
}

#[derive(Debug, Clone)]
struct FtraceStats {
    random: Stats,
    syscall: Stats,
    tcp: Stats,
    irq_matrix: Stats,
}

impl FtraceStats {
    pub fn new() -> Self {
        Self {
            random: Stats::new(500),
            syscall: Stats::new(100000),
            tcp: Stats::new(100),
            irq_matrix: Stats::new(100),
        }
    }
    pub fn register_event(&mut self, ftrace_kind: FtraceKind) -> bool {
        match ftrace_kind {
            FtraceKind::Random => self.random.register_event(),
            FtraceKind::Syscall => self.syscall.register_event(),
            FtraceKind::Tcp => self.tcp.register_event(),
            FtraceKind::IrqMatrix => self.irq_matrix.register_event(),
        }
    }
    pub fn get_stats(&self, ftrace_kind: FtraceKind) -> &Stats {
        match ftrace_kind {
            FtraceKind::Random => &self.random,
            FtraceKind::Syscall => &self.syscall,
            FtraceKind::Tcp => &self.tcp,
            FtraceKind::IrqMatrix => &self.irq_matrix,
        }
    }

    pub fn update(&mut self, dt: f64) {
        self.random.update(dt);
        self.syscall.update(dt);
        self.tcp.update(dt);
        self.irq_matrix.update(dt);
    }
}

#[derive(Debug, Clone)]
struct Stats {
    total_events_registered: u64,
    events_since_last_trigger: u64,
    trigger_threshold: u64,
    average_events_per_second: f64,
    rolling_average: f64,
    min_rolling_average: f64,
    max_rolling_average: f64,
    /// when the Stats was created
    start_time: Instant,
    /// the number of times to apply the precalculated falloff ratio, with a reminder
    num_physics_steps: f64,
    rolloff_ratio: f64,
    rolling_average_triggers_per_second: Option<f64>,
    trigger_count_this_second: u64,
    /// keeps track of the latest second to count in order to count triggers every second
    second_instant: Instant,
}

impl Stats {
    pub fn new(trigger_threshold: u64) -> Self {
        Self {
            total_events_registered: 0,
            events_since_last_trigger: 0,
            trigger_threshold,
            average_events_per_second: 0.0,
            rolling_average: 0.0,
            min_rolling_average: f64::MAX,
            max_rolling_average: 0.0,
            start_time: Instant::now(),
            num_physics_steps: 0.0,
            rolloff_ratio: (0.001_f64).powf(1.0_f64 / STEPS_PER_SECOND),
            rolling_average_triggers_per_second: None,
            trigger_count_this_second: 0,
            second_instant: Instant::now(),
        }
    }

    pub fn register_event(&mut self) -> bool {
        self.total_events_registered += 1;
        self.events_since_last_trigger += 1;
        self.rolling_average += 1.0;
        if self.events_since_last_trigger >= self.trigger_threshold {
            self.events_since_last_trigger = 0;
            self.trigger_count_this_second += 1;
            true
        } else {
            false
        }
    }
    pub fn update(&mut self, dt: f64) {
        // Recalculate the average_events_per_second
        self.average_events_per_second =
            self.total_events_registered as f64 / self.start_time.elapsed().as_secs_f64();

        if self.rolling_average > self.max_rolling_average {
            self.max_rolling_average = self.rolling_average;
        } else {
            // Go slightly towards the current value so that the max can adjust over time
            self.max_rolling_average =
                self.max_rolling_average * 0.9999 + self.rolling_average * 0.0001;
        }
        // Recalculate rolling average
        self.num_physics_steps += dt * STEPS_PER_SECOND;
        while self.num_physics_steps >= 1.0 {
            self.rolling_average *= self.rolloff_ratio;
            self.num_physics_steps -= 1.0;
        }
        if self.start_time.elapsed().as_secs_f32() > 5.0 {
            if self.rolling_average < self.min_rolling_average {
                self.min_rolling_average = self.rolling_average;
            } else {
                // Go slightly towards the current value so that the min can adjust over time
                self.min_rolling_average =
                    self.min_rolling_average * 0.99999 + self.rolling_average * 0.00001;
            }
        }
        if self.second_instant.elapsed() >= Duration::from_secs(1) {
            let triggers_per_sec =
                self.trigger_count_this_second as f64 / self.second_instant.elapsed().as_secs_f64();
            self.trigger_count_this_second = 0;
            self.rolling_average_triggers_per_second = Some(
                if let Some(prev_value) = self.rolling_average_triggers_per_second {
                    prev_value * 0.5 + triggers_per_sec * 0.5
                } else {
                    triggers_per_sec
                },
            );
            self.second_instant = Instant::now();
        }
    }
}

struct Sonifier {
    osc_sender: osc::Sender<Connected>,
}
impl Sonifier {
    pub fn new(osc_destination: &str) -> Self {
        Self {
            osc_sender: osc::sender().unwrap().connect(osc_destination).unwrap(),
        }
    }
    pub fn send_monitor_message(&mut self, m: MonitorMessage) {
        let args = vec![
            osc::Type::String(m.origin),
            osc::Type::String(m.action),
            osc::Type::String(m.arguments),
        ];
        self.osc_sender.send(("/monitor", args)).ok();
    }
    pub fn send_ftrace_message(
        &mut self,
        ftrace_kind: FtraceKind,
        rolling_average: f32,
        average_events_per_second: f32,
    ) {
        let args = vec![
            osc::Type::String(format!("{ftrace_kind:?}")),
            osc::Type::Float(rolling_average),
            osc::Type::Float(average_events_per_second),
        ];
        self.osc_sender.send(("/ftrace", args)).ok();
    }
    pub fn send_stats_update(&mut self, ftrace_stats: &FtraceStats) {
        let args = vec![
            osc::Type::String("syscall".to_owned()),
            osc::Type::Float(ftrace_stats.syscall.rolling_average as f32),
            osc::Type::Float(ftrace_stats.syscall.min_rolling_average as f32),
            osc::Type::Float(ftrace_stats.syscall.max_rolling_average as f32),
        ];
        self.osc_sender.send(("/ftrace_stats", args)).ok();
        let args = vec![
            osc::Type::String("random".to_owned()),
            osc::Type::Float(ftrace_stats.random.rolling_average as f32),
            osc::Type::Float(ftrace_stats.random.min_rolling_average as f32),
            osc::Type::Float(ftrace_stats.random.max_rolling_average as f32),
        ];
        self.osc_sender.send(("/ftrace_stats", args)).ok();
    }
}

const STEPS_PER_SECOND: f64 = 100.0;
