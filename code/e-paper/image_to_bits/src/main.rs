use bitvec::prelude::*;
use image::{self, imageops::*};
fn main() {
    // let img = image::open("/home/erik/Bilder/hommage-a-molnar.jpg").unwrap();
    let img = image::open("/home/erik/Bilder/neodymium.jpg").unwrap();
    let mut img = img.grayscale();
    let mut img = img.as_mut_luma8().unwrap();
    dither(&mut img, &BiLevel);
    // img.save("cat.png").unwrap(); // this step is optional but convenient for testing
    // dbg!(&img);
    // println!("Num pixels: {}", img.len());

    let mut bv = bitvec![u8, Msb0;];
    for pixel in img.pixels() {
        bv.push(pixel.0[0] == 255);
    }
    // println!("bv len: {}", bv.len());
    bv.set_uninitialized(false);
    let bytes = bv.into_vec();
    // println!("bytes len: {}", bytes.len());
    println!("{FILE_HEADER}");
    let frame_name = "gImage0";
    println!("const unsigned char {frame_name}[{}] = {{", bytes.len());
    for (i, b) in bytes.into_iter().enumerate() {
        if i % 16 == 0 {
            println!();
        }
        print!("{b:#04x}, ");
    }

    println!("}};");
}

const FILE_HEADER: &str = r##"
/*
* | Function    :
*----------------
* |	This version:   V1.1
* | Date        :   2019-06-12
* | Info        :
*
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documnetation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to  whom the Software is
# furished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS OR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
# THE SOFTWARE.
#

******************************************************************************/

#include "ImageData.h"
"##;
