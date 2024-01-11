use anyhow::Result;
use nix::libc::TCP_THIN_LINEAR_TIMEOUTS;
use nix::sys;
use nix::sys::ptrace::{getevent, Options};
use std::mem::transmute;
use std::sync::mpsc::{channel, Sender};
use std::time::Duration;
use std::{
    collections::HashMap,
    net::TcpStream,
    os::unix::process::CommandExt,
    process::Command,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
};

use argh::FromArgs;
use log::*;
use nix::{
    errno::Errno,
    sys::{ptrace, wait::waitpid},
    unistd::Pid,
};
use owo_colors::OwoColorize;
use syscalls_shared::{Packet, Syscall, SyscallKind};
use tungstenite::{connect, stream::MaybeTlsStream, WebSocket};
use url::Url;

#[derive(FromArgs)]
/// Strace Collector
struct Args {
    /// if syscalls are printed to the terminal, set to false for cli apps
    #[argh(switch, short = 'p')]
    print_syscalls: bool,
    /// optional command to run, default: gedit
    #[argh(option)]
    command: Option<String>,
    /// optional arguments to the command you are running
    #[argh(positional, greedy)]
    args: Vec<String>,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt()
        .pretty()
        .with_thread_names(true)
        // enable everything
        .with_max_level(tracing::Level::INFO)
        // sets this to be the default, global subscriber for this application.
        .init();

    let running = Arc::new(AtomicBool::new(true));
    let r = running.clone();

    ctrlc::set_handler(move || {
        r.store(false, Ordering::SeqCst);
    })
    .expect("Error setting Ctrl-C handler");

    let args: Args = argh::from_env();
    let json: serde_json::Value = serde_json::from_str(include_str!("syscall.json"))?;
    let syscall_table: HashMap<u64, String> = json["aaData"]
        .as_array()
        .unwrap()
        .iter()
        .map(|item| {
            (
                item[0].as_u64().unwrap(),
                item[1].as_str().unwrap().to_owned(),
            )
        })
        .collect();
    info!("Data loaded, initial setup complete");

    let (syscall_sender, syscall_receiver) = channel();
    // let (child_sender, child_receiver) = channel();
    let mut unknown_kind_syscalls = HashMap::new();

    let command_str = args.command.unwrap_or("gedit".to_string());
    let Ok(mut socket) = reconnect(running.clone()) else {
        return Ok(());
    };

    {
        let syscall_sender = syscall_sender.clone();
        let running = running.clone();
        std::thread::spawn(move || {
            info!("Syscall tracing thread started");
            let mut command = Command::new(command_str.clone());
            for arg in args.args {
                println!("Adding arg: {arg}");
                command.arg(arg);
            }
            unsafe {
                command.pre_exec(|| {
                    use nix::sys::ptrace::traceme;
                    traceme().map_err(|e| e.into())
                });
            }
            let child = command.spawn()?;
            let child_pid = Pid::from_raw(child.id() as _);
            // ptrace::setoptions(
            //     child_pid,
            //     Options::PTRACE_O_TRACECLONE
            //         | Options::PTRACE_O_TRACEFORK
            //         | Options::PTRACE_O_TRACEVFORK,
            // );
            trace_pid(child_pid, command_str.clone(), syscall_sender, running)
        });
    }
    // ...
    loop {
        if let Ok(mut syscall) = syscall_receiver.try_recv() {
            let name = syscall_table
                .get(&syscall.syscall_id)
                .map_or("", |s| s.as_str());

            let kind = if let Ok(kind) = SyscallKind::try_from(name) {
                kind
            } else {
                *unknown_kind_syscalls.entry(name.clone()).or_insert(0) += 1;
                SyscallKind::Unknown
            };
            syscall.kind = kind;

            // info!("{}", syscall.command);
            if args.print_syscalls {
                let errno = Errno::from_i32(syscall.return_value);
                eprintln!(
                    "{:?} {}({:x}, {:x}, {:x}, ...) = {:x} {}",
                    kind,
                    name.green(),
                    syscall.args[0].blue(),
                    syscall.args[1].blue(),
                    syscall.args[2].blue(),
                    syscall.return_value.yellow(),
                    errno.desc().red(),
                );
            }
            if name == "fork" || name == "clone3" || name == "vfork" || name == "clone" {
                info!("Forked process! {:?}", syscall);
                let errno = Errno::from_i32(syscall.return_value);
                // eprintln!(
                //     "{:?} {}({:x}, {:x}, {:x}, ...) = {:} {}",
                //     syscall.kind,
                //     name.green(),
                //     syscall.args[0].blue(),
                //     syscall.args[1].blue(),
                //     syscall.args[2].blue(),
                //     syscall.return_value.yellow(),
                //     errno.desc().red(),
                // );
                // if syscall.return_value > 0 {
                //     {
                //         let syscall_sender = syscall_sender.clone();
                //         let running = running.clone();
                //         std::thread::spawn(move || {
                //             let child_pid = Pid::from_raw(syscall.return_value as _);
                //             if let Err(e) = nix::sys::ptrace::attach(child_pid) {
                //                 error!(
                //                     "Failed to attach to child process {}: {e}",
                //                     syscall.return_value
                //                 );
                //             }
                //             trace_pid(
                //                 child_pid,
                //                 format!("Child {}", syscall.return_value),
                //                 syscall_sender,
                //                 running,
                //             )
                //         });
                //     }
                // }
            }
            let postcard = postcard::to_stdvec(&Packet::Syscall(syscall)).unwrap();
            match socket.write_message(tungstenite::Message::Binary(postcard)) {
                Ok(_) => (),
                Err(_) => {
                    info!("Reconnecting...");
                    socket = match reconnect(running.clone()) {
                        Ok(s) => s,
                        Err(_) => break,
                    }
                }
            }
        }

        if !running.load(Ordering::SeqCst) {
            break;
        }
    }

