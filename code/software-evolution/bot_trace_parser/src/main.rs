// Turn on clippy lints
#![warn(clippy::all)]
use chrono::{DateTime, Utc};

use nannou::prelude::*;
use nannou::ui::prelude::*;
use nannou_osc as osc;
use std::{cell::RefCell, convert::TryInto, fs, path::PathBuf, process::Command};
mod profile;
use profile::{Profile, TraceData};
mod audio_interface;
mod coverage;
use audio_interface::*;
use coverage::*;
mod spawn_synthesis_nodes;
use spawn_synthesis_nodes::*;
mod draw_functions;
mod from_web_api;
mod wgpu_helpers;
use wgpu_helpers::*;
mod texture;

fn main() {
    nannou::app(model).update(update).run();
}

enum ColorMode {
    Script,
    Profile,
    Selected,
}

enum DrawMode {
    Indentation(ProfileDrawMode),
    LineLength(ProfileDrawMode),
    GraphDepth(GraphDepthDrawMode),
    Coverage(CoverageDrawMode),
}

enum ProfileDrawMode {
    SingleFlower,
}

enum GraphDepthDrawMode {
    Vertical,
    Horizontal,
    Polar,
    PolarGrid,
    Rings,
    PolarAxes,
    PolarAxesRolling,
    AllSitesPolarAxes,
}

enum CoverageDrawMode {
    HeatMap,
    Blob,
    SmoothBlob,
    Spacebrush,
    Shell(RefCell<WgpuShaderData>),
    GemStone(RefCell<WgpuShaderData>),
    Voronoi(RefCell<VoronoiShader>),
}

impl CoverageDrawMode {
    pub fn shell(window: &Window) -> Self {
        let wgpu_shader_data = WgpuShaderData::new(window, "vertex_triangles");
        CoverageDrawMode::Shell(RefCell::new(wgpu_shader_data))
    }
    pub fn gem_stone(window: &Window) -> Self {
        let wgpu_shader_data = WgpuShaderData::new(window, "vertex_triangles");
        CoverageDrawMode::GemStone(RefCell::new(wgpu_shader_data))
    }
    pub fn voronoi(window: &Window) -> Self {
        let voronoi_shader = VoronoiShader::new(window);
        CoverageDrawMode::Voronoi(RefCell::new(voronoi_shader))
    }
}

impl DrawMode {
    fn to_str(&self) -> &str {
        match self {
            DrawMode::Indentation(pdm) => match pdm {
                ProfileDrawMode::SingleFlower => "indentation - single flower",
            },
            DrawMode::LineLength(pdm) => match pdm {
                ProfileDrawMode::SingleFlower => "line length - single flower",
            },
            DrawMode::GraphDepth(gddm) => match gddm {
                GraphDepthDrawMode::Vertical => "graph depth - vertical",
                GraphDepthDrawMode::Horizontal => "graph depth - horizontal",
                GraphDepthDrawMode::Polar => "graph depth - polar",
                GraphDepthDrawMode::PolarGrid => "graph depth - polar grid",
                GraphDepthDrawMode::Rings => "graph depth - rings",
                GraphDepthDrawMode::PolarAxes => "graph depth - polar axes",
                GraphDepthDrawMode::PolarAxesRolling => "graph depth - polar axes rolling",
                GraphDepthDrawMode::AllSitesPolarAxes => "graph_depth - all sites polar axes",
            },
            DrawMode::Coverage(cdm) => match cdm {
                CoverageDrawMode::HeatMap => "coverage - heat map",
                CoverageDrawMode::Blob => "coverage - blob",
                CoverageDrawMode::SmoothBlob => "coverage - smooth blob",
                CoverageDrawMode::Spacebrush => "coverage - spacebrush",
                CoverageDrawMode::GemStone(_) => "coverage - gem stone",
                CoverageDrawMode::Shell(_) => "coverage - shell",
                CoverageDrawMode::Voronoi(_) => "coverage - voronoi",
            },
        }
    }
}

/// For keeping track of frames when rendering
enum RenderState {
    NoRendering,
    RenderAllTraces { current_trace: usize },
}

