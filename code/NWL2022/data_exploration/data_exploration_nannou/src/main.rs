use std::collections::HashMap;

use nannou::{
    prelude::*,
    rand::{thread_rng, Rng},
};
use parser::{calltrace, deepika1};

#[derive(Debug)]
enum NannouTrace {
    Calltrace {
        trace: calltrace::Calltrace,
        zoom: f32,
        offset: f32,
        class_colors: HashMap<String, Hsla>,
        method_colors: HashMap<String, Hsla>,
        color_source: calltrace::ColorSource,
    },
    Deepika1 {
        trace: deepika1::Deepika1,
        zoom: f32,
        offset: f32,
        supplier_colors: HashMap<String, Hsla>,
        dependency_colors: HashMap<String, Hsla>,
        function_colors: HashMap<String, Hsla>,
        color_source: deepika1::ColorSource,
    },
}

impl NannouTrace {
    pub fn from_calltrace(trace: calltrace::Calltrace) -> Self {
        let mut class_colors = HashMap::new();
        let mut method_colors = HashMap::new();
        let mut rng = thread_rng();
        for call in &trace.trace {
            class_colors
                .entry(call.class.clone())
                .or_insert_with(|| hsla(rng.gen(), 1.0, 0.6, 1.0));
            method_colors
                .entry(call.method.clone())
                .or_insert_with(|| hsla(rng.gen(), 1.0, 0.6, 1.0));
        }
        Self::Calltrace {
            trace,
            zoom: 1.0,
            offset: 0.0,
            class_colors,
            method_colors,
            color_source: calltrace::ColorSource::Class,
        }
    }
    pub fn from_deepika1(trace: deepika1::Deepika1) -> Self {
        let mut rng = thread_rng();

        let mut supplier_colors = HashMap::new();
        let mut dependency_colors = HashMap::new();
        let mut function_colors = HashMap::new();

        for call in &trace.draw_trace {
            supplier_colors
                .entry(call.callee_supplier.clone())
                .or_insert_with(|| hsla(rng.gen(), 1.0, 0.6, 1.0));
            dependency_colors
                .entry(call.callee_dependency.clone())
                .or_insert_with(|| hsla(rng.gen(), 1.0, 0.6, 1.0));
            function_colors
                .entry(call.callee_name.clone())
                .or_insert_with(|| hsla(rng.gen(), 1.0, 0.6, 1.0));
        }
        Self::Deepika1 {
            trace,
            zoom: 1.0,
            offset: 0.0,
            supplier_colors,
            dependency_colors,
            function_colors,
            color_source: deepika1::ColorSource::Dependency,
        }
    }
    pub fn draw(&self, draw: &Draw, win: Rect) {
        match self {
            NannouTrace::Calltrace {
                trace,
                zoom,
                offset,
                class_colors,
                method_colors,
                color_source,
            } => {
                let zoom_x = zoom;

                let max_depth = trace.max_depth;
                let call_w = win.w() / trace.trace.len() as f32 * zoom_x;
                // let offset_x =
                //     (app.elapsed_frames() as f32 / 500.0) % 1.0 * call_w * model.trace.len() as f32 - win.w();
                let offset_x = offset * call_w * trace.trace.len() as f32 - win.w();
                let mut y = win.bottom() + win.h() * 0.02;
                let depth_height = (win.h() / max_depth as f32) * 0.5;

                if true {
                    let mut lines = vec![];
                    for (i, call) in trace.trace.iter().enumerate() {
                        let color = match color_source {
                            calltrace::ColorSource::Method => {
                                method_colors.get(&call.method).unwrap().clone()
                            }
                            calltrace::ColorSource::Class => {
                                class_colors.get(&call.class).unwrap().clone()
                            }
                        };
                        lines.push((
                            pt2(
                                win.left() + i as f32 * call_w - offset_x,
                                y + depth_height * call.call_depth as f32,
                            ),
                            color,
                        ));
                    }
                    draw.polyline().points_colored(lines);
                } else {
                    let mut lines = vec![];
                    for (i, call) in trace.trace.iter().enumerate() {
                        lines.push(pt2(
                            win.left() + i as f32 * call_w - offset_x,
                            y + depth_height * call.call_depth as f32,
                        ));
                    }
                    draw.polyline()
                        .color(hsla(0.0, 1.0, 0.7, 0.8))
                        .points(lines);
                }
            }
            NannouTrace::Deepika1 {
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
                let trace = &trace.draw_trace;
                let call_w = win.w() / trace.len() as f32 * zoom_x;
                // let offset_x =
                //     (app.elapsed_frames() as f32 / 500.0) % 1.0 * call_w * model.trace.len() as f32 - win.w();
                let offset_x = offset * call_w * trace.len() as f32 - win.w();

                // Get the local max_depth and min_depth to zoom in on the curve
                //
                let mut local_max_depth = 0;
                let mut local_min_depth = i32::MAX;
                for (i, call) in trace.iter().enumerate() {
                    let x = win.left() + i as f32 * call_w - offset_x;
                    if x >= win.left() && x <= win.right() {
                        local_max_depth = local_max_depth.max(call.depth);
                        local_min_depth = local_min_depth.min(call.depth);
                    }
                }
                let local_depth_width = local_max_depth - local_min_depth;
                let mut y = win.bottom() + win.h() * 0.02;
                let depth_height = (win.h() / local_depth_width as f32) * 0.96;

                let mut lines = vec![];
                for (i, call) in trace.iter().enumerate() {
                    let color = match color_source {
                        deepika1::ColorSource::Supplier => {
                            supplier_colors.get(&call.callee_supplier).unwrap()
                        }
                        deepika1::ColorSource::Dependency => {
                            dependency_colors.get(&call.callee_dependency).unwrap()
                        }
                        deepika1::ColorSource::Function => {
                            function_colors.get(&call.callee_name).unwrap()
                        }
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
                draw.polyline().stroke_weight(2.0).points_colored(lines);
            }
        }
    }
    pub fn event(&mut self, app: &App, event: WindowEvent) {
        match self {
            NannouTrace::Calltrace {
                trace,
                zoom,
                offset,
                class_colors,
                method_colors,
                color_source,
            } => match event {
                KeyPressed(key) => match key {
                    Key::C => *color_source = calltrace::ColorSource::Class,
                    Key::M => *color_source = calltrace::ColorSource::Method,
                    Key::R => {
                        println!("Rerandomising colors");
                        class_colors.clear();
                        method_colors.clear();

                        let mut rng = thread_rng();
                        for call in &trace.trace {
                            class_colors
                                .entry(call.class.clone())
                                .or_insert_with(|| hsla(rng.gen(), 1.0, 0.6, 1.0));
                            method_colors
                                .entry(call.method.clone())
                                .or_insert_with(|| hsla(rng.gen(), 1.0, 0.6, 1.0));
                        }
                    }
                    _ => (),
                },
                KeyReleased(_key) => {}
                ReceivedCharacter(_char) => {}
                MouseMoved(pos) => {
                    *zoom = (pos.y / app.window_rect().h() + 0.5) * 100.0;
                    *offset = pos.x / app.window_rect().w() + 0.5;
                }
                MousePressed(_button) => {}
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
            },
            NannouTrace::Deepika1 {
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
                            deepika1::ColorSource::Supplier => deepika1::ColorSource::Dependency,
                            deepika1::ColorSource::Dependency => deepika1::ColorSource::Function,
                            deepika1::ColorSource::Function => deepika1::ColorSource::Supplier,
                        }
                    }
                    _ => (),
                },
                KeyReleased(_key) => {}
                ReceivedCharacter(_char) => {}
                MouseMoved(pos) => {
                    *zoom = (pos.y / app.window_rect().h() + 0.5) * 2000.0;
                    *offset = pos.x / app.window_rect().w() + 0.5;
                }
                MousePressed(_button) => {}
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
            },
        }
    }
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

    let deepika1_trace = NannouTrace::from_deepika1(deepika1::Deepika1::new());
    let calltrace = NannouTrace::from_calltrace(calltrace::Calltrace::new());
    let traces = vec![deepika1_trace, calltrace];

    let m = Model {
        traces,
        trace_to_show: 0,
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
    model.traces[model.trace_to_show].draw(&draw, win);

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
