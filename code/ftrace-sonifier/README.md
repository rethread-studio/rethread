# ftrace sonifier

This program sonifies data sent from the ftrace-live program. It currently only supports JACK as an audio backend.

## Usage

In the root ftrace-sonifier directory

```
cargo run --release
```

All options such as OSC input port are currently hardcoded in the source code.