struct Site {
    name: String,
    trace_datas: Vec<TraceData>,
    deepest_tree_depth: u32,
    longest_tree: u32,
    deepest_indentation: u32,
    longest_indentation: u32,
    deepest_line_length: u32,
    longest_line_length: u32,
    longest_coverage_vector: usize,
    max_coverage_vector_count: i32,
    max_coverage_total_length: i64,
    max_profile_tick: f32,
}

pub struct Model {
    ui: Ui,
    ids: Ids,
    selected_site: usize,
    sites: Vec<Site>,
    selected_visit: usize,
    index: usize,
    separation_ratio: f32,
    draw_mode: DrawMode,
    color_mode: ColorMode,
    sender: osc::Sender<osc::Connected>,
    audio_interface: audio_interface::AudioInterface,
    font: nannou::text::Font,
    render_state: RenderState,
    use_web_api: bool,
    show_gui: bool,
    background_lightness: f32,
}

widget_ids! {
    struct Ids {
        separation_ratio,
        selected_site,
        selected_visit,
    background_lightness,
    }
}

fn model(app: &App) -> Model {
    let _window = app
        .new_window()
        .view(view)
        .event(window_event)
        .size(1080, 1080)
        .build()
        .unwrap();

    // Create the UI.
    let mut ui = app.new_ui().build().unwrap();

    // Generate some ids for our widgets.
    let ids = Ids::new(ui.widget_id_generator());

    // Set up osc sender
    let port = 57120;
    let target_addr = format!("{}:{}", "127.0.0.1", port);

    let sender = osc::sender()
        .expect("Could not bind to default socket")
        .connect(target_addr)
        .expect("Could not connect to socket at address");

    let mut audio_interface = AudioInterface::new();
    audio_interface.connect_to_system(2);

    // audio_interface.send(EventMsg::AddSynthesisNode(Some(
    //     generate_wave_guide_synthesis_node(220., audio_interface.sample_rate as f32),
    // )));
    // audio_interface.send(EventMsg::AddSynthesisNode(Some(
    //     generate_wave_guide_synthesis_node(440., audio_interface.sample_rate as f32),
    // )));
    // audio_interface.send(EventMsg::AddSynthesisNode(Some(
    //     generate_wave_guide_synthesis_node(220. * 5. / 4., audio_interface.sample_rate as f32),
    // )));
    // audio_interface.send(EventMsg::AddSynthesisNode(Some(
    //     generate_wave_guide_synthesis_node(220. * 7. / 4., audio_interface.sample_rate as f32),
    // )));

    let use_web_api = true;
    let sites = if use_web_api {
        from_web_api::get_all_sites().expect("Failed to get list of pages from Web API")
    } else {
        let list = vec![
            "bing",
            "duckduckgo",
            "google",
            "kiddle",
            "qwant",
            "spotify",
            "wikipedia",
            "yahoo",
        ];
        list.iter()
            .map(|s| String::from(*s))
            .collect::<Vec<String>>()
    };

    let sites: Vec<Site> = sites
        .iter()
        .map(|name| load_site(&name, use_web_api))
        .collect();

    let font = nannou::text::font::from_file("/home/erik/.fonts/SpaceMono-Regular.ttf").unwrap();

    Model {
        ui,
        ids,
        selected_site: 0,
        sites,
        index: 0,
        separation_ratio: 1.0,
        draw_mode: DrawMode::GraphDepth(GraphDepthDrawMode::AllSitesPolarAxes),
        color_mode: ColorMode::Script,
        sender,
        selected_visit: 0,
        audio_interface,
        font,
        render_state: RenderState::NoRendering,
        use_web_api,
        show_gui: false,
        background_lightness: 0.43,
    }
}

