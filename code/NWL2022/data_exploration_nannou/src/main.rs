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
    method_colors: HashMap<String, Hsla>,
    color_source: ColorSource,
}

#[derive(Debug)]
enum ColorSource {
    Method,
    Class,
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
    let mut method_colors = HashMap::new();
    let mut rng = thread_rng();
    for call in &trace {
        if call.call_depth > max_depth {
            max_depth = call.call_depth;
        }
        class_colors
            .entry(call.class.clone())
            .or_insert_with(|| hsla(rng.gen(), 1.0, 0.6, 1.0));
        method_colors
            .entry(call.method.clone())
            .or_insert_with(|| hsla(rng.gen(), 1.0, 0.6, 1.0));
    }

    let m = Model {
        trace,
        max_depth,
        zoom: 1.0,
        offset: 0.0,
        class_colors,
        method_colors,
        color_source: ColorSource::Class,
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
            let color = match model.color_source {
                ColorSource::Method => model.method_colors.get(&call.method).unwrap().clone(),
                ColorSource::Class => model.class_colors.get(&call.class).unwrap().clone(),
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
        KeyPressed(key) => match key {
            Key::Key1 => todo!(),
            Key::Key2 => todo!(),
            Key::Key3 => todo!(),
            Key::Key4 => todo!(),
            Key::Key5 => todo!(),
            Key::Key6 => todo!(),
            Key::Key7 => todo!(),
            Key::Key8 => todo!(),
            Key::Key9 => todo!(),
            Key::Key0 => todo!(),
            Key::A => todo!(),
            Key::B => todo!(),
            Key::C => model.color_source = ColorSource::Class,
            Key::D => todo!(),
            Key::E => todo!(),
            Key::F => todo!(),
            Key::G => todo!(),
            Key::H => todo!(),
            Key::I => todo!(),
            Key::J => todo!(),
            Key::K => todo!(),
            Key::L => todo!(),
            Key::M => model.color_source = ColorSource::Method,
            Key::N => todo!(),
            Key::O => todo!(),
            Key::P => todo!(),
            Key::Q => todo!(),
            Key::R => {
                println!("Rerandomising colors");
                model.class_colors.clear();
                model.method_colors.clear();

                let mut rng = thread_rng();
                for call in &model.trace {
                    model
                        .class_colors
                        .entry(call.class.clone())
                        .or_insert_with(|| hsla(rng.gen(), 1.0, 0.6, 1.0));
                    model
                        .method_colors
                        .entry(call.method.clone())
                        .or_insert_with(|| hsla(rng.gen(), 1.0, 0.6, 1.0));
                }
            }
            Key::S => todo!(),
            Key::T => todo!(),
            Key::U => todo!(),
            Key::V => todo!(),
            Key::W => todo!(),
            Key::X => todo!(),
            Key::Y => todo!(),
            Key::Z => todo!(),
            Key::Escape => todo!(),
            Key::F1 => todo!(),
            Key::F2 => todo!(),
            Key::F3 => todo!(),
            Key::F4 => todo!(),
            Key::F5 => todo!(),
            Key::F6 => todo!(),
            Key::F7 => todo!(),
            Key::F8 => todo!(),
            Key::F9 => todo!(),
            Key::F10 => todo!(),
            Key::F11 => todo!(),
            Key::F12 => todo!(),
            Key::F13 => todo!(),
            Key::F14 => todo!(),
            Key::F15 => todo!(),
            Key::F16 => todo!(),
            Key::F17 => todo!(),
            Key::F18 => todo!(),
            Key::F19 => todo!(),
            Key::F20 => todo!(),
            Key::F21 => todo!(),
            Key::F22 => todo!(),
            Key::F23 => todo!(),
            Key::F24 => todo!(),
            Key::Snapshot => todo!(),
            Key::Scroll => todo!(),
            Key::Pause => todo!(),
            Key::Insert => todo!(),
            Key::Home => todo!(),
            Key::Delete => todo!(),
            Key::End => todo!(),
            Key::PageDown => todo!(),
            Key::PageUp => todo!(),
            Key::Left => todo!(),
            Key::Up => todo!(),
            Key::Right => todo!(),
            Key::Down => todo!(),
            Key::Back => todo!(),
            Key::Return => todo!(),
            Key::Space => todo!(),
            Key::Compose => todo!(),
            Key::Caret => todo!(),
            Key::Numlock => todo!(),
            Key::Numpad0 => todo!(),
            Key::Numpad1 => todo!(),
            Key::Numpad2 => todo!(),
            Key::Numpad3 => todo!(),
            Key::Numpad4 => todo!(),
            Key::Numpad5 => todo!(),
            Key::Numpad6 => todo!(),
            Key::Numpad7 => todo!(),
            Key::Numpad8 => todo!(),
            Key::Numpad9 => todo!(),
            Key::NumpadAdd => todo!(),
            Key::NumpadDivide => todo!(),
            Key::NumpadDecimal => todo!(),
            Key::NumpadComma => todo!(),
            Key::NumpadEnter => todo!(),
            Key::NumpadEquals => todo!(),
            Key::NumpadMultiply => todo!(),
            Key::NumpadSubtract => todo!(),
            Key::AbntC1 => todo!(),
            Key::AbntC2 => todo!(),
            Key::Apostrophe => todo!(),
            Key::Apps => todo!(),
            Key::Asterisk => todo!(),
            Key::At => todo!(),
            Key::Ax => todo!(),
            Key::Backslash => todo!(),
            Key::Calculator => todo!(),
            Key::Capital => todo!(),
            Key::Colon => todo!(),
            Key::Comma => todo!(),
            Key::Convert => todo!(),
            Key::Equals => todo!(),
            Key::Grave => todo!(),
            Key::Kana => todo!(),
            Key::Kanji => todo!(),
            Key::LAlt => todo!(),
            Key::LBracket => todo!(),
            Key::LControl => todo!(),
            Key::LShift => todo!(),
            Key::LWin => todo!(),
            Key::Mail => todo!(),
            Key::MediaSelect => todo!(),
            Key::MediaStop => todo!(),
            Key::Minus => todo!(),
            Key::Mute => todo!(),
            Key::MyComputer => todo!(),
            Key::NavigateForward => todo!(),
            Key::NavigateBackward => todo!(),
            Key::NextTrack => todo!(),
            Key::NoConvert => todo!(),
            Key::OEM102 => todo!(),
            Key::Period => todo!(),
            Key::PlayPause => todo!(),
            Key::Plus => todo!(),
            Key::Power => todo!(),
            Key::PrevTrack => todo!(),
            Key::RAlt => todo!(),
            Key::RBracket => todo!(),
            Key::RControl => todo!(),
            Key::RShift => todo!(),
            Key::RWin => todo!(),
            Key::Semicolon => todo!(),
            Key::Slash => todo!(),
            Key::Sleep => todo!(),
            Key::Stop => todo!(),
            Key::Sysrq => todo!(),
            Key::Tab => todo!(),
            Key::Underline => todo!(),
            Key::Unlabeled => todo!(),
            Key::VolumeDown => todo!(),
            Key::VolumeUp => todo!(),
            Key::Wake => todo!(),
            Key::WebBack => todo!(),
            Key::WebFavorites => todo!(),
            Key::WebForward => todo!(),
            Key::WebHome => todo!(),
            Key::WebRefresh => todo!(),
            Key::WebSearch => todo!(),
            Key::WebStop => todo!(),
            Key::Yen => todo!(),
            Key::Copy => todo!(),
            Key::Paste => todo!(),
            Key::Cut => todo!(),
        },
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
