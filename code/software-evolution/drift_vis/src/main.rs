// Turn on clippy lints
#![warn(clippy::all)]
use chrono::{DateTime, Utc};
use phf::{phf_map, phf_set};

use nannou::prelude::*;
use nannou::ui::prelude::*;
use std::{
    cell::RefCell,
    convert::TryInto,
    env,
    fs::{self, File},
    io::Read,
    path::PathBuf,
    process::Command,
};
mod draw_functions;
mod wgpu_helpers;
use wgpu_helpers::*;
mod texture;

pub use drift_data::*;
pub use drift_data::Site;

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
    Rings(RefCell<WgpuShaderData>),
    PolarAxes,
    PolarAxesRolling,
    TriangleRolling,
    AllSitesPolarAxes,
}

impl GraphDepthDrawMode {
    pub fn rings(window: &Window, resolution: [u32; 2]) -> Self {
        let wgpu_shader_data = WgpuShaderData::new(window, resolution, "vertex_triangles");
        GraphDepthDrawMode::Rings(RefCell::new(wgpu_shader_data))
    }
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
    pub fn shell(window: &Window, resolution: [u32; 2]) -> Self {
        let wgpu_shader_data = WgpuShaderData::new(window, resolution, "vertex_triangles");
        CoverageDrawMode::Shell(RefCell::new(wgpu_shader_data))
    }
    pub fn gem_stone(window: &Window, resolution: [u32; 2]) -> Self {
        let wgpu_shader_data = WgpuShaderData::new(window, resolution, "vertex_triangles");
        CoverageDrawMode::GemStone(RefCell::new(wgpu_shader_data))
    }
    pub fn voronoi(window: &Window, resolution: [u32; 2]) -> Self {
        let voronoi_shader = VoronoiShader::new(window, resolution);
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
                GraphDepthDrawMode::Rings(_) => "graph depth - rings",
                GraphDepthDrawMode::PolarAxes => "graph depth - polar axes",
                GraphDepthDrawMode::PolarAxesRolling => "graph depth - polar axes rolling",
                GraphDepthDrawMode::AllSitesPolarAxes => "graph_depth - all sites polar axes",
                GraphDepthDrawMode::TriangleRolling => "graph_depth - triangle_rolling",
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
    RenderSingleTraceThenExit { output_path: Option<PathBuf> },
    Screenshot,
    Exit,
}


pub struct Model {
    ui: Ui,
    ids: Ids,
    rgb_selectors: Vec<RgbSelector>,
    voronoi_fade_out_distance: f32,
    selected_site: usize,
    sites: Vec<Site>,
    selected_visit: usize,
    index: usize,
    param1: f32,
    param2: f32,
    param3: f32,
    draw_mode: DrawMode,
    color_mode: ColorMode,
    font: Option<nannou::text::Font>,
    render_state: RenderState,
    use_web_api: bool,
    show_gui: bool,
    background_lightness: f32,
    // The texture that we will draw to.
    texture: wgpu::Texture,
    // Create a `Draw` instance for drawing to our texture.
    draw: nannou::Draw,
    // The type used to render the `Draw` vertices to our texture.
    renderer: nannou::draw::Renderer,
    // The type used to capture the texture.
    texture_capturer: wgpu::TextureCapturer,
    // The type used to resize our texture to the window texture.
    texture_reshaper: wgpu::TextureReshaper,
    blur_shader: BlurShader,
    render_video: bool,
    show_text: bool,
}

widget_ids! {
    struct RgbIds {
    r,
    g,
    b,
    }
}

pub struct RgbSelector {
    r: f32,
    g: f32,
    b: f32,
    ids: RgbIds,
}

impl RgbSelector {
    fn new(r: f32, g: f32, b: f32, generator: widget::id::Generator) -> Self {
        Self {
            r,
            g,
            b,
            ids: RgbIds::new(generator),
        }
    }
    fn view(&mut self, ui: &mut UiCell) {
        fn slider(
            val: f32,
            min: f32,
            max: f32,
            rgb: (f32, f32, f32),
        ) -> widget::Slider<'static, f32> {
            widget::Slider::new(val, min, max)
                .w_h(200.0, 15.0)
                .label_font_size(12)
                .rgb(rgb.0, rgb.1, rgb.2)
                .label_rgb(1.0 - rgb.0, 1.0 - rgb.1, 1.0 - rgb.2)
                .border(1.0)
        }

        for value in slider(self.r, 0.0, 1.0, (self.r, self.g, self.b))
            .down(15.0)
            .label(&format!("r: {}", self.r))
            .set(self.ids.r, ui)
        {
            self.r = value as f32;
        }
        for value in slider(self.g, 0.0, 1.0, (self.r, self.g, self.b))
            .down(2.0)
            .label(&format!("g: {}", self.g))
            .set(self.ids.g, ui)
        {
            self.g = value as f32;
        }
        for value in slider(self.b, 0.0, 1.0, (self.r, self.g, self.b))
            .down(2.0)
            .label(&format!("b: {}", self.b))
            .set(self.ids.b, ui)
        {
            self.b = value as f32;
        }
    }
}

