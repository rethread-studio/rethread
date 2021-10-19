# ftrace live

Configures and starts an ftrace trace on the current system and sends some of the data traced via OSC over UDP (can be to localhost).

This program is meant to be used together with the ftrace sonifier.

## Usage

First run the ftrace-sonifier to open an OSC port to connect to.
ftrace-live has to be run as sudo. The -e or --event argument can accept multiple types of events that will all be traced. In the root ftrace-live directory:

```
cargo build --release
sudo ./target/release/ftrace-live -e tcp random fs
```

CTRL-C stops the trace and exits the program.

For more usage instructions, run

```
./target/release/ftrace-live --help
```

## event types

- _tcp_
- _fs_dax_ - filesystem
- _syscalls_
- _random_
- _clk_ - The common clk framework is an interface to control the clock nodes available on various devices today.
- _drm_ - Direct Rendering Manager for interfacing with GPUs
- _ext4_
- _compaction_ - a mechanism to reduce memory fragmentation
- _exceptions_ - lots and lots of pagefaults
- _irq_ - Interrupt ReQuest, an interrupt from hardware to the processor.
- _random_ - Events of the Linux Kernel entropy pool being filled up e.g. by touchpad interaction. How it works:
  - https://www.2uo.de/myths-about-urandom/
  - https://blog.cloudflare.com/ensuring-randomness-with-linuxs-random-number-generator/
- _syscalls, raw_syscalls, vsyscall_ - vsyscall is old and not of much interest, syscalls just provides
  a little bit more info than raw_syscalls it seems

## Troubleshooting

Accessing ftrace is done through a file interface at `/sys/kernel/debug/tracing/` or `/sys/kernel/tracing/`. To access this you may need to become root, using e.g. `sudo su`.

### The `tracing` folder doesn't exist

You may need a different kernel with ftrace available, or to run the following command as root:

``` sh
mount -t tracefs tracefs /sys/kernel/tracing
```

## More resources on ftrace

Learning webinar: https://resources.linuxfoundation.org/Webinar%20Recordings/Intro-to-Ftrace-Debugging-Tool-for-Linux-Kernel-Developers.mp4


Exploring the file and folder structure reveals a lot. E.g.

``` sh
cat available_tracers
```
displays what tracers are available.
