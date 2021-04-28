// Turn on clippy lints
#![warn(clippy::all)]
use chrono::{DateTime, Utc};
use crossbeam_channel::bounded;
use nannou::{daggy::petgraph::graph, prelude::*};
use nannou_osc as osc;
use std::{
    convert::TryInto,
    fs,
    path::{Path, PathBuf},
};
mod profile;
use profile::{GraphData, Profile, TraceData, TreeNode};
mod audio_interface;
use audio_interface::*; 
mod spawn_synthesis_nodes;
use spawn_synthesis_nodes::*;
mod draw_functions;

fn main() {
    nannou::app(model).update(update).run();
}

enum ColorMode {
    Script,
    Profile,
    Selected,
}

enum DrawMode {
    VerticalGraphDepth,
    PolarGraphDepth,
    HorizontalGraphDepth,
    FlowerGridGraphDepth,
    FlowerGridIndentation,
    SingleFlowerIndentation,
}

pub struct Model {
    selected_page: usize,
    profiles: Vec<Profile>,
    selected_profile: usize,
    trace_datas: Vec<TraceData>,
    deepest_tree_depth: u32,
    longest_tree: u32,
    deepest_indentation: u32,
    longest_indentation: u32,
    index: usize,
    separation_ratio: f32,
    num_profiles: u32,
    draw_mode: DrawMode,
    color_mode: ColorMode,
    sender: osc::Sender<osc::Connected>,
    audio_interface: audio_interface::AudioInterface,
    font: nannou::text::Font,
}

fn model(app: &App) -> Model {
    let _window = app
        .new_window()
        .view(view)
        .event(window_event)
        .size(1080, 1080)
        .build()
        .unwrap();

    // Set up osc sender
    let port = 57120;
    let target_addr = format!("{}:{}", "127.0.0.1", port);

    let sender = osc::sender()
        .expect("Could not bind to default socket")
        .connect(target_addr)
        .expect("Could not connect to socket at address");

    let mut audio_interface = AudioInterface::new();
    audio_interface.connect_to_system(2);

    audio_interface.send(EventMsg::AddSynthesisNode(Some(
        generate_wave_guide_synthesis_node(220., audio_interface.sample_rate as f32),
    )));
    audio_interface.send(EventMsg::AddSynthesisNode(Some(
        generate_wave_guide_synthesis_node(440., audio_interface.sample_rate as f32),
    )));
    audio_interface.send(EventMsg::AddSynthesisNode(Some(
        generate_wave_guide_synthesis_node(220. * 5. / 4., audio_interface.sample_rate as f32),
    )));
    audio_interface.send(EventMsg::AddSynthesisNode(Some(
        generate_wave_guide_synthesis_node(220. * 7. / 4., audio_interface.sample_rate as f32),
    )));

    let font = nannou::text::font::from_file("/home/erik/.fonts/SpaceMono-Regular.ttf").unwrap();

    let mut model = Model {
        selected_page: 0,
        profiles: vec![],
        trace_datas: vec![],
        deepest_tree_depth: 0,
        longest_tree: 0,
        deepest_indentation: 0,
        longest_indentation: 0,
        index: 0,
        separation_ratio: 1.0,
        num_profiles: 7,
        draw_mode: DrawMode::PolarGraphDepth,
        color_mode: ColorMode::Profile,
        sender,
        selected_profile: 0,
        audio_interface,
        font,
    };

    load_profiles(&mut model);
    model
}

