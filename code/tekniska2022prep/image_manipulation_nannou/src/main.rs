//! A simple as possible example demonstrating how to use the `draw` API to display a texture.

use nannou::{
    image::{DynamicImage, GenericImage, GenericImageView},
    prelude::*,
};
use nannou_osc as osc;

enum ManipulationKind {
    NegativeExponentialSpeed,
    RandomBrightnessExponentialSpeed(u8),
}

fn main() {
    nannou::app(model).update(update).view(view).run();
}

struct Model {
    texture: wgpu::Texture,
    image_bytes: Vec<u8>,
    image: DynamicImage,
    limit: u32,
    pixels_per_frame: f32,
    manipulation: ManipulationKind,
    sender: osc::Sender<osc::Connected>,
}

fn model(app: &App) -> Model {
    // Create a new window!
    app.new_window().size(512, 512).build().unwrap();
    // Load the image from disk and upload it to a GPU texture.
    let assets = app.assets_path().unwrap();
    let img_path = assets.join("images").join("rethread.jpg");
    let image = nannou::image::io::Reader::open(img_path)
        .unwrap()
        .decode()
        .unwrap();
    let image_bytes = image.to_bytes();
    let texture = wgpu::Texture::from_image(app, &image);

    // Bind an `osc::Sender` and connect it to the target address.
    let mut sender = osc::Sender::bind()
        .unwrap()
        .connect("127.0.0.1:57120")
        .unwrap();

    send_brightness_osc(&image, &mut sender);

    Model {
        texture,
        image_bytes,
        image,
        limit: 1,
        pixels_per_frame: 1.,
        manipulation: ManipulationKind::RandomBrightnessExponentialSpeed(128),
        sender,
    }
}

fn update(app: &App, model: &mut Model, _update: Update) {
    let (width, height) = model.image.dimensions();
    let limit = model.limit.min(width * height);
    match model.manipulation {
        ManipulationKind::NegativeExponentialSpeed => {
            let mut i = (limit - model.pixels_per_frame as u32).max(0);
            while i < limit {
                let x = i % width;
                let y = (i / width) % height;
                let mut pixel = model.image.get_pixel(x, y);
                pixel.0[0] = 255 - pixel.0[0];
                pixel.0[1] = 255 - pixel.0[1];
                pixel.0[2] = 255 - pixel.0[2];
                model.image.put_pixel(x, y, pixel);
                i += 1;
            }
            model.texture = wgpu::Texture::from_image(app, &model.image);
            model.pixels_per_frame *= 1.22;
            model.limit += model.pixels_per_frame as u32;
            if model.limit > width * height {
                model.limit = 0;
                model.pixels_per_frame = 1.;
                send_brightness_osc(&model.image, &mut model.sender);
            }
        }
        ManipulationKind::RandomBrightnessExponentialSpeed(ref mut change) => {
            let mut i = (limit - model.pixels_per_frame as u32).max(0);
            while i < limit {
                let x = i % width;
                let y = (i / width) % height;
                let mut pixel = model.image.get_pixel(x, y);
                pixel.0[0] += *change;
                pixel.0[1] += *change;
                pixel.0[2] += *change;
                model.image.put_pixel(x, y, pixel);
                i += 1;
            }
            model.texture = wgpu::Texture::from_image(app, &model.image);
            model.pixels_per_frame *= 1.22;
            model.limit += model.pixels_per_frame as u32;
            if model.limit > width * height {
                model.limit = 0;
                model.pixels_per_frame = 1.;
                *change = random::<u8>();
                send_brightness_osc(&model.image, &mut model.sender);
            }
        }
    }
}

// Draw the state of your `Model` into the given `Frame` here.
fn view(app: &App, model: &Model, frame: Frame) {
    frame.clear(BLACK);

    let draw = app.draw();
    draw.texture(&model.texture);

    draw.to_frame(app, &frame).unwrap();
}

fn quick_inaccurate_brightness(r: u8, g: u8, b: u8) -> u8 {
    let r = r as u32;
    let g = g as u32;
    let b = b as u32;
    ((r + r + r + b + g + g + g + g) >> 3) as u8
}

fn send_brightness_osc(image: &DynamicImage, sender: &mut osc::Sender<osc::Connected>) {
    let downsampling = 100;
    let (width, height) = image.dimensions();
    let cells_y = (height as f32 / downsampling as f32).ceil() as u32;
    let cells_x = (width as f32 / downsampling as f32).ceil() as u32;
    println!("num_cells: {}", cells_x * cells_y);
    for y in 0..cells_y {
        for x in 0..cells_x {
            let mut sum: u32 = 0;
            let samples_x = (width - x * downsampling).min(downsampling);
            let samples_y = (height - y * downsampling).min(downsampling);
            for offset_y in 0..samples_y {
                for offset_x in 0..samples_x {
                    let nx = x * downsampling + offset_x;
                    let ny = y * downsampling + offset_y;
                    let pixel = image.get_pixel(nx, ny);
                    sum += quick_inaccurate_brightness(pixel.0[0], pixel.0[1], pixel.0[2]) as u32;
                }
            }
            sum /= samples_x * samples_y;
            let addr = "/luma_chord";
            let args = vec![
                osc::Type::Int(x as i32),
                osc::Type::Int(y as i32),
                osc::Type::Int(sum as i32),
            ];
            sender.send((addr, args)).ok();
        }
    }
    let addr = "/luma_chord_finished";
    let args = vec![];
    sender.send((addr, args)).ok();
}
