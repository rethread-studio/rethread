use nix::errno::Errno;
use protocol::Protocol;

use serde::{Deserialize, Serialize};
use strum::Display;
#[derive(Protocol, Copy, Clone, Debug, PartialEq, Hash, Eq, Serialize, Deserialize, Display)]
pub enum SyscallKind {
    Memory,
    Io,
    /// Events on special file descriptors, not just any file descriptor
    SpecialIo,
    Signal,
    Permissions,
    WaitForReady,
    Scheduling,
    Synchronisation,
    Random,
    Unknown,
}
impl TryFrom<&str> for SyscallKind {
    type Error = ();

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "mremap" | "mmap" | "mprotect" | "brk" | "munmap" | "msync" | "mincore" | "madvise"
            | "shmget" => Ok(SyscallKind::Memory),
            "read" | "write" | "open" | "close" | "stat" | "fstat" | "lstat" | "lseek"
            | "pread64" | "pwrite64" | "readv" | "writev" | "preadv" | "pwritev" => {
                Ok(SyscallKind::Io)
            }
            "rt_sigaction" | "rt_sigprocmask" | "rt_sigreturn" => Ok(SyscallKind::Signal),
            "ioctl" | "pipe" => Ok(Self::SpecialIo),
            "access" => Ok(Self::Permissions),
            "poll" | "select" => Ok(Self::WaitForReady),
            "sched_yield" | "pause" | "nanosleep" => Ok(Self::Scheduling),
            "futex" => Ok(Self::Synchronisation),
            "getrandom" => Ok(Self::Random),
            _ => Err(()),
        }
    }
}

#[derive(Protocol, Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Syscall {
    pub syscall_id: u64,
    pub kind: SyscallKind,
    pub args: [u64; 3],
    pub return_value: i32,
    pub command: String,
}
impl Syscall {
    pub fn returns_error(&self) -> bool {
        let errno = Errno::from_i32(self.return_value);
        !matches!(errno, Errno::UnknownErrno)
    }
}

#[derive(Protocol, Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum Packet {
    Syscall(Syscall),
}
