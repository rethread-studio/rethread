use std::{collections::HashMap, fs, hash::Hash};

use nannou::{
    prelude::*,
    rand::{thread_rng, Rng},
};
use serde::{Deserialize, Serialize};

mod calltrace {
    use nom::branch::alt;
    use nom::bytes::complete::{is_a, is_not};
    use nom::character::complete::{char, one_of};
    use nom::combinator::recognize;
    use nom::error::Error;
    use nom::multi::{many0, many1};
    use nom::sequence::{delimited, terminated};
    use nom::{
        bytes::complete::{tag, take, take_while_m_n},
        combinator::map_res,
        sequence::tuple,
        IResult,
    };
    #[derive(Debug)]
    pub enum Direction {
        In,
        Out,
    }
    #[derive(Debug)]
    pub struct Call {
        pub direction: Direction,
        pub call_depth: u32,
        pub thread_id: u32,
        pub class: String,
        pub method: String,
        pub timestamp: u64,
    }
    fn direction(input: &str) -> IResult<&str, &str> {
        alt((tag("<"), tag(">")))(input)
    }
    fn decimal_then_bracket(input: &str) -> IResult<&str, &str> {
        // recognize(many1(terminated(one_of("0123456789"), many0(char(']')))))(input)
        terminated(is_a("0123456789"), tag("]"))(input)
    }
    fn from_decimal(input: &str) -> Result<u32, std::num::ParseIntError> {
        u32::from_str_radix(input, 10)
    }
    fn from_decimal_u64(input: &str) -> Result<u64, std::num::ParseIntError> {
        u64::from_str_radix(input, 10)
    }
    fn parse_decimal_then_bracket(input: &str) -> IResult<&str, u32> {
        map_res(decimal_then_bracket, from_decimal)(input)
    }
    pub fn parse_call_trace_line(data: &str) -> IResult<&str, Call> {
        let (input, dir) = direction(data)?;
        let direction = if dir == "<" {
            Direction::Out
        } else {
            Direction::In
        };
        let (input, _) = tag("[")(input)?;
        let (input, call_depth) = parse_decimal_then_bracket(input)?;
        let (input, _) = tag("[")(input)?;
        let (input, thread_id) = parse_decimal_then_bracket(input)?;
        let (input, class) = terminated(is_not(":"), tag(":"))(input)?;
        let (input, method) = terminated(is_not("="), tag("="))(input)?;
        let (input, timestamp) = map_res(is_a("0123456789"), from_decimal_u64)(input)?;
        Ok((
            input,
            Call {
                direction,
                call_depth,
                thread_id,
                class: class.to_owned(),
                method: method.to_owned(),
                timestamp,
            },
        ))
    }
}

// #[derive(Serialize, Deserialize, Debug)]
// struct Function {
//     fqn: String,
//     supplier: String,
//     dependency: String,
// }
// #[derive(Serialize, Deserialize, Debug)]
// struct Call {
//     callee: Function,
//     caller: Function,
//     timestamp: u64,
// }

fn main() {
    nannou::app(model)
        .event(event)
        .update(update)
        .view(view)
        .run();
}

#[derive(Debug)]
struct Model {
    trace: Vec<calltrace::Call>,
    max_depth: u32,
    zoom: f32,
    offset: f32,
    class_colors: HashMap<String, Hsla>,
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

    // let data = fs::read_to_string("/home/erik/Hämtningar/data-pdfbox-new-format.json").unwrap();
    // let trace: Vec<Call> = serde_json::from_str(&data).unwrap();
    // println!("num calls: {}", trace.len());

    let data =
        fs::read_to_string("/home/erik/Hämtningar/nwl2022/minvert-calltrace.txt.txt").unwrap();
    let mut trace = vec![];
    for line in data.lines() {
        trace.push(calltrace::parse_call_trace_line(line).unwrap().1);
    }
    println!("num calls: {}", trace.len());

    let mut max_depth = 0;
    let mut class_colors = HashMap::new();
    let mut rng = thread_rng();
    for call in &trace {
        if call.call_depth > max_depth {
            max_depth = call.call_depth;
        }
        class_colors
            .entry(call.class.clone())
            .or_insert_with(|| hsla(rng.gen(), 1.0, 0.6, 1.0));
    }

    let m = Model {
        trace,
        max_depth,
        zoom: 1.0,
        offset: 0.0,
        class_colors,
    };
    println!("model: {m:?}");
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

    let zoom_x = 10.;
    let zoom_x = model.zoom;

    let win = app.window_rect();
    let call_w = win.w() / model.trace.len() as f32 * zoom_x;
    // let offset_x =
    //     (app.elapsed_frames() as f32 / 500.0) % 1.0 * call_w * model.trace.len() as f32 - win.w();
    let offset_x = model.offset * call_w * model.trace.len() as f32 - win.w();
    let mut y = win.bottom() + win.h() * 0.02;
    let depth_height = (win.h() / model.max_depth as f32) * 0.5;

    if true {
        let mut lines = vec![];
        for (i, call) in model.trace.iter().enumerate() {
            let color = model.class_colors.get(&call.class).unwrap().clone();
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
        for (i, call) in model.trace.iter().enumerate() {
            lines.push(pt2(
                win.left() + i as f32 * call_w - offset_x,
                y + depth_height * call.call_depth as f32,
            ));
        }
        draw.polyline()
            .color(hsla(0.0, 1.0, 0.7, 0.8))
            .points(lines);
    }

    draw.to_frame(app, &frame).unwrap();
}

fn window_event(app: &App, model: &mut Model, event: WindowEvent) {
    match event {
        KeyPressed(_key) => {}
        KeyReleased(_key) => {}
        ReceivedCharacter(_char) => {}
        MouseMoved(pos) => {
            model.zoom = (pos.y / app.window_rect().h() + 0.5) * 100.0;
            model.offset = pos.x / app.window_rect().w() + 0.5;
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
