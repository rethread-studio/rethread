use chrono::{DateTime, Utc};
use nannou::prelude::*;
use nannou_osc as osc;
use std::{convert::TryInto, fs};
mod profile;
use profile::{GraphData, Profile, TreeNode};

fn main() {
    nannou::app(model).update(update).run();
}

enum ColorMode {
    Script,
    Profile,
    Selected,
}

enum DrawMode {
    Vertical,
    Polar,
    Horizontal,
    FlowerGrid,
}

struct Model {
    profile_group: usize,
    profiles: Vec<Profile>,
    selected_profile: usize,
    graph_datas: Vec<GraphData>,
    deepest_tree_depth: u32,
    longest_tree: u32,
    index: usize,
    separation_ratio: f32,
    num_profiles: u32,
    draw_mode: DrawMode,
    color_mode: ColorMode,
    sender: osc::Sender<osc::Connected>,
}

fn model(app: &App) -> Model {
    let _window = app
        .new_window()
        .view(view)
        .event(window_event)
        .size(1920, 1080)
        .build()
        .unwrap();

    // Set up osc sender
    let port = 57120;
    let target_addr = format!("{}:{}", "127.0.0.1", port);

    let sender = osc::sender()
        .expect("Could not bind to default socket")
        .connect(target_addr)
        .expect("Could not connect to socket at address");

    let mut model = Model {
        profile_group: 0,
        profiles: vec![],
        graph_datas: vec![],
        deepest_tree_depth: 0,
        longest_tree: 0,
        index: 0,
        separation_ratio: 1.0,
        num_profiles: 7,
        draw_mode: DrawMode::Polar,
        color_mode: ColorMode::Profile,
        sender,
        selected_profile: 0,
    };

    load_profiles(&mut model);
    model
}

fn load_profiles(model: &mut Model) {
    let mut profiles = vec![];
    let root_path = "/home/erik/code/kth/request-bot-files/20200124/";
    let path_groups = [
        vec![
            "bing01-12-2020_16_06/",
            "bing01-13-2020_11_45/",
            "bing01-14-2020_15_32/",
            "bing01-15-2020_14_00/",
            "bing01-16-2020_13_34/",
            "bing01-17-2020_14_10/",
            "bing01-19-2020_20_01/",
        ],
        vec![
            "duckduck01-12-2020_16_06/",
            "duckduck01-13-2020_11_45/",
            "duckduck01-14-2020_15_32/",
            "duckduck01-15-2020_14_00/",
            "duckduck01-16-2020_13_34/",
            "duckduck01-17-2020_14_10/",
            "duckduck01-19-2020_20_01/",
        ],
        vec![
            "google01-12-2020_15_42/",
            "google01-12-2020_16_06/",
            "google01-13-2020_11_45/",
            "google01-14-2020_15_32/",
            "google01-15-2020_14_00/",
            "google01-16-2020_13_34/",
            "google01-17-2020_14_10/",
            "google01-19-2020_20_01/",
        ],
        vec![
            "wikipedia01-12-2020_16_06/",
            "wikipedia01-14-2020_15_32/",
            "wikipedia01-13-2020_11_45/",
            "wikipedia01-15-2020_14_00/",
            "wikipedia01-16-2020_13_34/",
            "wikipedia01-17-2020_14_10/",
            "wikipedia01-19-2020_20_01/",
        ],
        vec![
            "yahoo01-12-2020_16_06/",
            "yahoo01-13-2020_11_45/",
            "yahoo01-14-2020_15_32/",
            "yahoo01-15-2020_14_00/",
            "yahoo01-16-2020_13_34/",
            "yahoo01-17-2020_14_10/",
            "yahoo01-19-2020_20_01/",
        ],
    ];

    while model.profile_group >= path_groups.len() {
        model.profile_group -= path_groups.len()
    }

    for p in &path_groups[model.profile_group] {
        let full_path = format!("{}{}profile.json", root_path, p);
        let data = fs::read_to_string(full_path).unwrap();
        let profile: Profile = serde_json::from_str(&data).unwrap();
        profiles.push(profile);
    }

    let mut graph_datas = vec![];
    for profile in &profiles {
        graph_datas.push(profile.generate_graph_data());
    }

    let mut deepest_tree_depth = 0;
    let mut longest_tree = 0;
    for gd in &graph_datas {
        if gd.depth_tree.len() > longest_tree {
            longest_tree = gd.depth_tree.len();
        }
        for node in &gd.depth_tree {
            if node.depth > deepest_tree_depth {
                deepest_tree_depth = node.depth;
            }
        }
    }

    model.num_profiles = profiles.len().try_into().unwrap();
    model.profiles = profiles;
    model.graph_datas = graph_datas;
    model.longest_tree = longest_tree.try_into().unwrap();
    model.deepest_tree_depth = deepest_tree_depth.try_into().unwrap();
}