fn load_profiles(model: &mut Model) {
    let mut profiles = vec![];
    let root_path = PathBuf::from("/home/erik/code/kth/web-evolution/");
    let pages = vec![
        "bing",
        "duckduckgo",
        "google",
        "kiddle",
        "qwant",
        "spotify",
        "wikipedia",
        "yahoo",
    ];

    while model.selected_page < pages.len() {
        model.selected_page += pages.len()
    }
    while model.selected_page >= pages.len() {
        model.selected_page -= pages.len()
    }

    let mut trace_datas = vec![];
    let mut page_folder = root_path.clone();
    page_folder.push(pages[model.selected_page]);
    let trace_paths_in_folder = fs::read_dir(page_folder)
        .expect("Failed to open page folder")
        .filter(|r| r.is_ok()) // Get rid of Err variants for Result<DirEntry>
        .map(|r| r.unwrap().path())
        .filter(|r| r.is_dir()) // Only keep folders
        .collect::<Vec<_>>();
    for p in &trace_paths_in_folder {
        let mut folder_path = p.clone();
        folder_path.push("profile.json");
        let data = fs::read_to_string(&folder_path).unwrap();
        let profile: Profile = serde_json::from_str(&data).unwrap();
        let graph_data = profile.generate_graph_data();
        // Create TraceData
        let timestamp: String = if let Some(ts_osstr) = p.iter().last() {
            if let Some(ts) = ts_osstr.to_str() {
                ts.to_owned()
            } else {
                String::from("failed to process folder name")
            }
        } else {
            String::from("unknown timestamp")
        };
        let mut trace_data = TraceData::new(
            pages[model.selected_page].to_owned(),
            timestamp,
            graph_data,
        );
        // Load indentation profile
        folder_path.pop();
        folder_path.push("indent_profile.csv");
        if let Ok(indentation_profile) = fs::read_to_string(&folder_path) {
            if let Err(_) = trace_data.add_indentation_profile(indentation_profile) {
                eprintln!("Failed to parse {:?}", folder_path);
            }
        }
        trace_datas.push(trace_data);
        profiles.push(profile);
    }

    let mut deepest_tree_depth = 0;
    let mut longest_tree = 0;
    let mut deepest_indentation = 0;
    let mut longest_indentation = 0;
    for td in &trace_datas {
        let gd = &td.graph_data;
        if gd.depth_tree.len() > longest_tree {
            longest_tree = gd.depth_tree.len();
        }
        for node in &gd.depth_tree {
            if node.depth > deepest_tree_depth {
                deepest_tree_depth = node.depth;
            }
        }
        if let Some(indentation_profile) = &td.indentation_profile {
            if indentation_profile.len() > longest_indentation {
                longest_indentation = indentation_profile.len();
            }
            for v in indentation_profile {
                if *v > deepest_indentation {
                    deepest_indentation = *v;
                }
            }
        }
    }

    println!(
        "deepest_indentation: {}, longest_indentation: {}",
        deepest_indentation, longest_indentation
    );

    model.num_profiles = profiles.len().try_into().unwrap();
    model.profiles = profiles;
    model.trace_datas = trace_datas;
    model.longest_tree = longest_tree.try_into().unwrap();
    model.deepest_tree_depth = deepest_tree_depth.try_into().unwrap();
    model.longest_indentation = longest_indentation.try_into().unwrap();
    model.deepest_indentation = deepest_indentation;
}

fn update(_app: &App, model: &mut Model, _update: Update) {
    model.index += 10;
}

