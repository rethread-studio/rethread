use nannou::prelude::*;
use std::fs;
mod profile;
use profile::{Profile, TreeNode};

fn main() {
    nannou::app(model).update(update).run();
}

struct Model {
    profiles: Vec<Profile>,
    depth_trees: Vec<Vec<TreeNode>>,
    index: usize,
    separation_ratio: f32,
}

fn model(app: &App) -> Model {
    let _window = app
        .new_window()
        .view(view)
        .event(window_event)
        .build()
        .unwrap();

    let mut profiles = vec![];
    let paths = [
        "/home/erik/code/kth/request-bot-files/20200124/bing01-12-2020_16_06/profile.json",
        "/home/erik/code/kth/request-bot-files/20200124/bing01-13-2020_11_45/profile.json",
        "/home/erik/code/kth/request-bot-files/20200124/bing01-14-2020_15_32/profile.json",
        "/home/erik/code/kth/request-bot-files/20200124/bing01-15-2020_14_00/profile.json",
        "/home/erik/code/kth/request-bot-files/20200124/bing01-16-2020_13_34/profile.json",
        "/home/erik/code/kth/request-bot-files/20200124/bing01-17-2020_14_10/profile.json",
        "/home/erik/code/kth/request-bot-files/20200124/bing01-19-2020_20_01/profile.json",
    ];
    for p in &paths {
        let mut data = fs::read_to_string(p).unwrap();
        let profile: Profile = serde_json::from_str(&data).unwrap();
        profiles.push(profile);
    }

    let mut depth_trees = vec![];
    for profile in &profiles {
        depth_trees.push(profile.generate_depth_tree());
    }

    Model {
        profiles,
        depth_trees,
        index: 0,
        separation_ratio: 1.0,
    }
}

fn update(_app: &App, model: &mut Model, _update: Update) {
    model.index += 1;
}

fn view(app: &App, model: &Model, frame: Frame) {
    // Prepare to draw.
    let draw = app.draw();

    // Clear the background to purple.
    draw.background().color(WHITE);

    let win = app.window_rect();

    const x_scale: f32 = 4.0;
    const y_scale: f32 = 2.0;

    let tree_separation = win.w() / (model.depth_trees.len()) as f32;

    for i in 0..model.index {
        let y = win.top() - (i as f32 * y_scale);
        for (index, d_tree) in model.depth_trees.iter().enumerate() {
            if i < d_tree.len() {
                let x = win.left()
                    + (d_tree[i].depth as f32 * x_scale
                        + (index as f32 * tree_separation * model.separation_ratio));
                // let col = hsla(index as f32 * 0.038573, 0.7, 0.3, 1.0);
                let col = hsl(d_tree[i].script_id as f32 * 0.0426, 0.8, 0.4);
                draw.rect().color(col).x_y(x, y).w_h(x_scale, y_scale);
            }
        }
    }

    // Write to the window frame.
    draw.to_frame(app, &frame).unwrap();
}

fn window_event(app: &App, model: &mut Model, event: WindowEvent) {
    match event {
        KeyPressed(_key) => {}
        KeyReleased(_key) => {}
        MouseMoved(pos) => {
            model.separation_ratio = (pos.x + app.window_rect().w() / 2.0) / app.window_rect().w();
        }
        MousePressed(_button) => {
            model.index = 0;
        }
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
