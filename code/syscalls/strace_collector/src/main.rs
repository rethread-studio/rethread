use std::{collections::HashMap, os::unix::process::CommandExt, process::Command};

use argh::FromArgs;
use nix::{
    errno::Errno,
    sys::{ptrace, wait::waitpid},
    unistd::Pid,
};
use owo_colors::OwoColorize;
use syscalls_shared::{Packet, Syscall, SyscallKind};

#[derive(FromArgs)]
/// Strace Collector
struct Args {
    /// optional command to run, default: gedit
    #[argh(option)]
    command: Option<String>,
    /// optional arguments to the command you are running
    #[argh(option)]
    args: Option<String>,
    /// if syscalls are printed to the terminal, set to false for cli apps
    #[argh(switch, short = 'p')]
    print_syscalls: bool,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
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

    let command_str = args.command.unwrap_or("gedit".to_string());
    let mut command = Command::new(command_str);
    if let Some(command_args) = args.args {
        command.arg(command_args);
    }
    unsafe {
        command.pre_exec(|| {
            use nix::sys::ptrace::traceme;
            traceme().map_err(|e| e.into())
        });
    }

    let child = command.spawn()?;
    let child_pid = Pid::from_raw(child.id() as _);
    let res = waitpid(child_pid, None)?;
    eprintln!("first wait: {:?}", res.yellow());

    let mut is_sys_exit = false;
    let mut num_syscalls: u64 = 0;

    use std::net::TcpStream;

    let stream = TcpStream::connect("127.0.0.1:34254").unwrap();
    let settings = protocol::Settings {
        byte_order: protocol::ByteOrder::LittleEndian,
        ..Default::default()
    };
    let mut connection = protocol::wire::stream::Connection::new(
        stream,
        protocol::wire::middleware::pipeline::default(),
        settings,
    );

    loop {
        // Continue execution until the next syscall
        ptrace::syscall(child_pid, None)?;
        _ = waitpid(child_pid, None)?;
        if is_sys_exit {
            num_syscalls += 1;
            let regs = ptrace::getregs(child_pid)?;
            let name = &syscall_table[&regs.orig_rax];
            let kind = SyscallKind::try_from(name.as_str()).unwrap_or(SyscallKind::Unknown);
            if args.print_syscalls {
                let errno = Errno::from_i32((regs.rax as i64) as i32);
                eprintln!(
                    "{}: {:?} {}({:x}, {:x}, {:x}, ...) = {:x} {}",
                    num_syscalls,
                    kind,
                    name.green(),
                    regs.rdi.blue(),
                    regs.rsi.blue(),
                    regs.rdx.blue(),
                    regs.rax.yellow(),
                    errno.desc().red(),
                );
            }
            let syscall = Syscall {
                syscall_id: regs.orig_rax,
                kind,
                args: [regs.rdi, regs.rsi, regs.rdx],
                return_value: regs.rax as i64 as i32,
            };
            connection.send_packet(&Packet::Syscall(syscall)).unwrap();
        }
        is_sys_exit = !is_sys_exit;
    }
}
