use std::collections::HashMap;

use nannou::{
    color::IntoLinSrgba,
    image::{DynamicImage, GenericImage, GenericImageView, Rgba, RgbaImage},
    prelude::*,
    rand::{thread_rng, Rng},
};
use parser::{calltrace, deepika1, deepika2};

#[derive(Debug)]
enum NannouTrace {
    Deepika2 {
        trace: deepika2::Deepika2,
        zoom: f32,
        offset: f32,
        supplier_colors: HashMap<String, Hsla>,
        dependency_colors: HashMap<String, Hsla>,
        function_colors: HashMap<String, Hsla>,
        color_source: deepika2::ColorSource,
    },
}

impl NannouTrace {
    pub fn from_deepika2(trace: deepika2::Deepika2) -> Self {
        let mut rng = thread_rng();

        let mut supplier_colors = HashMap::new();
        let mut dependency_colors = HashMap::new();
        let mut function_colors = HashMap::new();

        for call in &trace.draw_trace {
            if let Some(supplier) = &call.supplier {
                supplier_colors
                    .entry(supplier.clone())
                    .or_insert_with(|| hsla(rng.gen(), 1.0, 0.6, 1.0));
            }
            if let Some(dependency) = &call.dependency {
                dependency_colors
                    .entry(dependency.clone())
                    .or_insert_with(|| hsla(rng.gen(), 1.0, 0.6, 1.0));
            }
            function_colors
                .entry(call.name.clone())
                .or_insert_with(|| hsla(rng.gen(), 1.0, 0.6, 1.0));
        }
        println!("suppliers: {supplier_colors:#?}");
        println!("num dependencies: {}", dependency_colors.len());
        Self::Deepika2 {
            trace,
            zoom: 1.0,
            offset: 0.0,
            supplier_colors,
            dependency_colors,
            function_colors,
            color_source: deepika2::ColorSource::Dependency,
        }
    }
    pub fn draw(&self, draw: &Draw, win: Rect) {
        match self {
            NannouTrace::Deepika2 {
                trace,
                zoom,
                offset,
                supplier_colors,
                dependency_colors,
                function_colors,
                color_source,
            } => {
                let zoom_x = zoom;

                let max_depth = trace.max_depth;
                let draw_trace = &trace.draw_trace;
                let call_w = win.w() / draw_trace.len() as f32 * zoom_x;
                // let offset_x =
                //     (app.elapsed_frames() as f32 / 500.0) % 1.0 * call_w * model.trace.len() as f32 - win.w();
                let offset_x = offset * call_w * draw_trace.len() as f32 - win.w();

                // Get the local max_depth and min_depth to zoom in on the curve
                //
                let mut local_max_depth = 0;
                let mut local_min_depth = i32::MAX;
                for (i, call) in draw_trace.iter().enumerate() {
                    let x = win.left() + i as f32 * call_w - offset_x;
                    if x >= win.left() && x <= win.right() {
                        local_max_depth = local_max_depth.max(call.depth);
                        local_min_depth = local_min_depth.min(call.depth);
                    }
                }
                let local_depth_width = local_max_depth - local_min_depth;
                let y = win.bottom() + win.h() * 0.02;
                let depth_height = (win.h() / local_depth_width as f32) * 0.96;

                let mut lines = vec![];
                let default_color = hsla(0.0, 0.0, 0.5, 1.0);
                for (i, call) in draw_trace.iter().enumerate() {
                    let color = match color_source {
                        deepika2::ColorSource::Supplier => {
                            if let Some(supplier) = &call.supplier {
                                supplier_colors.get(supplier).unwrap()
                            } else {
                                &default_color
                            }
                        }
                        deepika2::ColorSource::Dependency => {
                            if let Some(dependency) = &call.dependency {
                                dependency_colors.get(dependency).unwrap()
                            } else {
                                &default_color
                            }
                        }
                        deepika2::ColorSource::Function => function_colors.get(&call.name).unwrap(),
                    }
                    .clone();
                    lines.push((
                        pt2(
                            win.left() + i as f32 * call_w - offset_x,
                            y + depth_height * (call.depth - local_min_depth) as f32,
                        ),
                        color,
                    ));
                }
                // for point in &lines {
                //     draw.ellipse().w_h(5., 5.).color(point.1).xy(point.0);
                // }
                draw.polyline().stroke_weight(2.0).points_colored(lines);

                // Draw envelope
                let mut points = Vec::new();
                let mut last_known_value = 0.0;
                let total_depth_height = win.h() / max_depth as f32;
                for p in &trace.depth_envelope.sections {
                    let color = match p.state {
                        deepika2::DepthState::Stable => hsl(0.6, 0.5, 0.8),
                        deepika2::DepthState::Increasing => hsl(0.0, 0.9, 0.6),
                        deepika2::DepthState::Decreasing => hsl(0.7, 0.9, 0.6),
                    };
                    let value = p.average;
                    let x = win.left() + p.start_index as f32 * call_w - offset_x;
                    let x_end = win.left() + p.end_index as f32 * call_w - offset_x;
                    let y = y + total_depth_height * value;
                    if x < win.right() && x_end >= win.left() {
                        points.push((pt2(x, y), color));
                        points.push((pt2(x_end, y), color));

                        draw.ellipse()
                            .x_y(x, y + 30.)
                            .w_h(15.0 * p.dependency_dist_evenness, 15.)
                            .color(hsla(p.dependency_dist_evenness * 0.6, 1.0, 0.6, 0.8));
                        draw.ellipse().x_y(x, y + 60.).w_h(15.0, 15.).color(hsla(
                            p.supplier_dist_evenness * 0.6,
                            1.0,
                            0.6,
                            0.8,
                        ));
                    }
                }
                draw.polyline().stroke_weight(2.0).points_colored(points);

                // Draw n-gram analysis
                if let Some(ngram_analysis) = &trace.ngram_analysis {
                    for (key, section) in &ngram_analysis.sections {
                        for start_index in &section.start_indices {
                            let x = win.left() + *start_index as f32 * call_w - offset_x;
                            let end_x = win.left()
                                + (*start_index + section.section_length) as f32 * call_w
                                - offset_x;
                            if end_x > win.left() && x < win.right() {
                                let y = win.bottom() + (section.section_length as f32 * 2.);
                                let hue = (key.len() as f32 * 5073.9823) % 1.0;
                                draw.line()
                                    .start(pt2(x, y))
                                    .end(pt2(end_x, y))
                                    .color(hsla(hue, 1.0, 0.5, 1.0));
                            }
                        }
                    }
                }
            }
        }
    }
    pub fn event(&mut self, app: &App, event: WindowEvent) {
        match self {
            NannouTrace::Deepika2 {
                trace,
                zoom,
                offset,
                supplier_colors,
                dependency_colors,
                function_colors,
                color_source,
            } => match event {
                KeyPressed(key) => match key {
                    Key::C => {
                        *color_source = match color_source {
                            deepika2::ColorSource::Supplier => deepika2::ColorSource::Dependency,
                            deepika2::ColorSource::Dependency => deepika2::ColorSource::Function,
                            deepika2::ColorSource::Function => deepika2::ColorSource::Supplier,
                        }
                    }
                    _ => (),
                },
                MouseMoved(pos) => {
                    let max_zoom = trace.draw_trace.len() as f32 / 1000.;
                    // let max_zoom = 10.;
                    *zoom = ((pos.y / app.window_rect().h() + 0.5) * max_zoom).max(1.0);
                    *offset = pos.x / app.window_rect().w() + 0.5;
                }
                _ => (),
            },
        }
    }
}
#[derive(Debug)]
enum DrawMode {
    Graph,
    Pixels(wgpu::Texture),
}
fn main() {
    nannou::app(model)
        .event(event)
        .update(update)
        .view(view)
        .run();
}

