use std::{collections::HashMap, fs, hash::Hash};

use nannou::{
    prelude::*,
    rand::{thread_rng, Rng},
};

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
    use std::{collections::HashMap, fs, hash::Hash};

    use nannou::{
        prelude::*,
        rand::{thread_rng, Rng},
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
    #[derive(Debug)]
    enum ColorSource {
        Method,
        Class,
    }
    #[derive(Debug)]
    pub struct Calltrace {
        trace: Vec<Call>,
        max_depth: u32,
        zoom: f32,
        offset: f32,
        class_colors: HashMap<String, Hsla>,
        method_colors: HashMap<String, Hsla>,
        color_source: ColorSource,
    }
    impl Calltrace {
        pub fn new() -> Self {
            let data =
                fs::read_to_string("/home/erik/Hämtningar/nwl2022/minvert-calltrace.txt.txt")
                    .unwrap();
            let mut trace = vec![];
            for line in data.lines() {
                trace.push(parse_call_trace_line(line).unwrap().1);
            }
            println!("Calltrace!");
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
            Self {
                trace,
                max_depth,
                zoom: 1.0,
                offset: 0.0,
                class_colors,
                method_colors,
                color_source: ColorSource::Class,
            }
        }
        pub fn draw(&self, draw: &Draw, win: Rect) {
            let zoom_x = self.zoom;

            let call_w = win.w() / self.trace.len() as f32 * zoom_x;
            // let offset_x =
            //     (app.elapsed_frames() as f32 / 500.0) % 1.0 * call_w * model.trace.len() as f32 - win.w();
            let offset_x = self.offset * call_w * self.trace.len() as f32 - win.w();
            let mut y = win.bottom() + win.h() * 0.02;
            let depth_height = (win.h() / self.max_depth as f32) * 0.5;

            if true {
                let mut lines = vec![];
                for (i, call) in self.trace.iter().enumerate() {
                    let color = match self.color_source {
                        ColorSource::Method => {
                            self.method_colors.get(&call.method).unwrap().clone()
                        }
                        ColorSource::Class => self.class_colors.get(&call.class).unwrap().clone(),
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
                for (i, call) in self.trace.iter().enumerate() {
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
        pub fn event(&mut self, app: &App, event: WindowEvent) {
            match event {
                KeyPressed(key) => match key {
                    Key::C => self.color_source = ColorSource::Class,
                    Key::M => self.color_source = ColorSource::Method,
                    Key::R => {
                        println!("Rerandomising colors");
                        self.class_colors.clear();
                        self.method_colors.clear();

                        let mut rng = thread_rng();
                        for call in &self.trace {
                            self.class_colors
                                .entry(call.class.clone())
                                .or_insert_with(|| hsla(rng.gen(), 1.0, 0.6, 1.0));
                            self.method_colors
                                .entry(call.method.clone())
                                .or_insert_with(|| hsla(rng.gen(), 1.0, 0.6, 1.0));
                        }
                    }
                    _ => (),
                },
                KeyReleased(_key) => {}
                ReceivedCharacter(_char) => {}
                MouseMoved(pos) => {
                    self.zoom = (pos.y / app.window_rect().h() + 0.5) * 100.0;
                    self.offset = pos.x / app.window_rect().w() + 0.5;
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
    }
}

mod pdfbox {
    use serde::{Deserialize, Serialize};
    use std::fs;

    use nannou::{
        prelude::*,
        rand::{thread_rng, Rng},
    };
    #[derive(Serialize, Deserialize, Debug)]
    pub struct Function {
        fqn: String,
        supplier: String,
        dependency: String,
    }
    #[derive(Serialize, Deserialize, Debug)]
    pub struct Call {
        callee: Function,
        caller: Function,
        timestamp: u64,
    }

    #[derive(Debug)]
    pub struct PDFBoxTrace {
        trace: Vec<Call>,
        depth_graph: Vec<i32>,
        max_depth: i32,
        zoom: f32,
        offset: f32,
    }

    impl PDFBoxTrace {
        pub fn new() -> Self {
            let data =
                fs::read_to_string("/home/erik/Hämtningar/nwl2022/data-pdfbox-new-format.json")
                    .unwrap();
            let trace: Vec<Call> = serde_json::from_str(&data).unwrap();
            let depth_graph_change: Vec<i32> = trace
                .iter()
                .zip(trace.iter().skip(1))
                .map(|(a, b)| {
                    if a.callee.fqn == b.caller.fqn {
                        1
                    } else if a.caller.fqn == b.caller.fqn {
                        0
                    } else {
                        -1
                    }
                })
                .collect();
            let mut depth_graph = vec![];
            let mut level = 0;
            let mut num_ones = 0;
            let mut min_depth = 999999;
            let mut max_depth = 0;
            for change in depth_graph_change {
                if level < min_depth {
                    min_depth = level;
                }
                if level > max_depth {
                    max_depth = level;
                }
                depth_graph.push(level);
                level += change;
                if change == 1 {
                    num_ones += 1;
                }
            }
            let depth_graph = depth_graph.into_iter().map(|a| a - min_depth).collect();
            max_depth -= min_depth;
            println!("PDFBox!");
            // println!("depth_graph: {depth_graph:?}");
            println!("num_ones: {num_ones}");
            println!("max_depth: {max_depth}");
            println!("num_calls: {}", trace.len());

            Self {
                trace,
                depth_graph,
                max_depth,
                zoom: 1.0,
                offset: 0.0,
            }
        }
        pub fn event(&mut self, app: &App, event: WindowEvent) {
            match event {
                KeyPressed(key) => match key {
                    _ => (),
                },
                KeyReleased(_key) => {}
                ReceivedCharacter(_char) => {}
                MouseMoved(pos) => {
                    self.zoom = (pos.y / app.window_rect().h() + 0.5) * 100.0;
                    self.offset = pos.x / app.window_rect().w() + 0.5;
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
        pub fn draw(&self, draw: &Draw, win: Rect) {
            let zoom_x = self.zoom;

            let call_w = win.w() / self.depth_graph.len() as f32 * zoom_x;
            // let offset_x =
            //     (app.elapsed_frames() as f32 / 500.0) % 1.0 * call_w * model.trace.len() as f32 - win.w();
            let offset_x = self.offset * call_w * self.depth_graph.len() as f32 - win.w();
            let mut y = win.bottom() + win.h() * 0.02;
            let depth_height = (win.h() / self.max_depth as f32) * 0.5;

            let mut lines = vec![];
            for (i, depth) in self.depth_graph.iter().enumerate() {
                lines.push(pt2(
                    win.left() + i as f32 * call_w - offset_x,
                    y + depth_height * *depth as f32,
                ));
            }
            draw.polyline()
                .color(hsla(0.0, 1.0, 0.7, 0.8))
                .points(lines);
        }
    }

    impl Default for PDFBoxTrace {
        fn default() -> Self {
            Self::new()
        }
    }
}

#[derive(Debug)]
enum TraceToShow {
    Calltrace,
    PdfBox,
}
impl TraceToShow {
    pub fn next(&self) -> Self {
        match self {
            TraceToShow::Calltrace => TraceToShow::PdfBox,
            TraceToShow::PdfBox => TraceToShow::Calltrace,
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
    calltrace: calltrace::Calltrace,
    pdfbox_trace: pdfbox::PDFBoxTrace,
    trace_to_show: TraceToShow,
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

    let pdfbox_trace = pdfbox::PDFBoxTrace::new();
    let calltrace = calltrace::Calltrace::new();

    let m = Model {
        pdfbox_trace,
        calltrace,
        trace_to_show: TraceToShow::PdfBox,
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
    match model.trace_to_show {
        TraceToShow::Calltrace => model.calltrace.draw(&draw, win),
        TraceToShow::PdfBox => model.pdfbox_trace.draw(&draw, win),
    }

    draw.to_frame(app, &frame).unwrap();
}

fn window_event(app: &App, model: &mut Model, event: WindowEvent) {
    match &event {
        KeyPressed(key) => match key {
            Key::Left => {
                model.trace_to_show = model.trace_to_show.next();
            }
            _ => (),
        },
        _ => (),
    }
    match model.trace_to_show {
        TraceToShow::Calltrace => model.calltrace.event(app, event),
        TraceToShow::PdfBox => model.pdfbox_trace.event(app, event),
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