fn load_site_from_disk(site: &str) -> Vec<TraceData> {
    let root_path = PathBuf::from("/home/erik/code/kth/web_evolution_2021-04/");
    let mut trace_datas = vec![];

    let mut page_folder = root_path.clone();
    page_folder.push(site);
    let trace_paths_in_folder = fs::read_dir(page_folder)
        .expect("Failed to open page folder")
        .filter(|r| r.is_ok()) // Get rid of Err variants for Result<DirEntry>
        .map(|r| r.unwrap().path())
        .filter(|r| r.is_dir()) // Only keep folders
        .collect::<Vec<_>>();
    for (_i, p) in trace_paths_in_folder.iter().enumerate() {
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
        let mut trace_data = TraceData::new(site.to_owned(), timestamp, graph_data);
        // Load indentation profile
        folder_path.pop();
        folder_path.push("indent_profile.csv");
        if let Ok(indentation_profile) = fs::read_to_string(&folder_path) {
            if let Err(_) = trace_data.add_indentation_profile(indentation_profile) {
                eprintln!("Failed to parse {:?}", folder_path);
            }
        }
        // Load line length profile
        folder_path.pop();
        folder_path.push("line_length_profile.csv");
        if let Ok(line_length_profile) = fs::read_to_string(&folder_path) {
            if let Err(_) = trace_data.add_line_length_profile(line_length_profile) {
                eprintln!("Failed to parse {:?}", folder_path);
            }
        }
        // Load coverage
        folder_path.pop();
        folder_path.push("coverage.json");
        let data = fs::read_to_string(&folder_path).unwrap();
        let coverage = Coverage::from_data(data);
        trace_data.coverage = Some(coverage);

        // Copy screenshots to new location
        folder_path.pop();
        folder_path.push("screenshots");
        // copy_screenshot(&folder_path, &app, pages[model.selected_page], i);

        trace_datas.push(trace_data);
    }
    trace_datas
}

