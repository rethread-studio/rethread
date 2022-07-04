use anyhow::{Context, Result};
use nannou::prelude::*;

fn main() {
    nannou::app(model).update(update).view(view).run();
}

struct FtraceEvent {
    task_name: String,
    pid: u32,
    cpu: u8,
    timestamp: f64,
    function: String,
}

struct Model {
    ftrace: Vec<FtraceEvent>,
    timestamp_width: f64,
    position: f32,
    zoom_level: f64,
}

fn model(app: &App) -> Model {
    app.new_window()
        .size(720, 720)
        .key_pressed(key_pressed)
        .mouse_wheel(mouse_wheel)
        .build()
        .unwrap();
    // Read file containing ftrace data
    //
    let mut assets_path = app.assets_path().unwrap();
    assets_path.push("ftrace_trace_test3.txt");
    let raw_ftrace_data = std::fs::read_to_string(assets_path).unwrap();
    let mut ftrace = Vec::new();
    for (i, line) in raw_ftrace_data.lines().enumerate() {
        if line.len() > 43 {
            match parse_line(line, i) {
                Ok(ftrace_event) => ftrace.push(ftrace_event),
                Err(e) => eprintln!("Failed to parse: {e}"),
            }
        }
    }
    let first_timestamp = ftrace[0].timestamp;
    for event in &mut ftrace {
        event.timestamp -= first_timestamp;
    }
    let timestamp_width = ftrace.last().unwrap().timestamp;
    println!(
        "first_timestamp: {first_timestamp}, timestamp_width: {timestamp_width}, num_events: {}",
        ftrace.len()
    );

    Model {
        ftrace,
        position: timestamp_width as f32 * 0.5,
        timestamp_width,
        zoom_level: 1.0,
    }
}

fn update(_app: &App, _model: &mut Model, _update: Update) {}

fn view(app: &App, model: &Model, frame: Frame) {
    // Prepare to draw.
    let draw = app.draw();

    // Clear the background to purple.
    draw.background().color(BLACK);

    let win = app.window_rect();

    let mut current_event = 0;
    // let zoom_levels = vec![
    //     model.zoom_level,
    //     model.zoom_level * 1.5,
    //     model.zoom_level * 2.0,
    //     model.zoom_level * 3.0,
    // ];
    let zoom_levels = (0..7)
        .into_iter()
        .map(|i| model.zoom_level * 2.0.powi(i))
        .collect::<Vec<_>>();

    let status_bar_height = win.h() * 0.1;
    let height = (win.h() - status_bar_height) / zoom_levels.len() as f32;
    let half_width = win.w() * 0.5;
    for (i, zoom) in zoom_levels.into_iter().enumerate() {
        let mut activity_per_pixel = vec![0; win.w() as usize + 1];
        let y_offset = win.top() - height * (i as f32 + 0.5);

        // let mut points = vec![];
        for (k, event) in model.ftrace.iter().enumerate() {
            // let x = ((((event.timestamp / model.timestamp_width) - 0.5) as f32 + model.position)
            //     * win.w()
            //     * zoom as f32)
            //     - half_width;
            // let y = ((event.cpu as f32 / 8.0) - 0.5) * 0.9 * height + y_offset;
            let x_index = (((event.timestamp / model.timestamp_width) as f32 - model.position)
                * win.w()
                * zoom as f32)
                + half_width;
            if x_index > 0.0 && x_index < win.w() {
                // activity_per_pixel[x_index as usize] += 1;
                activity_per_pixel[x_index as usize] = 1 + event.cpu;
            }
            // points.push((pt2(x, y), WHITE));

            if current_event == 0 && event.timestamp > model.position as f64 {
                current_event = k;
            }
        }
        let max_activity = *activity_per_pixel.iter().max().unwrap() as f32;
        let activity_points = activity_per_pixel
            .into_iter()
            .enumerate()
            .map(|(i, activity)| {
                (
                    pt2(
                        i as f32 - (win.w() * 0.5),
                        ((activity as f32 / max_activity).powf(0.25) - 0.5) * 0.5 * height
                            + y_offset,
                    ),
                    WHITE,
                )
            })
            .collect::<Vec<_>>();

        // draw.polyline().points_colored(points);
        // draw.polyline().points_colored(activity_points);
        for (coordinates, col) in activity_points {
            draw.ellipse()
                .xy(coordinates)
                .color(rgba(1., 1., 1., 1.0))
                .w_h(1.0, 1.0);
        }
        let line_y = win.top() - height * (i as f32 + 1.);
        draw.line()
            .points(pt2(win.left(), line_y), pt2(win.right(), line_y))
            .stroke_weight(1.0)
            // .color(rgba(0.2, 0.2, 0.2, 1.0));
            .color(rgba(1.0, 0.2, 0.2, 1.0));
    }

    let time_to_next =
        (model.ftrace[current_event + 1].timestamp - model.position as f64) * 170000.;
    let time_text = if time_to_next < 1.0 {
        format!("{} ms", (time_to_next * 1000.).floor())
    } else if time_to_next < 60.0 {
        format!("{:.2} s", (time_to_next))
    } else if time_to_next < 3600.0 {
        format!("{:.2} min", (time_to_next / 60.0))
    } else {
        format!("{:.2} h", time_to_next / 3600.)
    };

    draw.line()
        .points(pt2(0., win.h() * -0.5), pt2(0., win.h() * 0.5))
        .color(RED)
        .stroke_weight(3.0);

    draw.text(&format!("NEXT EVENT: {time_text}"))
        .color(WHITE)
        .font_size(26)
        .x_y(20.0, win.bottom() + 40.)
        .left_justify()
        .w_h(win.w(), 100.);

    let page = current_event / 300;

    draw.text(&format!("PAGE: {page}"))
        .color(WHITE)
        .font_size(26)
        .x_y(win.w() - 200., win.bottom() + 40.)
        .left_justify()
        .w_h(win.w(), 100.);

    // Write to the window frame.
    draw.to_frame(app, &frame).unwrap();
}

