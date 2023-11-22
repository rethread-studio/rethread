use enum_iterator::Sequence;
#[cfg(not(target_arch = "wasm32"))]
use nix::errno::Errno;
use num_enum::{IntoPrimitive, TryFromPrimitive};

use serde::{Deserialize, Serialize};
use strum::Display;

pub mod score;

#[derive(
    Copy,
    Clone,
    Debug,
    PartialEq,
    Hash,
    Eq,
    Serialize,
    Deserialize,
    Display,
    Sequence,
    IntoPrimitive,
    TryFromPrimitive,
)]
#[repr(u8)]
pub enum SyscallKind {
    Memory,
    /// I/O calls that could apply to any file descriptor
    Io,
    /// I/O calls that are probably specifically for files
    FileIo,
    /// I/O calls using sockets
    SocketIo,
    /// Events on special file descriptors, not just any file descriptor
    SpecialIo,
    Signal,
    /// File permissions or process permissions (resource limits)
    Permissions,
    SystemInfo,
    Process,
    WaitForReady,
    Scheduling,
    Synchronisation,
    Random,
    Unknown,
}
impl TryFrom<&str> for SyscallKind {
    type Error = ();

    /// Convert syscall name to a category of syscalls
    ///
    /// You could try to divide the IO category into multiples, but files on
    /// POSIX are so generic that it is difficult.
    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "mremap" | "mmap" | "mprotect" | "brk" | "munmap" | "msync" | "mincore" | "madvise"
            | "shmget" | "shmdt" | "shmat" | "shmctl" | "memfd_create" => Ok(SyscallKind::Memory),
            "read" | "write" | "open" | "openat" | "close" | "stat" | "statx" | "fstat"
            | "newfstatat" | "fstatat" | "lstat" | "lseek" | "pread64" | "pwrite64" | "readv"
            | "writev" | "preadv" | "pwritev" | "fcntl" | "fsync" | "dup" | "dup2" | "dup3" => {
                Ok(SyscallKind::Io)
            }
            "mkdir"
            | "readlinkat"
            | "getdents"
            | "getdents64"
            | "readlink"
            | "fallocate"
            | "rename"
            | "inotify_add_watch"
            | "ftruncate"
            | "umask"
            | "get_current_dir_name"
            | "getwd"
            | "getcwd"
            | "chdir"
            | "unlink" => Ok(Self::FileIo),
            "rt_sigaction" | "rt_sigprocmask" | "rt_sigreturn" | "kill" => Ok(SyscallKind::Signal),
            "ioctl" | "pipe" | "pipe2" => Ok(Self::SpecialIo),
            "recv" | "recvfrom" | "recvmsg" | "connect" | "socket" | "sendto" | "sendmsg"
            | "shutdown" | "getpeername" | "socketpair" => Ok(Self::SocketIo),
            "access" | "faccessat" | "faccessat2" | "prlimit64" | "chmod" | "getgid"
            | "getegid" | "fchown" => Ok(Self::Permissions),
            "getpid" | "getppid" | "clone" | "__clone2" | "clone3" | "wait4" | "wait3"
            | "prctl" | "execve" => Ok(Self::Process),
            "uname" | "eventfd2" | "eventfd" | "statfs" | "fstatfs" | "getuid" | "geteuid"
            | "getresuid" | "getredgid" | "getrusage" | "times" | "sysinfo" => Ok(Self::SystemInfo),
            "poll" | "select" | "epoll_wait" | "epoll" | "epoll_ctl" | "epoll_create1" => {
                Ok(Self::WaitForReady)
            }
            "sched_yield" | "pause" | "nanosleep" | "clock_nanosleep" | "sched_setattr"
            | "sched_getattr" => Ok(Self::Scheduling),
            "futex" | "flock" => Ok(Self::Synchronisation),
            "getrandom" => Ok(Self::Random),
            _ => Err(()),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Syscall {
    pub syscall_id: u64,
    pub kind: SyscallKind,
    pub args: [u64; 3],
    pub return_value: i32,
    pub command: String,
}
impl Syscall {
    #[cfg(not(target_arch = "wasm32"))]
    pub fn returns_error(&self) -> bool {
        let errno = Errno::from_i32(self.return_value);
        !matches!(errno, Errno::UnknownErrno)
    }
}
impl ToString for Syscall {
    fn to_string(&self) -> String {
        format!("{self:?}")
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum Packet {
    Syscall(Syscall),
}
