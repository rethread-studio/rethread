use anyhow::Result;
use crossterm::{
    event::{self, DisableMouseCapture, EnableMouseCapture, Event, KeyCode},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use futures_util::{SinkExt, StreamExt};
use log::*;
use nix::errno::Errno;
use std::net::SocketAddr;
use std::{
    collections::HashMap,
    fmt::Debug,
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};
use std::{error::Error, io};
use syscalls_shared::{Packet, Syscall, SyscallKind};
use tokio::net::{TcpListener, TcpStream};
use tui::{
    backend::{Backend, CrosstermBackend},
    layout::{Constraint, Layout},
    style::{Color, Modifier, Style},
    widgets::{Block, Borders, Cell, Row, Table, TableState},
    Frame, Terminal,
};

use protocol::wire::stream::Connection;

static SHOW_TUI: bool = true;

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
    pub fn register_packet(&mut self, syscall: Syscall) {
        *self.packets_per_kind.entry(syscall.kind).or_insert(0) += 1;
        self.num_packets_last_second += 1;
        let errno = Errno::from_i32(syscall.return_value);
        if !matches!(errno, Errno::UnknownErrno) {
            self.errors_last_second.push((errno, Instant::now()));
            self.num_errors_last_second += 1;
        }
        self.packets_last_second.push((syscall, Instant::now()));
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

    let syscall_analyser = Arc::new(Mutex::new(SyscallAnalyser::new()));

    if SHOW_TUI {
        {
            let syscall_analyser = syscall_analyser.clone();
            tokio::spawn(start_network_communication(syscall_analyser));
        }
        // setup terminal
        enable_raw_mode()?;
        let mut stdout = io::stdout();
        execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
        let backend = CrosstermBackend::new(stdout);
        let mut terminal = Terminal::new(backend)?;
        // create app and run it
        let app = App {
            syscall_analyser: syscall_analyser.clone(),
            table_state: TableState::default(),
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
        start_network_communication(syscall_analyser).await?;
    }

    Ok(())
}

struct App {
    syscall_analyser: Arc<Mutex<SyscallAnalyser>>,
    table_state: TableState,
}

fn run_app<B: Backend>(terminal: &mut Terminal<B>, mut app: App) -> io::Result<()> {
    let mut last_tick = Instant::now();
    let tick_rate = Duration::from_millis(16);
    loop {
        terminal.draw(|f| ui(f, &mut app))?;

        let timeout = tick_rate
            .checked_sub(last_tick.elapsed())
            .unwrap_or_else(|| Duration::from_secs(0));
        if crossterm::event::poll(timeout)? {
            if let Event::Key(key) = event::read()? {
                match key.code {
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
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)].as_ref())
        .margin(5)
        .split(f.size());

    let (packets_per_kind_rows, syscalls_last_second, errors_last_second) = {
        let sa = app.syscall_analyser.lock().unwrap();
        let packets_per_kind_rows = sa.packets_per_kind_rows();
        (
            packets_per_kind_rows,
            sa.num_packets_last_second,
            sa.num_errors_last_second,
        )
    };
    render_packets_per_kind(f, packets_per_kind_rows, rects[1], app);
    render_general(f, syscalls_last_second, errors_last_second, rects[0], app);
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
async fn start_network_communication(syscall_analyser: Arc<Mutex<SyscallAnalyser>>) -> Result<()> {
    let addr = "127.0.0.1:3012";
    let listener = TcpListener::bind(&addr).await.expect("Can't listen");

    {
        let syscall_analyser = syscall_analyser.clone();
        tokio::spawn(async move {
            loop {
                {
                    let mut syscall_analyser = syscall_analyser.lock().unwrap();
                    syscall_analyser.update();
                    // dbg!(&syscall_analyser.packets_per_kind);
                    // dbg!(syscall_analyser.packets_last_second.len());
                    // dbg!(syscall_analyser.errors_last_second.len());
                }
                std::thread::sleep(Duration::from_millis(1000));
            }
        });
    }
    loop {
        let (socket, _) = listener.accept().await?;
        let syscall_analyser = syscall_analyser.clone();
        let peer = socket
            .peer_addr()
            .expect("connected streams should have a peer address");
        info!("Peer address: {}", peer);
        tokio::spawn(async move {
            handle_client(peer, socket, syscall_analyser).await.unwrap();
        });
    }

    Ok(())
}
async fn handle_client(
    peer: SocketAddr,
    stream: TcpStream,
    syscall_analyser: Arc<Mutex<SyscallAnalyser>>,
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
                    Ok(packet) => match packet {
                        Packet::Syscall(syscall) => {
                            let mut analyser = syscall_analyser.lock().unwrap();
                            analyser.register_packet(syscall);
                        }
                        _ => (),
                    },
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
