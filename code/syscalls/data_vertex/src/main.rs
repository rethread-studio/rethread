use nix::errno::Errno;
use std::{
    collections::HashMap,
    net::{TcpListener, TcpStream},
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};
use syscalls_shared::{Packet, Syscall, SyscallKind};

use protocol::wire::stream::Connection;

struct SyscallAnalyser {
    pub packets_per_kind: HashMap<SyscallKind, u64>,
    pub packets_last_second: Vec<(Syscall, Instant)>,
    pub errors_last_second: Vec<(Errno, Instant)>,
}
impl SyscallAnalyser {
    pub fn new() -> Self {
        Self {
            packets_per_kind: HashMap::new(),
            packets_last_second: Vec::new(),
            errors_last_second: Vec::new(),
        }
    }
    pub fn register_packet(&mut self, syscall: Syscall) {
        *self.packets_per_kind.entry(syscall.kind).or_insert(0) += 1;
        let errno = Errno::from_i32(syscall.return_value);
        if !matches!(errno, Errno::UnknownErrno) {
            self.errors_last_second.push((errno, Instant::now()));
        }
        self.packets_last_second.push((syscall, Instant::now()));
    }
    pub fn update(&mut self) {
        let mut i = 0;
        while i < self.packets_last_second.len() {
            if self.packets_last_second[i].1.elapsed().as_secs() > 0 {
                self.packets_last_second.remove(i);
            } else {
                i += 1;
            }
        }
        let mut i = 0;
        while i < self.errors_last_second.len() {
            if self.errors_last_second[i].1.elapsed().as_secs() > 0 {
                self.errors_last_second.remove(i);
            } else {
                i += 1;
            }
        }
    }
}

fn main() -> anyhow::Result<()> {
    let listener = TcpListener::bind("127.0.0.1:34254").unwrap();
    let syscall_analyser = Arc::new(Mutex::new(SyscallAnalyser::new()));

    {
        let syscall_analyser = syscall_analyser.clone();
        std::thread::spawn(move || -> ! {
            loop {
                {
                    let mut syscall_analyser = syscall_analyser.lock().unwrap();
                    syscall_analyser.update();
                    dbg!(&syscall_analyser.packets_per_kind);
                    dbg!(syscall_analyser.packets_last_second.len());
                    dbg!(syscall_analyser.errors_last_second.len());
                }
                std::thread::sleep(Duration::from_millis(1000));
            }
        });
    }

    for stream in listener.incoming() {
        handle_client(stream?, syscall_analyser.clone())?;
    }
    Ok(())
}
fn handle_client(
    stream: TcpStream,
    syscall_analyser: Arc<Mutex<SyscallAnalyser>>,
) -> anyhow::Result<()> {
    let settings = protocol::Settings {
        byte_order: protocol::ByteOrder::LittleEndian,
        ..Default::default()
    };
    let mut connection: Connection<Packet, TcpStream> = protocol::wire::stream::Connection::new(
        stream,
        protocol::wire::middleware::pipeline::default(),
        settings,
    );

    loop {
        if let Some(response) = connection.receive_packet().unwrap() {
            match response {
                Packet::Syscall(syscall) => {
                    let mut analyser = syscall_analyser.lock().unwrap();
                    analyser.register_packet(syscall);
                }
                _ => (),
            }
        }
    }
    Ok(())
}
