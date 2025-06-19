
https://www.waveshare.com/wiki/E-Paper_ESP32_Driver_Board

# Installation

To program the esp32 microcontroller, we need the `esp32-waveshare-epd` Arduino library. Download and put it in the Arduino libraries folder on your system.

The relevant example is `epd7in5_V2-demo` which shows how to use the API.


# Showing single frame(s)

The folder epd7in5_V2_show_image contains a project that shows one 1 bit black and white image. That image is stored in 

## Generating the 1 bit colour image

The `image_to_bits` program converts a jpg file to a packed 1-bit image by simply setting all pixels where red is 255, disregarding the other channels, to 1 and everything else to 0. It requires having a Rust toolchain installed.

The path is hard coded. To change it, edit line 5 of `src/main.rs`.

When run, it prints its output to the terminal. It is usually more convenient to pipe it into a file and copy it from there:

```
cargo run --release -- > bits.txt
```

Then replace the image data in `ImageData.c` with the newly generated 1-bit image and upload the new code to the e-paper microcontroller.

# Animation
