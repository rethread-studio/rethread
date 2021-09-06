use nannou::prelude::*;
use std::fs;
mod commits;
use commits::read_commit_data;
use commits::Commit;
use std::path::PathBuf;

use chrono::{DateTime, Utc};

fn main() {
    nannou::app(model).update(update).run();
}

struct Model {
    commits: Vec<Commit>,
    // The texture that we will draw to.
    texture: wgpu::Texture,
    // Create a `Draw` instance for drawing to our texture.
    draw: nannou::Draw,
    // The type used to render the `Draw` vertices to our texture.
    renderer: nannou::draw::Renderer,
    // The type used to capture the texture.
    texture_capturer: wgpu::TextureCapturer,
    // The type used to resize our texture to the window texture.
    texture_reshaper: wgpu::TextureReshaper,
    screenshot: bool,
}

fn model(app: &App) -> Model {
    // Hi-res capturing setup
    // Lets write to a 4K UHD texture.
    let texture_size = [2_160, 2_160];
    // let texture_size = [1080, 1080]; // Temporarily render 1080p for speed

    // Create the window.
    let [win_w, win_h] = [texture_size[0] / 2, texture_size[1] / 2];

    let w_id = app
        .new_window()
        // .power_preference(wgpu::PowerPreference::HighPerformance)
        .msaa_samples(1)
        .view(view)
        .event(window_event)
        .size(win_w, win_h)
        .build()
        .unwrap();

    let window = app.window(w_id).unwrap();

    // Retrieve the wgpu device.
    let device = window.swap_chain_device();

    // Create our custom texture.
    let sample_count = window.msaa_samples();
    let texture = wgpu::TextureBuilder::new()
        .size(texture_size)
        // Our texture will be used as the RENDER_ATTACHMENT for our `Draw` render pass.
        // It will also be SAMPLED by the `TextureCapturer` and `TextureResizer`.
        .usage(
            wgpu::TextureUsage::RENDER_ATTACHMENT
                | wgpu::TextureUsage::SAMPLED
                | wgpu::TextureUsage::COPY_DST,
        )
        // Use nannou's default multisampling sample count.
        .sample_count(sample_count)
        // Use a spacious 16-bit linear sRGBA format suitable for high quality drawing.
        .format(wgpu::TextureFormat::Rgba16Float)
        // Build it!
        .build(device);

    // Create our `Draw` instance and a renderer for it.
    let draw = nannou::Draw::new();
    let descriptor = texture.descriptor();
    let renderer =
        nannou::draw::RendererBuilder::new().build_from_texture_descriptor(device, descriptor);

    // Create the texture capturer.
    let texture_capturer = wgpu::TextureCapturer::default();

    // Create the texture reshaper.
    let texture_view = texture.view().build();
    let texture_sample_type = texture.sample_type();
    let dst_format = Frame::TEXTURE_FORMAT;
    let texture_reshaper = wgpu::TextureReshaper::new(
        device,
        &texture_view,
        sample_count,
        texture_sample_type,
        sample_count,
        dst_format,
    );

    // Read file with all of the commits in JSON format
    let mut filepath = app.assets_path().unwrap();
    let mut commit_path = filepath.clone();
    commit_path.push("rethread_commits.json");
    let mut stat_path = filepath.clone();
    stat_path.push("rethread_stats.json");
    let commits = read_commit_data(commit_path, stat_path);
    Model {
        commits,
        draw,
        texture_capturer,
        texture_reshaper,
        texture,
        renderer,
        screenshot: false,
    }
}