fn load_site(name: &str, use_web_api: bool) -> Site {
    let trace_datas = if use_web_api {
        from_web_api::get_trace_data_from_site(name)
    } else {
        load_site_from_disk(name)
    };

    let mut deepest_tree_depth = 0;
    let mut longest_tree = 0;
    let mut deepest_indentation = 0;
    let mut longest_indentation = 0;
    let mut deepest_line_length = 0;
    let mut longest_line_length = 0;
    let mut longest_coverage_vector = 0;
    let mut max_coverage_vector_count = 0;
    let mut max_coverage_total_length = 0;
    let mut max_profile_tick = 0;
    for td in &trace_datas {
        let gd = &td.graph_data;
        if gd.depth_tree.len() > longest_tree {
            longest_tree = gd.depth_tree.len();
        }
        for node in &gd.depth_tree {
            if node.depth > deepest_tree_depth {
                deepest_tree_depth = node.depth;
            }
            if node.ticks > max_profile_tick {
                max_profile_tick = node.ticks;
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
        if let Some(line_length_profile) = &td.line_length_profile {
            if line_length_profile.len() > longest_line_length {
                longest_line_length = line_length_profile.len();
            }
            for v in line_length_profile {
                if *v > deepest_line_length {
                    deepest_line_length = *v;
                }
            }
        }
        if let Some(coverage) = &td.coverage {
            if coverage.vector.len() > longest_coverage_vector {
                longest_coverage_vector = coverage.vector.len();
            }
            let total_length = coverage.total_length;
            if total_length > max_coverage_total_length {
                max_coverage_total_length = total_length;
            }
            for pair in &coverage.vector {
                if pair.1 > max_coverage_vector_count {
                    max_coverage_vector_count = pair.1;
                }
            }
        }
    }

    println!(
        "deepest_indentation: {}, longest_indentation: {}",
        deepest_indentation, longest_indentation
    );

    Site {
        name: name.to_owned(),
        trace_datas,
        deepest_tree_depth: deepest_tree_depth.try_into().unwrap(),
        longest_tree: longest_tree.try_into().unwrap(),
        deepest_indentation,
        longest_indentation: longest_indentation.try_into().unwrap(),
        deepest_line_length,
        longest_line_length: longest_line_length.try_into().unwrap(),
        longest_coverage_vector,
        max_coverage_vector_count,
        max_coverage_total_length,
        max_profile_tick: max_profile_tick as f32,
    }
}

fn update(app: &App, model: &mut Model, _update: Update) {
    // GUI
    // Calling `set_widgets` allows us to instantiate some widgets.
    let ui = &mut model.ui.set_widgets();

    fn slider(val: f32, min: f32, max: f32) -> widget::Slider<'static, f32> {
        widget::Slider::new(val, min, max)
            .w_h(200.0, 30.0)
            .label_font_size(15)
            .rgb(0.3, 0.3, 0.3)
            .label_rgb(1.0, 1.0, 1.0)
            .border(1.0)
    }

    for value in slider(model.separation_ratio, 0.0, 1.0)
        .top_left_with_margin(20.0)
        .label("Separation ratio")
        .set(model.ids.separation_ratio, ui)
    {
        model.separation_ratio = value as f32;
    }

    for value in slider(
        model.selected_site as f32,
        0.0,
        (model.sites.len() - 1) as f32,
    )
    .down(10.0)
    .label("Selected site")
    .set(model.ids.selected_site, ui)
    {
        model.selected_site = value as usize;
    }

    for value in slider(
        model.selected_visit as f32,
        0.0,
        (model.sites[model.selected_site].trace_datas.len() - 1) as f32,
    )
    .down(10.0)
    .label("Selected visit")
    .set(model.ids.selected_visit, ui)
    {
        model.selected_visit = value as usize;
    }

    for value in slider(model.background_lightness, 0.0, 1.0)
        .down(10.)
        .label(&format!("Background light: {}", model.background_lightness))
        .set(model.ids.background_lightness, ui)
    {
        model.background_lightness = value.pow(2);
    }

    // update frame rendering
    match &mut model.render_state {
        RenderState::RenderAllTraces { current_trace } => {
            if *current_trace > 0 {
                // We must wait until the first trace has been drawn before saving it.
                // Capture the frame!
                let name = &model.sites[model.selected_site].trace_datas[model.selected_visit].name;
                let timestamp =
                    &model.sites[model.selected_site].trace_datas[model.selected_visit].timestamp;
                let file_path =
                    rendering_frame_path(app, &model.draw_mode, name, *current_trace - 1);
                app.main_window().capture_frame(file_path);
            }
            // Are we done?
            if *current_trace == model.sites[model.selected_site].trace_datas.len() {
                // All traces have been rendered
                model.render_state = RenderState::NoRendering;
                model.selected_visit = 0;
                let name = &model.sites[model.selected_site].trace_datas[model.selected_visit].name;
                let w = app.window_rect().w() as usize;
                let h = app.window_rect().h() as usize;
                let video_path = rendering_video_path(app, &model.draw_mode, name);
                let frame_folder_path = rendering_frame_folder_path(app, &model.draw_mode, name);
                // Run ffmpeg to make video files from the rendered images
                std::thread::spawn(move || {
                    let output = Command::new("ffmpeg")
                        .current_dir(frame_folder_path)
                        .arg("-y") // overwrite output files
                        .arg("-r")
                        .arg("30")
                        .arg("-start_number")
                        .arg("0")
                        .arg("-i")
                        .arg("%04d.png")
                        .arg("-c:v")
                        .arg("libx264")
                        .arg("-crf")
                        .arg("17")
                        .arg("-preset")
                        .arg("veryslow")
                        .arg("-s")
                        .arg(&format!("{}x{}", w, h))
                        .arg(&video_path)
                        .output()
                        .expect("failed to execute process");
                    println!("Finished rendering {}", video_path.to_str().unwrap());
                    println!("Rendering output: {}", output.status);
                    use std::io::{self, Write};
                    io::stdout().write_all(&output.stdout).unwrap();
                    io::stderr().write_all(&output.stderr).unwrap();

                    // ffmpeg -r 4 -start_number 0 -i %04d.png -c:v libx264 -crf 18 -preset veryslow -s 1080x1051 ../coverage_spacebrush.mp4
                });
            } else {
                // Set the next trace up for rendering
                model.selected_visit = *current_trace;
                *current_trace += 1;
            }
        }
        RenderState::NoRendering => (),
    }
}

fn view(app: &App, model: &Model, frame: Frame) {
    // Prepare to draw.
    let draw = app.draw();

    // Clear the background to purple.
    draw.background()
        .color(hsl(0.6, 0.1, model.background_lightness));

    let win = app.window_rect();

    let name = &model.sites[model.selected_site].name;
    let timestamp = &model.sites[model.selected_site].trace_datas[model.selected_visit].timestamp;
    let color_type = match model.color_mode {
        ColorMode::Script => "script colour",
        ColorMode::Profile => "profile index colour",
        ColorMode::Selected => "selection colour",
    };
    let visualisation_type = model.draw_mode.to_str();

    let full_text = format!(
        "{}\n{}\n\n{}\n{}",
        name, timestamp, visualisation_type, color_type
    );
    draw.text(&full_text)
        .font_size(16)
        .align_text_bottom()
        .right_justify()
        // .x_y(0.0, 0.0)
        .wh(win.clone().pad(20.).wh())
        .font(model.font.clone())
        // .x_y(win.right()-130.0, win.bottom() + 10.0)
        .color(LIGHTGREY);

    draw.to_frame(app, &frame).unwrap();
    let draw = app.draw();

    match &model.draw_mode {
        DrawMode::GraphDepth(gddm) => match gddm {
            GraphDepthDrawMode::Horizontal => {
                draw_functions::draw_horizontal_graph_depth(&draw, model, &win);
                draw.to_frame(app, &frame).unwrap();
            }
            GraphDepthDrawMode::Vertical => {
                draw_functions::draw_vertical_graph_depth(&draw, model, &win);
                draw.to_frame(app, &frame).unwrap();
            }
            GraphDepthDrawMode::Polar => {
                draw_functions::draw_polar_depth_graph(&draw, model, &win);
                draw.to_frame(app, &frame).unwrap();
            }
            GraphDepthDrawMode::PolarGrid => {
                draw_functions::draw_flower_grid_graph_depth(&draw, model, &win);
                draw.to_frame(app, &frame).unwrap();
            }
            GraphDepthDrawMode::Rings => {
                draw_functions::draw_depth_graph_rings(&draw, model, &win);
                draw.to_frame(app, &frame).unwrap();
            }
            GraphDepthDrawMode::PolarAxes => {
                draw_functions::draw_polar_axes_depth_graph(&draw, model, &win);
                draw.to_frame(app, &frame).unwrap();
            }
            GraphDepthDrawMode::PolarAxesRolling => {
                draw_functions::draw_polar_axes_rolling_depth_graph(&draw, model, &win);
                draw.to_frame(app, &frame).unwrap();
            }
            GraphDepthDrawMode::AllSitesPolarAxes => {
                draw_functions::draw_all_sites_single_visit_polar_axes_depth_graph(
                    &draw, model, &win,
                );
                draw.to_frame(app, &frame).unwrap();
            }
        },
        DrawMode::Indentation(pdm) => match pdm {
            ProfileDrawMode::SingleFlower => {
                draw_functions::draw_single_flower_indentation(&draw, model, &win);
                draw.to_frame(app, &frame).unwrap();
            }
        },
        DrawMode::LineLength(pdm) => match pdm {
            ProfileDrawMode::SingleFlower => {
                draw_functions::draw_single_flower_line_length(&draw, model, &win);
                draw.to_frame(app, &frame).unwrap();
            }
        },
        DrawMode::Coverage(cdm) => match cdm {
            CoverageDrawMode::HeatMap => {
                draw_functions::draw_coverage_heat_map(&draw, model, &win);
                draw.to_frame(app, &frame).unwrap();
            }
            CoverageDrawMode::Blob => {
                draw_functions::draw_coverage_blob(&draw, model, &win);
                draw.to_frame(app, &frame).unwrap();
            }
            CoverageDrawMode::SmoothBlob => {
                draw_functions::draw_smooth_coverage_blob(&draw, model, &win);
                draw.to_frame(app, &frame).unwrap();
            }
            CoverageDrawMode::Spacebrush => {
                draw_functions::draw_coverage_spacebrush(&draw, model, &win);
                draw.to_frame(app, &frame).unwrap();
            }
            CoverageDrawMode::GemStone(ref wgpu_shader_data) => {
                draw_functions::draw_coverage_organic(
                    &draw,
                    model,
                    &app.main_window(),
                    &win,
                    &frame,
                    &mut wgpu_shader_data.borrow_mut(),
                );
            }
            CoverageDrawMode::Shell(ref wgpu_shader_data) => {
                draw_functions::draw_coverage_shell(
                    &draw,
                    model,
                    &app.main_window(),
                    &win,
                    &frame,
                    &mut wgpu_shader_data.borrow_mut(),
                );
            }
            CoverageDrawMode::Voronoi(ref voronoi_shader) => {
                draw_functions::draw_coverage_voronoi(
                    &draw,
                    model,
                    &app.main_window(),
                    &win,
                    &frame,
                    &mut voronoi_shader.borrow_mut(),
                );

                // Try drawing the text on top
                let draw = app.draw();
                draw.text(&full_text)
                    .font_size(16)
                    .align_text_bottom()
                    .right_justify()
                    // .x_y(0.0, 0.0)
                    .wh(win.clone().pad(20.).wh())
                    .font(model.font.clone())
                    // .x_y(win.right()-130.0, win.bottom() + 10.0)
                    .color(DARKGREY);

                draw.to_frame(app, &frame).unwrap();
            }
        },
    };

    // // Write to the window frame.
    //

    if model.show_gui {
        // Draw the state of the `Ui` to the frame.
        model.ui.draw_to_frame(app, &frame).unwrap();
    }
}

fn window_event(app: &App, model: &mut Model, event: WindowEvent) {
    match event {
        KeyPressed(key) => match key {
            Key::A => match &mut model.draw_mode {
                DrawMode::GraphDepth(ref mut gddm) => match gddm {
                    GraphDepthDrawMode::Horizontal => *gddm = GraphDepthDrawMode::Vertical,
                    GraphDepthDrawMode::Vertical => *gddm = GraphDepthDrawMode::Polar,
                    GraphDepthDrawMode::Polar => *gddm = GraphDepthDrawMode::PolarGrid,
                    GraphDepthDrawMode::PolarGrid => *gddm = GraphDepthDrawMode::Rings,
                    GraphDepthDrawMode::Rings => *gddm = GraphDepthDrawMode::PolarAxes,
                    GraphDepthDrawMode::PolarAxes => *gddm = GraphDepthDrawMode::PolarAxesRolling,
                    GraphDepthDrawMode::PolarAxesRolling => {
                        *gddm = GraphDepthDrawMode::AllSitesPolarAxes
                    }
                    GraphDepthDrawMode::AllSitesPolarAxes => *gddm = GraphDepthDrawMode::Horizontal,
                },
                DrawMode::Indentation(ref mut pdm) => match pdm {
                    ProfileDrawMode::SingleFlower => (),
                },
                DrawMode::LineLength(ref mut pdm) => match pdm {
                    ProfileDrawMode::SingleFlower => (),
                },
                DrawMode::Coverage(ref mut cdm) => match cdm {
                    CoverageDrawMode::HeatMap => *cdm = CoverageDrawMode::Blob,
                    CoverageDrawMode::Blob => *cdm = CoverageDrawMode::SmoothBlob,
                    CoverageDrawMode::SmoothBlob => *cdm = CoverageDrawMode::Spacebrush,
                    CoverageDrawMode::Spacebrush => {
                        *cdm = CoverageDrawMode::shell(&app.main_window())
                    }
                    CoverageDrawMode::Shell(_) => {
                        *cdm = CoverageDrawMode::gem_stone(&app.main_window())
                    }
                    CoverageDrawMode::GemStone(_) => {
                        *cdm = CoverageDrawMode::voronoi(&app.main_window())
                    }
                    CoverageDrawMode::Voronoi(_) => *cdm = CoverageDrawMode::HeatMap,
                },
            },
            Key::D => match &mut model.draw_mode {
                DrawMode::GraphDepth(ref mut gddm) => match gddm {
                    GraphDepthDrawMode::Horizontal => *gddm = GraphDepthDrawMode::AllSitesPolarAxes,
                    GraphDepthDrawMode::Vertical => *gddm = GraphDepthDrawMode::Horizontal,
                    GraphDepthDrawMode::Polar => *gddm = GraphDepthDrawMode::Vertical,
                    GraphDepthDrawMode::PolarGrid => *gddm = GraphDepthDrawMode::Polar,
                    GraphDepthDrawMode::Rings => *gddm = GraphDepthDrawMode::PolarGrid,
                    GraphDepthDrawMode::PolarAxes => *gddm = GraphDepthDrawMode::Rings,
                    GraphDepthDrawMode::PolarAxesRolling => *gddm = GraphDepthDrawMode::PolarAxes,
                    GraphDepthDrawMode::AllSitesPolarAxes => {
                        *gddm = GraphDepthDrawMode::PolarAxesRolling
                    }
                },
                DrawMode::Indentation(ref mut pdm) => match pdm {
                    ProfileDrawMode::SingleFlower => (),
                },
                DrawMode::LineLength(ref mut pdm) => match pdm {
                    ProfileDrawMode::SingleFlower => (),
                },
                DrawMode::Coverage(ref mut cdm) => match cdm {
                    CoverageDrawMode::HeatMap => {
                        *cdm = CoverageDrawMode::voronoi(&app.main_window())
                    }
                    CoverageDrawMode::Blob => *cdm = CoverageDrawMode::HeatMap,
                    CoverageDrawMode::SmoothBlob => *cdm = CoverageDrawMode::Blob,
                    CoverageDrawMode::Spacebrush => *cdm = CoverageDrawMode::SmoothBlob,
                    CoverageDrawMode::Shell(_) => *cdm = CoverageDrawMode::Spacebrush,
                    CoverageDrawMode::GemStone(_) => {
                        *cdm = CoverageDrawMode::shell(&app.main_window())
                    }
                    CoverageDrawMode::Voronoi(_) => {
                        *cdm = CoverageDrawMode::gem_stone(&app.main_window())
                    }
                },
            },
            Key::W => {
                model.draw_mode = match &model.draw_mode {
                    DrawMode::GraphDepth(_gddm) => {
                        DrawMode::Indentation(ProfileDrawMode::SingleFlower)
                    }
                    DrawMode::Indentation(_pdm) => {
                        DrawMode::LineLength(ProfileDrawMode::SingleFlower)
                    }
                    DrawMode::LineLength(_pdm) => DrawMode::Coverage(CoverageDrawMode::HeatMap),
                    DrawMode::Coverage(_cdm) => DrawMode::GraphDepth(GraphDepthDrawMode::Polar),
                }
            }
            Key::S => {
                model.draw_mode = match &model.draw_mode {
                    DrawMode::GraphDepth(_gddm) => DrawMode::Coverage(CoverageDrawMode::HeatMap),
                    DrawMode::Indentation(_pdm) => DrawMode::GraphDepth(GraphDepthDrawMode::Polar),
                    DrawMode::LineLength(_pdm) => {
                        DrawMode::Indentation(ProfileDrawMode::SingleFlower)
                    }
                    DrawMode::Coverage(_cdm) => DrawMode::LineLength(ProfileDrawMode::SingleFlower),
                }
            }
            Key::Up => {
                model.selected_site += 1;
                if model.selected_site >= model.sites.len() {
                    model.selected_site = 0;
                }
                model.selected_visit = 0;
            }
            Key::Down => {
                if model.selected_site > 0 {
                    model.selected_site -= 1;
                } else {
                    model.selected_site = model.sites.len() - 1;
                }
                model.selected_visit = 0;
            }
            Key::Left => {
                if model.selected_visit > 0 {
                    model.selected_visit -= 1;
                } else {
                    model.selected_visit = model.sites[model.selected_site].trace_datas.len() - 1;
                }
            }
            Key::Right => {
                model.selected_visit =
                    (model.selected_visit + 1) % model.sites[model.selected_site].trace_datas.len();
            }
            Key::C => {
                model.color_mode = match model.color_mode {
                    ColorMode::Script => ColorMode::Profile,
                    ColorMode::Profile => ColorMode::Selected,
                    ColorMode::Selected => ColorMode::Script,
                }
            }
            Key::X => {
                // Capture the frame!
                let file_path = captured_frame_path(app);
                app.main_window().capture_frame(file_path);
            }
            Key::T => {
                // Send graph data via osc
                model.sites[model.selected_site].trace_datas[model.selected_visit]
                    .graph_data
                    .send_script_data_osc(&model.sender);
            }
            Key::R => {
                model.render_state = RenderState::RenderAllTraces { current_trace: 0 };
            }
            Key::G => {
                model.show_gui = !model.show_gui;
            }
            Key::Space => {
                // model.audio_interface.send(EventMsg::AddSynthesisNode(Some(
                //     synthesis_node_from_graph_data(
                //         &model.graph_datas[model.selected_profile],
                //         model.audio_interface.sample_rate as f32,
                //     ),
                // )));
                synthesize_call_graph(
                    &model.sites[model.selected_site].trace_datas[model.selected_visit].graph_data,
                    5.0,
                    model.audio_interface.sample_rate as f32,
                    &mut model.audio_interface,
                )
            }
            _ => (),
        },
        KeyReleased(_key) => {}
        MouseMoved(pos) => {
            // model.separation_ratio = (pos.x + app.window_rect().w() / 2.0) / app.window_rect().w();
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

fn rendering_frame_folder_path(app: &App, draw_mode: &DrawMode, name: &str) -> std::path::PathBuf {
    // Create a path that we want to save this frame to.
    let now: DateTime<Utc> = Utc::now();
    app.project_path()
        .expect("failed to locate `project_path`")
        // Capture all frames to a directory called `/<path_to_nannou>/nannou/simple_capture`.
        .join("renders")
        .join(name)
        .join(draw_mode.to_str())
}
fn rendering_frame_path(
    app: &App,
    draw_mode: &DrawMode,
    name: &str,
    frame_number: usize,
) -> std::path::PathBuf {
    // Create a path that we want to save this frame to.
    // let now: DateTime<Utc> = Utc::now();
    rendering_frame_folder_path(app, draw_mode, name)
        .join(format!("{:04}", frame_number))
        // The extension will be PNG. We also support tiff, bmp, gif, jpeg, webp and some others.
        .with_extension("png")
}

fn rendering_video_path(app: &App, draw_mode: &DrawMode, name: &str) -> std::path::PathBuf {
    // Create a path that we want to save this frame to.
    // let now: DateTime<Utc> = Utc::now();
    app.project_path()
        .expect("failed to locate `project_path`")
        // Capture all frames to a directory called `/<path_to_nannou>/nannou/simple_capture`.
        .join("renders")
        .join(name)
        .join(&format!("{}_{}", name, draw_mode.to_str()))
        .with_extension("mp4")
}

fn screenshot_collection_path(app: &App, name: &str, frame_number: usize) -> std::path::PathBuf {
    app.project_path()
        .expect("failed to locate `project_path`")
        .join("screenshot_collection")
        .join(name)
        .join(format!("{:04}", frame_number))
        .with_extension("jpg")
}

fn copy_screenshot(folder_path: &PathBuf, app: &App, name: &str, frame_number: usize) {
    let screenshot_paths_in_folder = fs::read_dir(folder_path)
        .expect("Failed to open screenshot folder")
        .filter(|r| r.is_ok()) // Get rid of Err variants for Result<DirEntry>
        .map(|r| r.unwrap().path())
        .filter(|r| r.is_file())
        .filter(|r| {
            if let Some(ext) = r.extension() {
                ext == "jpg"
            } else {
                false
            }
        })
        .collect::<Vec<_>>();

    let mut last_screenshot_path = PathBuf::new();
    let mut highest_screenshot_timestamp = 0;
    for p in screenshot_paths_in_folder {
        let timestamp: u64 = p
            .file_stem()
            .unwrap()
            .to_string_lossy()
            .parse::<u64>()
            .unwrap();
        if timestamp > highest_screenshot_timestamp {
            last_screenshot_path = p;
            highest_screenshot_timestamp = timestamp;
        }
    }
    let new_path = screenshot_collection_path(&app, name, frame_number);
    println!(
        "old: {:?}: {:?}, new: {:?}",
        last_screenshot_path,
        last_screenshot_path.is_file(),
        new_path
    );
    // Create the parent dir of the new file if it doesn't exist
    let mut new_path_parent = new_path.clone();
    new_path_parent.pop();
    fs::create_dir_all(new_path_parent).expect("Failed to create directory for screenshots");
    // Copy the file
    match std::fs::copy(last_screenshot_path, new_path) {
        Ok(_) => (),
        Err(e) => eprintln!("{}", e),
    }
}
