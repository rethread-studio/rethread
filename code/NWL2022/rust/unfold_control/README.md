# Installation

## Rust

Install the rust compiler and the cargo build system using rustup:

https://www.rust-lang.org/tools/install

## Bevy dependencies

Bevy has different dependencies for different systems, follow the instructions for yours here:

https://bevyengine.org/learn/book/getting-started/setup/

# Usage

Compile and run using

```sh
cargo run --release
```

Get current usage info for CLI:

```sh
cargo run --release -- --help
```

CLI parameters go after a double dash when using cargo, e.g. for a headless server opening a trace in `~/trace_name.postcard`:

```sh
cargo run --release -- --headless --trace ~/trace_name.postcard --osc
```

First time will take a long time to compile, subsequent runs will be fast.

Open a trace using the button in the Settings window or using the CLI argument. Select a .postcard file or an unparsed trace. Unparsed traces will be parsed and analysed, producing a .postcard file in the same directory so that the next load will be fast. Parsing can take several minutes.

Start the trace using the checkbox "Play". This will also send the calls to SuperCollider via OSC and open a WebSocket server which in browser JS clients can connect to to receive a live feed of the calls as they are being played.

## Websocket

The unfold websocket server will be at 127.0.0.1:12345. See the `unfold_ws_receiver_example` folder for an example of how to interact with the websocket server.

## OSC

`unfold_control` will send OSC to supercollider at `localhost:57120` and to the Node.js artnet_controller program at `localhost:57122`.
