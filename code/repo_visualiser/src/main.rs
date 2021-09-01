use nannou::prelude::*;
use std::fs;
mod commits;
use commits::CommitObject;

fn main() {
    nannou::app(model)
        .update(update)
        .simple_window(view)
        .run();
}

struct Model {}

fn model(app: &App) -> Model {
    // Read file
    let mut filename = app.assets_path().unwrap();
    filename.push("rethread_commits.json");
    let f = fs::read_to_string(filename).expect("couldn't read file");
    let o: Vec<CommitObject> = serde_json::from_str(&f).expect("Failed to parse json");
    println!("num commits: {}", o.len());
    Model {}
}

fn update(_app: &App, _model: &mut Model, _update: Update) {
}

fn view(_app: &App, _model: &Model, frame: Frame){
    frame.clear(PURPLE);
}
