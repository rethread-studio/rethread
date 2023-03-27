use nix::errno::Errno;
use protocol::Protocol;

#[derive(Protocol, Copy, Clone, Debug, PartialEq, Hash, Eq)]
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

#[derive(Protocol, Copy, Clone, Debug, PartialEq)]
pub struct Syscall {
    pub syscall_id: u64,
    pub kind: SyscallKind,
    pub args: [u64; 3],
    pub return_value: i32,
}

#[derive(Protocol, Clone, Debug, PartialEq)]
pub enum Packet {
    Syscall(Syscall),
}