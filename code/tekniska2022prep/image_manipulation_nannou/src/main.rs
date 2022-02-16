//! A simple as possible example demonstrating how to use the `draw` API to display a texture.

use std::fs;

use nannou::{
    image::{DynamicImage, GenericImage, GenericImageView},
    prelude::*,
    wgpu::SamplerDescriptor,
};
use nannou_egui::Egui;
use nannou_osc as osc;

mod egui_interface;
use egui_interface::*;
enum ManipulationKind {
    NegativeExponentialSpeed,
    RandomBrightnessExponentialSpeed(u8),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CameraMode {
    FullImage,
    SinglePixel,
    Text,
}
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PixelDisplayMode {
    Color,
    RGB,
    Numbers,
}
struct Camera {
    mode: CameraMode,
    pixel_display: PixelDisplayMode,
    current_pos: Point2,
    current_vel: Vec2,
    follow_mode: bool,
    zoom: f32,
}

impl Camera {
    fn full_image() -> Self {
        Self {
            mode: CameraMode::FullImage,
            pixel_display: PixelDisplayMode::Numbers,
            current_pos: pt2(0.0, 0.0),
            current_vel: vec2(0.0, 0.0),
            zoom: 1.0,
            follow_mode: false,
        }
    }
    fn single_pixel() -> Self {
        Self {
            mode: CameraMode::SinglePixel,
            pixel_display: PixelDisplayMode::Numbers,
            current_pos: pt2(0.0, 0.0),
            current_vel: vec2(0.0, 0.0),
            zoom: 1.0,
            follow_mode: true,
        }
    }
    fn update(&mut self, current_pixel: Point2) {
                self.current_pos = current_pixel;
        match self.mode {
            CameraMode::FullImage => {}
            CameraMode::SinglePixel => {
            }
            CameraMode::Text => {}
        }
    }
}

fn main() {
    nannou::app(model).update(update).run();
}

struct Model {
    egui: Egui,
    egui_interface: EguiInterface,
    texture: wgpu::Texture,
    image_bytes: Vec<u8>,
    image: DynamicImage,
    last_limit: f64,
    limit: f64,
    pixels_per_frame: f64,
    /// `current_pixel` is used for interpolating pixel changes over many frames
    current_pixel: Vec3,
    manipulation: ManipulationKind,
    camera: Camera,
    sender: osc::Sender<osc::Connected>,
    image_text: String,
    image_text_lines: Vec<String>,
    background_color: Rgb<u8>,
}

fn model(app: &App) -> Model {
    // Create a new window!
    let w_id = app
        .new_window()
        .raw_event(raw_window_event)
        .key_pressed(key_pressed)
        .view(view)
        .build()
        .unwrap();
    // Load the image from disk and upload it to a GPU texture.
    let assets = app.assets_path().unwrap();
    let img_path = assets.join("images").join("rethread(300x200).jpg");
    let image = nannou::image::io::Reader::open(&img_path)
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

    let first_pixel = image.get_pixel(0, 0);
    let current_pixel = vec3(
        first_pixel.0[0] as f32,
        first_pixel.0[1] as f32,
        first_pixel.0[2] as f32,
    );

    // let image_data = fs::read_to_string(&img_path).unwrap();
    // println!("{image_data}");
    // read image as text
    let image_data = fs::read(img_path).unwrap();
    // parse the data into a string
    let mut image_text = String::new();
    let mut image_text_lines = Vec::new();
    let mut chars_since_n = 0;
    for byte in image_data {
        // TODO: replace \n and \t
        let byte = byte % 127;
        if byte as char == '\n' || chars_since_n > 490 {
            image_text_lines.push(image_text);
            image_text = String::new();
            chars_since_n = 0;
        } else if byte as char != '\n' {
            image_text.push(byte as char);
            chars_since_n += 1;
        }
    }
    for line in &image_text_lines {
        println!("{line}");
    }

    // egui init
    let window = app.window(w_id).unwrap();
    let mut egui = Egui::from_window(&window);
    let proxy = app.create_proxy();
    let mut egui_interface = EguiInterface {
        camera_mode: CameraMode::FullImage,
        pixel_display_mode: PixelDisplayMode::Numbers,
        visible: true,
        zoom: 1.0,
        pixels_per_frame: 1.0 / 128.,
        follow_mode: false,
    };
    egui.do_frame_with_epi_frame(proxy, |ctx, epi_frame| {
        egui_interface.setup(&ctx, epi_frame, None);
    });

    Model {
        egui,
        egui_interface,
        texture,
        image_bytes,
        image,
        last_limit: 0.0,
        limit: 0.,
        pixels_per_frame: 1.0 / 128.0,
        current_pixel,
        manipulation: ManipulationKind::RandomBrightnessExponentialSpeed(128),
        camera: Camera::single_pixel(),
        sender,
        image_text,
        image_text_lines,
        background_color: BLACK,
    }
}

fn update(app: &App, model: &mut Model, update: Update) {
    let (width, height) = model.image.dimensions();

    let new_current_pixel = model.limit as u32 != (model.limit + model.pixels_per_frame) as u32;
    model.limit += model.pixels_per_frame;
    if model.limit as u32 > width * height {
        model.limit = 0.;
        // model.pixels_per_frame = 1.;
        send_brightness_osc(&model.image, &mut model.sender);
    }
    let limit_u32 = (model.limit as u32).min(width * height);
    let current_pixel = pt2(
        (limit_u32 % width) as f32,
        ((limit_u32 / width) % height) as f32,
    );
    model.camera.update(current_pixel);
    if new_current_pixel {
        let pix = model
            .image
            .get_pixel(current_pixel.x as u32, current_pixel.y as u32);
        model.current_pixel.x = pix.0[0] as f32;
        model.current_pixel.y = pix.0[1] as f32;
        model.current_pixel.z = pix.0[2] as f32;
    }
    // zoom from mouse
    // let new_zoom = 1.0
    //     + ((app.mouse.x + (app.window_rect().w() * 0.5)) / app.window_rect().w()).powf(3.0)
    //         * 2000.0;
    // if !new_zoom.is_nan() {
    //     model.camera.zoom = new_zoom;
    //     model.pixels_per_frame = (40.0 / new_zoom).powi(2) as f64;
    // }
    match model.manipulation {
        ManipulationKind::NegativeExponentialSpeed => {
            let mut i = (limit_u32 - model.pixels_per_frame as u32).max(0);
            while i < limit_u32 {
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
            model.limit += model.pixels_per_frame;
            if model.limit as u32 > width * height {
                model.limit = 1.;
                model.pixels_per_frame = 1.;
                send_brightness_osc(&model.image, &mut model.sender);
            }
        }
        ManipulationKind::RandomBrightnessExponentialSpeed(ref mut change) => {
            let mut i = model.last_limit;
            while i < model.limit {
                let i_u32 = i as u32;
                let x = i_u32 % width;
                let y = (i_u32 / width) % height;
                if i as u32 != model.limit as u32 {
                    let mut pixel = model.image.get_pixel(x, y);
                    pixel.0[0] += *change;
                    pixel.0[1] += *change;
                    pixel.0[2] += *change;
                    model.image.put_pixel(x, y, pixel);
                } else {
                    let rem = (model.limit - i) as f32;
                    model.current_pixel.x += *change as f32 * rem;
                    model.current_pixel.y += *change as f32 * rem;
                    model.current_pixel.z += *change as f32 * rem;
                }
                i += 1.0;
            }
            model.texture = wgpu::Texture::from_image(app, &model.image);
            // model.pixels_per_frame *= 1.002;
            model.last_limit = model.limit;
        }
    }

    // update egui
    model.egui.set_elapsed_time(update.since_start);
    let proxy = app.create_proxy();
    model.egui.do_frame_with_epi_frame(proxy, |ctx, frame| {
        model.egui_interface.update(&ctx, frame);
    });

    // transfer settings
    model.camera.zoom = model.egui_interface.zoom;
    model.camera.mode = model.egui_interface.camera_mode;
    model.camera.pixel_display = model.egui_interface.pixel_display_mode;
    model.pixels_per_frame = model.egui_interface.pixels_per_frame;
    model.camera.follow_mode = model.egui_interface.follow_mode;
}

// Draw the state of your `Model` into the given `Frame` here.
fn view(app: &App, model: &Model, frame: Frame) {
    frame.clear(model.background_color);

    let draw = app.draw();
    match model.camera.mode {
        CameraMode::FullImage => {

                    let zoom = model.camera.zoom;
            // The offset to put the first pixel in the middle of the screen. The `- 0.5` is for this last alignment of pixels.
            let top_right_offset = if model.camera.follow_mode {
                pt2(
                    (model.image.width() as f32 - 1.0) * zoom * 0.5,
                    (model.image.height() as f32 - 1.0) * zoom * -0.5,
                )
            } else {
                pt2(0.0, 0.0)
            };
            let current_pixel_pos = if model.camera.follow_mode {
                pt2(0., 0.)
            } else {
                model.camera.current_pos * pt2(zoom, -zoom)
            };
            let current_pixel_offset = if model.camera.follow_mode {
                model.camera.current_pos * pt2(zoom, -zoom)
            } else {
                pt2(0., 0.)
            };
            let current_pixel_offset = top_right_offset - current_pixel_offset;

            match model.camera.pixel_display {
                PixelDisplayMode::Color => {
                    draw.texture(&model.texture).w_h(
                        model.image.width() as f32 * zoom,
                        model.image.height() as f32 * zoom,
                    ).xy(current_pixel_offset);
                }

                PixelDisplayMode::RGB => {
                    let pixel_size = model.camera.zoom;
                    let x_offset = pixel_size * model.image.width() as f32 * 0.5;
                    let y_offset = pixel_size * model.image.height() as f32 * 0.5;
                    let window_rect = app.window_rect();
                    for y in 0..model.image.height() {
                        for x in 0..model.image.width() {
                            let pixel = model.image.get_pixel(x, y);
                            let pixel_rect = Rect::from_x_y_w_h(
                                pixel_size * x as f32 - x_offset + current_pixel_offset.x,
                                y_offset - pixel_size * y as f32 +  current_pixel_offset.y,
                                pixel_size,
                                pixel_size,
                            );
                            if let Some(_) = window_rect.overlap(pixel_rect) {
                                draw.rect()
                                    .xy(pixel_rect.xy() + pt2(0., pixel_size * 0.33))
                                    .wh(pt2(pixel_size * 0.5, pixel_size * 0.333))
                                    .color(rgba(1.0, 0.0, 0.0, pixel.0[0] as f32 / 255.0));
                                draw.rect()
                                    .xy(pixel_rect.xy())
                                    .wh(pt2(pixel_size * 0.5, pixel_size * 0.333))
                                    .color(rgba(0.0, 1.0, 0.0, pixel.0[1] as f32 / 255.0));
                                draw.rect()
                                    .xy(pixel_rect.xy() - pt2(0., pixel_size * 0.33))
                                    .wh(pt2(pixel_size * 0.5, pixel_size * 0.333))
                                    .color(rgba(0.0, 0.0, 1.0, pixel.0[2] as f32 / 255.0));
                            }
                        }
                    }
                }
                PixelDisplayMode::Numbers => {
                    let pixel_size = model.camera.zoom;
                    let x_offset = pixel_size * model.image.width() as f32 * 0.5;
                    let y_offset = pixel_size * model.image.height() as f32 * 0.5;
                    let window_rect = app.window_rect();
                    for y in 0..model.image.height() {
                        for x in 0..model.image.width() {
                            let pixel = model.image.get_pixel(x, y);
                            let pixel_rect = Rect::from_x_y_w_h(
                                pixel_size * x as f32 - x_offset + current_pixel_offset.x,
                                y_offset - pixel_size * y as f32 +  current_pixel_offset.y,
                                pixel_size,
                                pixel_size,
                            );
                            if let Some(_) = window_rect.overlap(pixel_rect) {
                                if pixel_size > 10.0 {
                                    let font_size = (pixel_size / 5.0) as u32;
                                    draw.text(&format!("{}", pixel.0[0]))
                                        .xy(pixel_rect.xy() + pt2(0., pixel_size * 0.33))
                                        .color(RED)
                                        .font_size(font_size);
                                    draw.text(&format!("{}", pixel.0[1]))
                                        .xy(pixel_rect.xy())
                                        .color(GREEN)
                                        .font_size(font_size);
                                    draw.text(&format!("{}", pixel.0[2]))
                                        .xy(pixel_rect.xy() - pt2(0., pixel_size * 0.33))
                                        .color(BLUE)
                                        .font_size(font_size);
                                } else {
                                    draw.rect()
                                        .xy(pixel_rect.xy() + pt2(0., pixel_size * 0.33))
                                        .wh(pt2(pixel_size * 0.5, pixel_size * 0.333))
                                        .color(rgba(1.0, 0.0, 0.0, pixel.0[0] as f32 / 255.0));
                                    draw.rect()
                                        .xy(pixel_rect.xy())
                                        .wh(pt2(pixel_size * 0.5, pixel_size * 0.333))
                                        .color(rgba(0.0, 1.0, 0.0, pixel.0[1] as f32 / 255.0));
                                    draw.rect()
                                        .xy(pixel_rect.xy() - pt2(0., pixel_size * 0.33))
                                        .wh(pt2(pixel_size * 0.5, pixel_size * 0.333))
                                        .color(rgba(0.0, 0.0, 1.0, pixel.0[2] as f32 / 255.0));
                                }
                            }
                        }
                    }
                }
            }
        }
        CameraMode::SinglePixel => {
            let draw = draw.sampler(SamplerDescriptor {
                label: Some("Pixelated_sampler"),
                address_mode_u: wgpu::AddressMode::ClampToEdge,
                address_mode_v: wgpu::AddressMode::ClampToEdge,
                address_mode_w: wgpu::AddressMode::ClampToEdge,
                mag_filter: wgpu::FilterMode::Nearest,
                min_filter: wgpu::FilterMode::Nearest,
                mipmap_filter: wgpu::FilterMode::Nearest,
                lod_min_clamp: -100.0,
                lod_max_clamp: 100.0,
                compare: None,
                anisotropy_clamp: None,
                border_color: None,
            });
            let zoom = model.camera.zoom;
            // The offset to put the first pixel in the middle of the screen. The `- 0.5` is for this last alignment of pixels.
            let top_right_offset = if model.camera.follow_mode {
                pt2(
                    (model.image.width() as f32 - 1.0) * zoom * 0.5,
                    (model.image.height() as f32 - 1.0) * zoom * -0.5,
                )
            } else {
                pt2(0.0, 0.0)
            };
            let current_pixel_pos = if model.camera.follow_mode {
                pt2(0., 0.)
            } else {
                model.camera.current_pos * pt2(zoom, -zoom)
            };
            let current_pixel_offset = if model.camera.follow_mode {
                (model.camera.current_pos * pt2(zoom, -zoom))
            } else {
                pt2(0., 0.)
            };
            draw.texture(&model.texture)
                .w_h(
                    model.image.width() as f32 * zoom,
                    model.image.height() as f32 * zoom,
                )
                .xy(top_right_offset - current_pixel_offset);

            let (width, height) = model.image.dimensions();
            let limit_u32 = (model.limit as u32).min(width * height);
            let current_pixel = pt2(
                (limit_u32 % width) as f32,
                ((limit_u32 / width) % height) as f32,
            );
            let pixel_size = zoom;
            match model.camera.pixel_display {
                PixelDisplayMode::Color => {}
                PixelDisplayMode::RGB => {
                    // let pixel = model
                    //     .image
                    //     .get_pixel(current_pixel.x as u32, current_pixel.y as u32);
                    let pixel = nannou::image::Rgb::from([
                        model.current_pixel.x as u8,
                        model.current_pixel.y as u8,
                        model.current_pixel.z as u8,
                    ]);
                    let pixel_rect = Rect::from_x_y_w_h(
                        current_pixel_pos.x,
                        current_pixel_pos.y,
                        pixel_size,
                        pixel_size,
                    );
                    draw.rect()
                        .xy(pixel_rect.xy())
                        .wh(pixel_rect.wh())
                        .color(rgb(pixel.0[0], pixel.0[1], pixel.0[2]));
                    let red_rect = Rect::from_x_y_w_h(
                        0.0,
                        pixel_size * 0.3333,
                        pixel.0[0] as f32 / 255.0 * pixel_size,
                        pixel_size * 0.333,
                    )
                    .align_left_of(pixel_rect);
                    let green_rect = Rect::from_x_y_w_h(
                        0.0,
                        0.0,
                        pixel.0[1] as f32 / 255.0 * pixel_size,
                        pixel_size * 0.333,
                    )
                    .align_left_of(pixel_rect);
                    let blue_rect = Rect::from_x_y_w_h(
                        0.0,
                        pixel_size * -0.3333,
                        pixel.0[2] as f32 / 255.0 * pixel_size,
                        pixel_size * 0.333,
                    )
                    .align_left_of(pixel_rect);
                    draw.rect().xy(red_rect.xy()).wh(red_rect.wh()).color(RED);
                    draw.text(&format!("{}", pixel.0[0]))
                        .xy(current_pixel_pos + pt2(0., pixel_size * 0.33))
                        .color(BLACK)
                        .font_size((zoom / 10.) as u32);
                    draw.rect()
                        .xy(green_rect.xy())
                        .wh(green_rect.wh())
                        .color(GREEN);
                    draw.text(&format!("{}", pixel.0[1]))
                        .xy(current_pixel_pos)
                        .x_y(0., 0.)
                        .color(BLACK)
                        .font_size((zoom / 10.) as u32);
                    draw.rect()
                        .xy(blue_rect.xy())
                        .wh(blue_rect.wh())
                        .color(BLUE);
                    draw.text(&format!("{}", pixel.0[2]))
                        .xy(current_pixel_pos + pt2(0., pixel_size * -0.33))
                        .color(BLACK)
                        .font_size((zoom / 10.) as u32);
                }
                PixelDisplayMode::Numbers => {
                    // let pixel = model
                    //     .image
                    //     .get_pixel(current_pixel.x as u32, current_pixel.y as u32);
                    //
                    let pixel = nannou::image::Rgb::from([
                        model.current_pixel.x as u8,
                        model.current_pixel.y as u8,
                        model.current_pixel.z as u8,
                    ]);

                    let pixel_rect = Rect::from_x_y_w_h(
                        current_pixel_pos.x,
                        current_pixel_pos.y,
                        pixel_size,
                        pixel_size,
                    );
                    draw.rect()
                        .xy(pixel_rect.xy())
                        .wh(pixel_rect.wh())
                        .color(BLACK);
                    let font_size = (pixel_size / 5.0) as u32;
                    draw.text(&format!("{}", pixel.0[0]))
                        .xy(pixel_rect.xy() + pt2(0., pixel_size * 0.33))
                        .color(RED)
                        .font_size(font_size);
                    draw.text(&format!("{}", pixel.0[1]))
                        .xy(pixel_rect.xy())
                        .color(GREEN)
                        .font_size(font_size);
                    draw.text(&format!("{}", pixel.0[2]))
                        .xy(pixel_rect.xy() - pt2(0., pixel_size * 0.33))
                        .color(BLUE)
                        .font_size(font_size);
                }
            }
        }
        CameraMode::Text => {
            let text_size = 15;
            let mut y = 0.;
            let window_rect = app.window_rect();
                let num_lines = model.image_text_lines.len();
            let start_line = (model.limit as usize %(num_lines-1));
            for line in &model.image_text_lines[start_line..num_lines] {
                draw.text(line)
                    .x_y(0.0, window_rect.h() * 0.5 - y)
                    .w(window_rect.w() * 0.4)
                    .font_size(text_size)
                    .color(WHITE);
                y += text_size as f32 * 1.5;
            }
        }
    }

    draw.to_frame(app, &frame).unwrap();
    model.egui.draw_to_frame(&frame).unwrap();
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

fn raw_window_event(_app: &App, model: &mut Model, event: &nannou::winit::event::WindowEvent) {
    model.egui.handle_raw_event(event);
}


fn key_pressed(_app: &App, model: &mut Model, key: Key) {
    match key {
        Key::I =>  {
            model.egui_interface.visible = !model.egui_interface.visible;
        }
        _ => ()
    }
}
