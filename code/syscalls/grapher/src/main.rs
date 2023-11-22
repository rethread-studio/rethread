use std::collections::HashMap;

use nannou::prelude::*;
use nannou_osc::{receiver, Receiver, Type};

fn main() {
    nannou::app(model).update(update).run();
}

struct Model {
    _window: window::Id,
    graphs: HashMap<String, Vec<usize>>,
    osc_receiver: Receiver,
}

fn model(app: &App) -> Model {
    let _window = app.new_window().view(view).build().unwrap();
    let graphs = HashMap::new();
    let osc_receiver = receiver(7375).unwrap();
    Model {
        _window,
        graphs,
        osc_receiver,
    }
}

fn update(_app: &App, model: &mut Model, _update: Update) {
    let mut current_frame: HashMap<String, usize> = HashMap::new();
    let mut osc_messages = Vec::new();
    while let Ok(Some(mess)) = model.osc_receiver.try_recv() {
        mess.0.unfold(&mut osc_messages);
    }
    for m in osc_messages {
        let kind = m.args.unwrap().into_iter().skip(1).next().unwrap();
        if let Type::String(kind) = kind {
            *(current_frame.entry(kind).or_insert(0)) += 1;
        }
    }
    for (kind, list) in &mut model.graphs {
        if list.len() > 2000 {
            list.remove(0);
        }
        if !current_frame.contains_key(kind) {
            list.push(0);
        }
    }
    for (kind, num) in current_frame {
        model.graphs.entry(kind).or_insert(Vec::new()).push(num);
    }
}

fn view(app: &App, model: &Model, frame: Frame) {
    let draw = app.draw();
    let win = app.window_rect();
    let num_graphs = model.graphs.len();
    let height_per_graph = win.h() / num_graphs as f32;
    for (i, (name, values)) in model.graphs.iter().enumerate() {
        let min = values.iter().min().unwrap();
        let max = values.iter().max().unwrap();
        let width = (max - min) as f32;
        let y_start = win.bottom() + height_per_graph * i as f32;
        let points = values.iter().rev().enumerate().map(|(i, v)| {
            let color = if *v == 0 {
                hsl(0.0, 0.0, 0.0)
            } else {
                hsl(((v - min) as f32 / width) * 0.5, 1.0, 0.5)
            };
            (
                pt2(
                    i as f32 + win.left(),
                    ((v - min) as f32 / width) * height_per_graph * 0.9 + y_start,
                ),
                color,
            )
        });
        draw.polyline().points_colored(points);
        draw.text(&name)
            .color(WHITE)
            .x_y(0.0, y_start + height_per_graph - 10.);
        draw.text(&format!("{min}"))
            .color(WHITE)
            .right_justify()
            .x_y(win.left(), y_start + 10.);
        draw.text(&format!("{max}"))
            .color(WHITE)
            .right_justify()
            .x_y(win.left(), y_start + height_per_graph - 10.);
    }
    draw.background().color(STEELBLUE);
    draw.to_frame(app, &frame).unwrap();
}
