# JS processor

This program processes collected JavaScript by auto formatting/deobfuscating and concatenating multiple script files in a directory.

## Install

This program uses js-beautify as a standalone to do the auto formatting and deobfuscation.

``` shell
sudo npm -g install js-beautify
```

You need a rust toolchain to build this. Build using

``` shell
cargo build --release
```

## Usage

Run using

``` shell
cargo run --release
```

Point the system folder dialog to the root of the trace data. It will collect and format all js and write the indentation data as csv to `indent_profile.csv`. For the built in help, run `cargo run --release -- --help`

If you want to process many traces at a time, run with

``` shell
cargo run --release -- --project
```

and point the folder selection to the superdirectory of the trace folders.

To also set the path on the CLI, use the `--path` flag

``` shell
cargo run --release -- --project --path="/path/to/my/project folder/"
```

To to activate line length parsing, use the `--line_length` flag

``` shell
cargo run --release -- --project --path="/path/to/my/project folder/" --line_length
```

Once compiled it can also be run from the binary directly:
```shell
./target/release/js-processor --project --path="../web-evolution/google/" --line_length
```