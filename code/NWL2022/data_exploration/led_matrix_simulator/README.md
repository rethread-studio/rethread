# Installation

## Rust

Install the rust compiler and the cargo build system using rustup:

https://www.rust-lang.org/tools/install

## Bevy dependencies

Bevy has different dependencies for different systems, follow the instructions for yours here:

https://bevyengine.org/learn/book/getting-started/setup/

# Usage

Open a trace using the button in the Settings window. Select a .postcard file or an unparsed trace. Unparsed traces will be parsed and analysed, producing a .postcard file in the same directory so that the next load will be fast. Parsing can take up to several minutes.

Start the trace using the checkbox "Play". This will also send the calls to SuperCollider via OSC and open a WebSocket server which in browser JS clients can connect to to receive a live feed of the calls as they are being played.