fn update(_app: &App, model: &mut Model, _update: Update) {
    model.index += 10;
}

fn view(app: &App, model: &Model, frame: Frame) {
    // Prepare to draw.
    let draw = app.draw();

    // Clear the background to purple.
    draw.background().color(hsl(0.6, 0.1, 0.05));

    let win = app.window_rect();

    match model.draw_mode {
        DrawMode::Polar => {
            let angle_scale: f32 = PI * 2.0 / model.longest_tree as f32;
            let radius_scale: f32 = win.h()
                / ((model.deepest_tree_depth + 1) as f32
                    * (((model.num_profiles - 1) as f32 * model.separation_ratio) + 1.0)
                    * 2.0);
            let tree_separation = radius_scale * model.deepest_tree_depth as f32;
            for i in 0..model.index {
                let angle = i as f32 * angle_scale;
                for (index, gd) in model.graph_datas.iter().enumerate() {
                    let d_tree = &gd.depth_tree;
                    if i < d_tree.len() && index < model.num_profiles as usize {
                        let start_radius = d_tree[i].depth as f32 * radius_scale
                            + (index as f32 * tree_separation * model.separation_ratio);
                        let radius = (d_tree[i].depth + 1) as f32 * radius_scale
                            + (index as f32 * tree_separation * model.separation_ratio);
                        let col = match model.color_mode {
                            ColorMode::Script => script_color(d_tree[i].script_id as f32),
                            ColorMode::Profile => profile_color(index as f32),
                            ColorMode::Selected => selected_color(index, model.selected_profile),
                        };
                        let weight = d_tree[i].ticks as f32;
                        let weight = weight;
                        let start = pt2(angle.cos() * start_radius, angle.sin() * start_radius);
                        let end = pt2(angle.cos() * radius, angle.sin() * radius);
                        // Draw a transparent circle representing the time spent
                        let mut transparent_col = col.clone();
                        transparent_col.alpha = 0.01 * weight;
                        draw.ellipse()
                            .radius(weight.max(0.0))
                            .xy(start)
                            .stroke_weight(0.0)
                            .color(transparent_col);
                        // Draw the line representing the function call
                        draw.line()
                            .stroke_weight(1.0)
                            .start(start)
                            .end(end)
                            .color(col);
                    }
                }
            }
        }
        DrawMode::FlowerGrid => {
            let angle_scale: f32 = PI * 2.0 / model.longest_tree as f32;
            let radius_scale: f32 = win.h() / ((model.deepest_tree_depth + 1) as f32 * 4.0);
            for (index, gd) in model.graph_datas.iter().enumerate() {
                let d_tree = &gd.depth_tree;
                let offset_angle = (index as f32 / model.num_profiles as f32) * PI * 2.0;
                let offset_radius = match index {
                    0 => 0.0,
                    _ => radius_scale * model.deepest_tree_depth as f32 * 1.5,
                };
                let offset = pt2(
                    offset_angle.cos() * offset_radius,
                    offset_angle.sin() * offset_radius,
                );
                for i in 0..model.index {
                    let angle = i as f32 * angle_scale;
                    if i < d_tree.len() && index < model.num_profiles as usize {
                        let start_radius = d_tree[i].depth as f32 * radius_scale;
                        let radius = (d_tree[i].depth + 1) as f32 * radius_scale;
                        let col = match model.color_mode {
                            ColorMode::Script => script_color(d_tree[i].script_id as f32),
                            ColorMode::Profile => profile_color(index as f32),
                            ColorMode::Selected => selected_color(index, model.selected_profile),
                        };
                        let weight = d_tree[i].ticks as f32;
                        let weight = weight.max(0.0);

                        let start =
                            pt2(angle.cos() * start_radius, angle.sin() * start_radius) + offset;
                        let end = pt2(angle.cos() * radius, angle.sin() * radius) + offset;
                        // Draw a transparent circle representing the time spent
                        let mut transparent_col = col.clone();
                        transparent_col.alpha = 0.01 * weight;
                        draw.ellipse()
                            .radius(weight)
                            .stroke_weight(0.0)
                            .xy(start)
                            .color(transparent_col);
                        // Draw the line representing the function call
                        draw.line()
                            .stroke_weight(1.0)
                            .start(start)
                            .end(end)
                            .color(col);
                    }
                }
            }
        }
        DrawMode::Vertical => {
            let x_scale: f32 = win.w()
                / ((model.num_profiles as f32 * model.separation_ratio + 1.0)
                    * model.deepest_tree_depth as f32);
            let y_scale: f32 = win.h() / model.longest_tree as f32;

            let tree_separation = win.w() / model.num_profiles as f32;
            for i in 0..model.index {
                let y = win.top() - (i as f32 * y_scale);
                for (index, gd) in model.graph_datas.iter().enumerate() {
                    let d_tree = &gd.depth_tree;
                    if i < d_tree.len() && index < model.num_profiles as usize {
                        let x = win.left()
                            + (d_tree[i].depth as f32 * x_scale
                                + (index as f32 * tree_separation * model.separation_ratio));
                        let col = match model.color_mode {
                            ColorMode::Script => script_color(d_tree[i].script_id as f32),
                            ColorMode::Profile => profile_color(index as f32),
                            ColorMode::Selected => selected_color(index, model.selected_profile),
                        };
                        let weight = d_tree[i].ticks as f32;
                        // Draw a transparent circle representing the time spent
                        let mut transparent_col = col.clone();
                        transparent_col.alpha = 0.01 * weight;
                        draw.ellipse()
                            .radius(weight)
                            .stroke_weight(0.0)
                            .xy(pt2(x, y))
                            .color(transparent_col);
                        draw.rect().color(col).x_y(x, y).w_h(x_scale, y_scale);
                    }
                }
            }
        }
        DrawMode::Horizontal => {
            let y_scale: f32 = win.h()
                / ((model.num_profiles as f32 * model.separation_ratio + 1.0)
                    * model.deepest_tree_depth as f32);
            let x_scale: f32 = win.w() / model.longest_tree as f32;

            let tree_separation = win.h() / model.num_profiles as f32;
            for i in 0..model.index {
                let x = win.left() + (i as f32 * x_scale);
                for (index, gd) in model.graph_datas.iter().enumerate() {
                    let d_tree = &gd.depth_tree;
                    if i < d_tree.len() && index < model.num_profiles as usize {
                        let y = win.top()
                            - (d_tree[i].depth as f32 * y_scale
                                + (index as f32 * tree_separation * model.separation_ratio));
                        let col = match model.color_mode {
                            ColorMode::Script => script_color(d_tree[i].script_id as f32),
                            ColorMode::Profile => profile_color(index as f32),
                            ColorMode::Selected => selected_color(index, model.selected_profile),
                        };
                        let weight = d_tree[i].ticks as f32;
                        // Draw a transparent circle representing the time spent
                        let mut transparent_col = col.clone();
                        transparent_col.alpha = 0.01 * weight;
                        draw.ellipse()
                            .radius(weight)
                            .stroke_weight(0.0)
                            .xy(pt2(x, y))
                            .color(transparent_col);
                        draw.rect()
                            .color(col)
                            .x_y(x, y)
                            .w_h(x_scale, (y_scale * 0.5).max(1.0));
                    }
                }
            }
        }
    }

    // Write to the window frame.
    draw.to_frame(app, &frame).unwrap();
}