widget_ids! {
    struct Ids {
        param1,
    param2,
    param3,
        selected_site,
        selected_visit,
    background_lightness,
    show_text,
    voronoi_fade_out_distance,
        blur_size,
        sigma,
        contrast,
        lightness,
        blur_alpha,
    }
}

fn model(app: &App) -> Model {
    // Parse command line arguments
    let matches = clap::App::new("Drift visualiser")
        .version("1.0")
        .author("re|thread/Erik Natanael Gustafsson")
        .about("Visualises web software")
        .arg(
            clap::Arg::with_name("offline")
                .long("offline")
                .help("Read from cache, don't try to download from the internet"),
        )
.arg(
            clap::Arg::with_name("recalculate")
                .long("recalculate")
                .help("Recalculate the longest traces, highest count values etc. This breaks compatibility along traces so ideally every trace image should be rerendered after recalculating."),
        )
        .arg(
            clap::Arg::with_name("cache")
                .short("c")
                .long("cache")
                .value_name("CACHE_PATH")
                .help("path to the cache, default: ./assets/cache/")
                .takes_value(true),
        )
        .arg(
            clap::Arg::with_name("max_visits")
                .short("m")
                .long("max_visits")
                .value_name("MAX_VISITS")
                .help("max number of visits to load, from the most recent ones")
                .takes_value(true),
        )
        .subcommand(
            clap::SubCommand::with_name("single")
                .about("render a single visit for a single page in a single way")
                .arg(
                    clap::Arg::with_name("visit")
                        .short("v")
                        .long("visit")
                        .value_name("VISIT")
                        .help("visit timestamp")
                        .required(true)
                        .takes_value(true),
                )
                .arg(
                    clap::Arg::with_name("site")
                        .short("s")
                        .long("site")
                        .value_name("SITE")
                        .takes_value(true)
                        .required(true)
                        .help("website name"),
                )
                .arg(
                    clap::Arg::with_name("output")
                        .short("o")
                        .long("output")
                        .value_name("OUTPUT_PATH")
                        .takes_value(true)
                        .help("output image file path"),
                )
                .arg(
                    clap::Arg::with_name("visualisation")
                        .long("visualisation")
                        .short("w")
                        .value_name("VIS")
                        .takes_value(true)
                        .help(
                            "visualisation name: coverage_voronoi, profile_rings, profile_triangle",
                        ),
                ),
        )
        .get_matches();

    let use_web_api = if matches.is_present("offline") {
        false
    } else {
        true
    };

    let recalculate_data = if matches.is_present("recalculate") {
        true
    } else {
        false
    };

    let max_visits: Option<u32> = if let Some(max) = matches.value_of("max_visits") {
        Some(max.parse::<u32>().unwrap())
    } else {
        None
    };
    // Lets write to a 4K UHD texture.
    let texture_size = [2_160, 2_160];
    // let texture_size = [1080, 1080]; // Temporarily render 1080p for speed

    // Create the window.
    let [win_w, win_h] = [texture_size[0] / 2, texture_size[1] / 2];
    // let [win_w, win_h] = [texture_size[0], texture_size[1]];
    let w_id = app
        .new_window()
        // .power_preference(wgpu::PowerPreference::HighPerformance)
        .msaa_samples(1)
        .view(view)
        .event(window_event)
        .size(win_w, win_h)
        .build()
        .unwrap();

    // Hi-res capturing setup

    let window = app.window(w_id).unwrap();

    // Retrieve the wgpu device.
    let device = window.swap_chain_device();

    // Create our custom texture.
    let sample_count = window.msaa_samples();
    let texture = wgpu::TextureBuilder::new()
        .size(texture_size)
        // Our texture will be used as the RENDER_ATTACHMENT for our `Draw` render pass.
        // It will also be SAMPLED by the `TextureCapturer` and `TextureResizer`.
        .usage(
            wgpu::TextureUsage::RENDER_ATTACHMENT
                | wgpu::TextureUsage::SAMPLED
                | wgpu::TextureUsage::COPY_DST,
        )
        // Use nannou's default multisampling sample count.
        .sample_count(sample_count)
        // Use a spacious 16-bit linear sRGBA format suitable for high quality drawing.
        .format(wgpu::TextureFormat::Rgba16Float)
        // Build it!
        .build(device);

    // Create our `Draw` instance and a renderer for it.
    let draw = nannou::Draw::new();
    let descriptor = texture.descriptor();
    let renderer =
        nannou::draw::RendererBuilder::new().build_from_texture_descriptor(device, descriptor);

    // Create the texture capturer.
    let texture_capturer = wgpu::TextureCapturer::default();

    // Create the texture reshaper.
    let texture_view = texture.view().build();
    let texture_sample_type = texture.sample_type();
    let dst_format = Frame::TEXTURE_FORMAT;
    let texture_reshaper = wgpu::TextureReshaper::new(
        device,
        &texture_view,
        sample_count,
        texture_sample_type,
        sample_count,
        dst_format,
    );

    // Blur shader setup
    let blur_shader = BlurShader::new(&window, texture_size, &texture_view);
    // Create the UI.
    let mut ui = app.new_ui().build().unwrap();

    // Generate some ids for our widgets.
    let ids = Ids::new(ui.widget_id_generator());

    let mut rgb_selectors = Vec::new();
    rgb_selectors.push(RgbSelector::new(
        0.0950,
        0.5245,
        0.8283,
        ui.widget_id_generator(),
    ));
    rgb_selectors.push(RgbSelector::new(0.0, 0.0, 0.0, ui.widget_id_generator()));
    rgb_selectors.push(RgbSelector::new(
        0.1294,
        0.6353,
        0.7882,
        ui.widget_id_generator(),
    ));
    rgb_selectors.push(RgbSelector::new(
        0.5741,
        0.8863,
        1.0,
        ui.widget_id_generator(),
    ));

    let font = match nannou::text::font::from_file("assets/SpaceMono-Regular.ttf") {
        Ok(the_font) => Some(the_font),
        Err(e) => {
            eprintln!(
                "Failed to load font. Make sure the file ./assets/SpaceMono-Regular.ttf exists. {}",
                e
            );
            None
        }
    };

    let mut draw_mode = DrawMode::GraphDepth(GraphDepthDrawMode::rings(
        &app.main_window(),
        texture.size(),
    ));
    // let mut draw_mode = DrawMode::Coverage(CoverageDrawMode::voronoi(
    //     &app.main_window(),
    //     texture.size(),
    // ));

    let cache_path = if let Some(path) = matches.value_of("cache") {
        PathBuf::from(path)
    } else {
        PathBuf::from("./assets/cache/")
    };

    let (sites, render_state) = if let Some(matches) = matches.subcommand_matches("single") {
        let site = matches.value_of("site").unwrap();
        let visit = matches.value_of("visit").unwrap();
        let render_state = if let Some(output_path) = matches.value_of("output") {
            RenderState::RenderSingleTraceThenExit {
                output_path: Some(PathBuf::from(output_path)),
            }
        } else {
            RenderState::RenderSingleTraceThenExit { output_path: None }
        };
        let sites = vec![load_site(
            site,
            vec![visit.to_owned()],
            use_web_api,
            &cache_path,
            recalculate_data,
            None,
        )];
        if let Some(vis) = matches.value_of("visualisation") {
            draw_mode = match vis {
                "coverage_voronoi" => DrawMode::Coverage(CoverageDrawMode::voronoi(
                    &app.main_window(),
                    texture.size(),
                )),
                "profile_rings" => DrawMode::GraphDepth(GraphDepthDrawMode::rings(
                    &app.main_window(),
                    texture.size(),
                )),
                "profile_triangle" => DrawMode::GraphDepth(GraphDepthDrawMode::TriangleRolling),
                _ => {
                    eprintln!("Invalid visualisation type. Rendering with the default.");
                    DrawMode::Coverage(CoverageDrawMode::voronoi(
                        &app.main_window(),
                        texture.size(),
                    ))
                }
            }
        }
        (sites, render_state)
    } else {
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

        let visits = if use_web_api {
            println!("Fetching all visit timestamps from server");
            from_web_api::get_all_visits().expect("Failed to retrieve visits")
        } else {
            vec![]
        };

        // Filter out the invalid visits
        let visits: Vec<String> = visits
            .into_iter()
            .filter(|ts| {
                let its = ts.parse::<u64>().unwrap();
                !(1619654400000..=1620054000000).contains(&its)
            })
            .collect();

        let sites: Vec<Site> = sites
            .iter()
            .map(|name| {
                load_site(
                    &name,
                    visits.clone(),
                    use_web_api,
                    &cache_path,
                    recalculate_data,
                    max_visits,
                )
            })
            .collect();
        (sites, RenderState::NoRendering)
    };

    let mut m = Model {
        ui,
        ids,
        rgb_selectors,
        voronoi_fade_out_distance: 0.00057,
        selected_site: 0,
        sites,
        index: 0,
        param1: 1.0,
        param2: 0.5,
        param3: 0.0,
        draw_mode,
        color_mode: ColorMode::Script,
        selected_visit: 0,
        font,
        render_state,
        use_web_api,
        show_gui: false,
        background_lightness: 0.0, // 0.43,
        texture,
        draw,
        renderer,
        texture_capturer,
        texture_reshaper,
        blur_shader,
        render_video: false,
        show_text: false,
    };
    set_blur_shader_params(&mut m);
    m
}


