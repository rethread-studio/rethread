Collects all the syscalls made by a program and sends them on to a `data_vertex` instance over WebSocket.

# Usage

`strace_collector` will always try to reconnect to a `data_vertex` so a `data_vertex` instance must be running for the program to progress.

You can run any command/program using strace_collector. To get up to date command line arguments, run with the --help flag:

```sh
cargo run --release -- --help
```

Note that all flags come after -- when run using cargo. You can also run the binary directly e.g.

```sh
./strace_collector --print-syscalls --command bat README.md Cargo.toml
```

It is not clear from the help, but anything after the --command command will be interpreted as arguments to that command so that you can (in theory) run any command as is.