#[derive(Debug)]
struct Model {
    traces: Vec<NannouTrace>,
    trace_to_show: usize,
    draw_mode: DrawMode,
}

fn model(app: &App) -> Model {
    app.new_window()
        .size(720, 720)
        .event(window_event)
        .raw_event(raw_window_event)
        .key_pressed(key_pressed)
        .key_released(key_released)
        .mouse_moved(mouse_moved)
        .mouse_pressed(mouse_pressed)
        .mouse_released(mouse_released)
        .mouse_wheel(mouse_wheel)
        .mouse_entered(mouse_entered)
        .mouse_exited(mouse_exited)
        .touch(touch)
        .touchpad_pressure(touchpad_pressure)
        .moved(window_moved)
        .resized(window_resized)
        .hovered_file(hovered_file)
        .hovered_file_cancelled(hovered_file_cancelled)
        .dropped_file(dropped_file)
        .focused(window_focused)
        .unfocused(window_unfocused)
        .closed(window_closed)
        .build()
        .unwrap();

    // println!("num calls: {}", trace.len());

    // let deepika1_trace = NannouTrace::from_deepika1(deepika1::Deepika1::new());
    // let calltrace = NannouTrace::from_calltrace(calltrace::Calltrace::new());
    // let trace =
    //     deepika2::Deepika2::parse_and_save("/home/erik/Hämtningar/nwl2022/data-imagej-copy-paste")
    //         .unwrap();
    // let trace = deepika2::Deepika2::parse_and_save(
    //     "/home/erik/Hämtningar/nwl2022/data-varna-copy-paste-isolated",
    // )
    // .unwrap();
    // let trace =
    //     deepika2::Deepika2::parse_and_save("/home/erik/Hämtningar/nwl2022/data-jedit-copy-paste")
    //         .unwrap();
    // let trace =
    //     deepika2::Deepika2::parse_and_save("/home/erik/Hämtningar/nwl2022/data-jedit-find-replace")
    //         .unwrap();
    // let trace = deepika2::Deepika2::parse_and_save(
    //     "/home/erik/Hämtningar/nwl2022/data-varna-startup-shutdown",
    // )
    // .unwrap();
    // let trace =
    //     deepika2::Deepika2::parse_and_save("/home/erik/Hämtningar/nwl2022/data-jedit-find-replace")
    //         .unwrap();
    // let trace =
    //     deepika2::Deepika2::parse_and_save("/home/erik/Hämtningar/nwl2022/data-jedit-with-marker")
    //         .unwrap();
    let trace =
        deepika2::Deepika2::open_or_parse("./data-jedit-with-marker")
            .unwrap();
    // trace.save_depth_as_wave("/home/erik/Hämtningar/nwl2022/data-jedit-with-marker-depth.wav");
    //

    let mut supplier_index = HashMap::new();
    let mut dependency_index = HashMap::new();
    for (i, call) in trace.draw_trace.iter().enumerate() {
        if let Some(supplier) = &call.supplier {
            let new_index = supplier_index.len();
            supplier_index.entry(supplier.clone()).or_insert(new_index);
            if let Some(dependency) = &call.dependency {
                let dependency_map = dependency_index
                    .entry(supplier.clone())
                    .or_insert(HashMap::new());
                let new_index = dependency_map.len();
                dependency_map
                    .entry(dependency.clone())
                    .or_insert(new_index);
            } else {
                let dependency_map = dependency_index
                    .entry(supplier.clone())
                    .or_insert(HashMap::new());
                let new_index = dependency_map.len();
                dependency_map.entry(String::new()).or_insert(new_index);
            }
        }
    }
    let (supplier_colors, dependency_colors) = {
        let mut supplier_colors: HashMap<String, Rgba<u8>> = HashMap::new();
        let mut dependency_colors: HashMap<String, Rgba<u8>> = HashMap::new();
        // Generate the supplier and dependency colors
        for (supplier, index) in supplier_index.iter() {
            // the multiplication factor can be anything.
            // we use 23, as the number of chromosomes for humans, and 42, as the answer
            let mut supplier_hue = (360. - (*index as f32 * 23.0)) % 360.0;

            let c = hsl(supplier_hue / 360.0, 1.0, 0.8).into_lin_srgba();
            supplier_colors.insert(
                supplier.clone(),
                Rgba([
                    (c.red * 255.) as u8,
                    (c.green * 255.) as u8,
                    (c.blue * 255.) as u8,
                    (c.alpha * 255.) as u8,
                ]),
            );
            if let Some(dependencies) = dependency_index.get(supplier) {
                let mut dependency_hue = supplier_hue;
                let mut dependency_lightness = 0.30;
                for (dependency, _dep_index) in dependencies.iter() {
                    let c = hsl(supplier_hue / 360.0, 1.0, dependency_lightness).into_lin_srgba();
                    dependency_lightness += 0.005;
                    dependency_colors.insert(
                        dependency.clone(),
                        Rgba([
                            (c.red * 255.) as u8,
                            (c.green * 255.) as u8,
                            (c.blue * 255.) as u8,
                            (c.alpha * 255.) as u8,
                        ]),
                    );
                }
            }
        }
        (supplier_colors, dependency_colors)
    };

    // 210:594
    // x * (x*0.353535) = num_calls
    // xx*0.353535 = num_calls
    // xx = num_calls /0.353535
    // x = sqrt(num_calls/0.353535)
    // calculate the closest size to the aspect ratio
    let q = (trace.draw_trace.len() as f64 / 0.35353535).sqrt();
    let width = q.ceil() as u32;
    let height = (q * 0.353535).ceil() as u32;
    let res = 3;
    let mut image = DynamicImage::new_rgba8(width*res, height*res);
    println!(
        "num calls: {}, num pixels: {}",
        trace.draw_trace.len(),
        image.width() * image.height()
    );
    let mut start_x = 0;
    let mut start_y = 0;
    let mut current_x = 0;
    let mut current_y = 0;
    for (i, call) in trace.draw_trace.iter().enumerate() {
        // let x = i as u32 % image.width();
        // let y = i as u32 / image.width();
        let x = current_x;
        let y = current_y;
        if current_x == image.width() - res || current_y == 0 {
            if start_y < image.height() - res {
                start_y += res;
            } else {
                start_x += res;
            }
            current_x = start_x;
            current_y = start_y;
        } else {
            current_x += res;
            current_y -= res;
        }
        let color = if let Some(dep) = &call.dependency {
            dependency_colors.get(dep).unwrap().clone()
        } else {
            Rgba([(call.depth % 255) as u8, 100, 255, 255])
        };
        for i in 0..res{
            for j in 0..res{
                image.put_pixel(x+i as u32, y+j as u32, color);
            }
        }
    }
    image.save("trace_as_pixels.png");
    let texture = wgpu::Texture::from_image(app, &image);

    let deepika2_trace = NannouTrace::from_deepika2(trace);
    let traces = vec![deepika2_trace];

    let m = Model {
        traces,
        trace_to_show: 0,
        draw_mode: DrawMode::Pixels(texture),
    };
    // println!("model: {m:?}");
    m
}

