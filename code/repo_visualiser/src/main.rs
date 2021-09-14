use nannou::prelude::*;
use std::fs;
mod commits;
use chrono::{DateTime, Utc};
use commits::read_commit_data;
use commits::Commit;
use indexmap::IndexMap;
use std::collections::HashMap;
use std::path::PathBuf;

// Visualisation planning:
// 1. Tracing files over time, watching the repo grow.
// Track every file, when it first starts existing to when it stops, and
// every changes in between. Save in a HashMap.
// 2. Draw several visualisations on top of each other.
// 3. Draw lines between commits by the same author, in the order they come. These lists, with indices for commits, can be generated during setup.
// 4. Draw lines between commits and the files they change.
// 5. There could be a time element where things fade. The current state of a file is fully opaque, its history is faded a little bit, like a shadow.
// 6. Don't plot over time, just draw each file as a blob.
// 7. Draw commits or files as sine waves that lose amplitude over time.

/// Blob is our files with their position and other attributes necessary to draw them
struct Blob {
    pos: Point2,
    color: Hsla,
    radius: f32,
}

impl Blob {
    pub fn overlaps(&self, pos: Point2, r: f32) -> bool {
        let rel_pos = self.pos - pos;
        self.pos.distance_squared(pos) < (self.radius + r).powi(2)
    }
}

#[derive(Clone)]
struct FileChange {
    author: usize,
    size: i32,
    timestamp: u64,
}
#[derive(Clone)]
struct FileHistory {
    start_commit_index: usize,
    end_commit_index: usize,
    start_timestamp: u64,
    num_changes: u32,
    path: String,
    /// How large the file is at each commit
    changes: Vec<FileChange>,
}

fn main() {
    nannou::app(model).update(update).run();
}

struct Model {
    commits: Vec<Commit>,
    /// Changes per file
    file_history: IndexMap<String, FileHistory>,
    /// Commits by a certain author, in order
    author_history: HashMap<String, Vec<usize>>,
    first_timestamp: u64,
    last_timestamp: u64,
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
    zoom: f32,
    focus_point: Point2,
    blobs: Vec<Blob>,
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

    let mut first_timestamp = u64::MAX;
    let mut last_timestamp = 0;

    let mut author_history = HashMap::new();
    let mut file_history = IndexMap::new();
    let mut author_indices = IndexMap::new();
    for (i, c) in commits.iter().rev().enumerate() {
        if c.timestamp > last_timestamp {
            last_timestamp = c.timestamp;
        }
        if c.timestamp < first_timestamp {
            first_timestamp = c.timestamp;
        }
        // Add to author history
        let author_entry = author_history.entry(c.author.clone()).or_insert(Vec::new());
        author_entry.push(i);
        for file in &c.files_changed {
            // Get entry and add new if it doesn't exist
            let file_entry = file_history
                .entry(file.path.clone())
                .or_insert(FileHistory {
                    start_commit_index: i,
                    end_commit_index: i,
                    start_timestamp: c.timestamp,
                    num_changes: 0,
                    path: file.path.clone(),
                    changes: Vec::new(),
                });
            // Set the current commit as last commit
            file_entry.end_commit_index = i;
            // Add a size entry to the file history
            let size_change = file.insertions - file.deletions;
            let num_authors = author_indices.len();
            let author_index = author_indices.entry(&c.author).or_insert(num_authors);
            let new_size = if let Some(change) = file_entry.changes.last() {
                change.size + size_change
            } else {
                size_change
            };
            let file_change = FileChange {
                author: *author_index,
                size: new_size,
                timestamp: c.timestamp,
            };
            file_entry.changes.push(file_change);
        }
    }

    let mut max_size = 0;
    for fh in file_history.values() {
        let s = fh.changes.last().unwrap().size;
        if s > max_size {
            max_size = s;
        }
    }
    // From this data, we pack blobs into the image
    println!("Packing blobs");
    let blob_max_size = 80.;
    let blob_min_size = 2.;
    let [w, h] = texture.size();
    let win = geom::Rect::from_w_h(w as f32, h as f32);

    let mut sorted_files: Vec<FileHistory> = file_history.values().map(|fh| fh.clone()).collect();
    sorted_files.sort_by_cached_key(|fh| fh.changes.last().unwrap().size);
    let mut blobs: Vec<Blob> = Vec::with_capacity(sorted_files.len());
    for fh in sorted_files.into_iter().rev() {
        // Try a random position and check that it isn't inside a circle and that it doesn't overlap a different circle
        let mut pt;
        let mut radius;
        loop {
            pt = pt2(random_f32() * win.w(), random_f32() * win.h());
            radius = (fh.changes.last().unwrap().size as f32 / max_size as f32).powf(0.266)
                * blob_max_size
                + blob_min_size;
            let mut failed = false;
            for b in &blobs {
                if b.overlaps(pt, radius) {
                    failed = true;
                    break;
                }
            }
            if !failed {
                break;
            }
        }

        let hue = if let Some(ext) = PathBuf::from(fh.path).extension() {
            (ext.to_str().unwrap().as_bytes().iter().map(|b| *b as u32).sum::<u32>() % 256) as f32 / 256.
        } else {
            0.0
        };
        blobs.push(Blob {
            pos: pt,
            radius,
            color: hsla(
                0.5 + hue * 0.15,
                0.5 + hue * 0.5,
                ((fh.start_timestamp - first_timestamp) as f64 / (last_timestamp - first_timestamp) as f64) as f32 * 0.45 + 0.15,
                1.0,
            ),
        })
    }

