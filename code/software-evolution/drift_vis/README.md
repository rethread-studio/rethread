# Visualise and sonify traces of web apps

This program visualises a trace in a wide array of ways

## Compilation

Requires a system installation of rustc and cargo: https://www.rust-lang.org/tools/install

```
cargo build --release
```

A binary will be placed in `./target/release/`

The dependencies take up a lot of disk space, but speeds up consecutive compilations significantly. To remove everything that cargo has fetched and generated, run `cargo clean`.

## Cache

By default all the js coverage and profile .json files are cached relative to the current directory in `./assets/cache/%SITE%/%UNIX_TIMESTAMP%/`. A custom cache location can be set with the `--cache` option.

## Render from the command line

Run using the `single` subcommand. Help available by running
```
cargo run --release -- single --help
```

The `single` subcommand will follow the `--offline` flag and the `--cache` option for fetching the raw data from a custom local location. If no output path is specified the default for rendering all traces will be used: `./renders/%SITE%/%INTERNAL_VISUALISATION_NAME%/%UNIX_TIMESTAMP%.png`

## Keyboard shortcuts

- G: Toggle GUI
- Up/Down: Change site
- Left/Right: Change vists/timestamp
- W/S: Change kind of data that is visualised
- A/D: Change specific visualistion of that data
- X: Save a screenshot of the window
- R: Render all of the traces for this site using the current visualisation to png files
- ESCAPE: Quit the program

## Convert image sequence to video file

``` shell
ffmpeg -r 8 -start_number 0 -i %04d.png -c:v libx264 -crf 20 -preset veryslow -s 1080x1051 ../bing_coverage_rings.mp4
```