fn event(_app: &App, _model: &mut Model, event: Event) {
    match event {
        Event::WindowEvent {
            id: _,
            //raw: _,
            simple: _,
        } => {}
        Event::DeviceEvent(_device_id, _event) => {}
        Event::Update(_dt) => {}
        Event::Suspended => {}
        Event::Resumed => {}
    }
}

fn update(_app: &App, _model: &mut Model, _update: Update) {}

fn view(app: &App, model: &Model, frame: Frame) {
    frame.clear(BLACK);

    let draw = app.draw();
    let win = app.window_rect();
    match &model.draw_mode {
        DrawMode::Graph => {
            model.traces[model.trace_to_show].draw(&draw, win);
        }
        DrawMode::Pixels(texture) => {
            draw.texture(texture);
        }
    }

    draw.to_frame(app, &frame).unwrap();
}

fn window_event(app: &App, model: &mut Model, event: WindowEvent) {
    match &event {
        KeyPressed(key) => match key {
            Key::Left => {
                model.trace_to_show = (model.trace_to_show + 1) % model.traces.len();
            }
            Key::Right => {
                if model.trace_to_show == 0 {
                    model.trace_to_show = model.traces.len() - 1;
                } else {
                    model.trace_to_show -= 1;
                }
            }
            _ => (),
        },
        _ => (),
    }
    for t in &mut model.traces {
        t.event(app, event.clone());
    }
}

