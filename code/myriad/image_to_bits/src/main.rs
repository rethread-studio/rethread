use bitvec::prelude::*;
use image::{self, imageops::*};
fn main() {
    let img = image::open("cat.jpg").unwrap();
    let mut img = img.grayscale();
    let mut img = img.as_mut_luma8().unwrap();
    dither(&mut img, &BiLevel);
    // img.save("cat.png").unwrap(); // this step is optional but convenient for testing
    // dbg!(&img);
    println!("Num pixels: {}", img.len());

    let mut bv = bitvec![u8, Msb0;];
    for pixel in img.pixels() {
        bv.push(pixel.0[0] == 255);
    }
    println!("bv len: {}", bv.len());
    bv.set_uninitialized(false);
    let bytes = bv.into_vec();
    println!("bytes len: {}", bytes.len());
    let frame_name = "gImage0";
    println!("const unsigned char {frame_name}[{}] = [", bytes.len());
    for (i, b) in bytes.into_iter().enumerate() {
        if i % 16 == 0 {
            println!();
        }
        print!("{b:#04x}, ");
    }

    println!("];");
}
