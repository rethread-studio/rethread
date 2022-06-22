use anyhow::{Context, Result};
use nannou::prelude::*;

fn main() {
    nannou::app(model).update(update).simple_window(view).run();
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
}

fn model(app: &App) -> Model {
    // Read file containing ftrace data
    //
    let mut assets_path = app.assets_path().unwrap();
    assets_path.push("ftrace_trace_test2.txt");
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
        timestamp_width,
    }
}

fn update(_app: &App, _model: &mut Model, _update: Update) {}

fn view(app: &App, model: &Model, frame: Frame) {
    // Prepare to draw.
    let draw = app.draw();

    // Clear the background to purple.
    draw.background().color(WHITE);

    let win = app.window_rect();

    let mut activity_per_pixel = vec![0; win.w() as usize + 1];

    let mut points = vec![];
    for event in &model.ftrace {
        let x = ((event.timestamp / model.timestamp_width) - 0.5) as f32 * win.w();
        let y = ((event.cpu as f32 / 8.0) - 0.5) * 0.8 * win.h();
        let y = 0.0;
        let x_index = (event.timestamp / model.timestamp_width) as f32 * win.w();
        activity_per_pixel[x_index as usize] += 1;
        points.push((pt2(x, y), BLACK));
    }
    let max_activity = *activity_per_pixel.iter().max().unwrap() as f32;
    let activity_points = activity_per_pixel
        .into_iter()
        .enumerate()
        .map(|(i, activity)| {
            (
                pt2(
                    i as f32 - (win.w() * 0.5),
                    ((activity as f32 / max_activity).powf(0.125) - 0.5) * 0.8 * win.h(),
                ),
                BLUE,
            )
        })
        .collect::<Vec<_>>();

    // draw.polyline().points_colored(points);
    draw.polyline().points_colored(activity_points);

    // Write to the window frame.
    draw.to_frame(app, &frame).unwrap();
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