    for (author, _index) in author_indices {
        println!("Author: {}", author);
    }

    Model {
        first_timestamp,
        last_timestamp,
        commits,
        author_history,
        file_history,
        draw,
        texture_capturer,
        texture_reshaper,
        texture,
        renderer,
        screenshot: false,
        zoom: 10.,
        focus_point: pt2(0., 0.),
        blobs,
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
        let time_width = model.last_timestamp - model.first_timestamp;

        // Draw commits over time
        // for (i, c) in model.commits.iter().enumerate() {
        //     let x = (win.w() / num_commits as f32) * i as f32 + win.left();
        //     let y = (c.impact as f32 / 10000.).clamp(-1.0, 1.0);
        //     let ysign = y < 0.;
        //     let y = y.abs().powf(0.33) * win.bottom() * 0.8;
        //     let y = if ysign { y * -1. } else { y };
        //     let size = (c.files_changed.len() as f32 / 10000.)
        //         .clamp(0.0, 1.0)
        //         .powf(0.5)
        //         * win.h()
        //         * 0.25
        //         + 2.;
        //     let r = (c.insertions as f32 / 1000.).powf(0.25);
        //     let b = (c.deletions as f32 / 1000.).powf(0.25);
        //     draw.ellipse()
        //         .x_y(x, y)
        //         .w_h(size, size)
        //         .color(rgba(r, 0., b, 0.1));
        // }

        // Draw file history
        // let num_files = model.file_history.len() as f64;
        // let num_files_usize = model.file_history.len();
        // let x_step = win.w() / num_commits as f32;
        // let x_ts_step = win.w() * model.zoom / time_width as f32;
        // for (i, fh) in model.file_history.values().enumerate() {
        //     let start_x = x_step * fh.start_commit_index as f32 + win.left();
        //     let file_x_step = ((fh.end_commit_index - fh.start_commit_index) as f32 * x_step)
        //         / fh.changes.len() as f32;
        //     let mut points_up = Vec::with_capacity(fh.changes.len());
        //     let mut points_down = Vec::with_capacity(fh.changes.len());
        //     let y = -(win.h()/2.) + ((i * 10 % num_files_usize) as f64 / num_files) as f32 * win.h();
        //     for (j, change) in fh.changes.iter().enumerate() {
        //         // let y = if i % 2 == 0 { y  } else { y * -1. };
        //         // let x = start_x + file_x_step * j as f32;
        //         // x value from timestamp
        //         let x = x_ts_step * (change.timestamp - model.first_timestamp) as f32 + win.left();
        //         let size = change.size;
        //         let size = (size as f32 / 100000.).clamp(0., 1.0).powf(0.25) * win.w() * 0.02 + 0.5;
        //         let col = hsla(change.author as f32 / 30.0, 0.8, 0.3, 1.0);
        //         // draw.ellipse()
        //         //     .x_y(x, y)
        //         //     .radius(size)
        //         //     .color(col);
        //         points_up.push(pt2(x, y + size));
        //         points_down.push(pt2(x, y - size));
        //     }
        //     let col = hsla(i as f32 * 300.5823723 % 1.0, 0.8, 0.3, 0.05);
        //     // draw.polyline().color(col).points(points_up);
        //     // draw.polyline().color(col).points(points_down);
        //     let mut polygon_points = Vec::with_capacity(points_up.len() * 2);
        //     for p in points_up.into_iter().chain(points_down.into_iter().rev()) {
        //         polygon_points.push(p);
        //     }
        //     draw.polygon().color(col).points(polygon_points);
        // }

        // Draw files as blobs
        for b in &model.blobs {
            draw.ellipse()
                .color(b.color)
                .xy(b.pos - (win.wh() / 2.))
                .w_h(b.radius * 2., b.radius * 2.);
        }

        // List of files with sizes
        // Circle packing

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

fn window_event(app: &App, model: &mut Model, event: WindowEvent) {
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
            Key::Plus => {
                model.zoom += 1.;
            }
            Key::Minus => {
                model.zoom -= 1.;
            }
            _ => (),
        },
        KeyReleased(_key) => {}
        MouseMoved(pos) => {
            model.focus_point = pt2(pos.x / app.window_rect().w(), pos.y / app.window_rect().h());
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