fn raw_window_event(_app: &App, _model: &mut Model, _event: &nannou::winit::event::WindowEvent) {}

fn key_pressed(_app: &App, _model: &mut Model, _key: Key) {}

fn key_released(_app: &App, _model: &mut Model, _key: Key) {}

fn mouse_moved(_app: &App, _model: &mut Model, _pos: Point2) {}

fn mouse_pressed(_app: &App, _model: &mut Model, _button: MouseButton) {}

fn mouse_released(_app: &App, _model: &mut Model, _button: MouseButton) {}

fn mouse_wheel(_app: &App, _model: &mut Model, _dt: MouseScrollDelta, _phase: TouchPhase) {}

fn mouse_entered(_app: &App, _model: &mut Model) {}

fn mouse_exited(_app: &App, _model: &mut Model) {}

fn touch(_app: &App, _model: &mut Model, _touch: TouchEvent) {}

fn touchpad_pressure(_app: &App, _model: &mut Model, _pressure: TouchpadPressure) {}

fn window_moved(_app: &App, _model: &mut Model, _pos: Point2) {}

fn window_resized(_app: &App, _model: &mut Model, _dim: Vec2) {}

fn window_focused(_app: &App, _model: &mut Model) {}

fn window_unfocused(_app: &App, _model: &mut Model) {}

fn window_closed(_app: &App, _model: &mut Model) {}

fn hovered_file(_app: &App, _model: &mut Model, _path: std::path::PathBuf) {}

fn hovered_file_cancelled(_app: &App, _model: &mut Model) {}

fn dropped_file(_app: &App, _model: &mut Model, _path: std::path::PathBuf) {}