fn update(app: &App, model: &mut Model, _update: Update) {
    // GUI
    {
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

        for value in slider(model.param1, 0.0, 1.0)
            .top_left_with_margin(20.0)
            .label(&format!("Param 1: {}", model.param1))
            .set(model.ids.param1, ui)
        {
            model.param1 = value as f32;
        }
        for value in slider(model.param2, 0.0, 1.0)
            .down(10.0)
            .label(&format!("Param 2: {}", model.param2))
            .set(model.ids.param2, ui)
        {
            model.param2 = value as f32;
        }
        for value in slider(model.param3, 0.0, 1.0)
            .down(10.0)
            .label(&format!("Param 3: {}", model.param3))
            .set(model.ids.param3, ui)
        {
            model.param3 = value as f32;
        }
        for value in slider(model.voronoi_fade_out_distance, 0.0, 0.01)
            .down(10.0)
            .label(&format!(
                "Fade out distance: {}",
                model.voronoi_fade_out_distance
            ))
            .set(model.ids.voronoi_fade_out_distance, ui)
        {
            model.voronoi_fade_out_distance = value as f32;
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

        for value in widget::Toggle::new(model.show_text)
            .down(10.)
            .label(&format!("Show text"))
            .set(model.ids.show_text, ui)
        {
            model.show_text = value;
        }
        for rgb in model.rgb_selectors.iter_mut() {
            rgb.view(ui);
        }

        for value in slider(model.blur_shader.blur_size as f32, 0.0, 128.0)
            .down(10.)
            .label(&format!("blur size: {}", model.blur_shader.blur_size))
            .set(model.ids.blur_size, ui)
        {
            model.blur_shader.blur_size = value as u32;
        }

        for value in slider(model.blur_shader.sigma as f32, 0.0, 64.0)
            .down(10.)
            .label(&format!("sigma: {}", model.blur_shader.sigma))
            .set(model.ids.sigma, ui)
        {
            model.blur_shader.sigma = value;
        }
        for value in slider(model.blur_shader.contrast as f32, 0.0, 2.0)
            .down(10.)
            .label(&format!("contrast: {}", model.blur_shader.contrast))
            .set(model.ids.contrast, ui)
        {
            model.blur_shader.contrast = value;
        }
        for value in slider(model.blur_shader.lightness as f32, 0.0, 4.0)
            .down(10.)
            .label(&format!("lightness: {}", model.blur_shader.lightness))
            .set(model.ids.lightness, ui)
        {
            model.blur_shader.lightness = value;
        }

        for value in slider(model.blur_shader.blur_alpha as f32, 0.0, 1.0)
            .down(10.)
            .label(&format!("blur_alpha: {}", model.blur_shader.blur_alpha))
            .set(model.ids.blur_alpha, ui)
        {
            model.blur_shader.blur_alpha = value;
        }
    }

    // Encapsulate the drawing stuff so that the window isn't borrowed when calling quit
    let snapshot = {
        // Do the drawing in update for hi-res texture rendering reasons
        // First, reset the `draw` state.
        let draw = &model.draw;
        draw.reset();

        // Create a `Rect` for our texture to help with drawing.
        let [w, h] = model.texture.size();
        let win = geom::Rect::from_w_h(w as f32, h as f32);

        // Setup rendering to texture
        let window = app.main_window();
        let device = window.swap_chain_device();
        let ce_desc = wgpu::CommandEncoderDescriptor {
            label: Some("texture renderer"),
        };

        ////////////////////////////////////////////////////////////////////////// DO ALL OF THE DRAWING STUFF

        // Clear the background
        draw.background()
            .color(hsl(0.6, 0.1, model.background_lightness));

        // let win = app.window_rect();

        let name = &model.sites[model.selected_site].name;
        let timestamp =
            &model.sites[model.selected_site].trace_datas[model.selected_visit].timestamp;
        let color_type = match model.color_mode {
            ColorMode::Script => "script colour",
            ColorMode::Profile => "profile index colour",
            ColorMode::Selected => "selection colour",
        };
        let visualisation_type = model.draw_mode.to_str();

        if model.show_text {
            let full_text = format!(
                "{}\n{}\n\n{}\n{}",
                name, timestamp, visualisation_type, color_type
            );
            if let Some(font) = &model.font {
                draw.text(&full_text)
                    .font_size(32)
                    .align_text_bottom()
                    .right_justify()
                    // .x_y(0.0, 0.0)
                    .wh(win.clone().pad(40.).wh())
                    .font(font.clone())
                    // .x_y(win.right()-130.0, win.bottom() + 10.0)
                    .color(LIGHTGREY);
            } else {
                draw.text(&full_text)
                    .font_size(32)
                    .align_text_bottom()
                    .right_justify()
                    // .x_y(0.0, 0.0)
                    .wh(win.clone().pad(40.).wh())
                    // .x_y(win.right()-130.0, win.bottom() + 10.0)
                    .color(LIGHTGREY);
            }
        }

        // draw.to_frame(app, &frame).unwrap();
        let mut encoder = device.create_command_encoder(&ce_desc);
        model
            .renderer
            .render_to_texture(device, &mut encoder, draw, &model.texture);
        draw.reset();

        use nannou::wgpu::ToTextureView;
        let texture_view = model.texture.to_texture_view();

        // let mut encoder = frame.command_encoder();

        match &model.draw_mode {
            DrawMode::GraphDepth(gddm) => match gddm {
                GraphDepthDrawMode::Horizontal => {
                    draw_functions::draw_horizontal_graph_depth(&draw, &model, &win);
                    model
                        .renderer
                        .render_to_texture(device, &mut encoder, &draw, &model.texture);
                }
                GraphDepthDrawMode::Vertical => {
                    draw_functions::draw_vertical_graph_depth(&draw, &model, &win);
                    model
                        .renderer
                        .render_to_texture(device, &mut encoder, &draw, &model.texture);
                }
                GraphDepthDrawMode::Polar => {
                    draw_functions::draw_polar_depth_graph(&draw, &model, &win);
                    model
                        .renderer
                        .render_to_texture(device, &mut encoder, &draw, &model.texture);
                }
                GraphDepthDrawMode::PolarGrid => {
                    draw_functions::draw_flower_grid_graph_depth(&draw, &model, &win);
                    model
                        .renderer
                        .render_to_texture(device, &mut encoder, &draw, &model.texture);
                }
                GraphDepthDrawMode::Rings(ref wgpu_shader_data) => {
                    draw_functions::draw_depth_graph_rings(
                        &draw,
                        &model,
                        &app.main_window(),
                        &win,
                        &mut encoder,
                        &texture_view,
                        &mut wgpu_shader_data.borrow_mut(),
                    );
                    model
                        .renderer
                        .render_to_texture(device, &mut encoder, &draw, &model.texture);
                }
                GraphDepthDrawMode::PolarAxes => {
                    draw_functions::draw_polar_axes_depth_graph(&draw, &model, &win);
                    model
                        .renderer
                        .render_to_texture(device, &mut encoder, &draw, &model.texture);
                }
                GraphDepthDrawMode::PolarAxesRolling => {
                    draw_functions::draw_polar_axes_rolling_depth_graph(&draw, &model, &win);
                    model
                        .renderer
                        .render_to_texture(device, &mut encoder, &draw, &model.texture);
                }
                GraphDepthDrawMode::AllSitesPolarAxes => {
                    draw_functions::draw_all_sites_single_visit_polar_axes_depth_graph(
                        &draw, &model, &win,
                    );
                    model
                        .renderer
                        .render_to_texture(device, &mut encoder, &draw, &model.texture);
                }
                GraphDepthDrawMode::TriangleRolling => {
                    draw_functions::draw_triangle_rolling_depth_graph(&draw, &model, &win);
                    model
                        .renderer
                        .render_to_texture(device, &mut encoder, &draw, &model.texture);
                }
            },
            DrawMode::Indentation(pdm) => match pdm {
                ProfileDrawMode::SingleFlower => {
                    draw_functions::draw_single_flower_indentation(&draw, &model, &win);
                }
            },
            DrawMode::LineLength(pdm) => match pdm {
                ProfileDrawMode::SingleFlower => {
                    draw_functions::draw_single_flower_line_length(&draw, &model, &win);
                }
            },
            DrawMode::Coverage(cdm) => match cdm {
                CoverageDrawMode::HeatMap => {
                    draw_functions::draw_coverage_heat_map(&draw, &model, &win);
                    model
                        .renderer
                        .render_to_texture(device, &mut encoder, &draw, &model.texture);
                }
                CoverageDrawMode::Blob => {
                    draw_functions::draw_coverage_blob(&draw, &model, &win);
                    model
                        .renderer
                        .render_to_texture(device, &mut encoder, &draw, &model.texture);
                }
                CoverageDrawMode::SmoothBlob => {
                    draw_functions::draw_smooth_coverage_blob(&draw, &model, &win);
                    model
                        .renderer
                        .render_to_texture(device, &mut encoder, &draw, &model.texture);
                }
                CoverageDrawMode::Spacebrush => {
                    draw_functions::draw_coverage_spacebrush(&draw, &model, &win);
                    model
                        .renderer
                        .render_to_texture(device, &mut encoder, &draw, &model.texture);
                }
                CoverageDrawMode::GemStone(ref wgpu_shader_data) => {
                    draw_functions::draw_coverage_organic(
                        &draw,
                        &model,
                        &app.main_window(),
                        &win,
                        &mut encoder,
                        &texture_view,
                        &mut wgpu_shader_data.borrow_mut(),
                    );
                }
                CoverageDrawMode::Shell(ref wgpu_shader_data) => {
                    draw_functions::draw_coverage_shell(
                        &draw,
                        &model,
                        &app.main_window(),
                        &win,
                        &mut encoder,
                        &texture_view,
                        &mut wgpu_shader_data.borrow_mut(),
                    );
                }
                CoverageDrawMode::Voronoi(ref voronoi_shader) => {
                    let mut cols = [[0.; 4]; 4];
                    for (i, rgb) in model.rgb_selectors.iter().enumerate() {
                        cols[i] = [rgb.r, rgb.g, rgb.b, 1.0];
                    }
                    draw_functions::draw_coverage_voronoi(
                        &draw,
                        &model,
                        &app.main_window(),
                        &win,
                        cols,
                        &mut encoder,
                        &texture_view,
                        &mut voronoi_shader.borrow_mut(),
                    );
                    model
                        .renderer
                        .render_to_texture(device, &mut encoder, &draw, &model.texture);

                    // Try drawing the text on top
                    // draw.reset();
                    // draw.text(&full_text)
                    //     .font_size(16)
                    //     .align_text_bottom()
                    //     .right_justify()
                    //     // .x_y(0.0, 0.0)
                    //     .wh(win.clone().pad(20.).wh())
                    //     .font(model.font.clone())
                    //     // .x_y(win.right()-130.0, win.bottom() + 10.0)
                    //     .color(DARKGREY);

                    // model
                    //     .renderer
                    //     .render_to_texture(device, &mut encoder, &draw, &model.texture);
                }
            },
        };

        ////////////////////////////////////////////////////////////////////////// END DO ALL OF THE DRAWING STUFF

        // Render our drawing to the texture.
        // model
        //     .renderer
        //     .render_to_texture(device, &mut encoder, draw, &model.texture);

        // Apply the post processing to the high res texture
        model
            .blur_shader
            .view(&mut encoder, &model.texture, &texture_view, &window);

        // Take a snapshot of the texture. The capturer will do the following:
        //
        // 1. Resolve the texture to a non-multisampled texture if necessary.
        // 2. Convert the format to non-linear 8-bit sRGBA ready for image storage.
        // 3. Copy the result to a buffer ready to be mapped for reading.
        let snapshot = model
            .texture_capturer
            .capture(device, &mut encoder, &model.texture);

        // Submit the commands for our drawing and texture capture to the GPU.
        window.swap_chain_queue().submit(Some(encoder.finish()));
        snapshot
    };

    // update frame rendering
    match &mut model.render_state {
        RenderState::RenderAllTraces { current_trace } => {
            // We must wait until the first trace has been drawn before saving it.
            // Capture the frame!
            let name = &model.sites[model.selected_site].trace_datas[model.selected_visit].name;
            let timestamp =
                &model.sites[model.selected_site].trace_datas[model.selected_visit].timestamp;
            let file_path = if model.render_video {
                rendering_frame_path(app, &model.draw_mode, name, *current_trace)
            } else {
                rendering_visit_path(app, &model.draw_mode, name, timestamp)
            };

            // Submit a function for writing our snapshot to a PNG.
            //
            // NOTE: It is essential that the commands for capturing the snapshot are `submit`ted before we
            // attempt to read the snapshot - otherwise we will read a blank texture!

            // Note: Saves the snapshot on a different thread
            snapshot
                .read(move |result| {
                    let image = result.expect("failed to map texture memory").to_owned();
                    image
                        .save(&file_path)
                        .expect("failed to save texture to png image");
                })
                .unwrap();

            // Select the next visit for rendering
            *current_trace += 1;
            model.selected_visit = *current_trace;

            // Are we done?
            if *current_trace == model.sites[model.selected_site].trace_datas.len() {
                // All traces have been rendered
                model.render_state = RenderState::NoRendering;
                model.selected_visit = 0;
                if model.render_video {
                    let name =
                        &model.sites[model.selected_site].trace_datas[model.selected_visit].name;
                    let [w, h] = model.texture.size();
                    let video_path = rendering_video_path(app, &model.draw_mode, name);
                    let frame_folder_path =
                        rendering_frame_folder_path(app, &model.draw_mode, name);
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
                }
            }
        }
        RenderState::NoRendering => (),
        RenderState::RenderSingleTraceThenExit { output_path } => {
            let file_path = if let Some(path) = output_path {
                path.clone()
            } else {
                let name = &model.sites[model.selected_site].trace_datas[model.selected_visit].name;
                let timestamp =
                    &model.sites[model.selected_site].trace_datas[model.selected_visit].timestamp;
                rendering_visit_path(app, &model.draw_mode, name, timestamp)
            };

            println!("Writing image to path: {}", file_path.to_str().unwrap());

            // Submit a function for writing our snapshot to a PNG.
            //
            // NOTE: It is essential that the commands for capturing the snapshot are `submit`ted before we
            // attempt to read the snapshot - otherwise we will read a blank texture!

            snapshot
                .read(move |result| {
                    let image = result.expect("failed to map texture memory").to_owned();
                    image
                        .save(&file_path)
                        .expect("failed to save texture to png image");
                })
                .unwrap();

            // Try to read the snapshot on the current thread instead
            // Warning:
            // This blocks indefinitely because the texture is never finished.
            // Something further down has to be run first. Waiting on the next
            // frame should be better. use futures::executor::block_on;

            // let snapshot_result = block_on(snapshot.read_async());
            // let image = snapshot_result
            //     .expect("failed to map texture memory")
            //     .to_owned();
            // image
            //     .save(&file_path)
            //     .expect("failed to save texture to png image");

            model.render_state = RenderState::Exit;
            println!("Done!");
            // Hopefully the exit function will wait for the screenshot to be saved here
        }
        RenderState::Exit => {
            // Wait for rendering to file
            println!("Waiting for PNG writing to complete...");
            {
                let window = app.main_window();
                let device = window.swap_chain_device();
                model
                    .texture_capturer
                    .await_active_snapshots(&device)
                    .unwrap();
            }
            app.quit();
        }
        RenderState::Screenshot => {
            // Capture the frame!
            let file_path = captured_frame_path(app);
            snapshot
                .read(move |result| {
                    let image = result.expect("failed to map texture memory").to_owned();
                    image
                        .save(&file_path)
                        .expect("failed to save texture to png image");
                })
                .unwrap();
            model.render_state = RenderState::NoRendering;
        }
    }
}

fn view(app: &App, model: &Model, frame: Frame) {
    // Sample the texture and write it to the frame.
    {
        let mut encoder = frame.command_encoder();
        model
            .texture_reshaper
            .encode_render_pass(frame.texture_view(), &mut *encoder);
    }

    if model.show_gui {
        // Draw the state of the `Ui` to the frame.
        model.ui.draw_to_frame(app, &frame).unwrap();
    }
}

fn window_event(app: &App, model: &mut Model, event: WindowEvent) {
    match event {
        KeyPressed(key) => match key {
            Key::A => {
                match &mut model.draw_mode {
                    DrawMode::GraphDepth(ref mut gddm) => match gddm {
                        GraphDepthDrawMode::Horizontal => *gddm = GraphDepthDrawMode::Vertical,
                        GraphDepthDrawMode::Vertical => *gddm = GraphDepthDrawMode::Polar,
                        GraphDepthDrawMode::Polar => *gddm = GraphDepthDrawMode::PolarGrid,
                        GraphDepthDrawMode::PolarGrid => {
                            *gddm =
                                GraphDepthDrawMode::rings(&app.main_window(), model.texture.size())
                        }
                        GraphDepthDrawMode::Rings(_) => *gddm = GraphDepthDrawMode::PolarAxes,
                        GraphDepthDrawMode::PolarAxes => {
                            *gddm = GraphDepthDrawMode::PolarAxesRolling
                        }
                        GraphDepthDrawMode::PolarAxesRolling => {
                            *gddm = GraphDepthDrawMode::TriangleRolling
                        }
                        GraphDepthDrawMode::TriangleRolling => {
                            *gddm = GraphDepthDrawMode::AllSitesPolarAxes
                        }
                        GraphDepthDrawMode::AllSitesPolarAxes => {
                            *gddm = GraphDepthDrawMode::Horizontal
                        }
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
                            *cdm = CoverageDrawMode::shell(&app.main_window(), model.texture.size())
                        }
                        CoverageDrawMode::Shell(_) => {
                            *cdm = CoverageDrawMode::gem_stone(
                                &app.main_window(),
                                model.texture.size(),
                            )
                        }
                        CoverageDrawMode::GemStone(_) => {
                            *cdm =
                                CoverageDrawMode::voronoi(&app.main_window(), model.texture.size())
                        }
                        CoverageDrawMode::Voronoi(_) => *cdm = CoverageDrawMode::HeatMap,
                    },
                }
                set_blur_shader_params(model);
            }
            Key::D => {
                match &mut model.draw_mode {
                    DrawMode::GraphDepth(ref mut gddm) => match gddm {
                        GraphDepthDrawMode::Horizontal => {
                            *gddm = GraphDepthDrawMode::AllSitesPolarAxes
                        }
                        GraphDepthDrawMode::Vertical => *gddm = GraphDepthDrawMode::Horizontal,
                        GraphDepthDrawMode::Polar => *gddm = GraphDepthDrawMode::Vertical,
                        GraphDepthDrawMode::PolarGrid => *gddm = GraphDepthDrawMode::Polar,
                        GraphDepthDrawMode::Rings(_) => *gddm = GraphDepthDrawMode::PolarGrid,
                        GraphDepthDrawMode::PolarAxes => {
                            *gddm =
                                GraphDepthDrawMode::rings(&app.main_window(), model.texture.size())
                        }
                        GraphDepthDrawMode::PolarAxesRolling => {
                            *gddm = GraphDepthDrawMode::PolarAxes
                        }
                        GraphDepthDrawMode::TriangleRolling => {
                            *gddm = GraphDepthDrawMode::PolarAxesRolling
                        }
                        GraphDepthDrawMode::AllSitesPolarAxes => {
                            *gddm = GraphDepthDrawMode::TriangleRolling
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
                            *cdm =
                                CoverageDrawMode::voronoi(&app.main_window(), model.texture.size())
                        }
                        CoverageDrawMode::Blob => *cdm = CoverageDrawMode::HeatMap,
                        CoverageDrawMode::SmoothBlob => *cdm = CoverageDrawMode::Blob,
                        CoverageDrawMode::Spacebrush => *cdm = CoverageDrawMode::SmoothBlob,
                        CoverageDrawMode::Shell(_) => *cdm = CoverageDrawMode::Spacebrush,
                        CoverageDrawMode::GemStone(_) => {
                            *cdm = CoverageDrawMode::shell(&app.main_window(), model.texture.size())
                        }
                        CoverageDrawMode::Voronoi(_) => {
                            *cdm = CoverageDrawMode::gem_stone(
                                &app.main_window(),
                                model.texture.size(),
                            )
                        }
                    },
                }
                set_blur_shader_params(model);
            }
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
                };
                set_blur_shader_params(model);
            }
            Key::S => {
                model.draw_mode = match &model.draw_mode {
                    DrawMode::GraphDepth(_gddm) => DrawMode::Coverage(CoverageDrawMode::HeatMap),
                    DrawMode::Indentation(_pdm) => DrawMode::GraphDepth(GraphDepthDrawMode::Polar),
                    DrawMode::LineLength(_pdm) => {
                        DrawMode::Indentation(ProfileDrawMode::SingleFlower)
                    }
                    DrawMode::Coverage(_cdm) => DrawMode::LineLength(ProfileDrawMode::SingleFlower),
                };
                set_blur_shader_params(model);
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
                model.render_state = RenderState::Screenshot;
            }
            Key::T => {
                // // Send graph data via osc
                // model.sites[model.selected_site].trace_datas[model.selected_visit]
                //     .graph_data
                //     .send_script_data_osc(&model.sender);
            }
            Key::R => {
                model.render_state = RenderState::RenderAllTraces { current_trace: 0 };
            }
            Key::G => {
                model.show_gui = !model.show_gui;
            }
            Key::Space => {}
            _ => (),
        },
        KeyReleased(_key) => {}
        MouseMoved(pos) => {
            // model.param1 = (pos.x + app.window_rect().w() / 2.0) / app.window_rect().w();
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

fn set_blur_shader_params(model: &mut Model) {
    match &model.draw_mode {
        DrawMode::Coverage(cdm) => {
            let bs = &mut model.blur_shader;
            bs.blur_size = 128;
            bs.sigma = 64.0;
            bs.contrast = 1.80;
            bs.lightness = 1.13;
            bs.blur_alpha = 0.6;
        }
        DrawMode::GraphDepth(gdm) => {
            let bs = &mut model.blur_shader;
            bs.blur_size = 128;
            bs.sigma = 30.0;
            bs.contrast = 1.14;
            bs.lightness = 1.75;
            bs.blur_alpha = 0.67;
        }
        _ => (),
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
    let path = rendering_frame_folder_path(app, draw_mode, name)
        .join(format!("{:04}", frame_number))
        // The extension will be PNG. We also support tiff, bmp, gif, jpeg, webp and some others.
        .with_extension("png");
    // Create the parent dir of the new file if it doesn't exist
    let mut new_path_parent = path.clone();
    new_path_parent.pop();
    fs::create_dir_all(new_path_parent).expect("Failed to create directory for screenshots");
    path
}
fn rendering_visit_path(
    app: &App,
    draw_mode: &DrawMode,
    name: &str,
    timestamp: &str,
) -> std::path::PathBuf {
    // Create a path that we want to save this frame to.
    // let now: DateTime<Utc> = Utc::now();
    let path = rendering_frame_folder_path(app, draw_mode, name)
        .join(timestamp)
        // The extension will be PNG. We also support tiff, bmp, gif, jpeg, webp and some others.
        .with_extension("png");
    // Create the parent dir of the new file if it doesn't exist
    let mut new_path_parent = path.clone();
    new_path_parent.pop();
    fs::create_dir_all(new_path_parent).expect("Failed to create directory for screenshots");
    path
}

fn rendering_video_path(app: &App, draw_mode: &DrawMode, name: &str) -> std::path::PathBuf {
    // Create a path that we want to save this frame to.
    // let now: DateTime<Utc> = Utc::now();
    let path = app
        .project_path()
        .expect("failed to locate `project_path`")
        // Capture all frames to a directory called `/<path_to_nannou>/nannou/simple_capture`.
        .join("renders")
        .join(name)
        .join(&format!("{}_{}", name, draw_mode.to_str()))
        .with_extension("mp4");
    // Create the parent dir of the new file if it doesn't exist
    let mut new_path_parent = path.clone();
    new_path_parent.pop();
    fs::create_dir_all(new_path_parent).expect("Failed to create directory for screenshots");
    path
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

// Wait for capture to finish.
fn exit(app: &App, model: Model) {
    println!("Waiting for PNG writing to complete...");
    let window = app.main_window();
    let device = window.swap_chain_device();
    model
        .texture_capturer
        .await_active_snapshots(&device)
        .unwrap();
    println!("Done!");
}
