use anyhow::Result;
use crossterm::{
    event::{self, DisableMouseCapture, EnableMouseCapture, Event, KeyCode},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use futures_util::{SinkExt, StreamExt};
use log::*;
use menu::MenuItem;
use nix::errno::Errno;
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    fmt::Debug,
    fs::File,
    io::Write,
    time::{Duration, Instant},
};
use std::{net::SocketAddr, path::PathBuf};
use syscalls_shared::{Packet, Syscall, SyscallKind};
use tokio::{
    net::{TcpListener, TcpStream},
    sync::mpsc::UnboundedSender,
};
use tui::{
    backend::{Backend, CrosstermBackend},
    layout::{Constraint, Layout},
    style::{Color, Modifier, Style},
    widgets::{Block, Borders, Cell, Row, Table, TableState},
    Frame, Terminal,
};

mod menu;

static SHOW_TUI: bool = true;

#[derive(Clone, Debug, Serialize, Deserialize)]
struct RecordedPackets {
    records: Vec<Record>,
}

impl RecordedPackets {
    fn new() -> Self {
        Self { records: vec![] }
    }
    fn record_packet(&mut self, packet: Packet, timestamp: Duration) {
        self.records.push(Record { packet, timestamp })
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct Record {
    packet: Packet,
    timestamp: Duration,
}

struct PacketHQ {
    syscall_analyser: SyscallAnalyser,
    recording: Option<RecordedPackets>,
    start_recording_time: Instant,
    gui_update_sender: rtrb::Producer<GuiUpdate>,
    command_receiver: rtrb::Consumer<PacketHQCommands>,
}
impl PacketHQ {
    fn new(
        gui_update_sender: rtrb::Producer<GuiUpdate>,
        command_receiver: rtrb::Consumer<PacketHQCommands>,
    ) -> Self {
        Self {
            syscall_analyser: SyscallAnalyser::new(),
            recording: None,
            start_recording_time: Instant::now(),
            gui_update_sender,
            command_receiver,
        }
    }
    fn start_recording(&mut self) {
        self.start_recording_time = Instant::now();
        self.recording = Some(RecordedPackets::new());
    }
    fn stop_and_save_recording(&mut self, path: PathBuf) {
        let Some(recording) = self.recording.take() else { return };
        let data = postcard::to_stdvec(&recording).unwrap();
        let Ok(mut file) = File::create(path) else { error!("Couldn't open file to save data!"); return; };
        file.write_all(data.as_slice());
    }
    fn register_packet(&mut self, packet: Packet) {
        match &packet {
            Packet::Syscall(syscall) => self.syscall_analyser.register_packet(syscall),
        }
        if let Some(recording) = &mut self.recording {
            recording.record_packet(packet, self.start_recording_time.elapsed());
        }
    }
    fn update(&mut self) {
        self.syscall_analyser.update();
        self.gui_update_sender
            .push(GuiUpdate {
                syscall_analyser: self.syscall_analyser.clone(),
            })
            .ok();
        while let Ok(command) = self.command_receiver.pop() {
            match command {
                PacketHQCommands::StartRecording => self.start_recording(),
                PacketHQCommands::SaveRecording { path } => self.stop_and_save_recording(path),
            }
        }
    }
}

#[derive(Clone, Debug)]
struct GuiUpdate {
    syscall_analyser: SyscallAnalyser,
}
enum PacketHQCommands {
    StartRecording,
    SaveRecording { path: PathBuf },
}

#[derive(Clone, Debug)]
struct SyscallAnalyser {
    pub num_packets_total: usize,
    pub num_errors_total: usize,
    pub packets_per_kind: HashMap<SyscallKind, u64>,
    pub packets_last_second: Vec<(Syscall, Instant)>,
    pub errors_last_second: Vec<(Errno, Instant)>,
    pub num_packets_last_second: usize,
    pub num_errors_last_second: usize,
    last_second: Instant,
}
impl SyscallAnalyser {
    pub fn new() -> Self {
        Self {
            packets_per_kind: HashMap::new(),
            packets_last_second: Vec::new(),
            errors_last_second: Vec::new(),
            num_packets_last_second: 0,
            num_errors_last_second: 0,
            last_second: Instant::now(),
            num_packets_total: 0,
            num_errors_total: 0,
        }
    }
    pub fn register_packet(&mut self, syscall: &Syscall) {
        *self.packets_per_kind.entry(syscall.kind).or_insert(0) += 1;
        self.num_packets_last_second += 1;
        let errno = Errno::from_i32(syscall.return_value);
        if !matches!(errno, Errno::UnknownErrno) {
            self.errors_last_second.push((errno, Instant::now()));
            self.num_errors_last_second += 1;
        }
    }
    pub fn update(&mut self) {
        if self.last_second.elapsed() >= Duration::from_secs(1) {
            self.num_packets_last_second = 0;
            self.num_errors_last_second = 0;
            self.last_second = Instant::now();
        }
        // let mut i = 0;
        // while i < self.packets_last_second.len() {
        //     if self.packets_last_second[i].1.elapsed().as_secs() > 0 {
        //         self.packets_last_second.remove(i);
        //     } else {
        //         i += 1;
        //     }
        // }
        // let mut i = 0;
        // while i < self.errors_last_second.len() {
        //     if self.errors_last_second[i].1.elapsed().as_secs() > 0 {
        //         self.errors_last_second.remove(i);
        //     } else {
        //         i += 1;
        //     }
        // }
    }
    pub fn packets_per_kind_rows<'a, 'b>(&'a self) -> Vec<Row<'b>> {
        let rows = self
            .packets_per_kind
            .iter()
            .map(|(key, number)| {
                let cells = vec![
                    Cell::from(format!("{key:?}")).style(Style::default().fg(Color::Cyan)),
                    Cell::from(format!("{number}")),
                ];
                Row::new(cells).height(1).bottom_margin(0)
            })
            .collect();
        rows
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let env = env_logger::Env::default()
        .filter_or("MY_LOG_LEVEL", "info")
        .write_style_or("MY_LOG_STYLE", "always");

    env_logger::init_from_env(env);

    let (gui_update_sender, gui_update_receiver) = rtrb::RingBuffer::new(100);
    let (packet_hq_sender, packet_hq_receiver) = rtrb::RingBuffer::new(100);
    let packet_hq = PacketHQ::new(gui_update_sender, packet_hq_receiver);

    if SHOW_TUI {
        {
            tokio::spawn(start_network_communication(packet_hq));
        }
        // setup terminal
        enable_raw_mode()?;
        let mut stdout = io::stdout();
        execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
        let backend = CrosstermBackend::new(stdout);
        let mut terminal = Terminal::new(backend)?;
        // create app and run it
        let app = App {
            gui_update_receiver,
            packet_hq_sender,
            syscall_analyser: None,
            table_state: TableState::default(),
            menu_table_state: TableState::default(),
            is_recording: false,
        };
        let res = run_app(&mut terminal, app);

        // restore terminal
        disable_raw_mode()?;
        execute!(
            terminal.backend_mut(),
            LeaveAlternateScreen,
            DisableMouseCapture
        )?;
        terminal.show_cursor()?;

        if let Err(err) = res {
            println!("{:?}", err)
        }
    } else {
        start_network_communication(packet_hq).await?;
    }

    Ok(())
}

pub struct App {
    syscall_analyser: Option<SyscallAnalyser>,
    gui_update_receiver: rtrb::Consumer<GuiUpdate>,
    packet_hq_sender: rtrb::Producer<PacketHQCommands>,
    table_state: TableState,
    menu_table_state: TableState,
    is_recording: bool,
}

fn run_app<B: Backend>(terminal: &mut Terminal<B>, mut app: App) -> anyhow::Result<()> {
    let mut last_tick = Instant::now();
    let tick_rate = Duration::from_millis(16);
    loop {
        terminal.draw(|f| ui(f, &mut app))?;
        while let Ok(gui_update) = app.gui_update_receiver.pop() {
            app.syscall_analyser = Some(gui_update.syscall_analyser);
        }

        let timeout = tick_rate
            .checked_sub(last_tick.elapsed())
            .unwrap_or_else(|| Duration::from_secs(0));
        if crossterm::event::poll(timeout)? {
            if let Event::Key(key) = event::read()? {
                match key.code {
                    KeyCode::Down => {
                        if let Some(selected) = app.menu_table_state.selected() {
                            app.menu_table_state.select(Some(
                                (selected + 1) % enum_iterator::cardinality::<MenuItem>(),
                            ));
                        } else {
                            app.menu_table_state.select(Some(0));
                        }
                    }
                    KeyCode::Up => {
                        if let Some(selected) = app.menu_table_state.selected() {
                            app.menu_table_state.select(Some(
                                (selected - 1) % enum_iterator::cardinality::<MenuItem>(),
                            ));
                        } else {
                            app.menu_table_state
                                .select(Some(enum_iterator::cardinality::<MenuItem>() - 1));
                        }
                    }
                    KeyCode::Enter => {
                        let selected = app.menu_table_state.selected().unwrap_or(0);
                        match MenuItem::try_from(selected as u8).unwrap() {
                            MenuItem::LoadRecordedData => {
                                todo!()
                            }
                            MenuItem::RecordData => {
                                app.is_recording = true;
                                app.packet_hq_sender
                                    .push(PacketHQCommands::StartRecording)?;
                            }
                            MenuItem::StopAndSaveRecording => {
                                if let Some(path) = rfd::FileDialog::new().save_file() {
                                    app.is_recording = false;
                                    app.packet_hq_sender
                                        .push(PacketHQCommands::SaveRecording { path })?;
                                }
                            }
                        }
                    }
                    KeyCode::Char('q') => return Ok(()),
                    _ => {}
                }
            }
        }
        if last_tick.elapsed() >= tick_rate {
            // app.on_tick();
            last_tick = Instant::now();
        }
    }
}

fn ui<B: Backend>(f: &mut Frame<B>, app: &mut App) {
    let rects = Layout::default()
        .direction(tui::layout::Direction::Horizontal)
        .constraints([Constraint::Percentage(25), Constraint::Percentage(75)].as_ref())
        .margin(5)
        .split(f.size());
    let data_rects = Layout::default()
        .direction(tui::layout::Direction::Vertical)
        .constraints([Constraint::Percentage(25), Constraint::Percentage(75)])
        .margin(5)
        .split(rects[1]);
    let menu_rect = rects[0];

    if let Some(sa) = &app.syscall_analyser {
        let (packets_per_kind_rows, syscalls_last_second, errors_last_second) = {
            let packets_per_kind_rows = sa.packets_per_kind_rows();
            (
                packets_per_kind_rows,
                sa.num_packets_last_second,
                sa.num_errors_last_second,
            )
        };
        render_packets_per_kind(f, packets_per_kind_rows, data_rects[1], app);
        render_general(
            f,
            syscalls_last_second,
            errors_last_second,
            data_rects[0],
            app,
        );
    }
    menu::menu_ui(f, app, menu_rect);
}
fn render_packets_per_kind<B: Backend>(
    f: &mut Frame<B>,
    packets_per_kind_rows: Vec<Row>,
    rect: tui::layout::Rect,
    app: &mut App,
) {
    let selected_style = Style::default().add_modifier(Modifier::REVERSED);
    let normal_style = Style::default().bg(Color::Blue);
    let header_cells = ["Kind", "Num events"]
        .iter()
        .map(|h| Cell::from(*h).style(Style::default().fg(Color::Black)));
    let header = Row::new(header_cells)
        .style(normal_style)
        .height(1)
        .bottom_margin(1);
    let t = Table::new(packets_per_kind_rows)
        .header(header)
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title("Syscall events per kind total"),
        )
        .highlight_style(selected_style)
        .highlight_symbol(">> ")
        .widths(&[
            Constraint::Percentage(50),
            Constraint::Length(30),
            Constraint::Min(10),
        ]);
    f.render_stateful_widget(t, rect, &mut app.table_state);
}
fn render_general<B: Backend>(
    f: &mut Frame<B>,
    syscalls_last_second: usize,
    errors_last_second: usize,
    rect: tui::layout::Rect,
    app: &mut App,
) {
    let selected_style = Style::default().add_modifier(Modifier::REVERSED);
    let normal_style = Style::default().bg(Color::Blue);
    let header_cells = ["Kind", "Num"]
        .iter()
        .map(|h| Cell::from(*h).style(Style::default().fg(Color::Black)));
    let header = Row::new(header_cells)
        .style(normal_style)
        .height(1)
        .bottom_margin(1);
    let kind_style = Style::default().fg(Color::LightCyan);
    let rows = vec![
        Row::new(vec![
            Cell::from("syscalls last second").style(kind_style),
            Cell::from(format!("{syscalls_last_second}")),
        ]),
        Row::new(vec![
            Cell::from("errors last second").style(kind_style),
            Cell::from(format!("{errors_last_second}")),
        ]),
    ];
    let t = Table::new(rows)
        .header(header)
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title("Running average data"),
        )
        .highlight_style(selected_style)
        .highlight_symbol(">> ")
        .widths(&[
            Constraint::Percentage(50),
            Constraint::Length(30),
            Constraint::Min(10),
        ]);
    f.render_stateful_widget(t, rect, &mut app.table_state);
}
async fn start_network_communication(mut packet_hq: PacketHQ) -> Result<()> {
    let addr = "127.0.0.1:3012";
    let listener = TcpListener::bind(&addr).await.expect("Can't listen");
    let (packet_sender, mut packet_receiver) = tokio::sync::mpsc::unbounded_channel();

    {
        tokio::spawn(async move {
            loop {
                while let Ok(packet) = packet_receiver.try_recv() {
                    packet_hq.register_packet(packet);
                }
                packet_hq.update();
            }
        });
    }
    loop {
        let (socket, _) = listener.accept().await?;
        let packet_sender = packet_sender.clone();
        let peer = socket
            .peer_addr()
            .expect("connected streams should have a peer address");
        info!("Peer address: {}", peer);
        tokio::spawn(async move {
            handle_client(peer, socket, packet_sender).await.unwrap();
        });
    }

    Ok(())
}
async fn handle_client(
    peer: SocketAddr,
    stream: TcpStream,
    packet_sender: UnboundedSender<Packet>,
) -> anyhow::Result<()> {
    let mut ws_stream = tokio_tungstenite::accept_async(stream)
        .await
        .expect("Failed to accept");

    info!("New WebSocket connection: {}", peer);
    while let Some(msg) = ws_stream.next().await {
        match msg? {
            tokio_tungstenite::tungstenite::Message::Text(text) => info!("ws message: {text}"),
            tokio_tungstenite::tungstenite::Message::Binary(data) => {
                match postcard::from_bytes(&data) {
                    Ok(packet) => packet_sender.send(packet)?,
                    Err(e) => error!("Failed to parse binary packet as postcard: {e}"),
                }
            }
            tokio_tungstenite::tungstenite::Message::Ping(_) => todo!(),
            tokio_tungstenite::tungstenite::Message::Pong(_) => todo!(),
            tokio_tungstenite::tungstenite::Message::Close(_) => todo!(),
            tokio_tungstenite::tungstenite::Message::Frame(_) => todo!(),
        }
    }

    Ok(())

    // old

    // let settings = protocol::Settings {
    //     byte_order: protocol::ByteOrder::LittleEndian,
    //     ..Default::default()
    // };
    // let mut connection: Connection<Packet, TcpStream> = protocol::wire::stream::Connection::new(
    //     stream,
    //     protocol::wire::middleware::pipeline::default(),
    //     settings,
    // );

    // loop {
    //     if let Some(response) = connection.receive_packet().unwrap() {
    //         match response {
    //             Packet::Syscall(syscall) => {
    //                 let mut analyser = syscall_analyser.lock().unwrap();
    //                 analyser.register_packet(syscall);
    //             }
    //             _ => (),
    //         }
    //     }
    // }
    // Ok(())
}