fn view(app: &App, model: &Model, frame: Frame) {
    // Prepare to draw.
    let draw = app.draw();

    // Clear the background to purple.
    draw.background().color(hsl(0.6, 0.1, 0.02));

    let win = app.window_rect();

    let mut name = &model.trace_datas[0].name;
    let mut timestamp = "";
    let mut color_type = match model.color_mode {
        ColorMode::Script => "script colour",
        ColorMode::Profile => "profile index colour",
        ColorMode::Selected => "selection colour",
    };

    let visualisation_type = match model.draw_mode {
        DrawMode::PolarGraphDepth => {
            draw_functions::draw_polar_depth_graph(&draw, model, &win);
            "polar graph depth"
        }
        DrawMode::FlowerGridGraphDepth => {
            draw_functions::draw_flower_grid_graph_depth(&draw, model, &win);
            "flower grid graph depth"
        }
        DrawMode::FlowerGridIndentation => {
            draw_functions::draw_flower_grid_indentation(&draw, model, &win);
            "flower grid indentation"
        }
        DrawMode::SingleFlowerIndentation => {
            draw_functions::draw_single_flower_indentation(&draw, model, &win);
            timestamp = &model.trace_datas[model.selected_profile].timestamp;
            "single flower indentation"
        }
        DrawMode::VerticalGraphDepth => {
            draw_functions::draw_vertical_graph_depth(&draw, model, &win);
            "vertical graph depth"
        }
        DrawMode::HorizontalGraphDepth => {
            draw_functions::draw_horizontal_graph_depth(&draw, model, &win);
            "horizontal graph depth"
        }
    };

    let full_text = format!("{}\n{}\n\n{}\n{}", name, timestamp, visualisation_type, color_type);
    draw.text(&full_text)
        .font_size(16)
        .align_text_bottom()
        .right_justify()
        // .x_y(0.0, 0.0)
        .wh(win.clone().pad(20.).wh())
        .font(model.font.clone())
        // .x_y(win.right()-130.0, win.bottom() + 10.0)
        .color(LIGHTGREY);

    // Write to the window frame.
    draw.to_frame(app, &frame).unwrap();
}

fn window_event(app: &App, model: &mut Model, event: WindowEvent) {
    match event {
        KeyPressed(key) => match key {
            Key::Left => {
                model.draw_mode = match model.draw_mode {
                    DrawMode::VerticalGraphDepth => DrawMode::PolarGraphDepth,
                    DrawMode::PolarGraphDepth => DrawMode::HorizontalGraphDepth,
                    DrawMode::HorizontalGraphDepth => DrawMode::FlowerGridGraphDepth,
                    DrawMode::FlowerGridGraphDepth => DrawMode::FlowerGridIndentation,
                    DrawMode::FlowerGridIndentation => DrawMode::SingleFlowerIndentation,
                    DrawMode::SingleFlowerIndentation => DrawMode::VerticalGraphDepth,
                }
            }
            Key::Right => {
                model.draw_mode = match model.draw_mode {
                    DrawMode::VerticalGraphDepth => DrawMode::SingleFlowerIndentation,
                    DrawMode::PolarGraphDepth => DrawMode::VerticalGraphDepth,
                    DrawMode::HorizontalGraphDepth => DrawMode::PolarGraphDepth,
                    DrawMode::FlowerGridGraphDepth => DrawMode::HorizontalGraphDepth,
                    DrawMode::FlowerGridIndentation => DrawMode::FlowerGridGraphDepth,
                    DrawMode::SingleFlowerIndentation => DrawMode::FlowerGridIndentation,
                }
            }
            Key::Up => {
                model.selected_page += 1;
                load_profiles(model);
                model.selected_profile = 0;
            }
            Key::Down => {
                model.selected_page -= 1;
                load_profiles(model);
                model.selected_profile = 0;
            }
            Key::A => {
                if model.selected_profile > 0 {
                    model.selected_profile -= 1;
                } else {
                    model.selected_profile = model.trace_datas.len() - 1;
                }
            }
            Key::D => {
                model.selected_profile = (model.selected_profile + 1) % model.trace_datas.len();
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
                model.trace_datas[model.selected_profile].graph_data.send_script_data_osc(&model.sender);
            }
            Key::Space => {
                // model.audio_interface.send(EventMsg::AddSynthesisNode(Some(
                //     synthesis_node_from_graph_data(
                //         &model.graph_datas[model.selected_profile],
                //         model.audio_interface.sample_rate as f32,
                //     ),
                // )));
                synthesize_call_graph(
                    &model.trace_datas[model.selected_profile].graph_data,
                    5.0,
                    model.audio_interface.sample_rate as f32,
                    &mut model.audio_interface,
                )
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