fn key_pressed(_app: &App, model: &mut Model, key: Key) {
    match key {
        Key::Left => model.position -= ((1.0 / model.zoom_level) * 0.01) as f32,
        Key::Right => model.position += ((1.0 / model.zoom_level) * 0.01) as f32,
        _ => (),
    }
}

fn mouse_wheel(_app: &App, model: &mut Model, dt: MouseScrollDelta, _phase: TouchPhase) {
    match dt {
        MouseScrollDelta::LineDelta(_, y) => model.zoom_level += y as f64,
        MouseScrollDelta::PixelDelta(px) => model.zoom_level += px.y * 0.01,
    }
}

// TODO: The amount of whitespace seems to be variable between systems. Find a more clever way of parsing this
fn parse_line(line: &str, line_number: usize) -> Result<FtraceEvent> {
    let process = &line[0..16];
    // pid can be 5 or 6 characters on my system
    let pid_str = &line[17..23];
    let pid_offset = if line[23..24].eq(" ") {
        6
    } else if line[23..24].eq("[") {
        5
    } else {
        panic!("Wrong pid index");
    };
    let cpu_str = &line[20 + pid_offset..22 + pid_offset];
    let irq = &line[25 + pid_offset..29 + pid_offset];
    let timestamp = &line[30 + pid_offset..41 + pid_offset];
    // shave of last : of timestamp
    // timestamp = &timestamp[..timestamp.len()-1];
    // println!("ts: {}, line: {}", timestamp, line);
    let timestamp_float = timestamp.parse::<f64>().unwrap();
    let event = &line[43 + pid_offset..line.len()];
    // Ignore the whitespace after the number by taking the first element in the string split by whitespace, e.g. Some("4827"), and unwrap
    let pid = pid_str
        .split_ascii_whitespace()
        .next()
        .unwrap()
        .parse::<u32>()
        .with_context(|| {
            format!(
                "Pid string wrong: {}, line: {}, process: {}, line: {line_number}",
                pid_str, line, process
            )
        })?;
    let cpu = cpu_str
        .parse::<u8>()
        .with_context(|| format!("cpu string wrong: {}, line: {line_number}", cpu_str))?;
    // let timestamp_int = (timestamp_float) * 1000000.0;
    Ok(FtraceEvent {
        task_name: process.to_owned(),
        pid,
        cpu,
        timestamp: timestamp_float,
        function: event.to_owned(),
    })
}
