# A blank Daisy Pod Repo

Clone this repo for a blank, but already setup project for the Electrosmith Daisy Seed Pod platform in the [RTIC](https://rtic.rs/) framework. Please use following command to include submodules:

``` shell
$ git clone --recursive <HTTPS-URL>
```

At the moment, only `revision 5` of the Daisy Seed is supported, specifically with the WM8931 codec. In the future, all revisions will be supported.

# Build

Make sure you have the toolchain and the right compiler installed. A quick guide can be found [here](https://docs.rust-embedded.org/cortex-m-quickstart/cortex_m_quickstart/).

### ST-Link

First, install the cargo embed binary:

``` shell
$ cargo install cargo-embed
```
After that, you can flash your Daisy

``` shell
$ cargo embed               # debug mode
$ cargo embed --release     # fast, smallest size
```

### microUSB

[First, install cargo-binutils](https://github.com/rust-embedded/cargo-binutils)

``` shell
$ cargo objcopy --release -- -O binary a.bin
$ dfu-util -a 0 -s 0x08000000 -D a.bin 
```