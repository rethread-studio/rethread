# ftrace live

Configures and starts an ftrace trace on the current system and sends some of the data traced via OSC over UDP (can be to localhost).

This program is meant to be used together with the ftrace sonifier.

## Usage

Has to be run as sudo. In the root ftrace-live directory:

```
cargo build --release
sudo ./target/release/ftrace-live -e tcp:*
```

CTRL-C stops the trace and exits the program.

For more usage instructions, run

```
./target/release/ftrace-live --help
```