fn script_color(id: f32) -> Hsla {
    hsla(id as f32 * 0.0226, 0.8, 0.45, 1.0)
}

fn profile_color(index: f32) -> Hsla {
    hsla(index * 0.048573, 0.8, 0.45, 1.0)
}

fn selected_color(index: usize, selected: usize) -> Hsla {
    if index == selected {
        hsla(0.048573, 0.8, 0.45, 1.0)
    } else {
        hsla(0.7, 0.8, 0.45, 1.0)
    }
}

fn window_event(app: &App, model: &mut Model, event: WindowEvent) {
    match event {
        KeyPressed(key) => match key {
            Key::Left => {
                model.draw_mode = match model.draw_mode {
                    DrawMode::Vertical => DrawMode::Polar,
                    DrawMode::Polar => DrawMode::Horizontal,
                    DrawMode::Horizontal => DrawMode::FlowerGrid,
                    DrawMode::FlowerGrid => DrawMode::Vertical,
                }
            }
            Key::Right => {
                model.draw_mode = match model.draw_mode {
                    DrawMode::Vertical => DrawMode::FlowerGrid,
                    DrawMode::Polar => DrawMode::Vertical,
                    DrawMode::Horizontal => DrawMode::Polar,
                    DrawMode::FlowerGrid => DrawMode::Horizontal,
                }
            }
            Key::Up => {
                model.profile_group += 1;
                load_profiles(model);
                model.selected_profile = 0;
            }
            Key::Down => {
                if model.profile_group > 0 {
                    model.profile_group -= 1;
                    load_profiles(model);
                    model.selected_profile = 0;
                }
            }
            Key::A => {
                if model.selected_profile > 0 {
                    model.selected_profile -= 1;
                } else {
                    model.selected_profile = model.graph_datas.len() - 1;
                }
            }
            Key::D => {
                model.selected_profile = (model.selected_profile + 1) % model.graph_datas.len();
            }
            Key::C => {
                model.color_mode = match model.color_mode {
                    ColorMode::Script => ColorMode::Profile,
                    ColorMode::Profile => ColorMode::Selected,
                    ColorMode::Selected => ColorMode::Script,
                }
            }
            Key::S => {
                // Capture the frame!
                let file_path = captured_frame_path(app);
                app.main_window().capture_frame(file_path);
            }
            Key::T => {
                // Send graph data via osc
                model.graph_datas[model.selected_profile].send_script_data_osc(&model.sender);
            }
            _ => (),
        },
        KeyReleased(_key) => {}
        MouseMoved(pos) => {
            model.separation_ratio = (pos.x + app.window_rect().w() / 2.0) / app.window_rect().w();
        }
        MousePressed(button) => match button {
            MouseButton::Left => {
                model.index = 0;
            }
            MouseButton::Right => {
                model.index = 99999;
            }
            _ => (),
        },
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

fn captured_frame_path(app: &App) -> std::path::PathBuf {
    // Create a path that we want to save this frame to.
    let now: DateTime<Utc> = Utc::now();
    app.project_path()
        .expect("failed to locate `project_path`")
        // Capture all frames to a directory called `/<path_to_nannou>/nannou/simple_capture`.
        .join("screencaps")
        // Name each file after the number of the frame.
        .join(format!("{}", now.to_rfc3339()))
        // The extension will be PNG. We also support tiff, bmp, gif, jpeg, webp and some others.
        .with_extension("png")
}
