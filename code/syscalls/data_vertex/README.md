Collects syscall and eBPF data and passes it on to other systems.

# Usage

These instructions assume you have a Rust toolchain installed. If you don't go to https://rustup.rs/

## Live

1. Configure Settings.toml in the data_vertex folder to reflect the settings of your OSC receiver(s)
2. Start data_vertex by running `cargo run --release` in the data_vertex folder
3. Start any number of `strace_collector`s on the same local machine (can be run inside a network in the future)
4. Done! You will now receive data to the OSC clients defined in Settings.toml

## Record data

1. Follow settings above to set up strace_collectors and start data_vertex. Optionally wait with starting strace_collectors to trace the start of the programs.
2. Choose "RecordData" in the data_vertex TUI menu using the arrow keys up/down and press Enter.
3. Interact with the programs.
4. When you are satisfied, choose the menu item "StopAndSaveRecording" and press enter.

## Play back data

1. Run data_vertex the same way as above.
2. Choose the menu item "LoadRecordedData" and pick the file you saved earlier.
3. The data will be loaded, but not played back. The progress bar at the bottom will reflect this.
4. Choose menu items "StartPlayback" and "PausePlayback" to control data playback. The data will be treated as if it was happening live.

# OSC data format

## /syscall

Sent once for each syscall and contains the following data. argN are arguments made to the function as integers. These will represent different things.

[syscall_id, syscall_kind_classifier, arg0, arg1, arg2, return_code_value, returns_error_true_or_false, program_or_command_name]

# Settings.toml

Currently only used for setting the OSC receiver data. The names of receivers are arbitrary and only used for documentation. The `Settings.toml` file should be in the root of the Rust crate if running using cargo.

Example content:

```toml
[osc_receivers]
supercollider = { ip = "127.0.0.1", port = 57120 }
openFrameworks = { ip = "127.0.0.1", port = 57130 }
```

# Debug

Logs are saved in debug.log