fn update(app: &App, model: &mut Model, _update: Update) {
    // Encapsulate the drawing stuff so that the window isn't borrowed when calling quit
    let snapshot = {
        // Do the drawing in update for hi-res texture rendering reasons
        // First, reset the `draw` state.
        let draw = &model.draw;
        draw.reset();

        // Create a `Rect` for our texture to help with drawing.
        let [w, h] = model.texture.size();
        let win = geom::Rect::from_w_h(w as f32, h as f32);

        // Setup rendering to texture
        let window = app.main_window();
        let device = window.swap_chain_device();
        let ce_desc = wgpu::CommandEncoderDescriptor {
            label: Some("texture renderer"),
        };
        let mut encoder = device.create_command_encoder(&ce_desc);

        // DO THE ACTUAL DRAWING HERE
        //
        draw.background().color(BLACK);
        let num_commits = model.commits.len();
        for (i, c) in model.commits.iter().enumerate() {
            let x = (win.w() / num_commits as f32) * i as f32 + win.left();
            let y = (c.impact as f32 / 10000.).clamp(-1.0, 1.0);
            let ysign = y < 0.;
            let y = y.abs().powf(0.33) * win.bottom() * 0.8;
            let y = if ysign { y * -1. } else { y };
            let size = (c.files_changed.len() as f32 / 10000.)
                .clamp(0.0, 1.0)
                .powf(0.5)
                * win.h()
                * 0.25
                + 2.;
            let r = (c.insertions as f32 / 1000.).powf(0.25);
            let b = (c.deletions as f32 / 1000.).powf(0.25);
            draw.ellipse()
                .x_y(x, y)
                .w_h(size, size)
                .color(rgba(r, 0., b, 0.1));
        }

        // Render our drawing to the texture.
        model
            .renderer
            .render_to_texture(device, &mut encoder, draw, &model.texture);

        // Take a snapshot of the texture. The capturer will do the following:
        //
        // 1. Resolve the texture to a non-multisampled texture if necessary.
        // 2. Convert the format to non-linear 8-bit sRGBA ready for image storage.
        // 3. Copy the result to a buffer ready to be mapped for reading.
        let snapshot = model
            .texture_capturer
            .capture(device, &mut encoder, &model.texture);

        // Submit the commands for our drawing and texture capture to the GPU.
        window.swap_chain_queue().submit(Some(encoder.finish()));
        snapshot
    };
    if model.screenshot {
        // Capture the frame!
        let file_path = captured_frame_path(app.project_path().unwrap());
        println!("screenshot path: {:?}", file_path);
        snapshot
            .read(move |result| {
                let image = result.expect("failed to map texture memory").to_owned();
                image
                    .save(&file_path)
                    .expect("failed to save texture to png image");
            })
            .unwrap();
        model.screenshot = false;
    }
}

fn view(_app: &App, model: &Model, frame: Frame) {
    let mut encoder = frame.command_encoder();
    model
        .texture_reshaper
        .encode_render_pass(frame.texture_view(), &mut *encoder);
}

fn window_event(_app: &App, model: &mut Model, event: WindowEvent) {
    match event {
        KeyPressed(key) => match key {
            Key::A => {}
            Key::D => {}
            Key::W => {}
            Key::S => {}
            Key::Up => {}
            Key::Down => {}
            Key::Left => {}
            Key::Right => {}
            Key::C => {}
            Key::X => {
                model.screenshot = true;
            }
            Key::T => {
                // // Send graph data via osc
                // model.sites[model.selected_site].trace_datas[model.selected_visit]
                //     .graph_data
                //     .send_script_data_osc(&model.sender);
            }
            Key::R => {}
            Key::G => {}
            Key::Space => {}
            _ => (),
        },
        KeyReleased(_key) => {}
        MouseMoved(pos) => {
            // model.param1 = (pos.x + app.window_rect().w() / 2.0) / app.window_rect().w();
        }
        MousePressed(button) => match button {
            _ => (),
        },
        MouseReleased(_button) => {}
        MouseEntered => {}
        MouseExited => {}
        MouseWheel(_amount, _phase) => {}
        Moved(_pos) => {}
        Resized(_size) => {}
        Touch(_touch) => {}
        TouchPressure(_pressure) => {}
        HoveredFile(_path) => {}
        DroppedFile(_path) => {}
        HoveredFileCancelled => {}
        Focused => {}
        Unfocused => {}
        Closed => {}
    }
}
fn captured_frame_path(render_path: PathBuf) -> std::path::PathBuf {
    // Create a path that we want to save this frame to.
    let now: DateTime<Utc> = Utc::now();
    let path = render_path
        .join("screencaps")
        // Name each file after the number of the frame.
        .join(format!("{}", now.to_rfc3339()))
        // The extension will be PNG. We also support tiff, bmp, gif, jpeg, webp and some others.
        .with_extension("png");
    // Create the parent dir of the new file if it doesn't exist
    let mut new_path_parent = path.clone();
    new_path_parent.pop();
    std::fs::create_dir_all(new_path_parent).expect("Failed to create directory for screenshots");
    path
}
