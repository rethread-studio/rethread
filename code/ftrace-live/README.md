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