    socket.close(None)?;
    let mut uks: Vec<_> = unknown_kind_syscalls.into_iter().collect();
    uks.sort_by(|(_, a), (_, b)| a.cmp(b));
    dbg!(uks);
    Ok(())
}

fn trace_pid(
    child_pid: Pid,
    child_name: String,
    syscall_sender: Sender<Syscall>,
    running: Arc<AtomicBool>,
) -> Result<()> {
    info!("Tracing child {child_name}");
    let res = waitpid(child_pid, None)?;
    eprintln!("first wait: {:?}", res.yellow());

    let mut is_sys_exit = false;
    let mut num_syscalls: u64 = 0;

    loop {
        // Continue execution until the next syscall
        match ptrace::syscall(child_pid, None) {
            Ok(_) => (),
            Err(e) => {
                error!("ptrace error: {e}. Exiting");
                break;
            }
        }
        _ = match waitpid(child_pid, None) {
            Ok(wait_status) => {
                // Check for forking
                if let nix::sys::wait::WaitStatus::PtraceEvent(_pid, _signal, event) = wait_status {
                    use nix::sys::ptrace::Event;
                    let event = unsafe { transmute(event) };
                    match event {
                        Event::PTRACE_EVENT_CLONE
                        | Event::PTRACE_EVENT_FORK
                        | Event::PTRACE_EVENT_VFORK => {
                            // There was a forking, start a new trace
                            info!("There was a forking");
                            // Get new pid
                            //             ptrace(PTRACE_GETEVENTMSG, child, NULL, (long) &newpid);
                            let res = getevent(child_pid);
                            if let Ok(new_pid) = res {
                                info!("Got new pid: {new_pid}");
                                {
                                    let new_pid = Pid::from_raw(new_pid as _);
                                    // if let Err(e) = nix::sys::ptrace::attach(new_pid) {
                                    //     error!(
                                    //         "Failed to attach to child process {}: {e}",
                                    //         new_pid
                                    //     );
                                    // }
                                    match ptrace::syscall(new_pid, None) {
                                        Ok(_) => (),
                                        Err(e) => {
                                            error!("ptrace error: {e}. Exiting");
                                            break;
                                        }
                                    }
                                    std::thread::sleep(Duration::from_millis(100));
                                }
                                // {
                                //     let syscall_sender = syscall_sender.clone();
                                //     let running = running.clone();
                                //     std::thread::spawn(move || {
                                //         let child_pid = Pid::from_raw(new_pid as _);
                                //         // if let Err(e) = nix::sys::ptrace::attach(child_pid) {
                                //         //     error!(
                                //         //         "Failed to attach to child process {}: {e}",
                                //         //         new_pid
                                //         //     );
                                //         // }
                                //         std::thread::sleep(Duration::from_millis(100));
                                //         trace_pid(
                                //             child_pid,
                                //             format!("Child {}", new_pid),
                                //             syscall_sender,
                                //             running,
                                //         )
                                //     });
                                // }
                            }
                        }
                        _ => (),
                    }
                }
            }
            Err(e) => {
                error!("ptrace error: {e}. Exiting");
                break;
            }
        };
        if is_sys_exit {
            num_syscalls += 1;
            let Ok(regs) = ptrace::getregs(child_pid) else {
                error!("Failed to get ptrace regs for {}. Exiting", child_name);
                break;
            };

            let mut syscall = Syscall {
                syscall_id: regs.orig_rax,
                kind: SyscallKind::Unknown,
                args: [regs.rdi, regs.rsi, regs.rdx],
                return_value: to_i32(regs.rax),
                command: child_name.clone(),
                returns_error: false,
            };
            let returns_error = syscall.returns_error();
            syscall.returns_error = returns_error;
            syscall_sender.send(syscall).unwrap();
            // socket.write_message(tungstenite::Message::Text("syscall".to_owned()))?;
        }
        is_sys_exit = !is_sys_exit;
        if !running.load(Ordering::SeqCst) {
            break;
        }
    }
    Ok(())
}

fn reconnect(running: Arc<AtomicBool>) -> Result<WebSocket<MaybeTlsStream<TcpStream>>, ()> {
    let socket = loop {
        info!("Trying to connect");
        match connect(Url::parse("ws://localhost:3012").unwrap()) {
            Ok((socket, _response)) => break socket,
            Err(e) => error!("Failed to connect: {e}"),
        }
        if !running.load(Ordering::SeqCst) {
            return Err(());
        }
    };
    info!("Connected to data_vertex via websocket");
    Ok(socket)
}

fn to_i32(n: u64) -> i32 {
    let bytes = n.to_le_bytes();
    i32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]])
}
