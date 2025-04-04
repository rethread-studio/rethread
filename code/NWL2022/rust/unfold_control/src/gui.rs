use std::time::Duration;

use bevy::{
    input::mouse::{MouseMotion, MouseWheel},
    math::vec3,
    prelude::*,
    render::camera::Projection,
};
use bevy_egui::{egui, EguiContext, EguiPlugin};
use bevy_inspector_egui::WorldInspectorPlugin;
use bevy_inspector_egui::{Inspectable, InspectorPlugin};
use rfd::FileDialog;

use crate::{get_args, scheduler::SchedulerMessage, score::Score};

use super::Trace;
use super::{AnimationCallData, NUM_LEDS_X, NUM_LEDS_Y};

pub fn run_gui() {
    let args = get_args();
    App::new()
        .insert_resource(ClearColor(Color::rgb(0.01, 0.01, 0.03)))
        .insert_resource(AnimationTimer(Timer::from_seconds(0.025, true)))
        .insert_resource(Trace::new(&args.trace))
        .insert_resource(Score::feet_under_80())
        .add_plugins(DefaultPlugins)
        .add_plugin(EguiPlugin)
        .add_plugin(InspectorPlugin::<GlobalSettings>::new())
        // .insert_resource(GlobalSettings::default())
        // .add_plugin(EguiPlugin)
        .add_plugin(WorldInspectorPlugin::new())
        .add_startup_system(setup)
        .add_startup_system(spawn_camera)
        .add_system(pan_orbit_camera)
        .add_system(cursor_position)
        .add_system(led_animation_from_trace)
        .add_system(bevy_ui)
        .run();
}
#[derive(PartialEq, Eq, Copy, Clone, Debug)]
enum Side {
    Left,
    Right,
    Any,
}
#[derive(Component, Eq, Copy, Clone, Debug)]
struct LedPosition {
    x: i32,
    y: i32,
    side: Side,
}
impl PartialEq for LedPosition {
    fn ne(&self, other: &Self) -> bool {
        !self.eq(other)
    }

    fn eq(&self, other: &Self) -> bool {
        self.x == other.x
            && self.y == other.y
            && (self.side == other.side
                || matches!(self.side, Side::Any)
                || matches!(other.side, Side::Any))
    }
}
#[derive(Component)]
struct OnOff(bool);

struct AnimationTimer(Timer);
/// In XYZ order e.g. DepthSupplierDependency where Depth is mapped to the x axis, Supplier to the y axis and Dependency to the z axis
#[derive(Inspectable)]
enum CallToCoordinateMapping {
    DepthSupplierDependency,
    SupplierDependencyDepth,
    TimeSupplierDependency,
}

#[derive(Inspectable)]
struct GlobalSettings {
    old_play: bool,
    play: bool,
    use_point_lights: bool,
    interpolate_depth: bool,
    #[inspectable(min = 1, max = 100)]
    num_leds_in_trace: usize,
    current_led_colour: Color,
    led_radius: f32,
    led_intensity: f32,
    led_depth: usize,
    call_to_coordinate_mapping: CallToCoordinateMapping,
    mouse_position: Vec2,
    min_length: usize,
}
impl Default for GlobalSettings {
    fn default() -> Self {
        Self {
            play: false,
            old_play: false,
            use_point_lights: false,
            interpolate_depth: false,
            num_leds_in_trace: 3,
            current_led_colour: Color::RED,
            led_depth: 10,
            led_radius: 0.,
            led_intensity: 1000.,
            call_to_coordinate_mapping: CallToCoordinateMapping::DepthSupplierDependency,
            mouse_position: bevy::math::vec2(0., 0.),
            min_length: 100,
        }
    }
}

// Animation:
// Every row is one call.
// Show calls in order from top to bottom
// The number of leds from the center depends on the depth / max depth of any call
// The left color depends on the dependency
// The right color depends on the supplier
//
fn led_animation_from_trace(
    _time: Res<Time>,
    settings: Res<GlobalSettings>,
    mut commands: Commands,
    _timer: ResMut<AnimationTimer>,
    mut trace: ResMut<Trace>,
    mut materials: ResMut<Assets<StandardMaterial>>,
    mut query: Query<(
        &LedPosition,
        &mut Handle<StandardMaterial>,
        &mut OnOff,
        &mut Transform,
        Entity,
        Option<&Children>,
    )>,
    mut lights: Query<(&mut PointLight, Entity)>,
) {
    // Set old lights to white
    // for old_light in &trace.lit_leds {
    //     for (matrix_position, mut material, onoff, mut transform, entity, children) in
    //         query.iter_mut()
    //     {
    //         if entity == *old_light {
    //             let material = materials.get_mut(&material).unwrap();
    //             // material.base_color = Color::WHITE;
    //             material.base_color = Color::rgba(1., 1., 1., 0.5);
    //             // material.emissive = Color::WHITE;

    //             if let Some(children) = children {
    //                 for child in children {
    //                     for (mut pl, pl_entity) in lights.iter_mut() {
    //                         if pl_entity == *child {
    //                             pl.color = Color::WHITE;
    //                         }
    //                     }
    //                 }
    //             }
    //         }
    //     }
    // }
    while let Some(_new_index) = trace.get_new_index() {
        for (_matrix_position, material, mut onoff, mut transform, _entity, children) in
            query.iter_mut()
        {
            const DEFAULT_COLOR: Color = Color::WHITE;
            const FALLOFF: f32 = 0.55;
            let material = materials.get_mut(&material).unwrap();
            material.base_color = DEFAULT_COLOR;
            material.emissive = DEFAULT_COLOR;
            // transform.scale *= FALLOFF;

            // transform.scale = vec3(1., 1., 1.);
            if transform.scale.x < 0.1 {
                if let Some(children) = children {
                    for child in children {
                        // despawn_recursive also removes the child from the parent
                        commands.entity(*child).despawn_recursive();
                    }
                    onoff.0 = false;
                }
            }
        }
        if settings.play {
            let num_depth_points = trace.trace.depth_envelope.sections.len();
            let mut depth_point =
                trace.trace.depth_envelope.sections[trace.current_depth_envelope_index];
            while trace.current_index > depth_point.end_index
                || trace.current_index < depth_point.start_index
            {
                trace.current_depth_envelope_index += 1;
                trace.current_depth_envelope_index %= num_depth_points;
                depth_point =
                    trace.trace.depth_envelope.sections[trace.current_depth_envelope_index];
            }
            let _state = depth_point.state;
            for y_pos in 0..NUM_LEDS_Y {
                let index = trace.current_index as i32 - y_pos as i32;
                if index >= 0 {
                    let AnimationCallData {
                        num_leds,
                        left_color,
                        right_color,
                    } = trace.get_animation_call_data(index as usize);
                    let mut led_positions = vec![];
                    for x in 0..num_leds {
                        led_positions.push(LedPosition {
                            x: x as i32,
                            y: y_pos as i32,
                            side: Side::Any,
                        });
                    }

                    for (led_position, material, mut onoff, mut transform, entity, children) in
                        query.iter_mut()
                    {
                        if led_positions.contains(led_position) {
                            // Turn on the new light
                            let new_color = match led_position.side {
                                Side::Left => left_color.clone(),
                                Side::Right => right_color.clone(),
                                Side::Any => unreachable!(),
                            };
                            let material = materials.get_mut(&material).unwrap();
                            material.base_color = new_color.clone();
                            material.emissive = new_color.clone();
                            transform.scale = vec3(3., 3., 3.);
                            if !onoff.0 && led_position.x == 0 {
                                if settings.use_point_lights {
                                    let light = commands
                                        .spawn_bundle(PointLightBundle {
                                            // transform: transform.clone(),
                                            point_light: PointLight {
                                                intensity: settings.led_intensity,
                                                range: 50.,
                                                radius: settings.led_radius,
                                                color: new_color.clone(),
                                                shadows_enabled: true,
                                                ..default()
                                            },
                                            ..default()
                                        })
                                        .id();
                                    commands.entity(entity).add_child(light);
                                    onoff.0 = true;
                                }
                            } else {
                                // The light already exists, but we want to set it to the active colour
                                if let Some(children) = children {
                                    for child in children {
                                        for (mut pl, pl_entity) in lights.iter_mut() {
                                            if pl_entity == *child {
                                                pl.color = new_color.clone();
                                                pl.radius = settings.led_radius;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

fn cursor_position(windows: Res<Windows>, mut settings: ResMut<GlobalSettings>) {
    // Games typically only have one window (the primary window).
    // For multi-window applications, you need to use a specific window ID here.
    let window = windows.get_primary().unwrap();

    if let Some(position) = window.cursor_position() {
        // cursor is inside the window, position given
        settings.mouse_position = position / Vec2::new(window.width(), window.height());

        let pan_pos_radians = settings.mouse_position.x * std::f32::consts::FRAC_PI_2;
        let _left_gain = (pan_pos_radians).cos();
        let _right_gain = (pan_pos_radians).sin();
        // println!("left: {left_gain:.3} right: {right_gain:.3}");
    } else {
        // cursor is not inside the window
    }
}

#[derive(Component)]
struct LedMatrix;
#[derive(Component)]
struct TurbineHall;

/// set up a simple 3D scene
fn setup(
    _trace: Res<Trace>,
    _settings: Res<GlobalSettings>,
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<StandardMaterial>>,
    asset_server: Res<AssetServer>,
) {
    // TODO: Create the grid based on the trace size. Make the supplier/dependency order deterministic.
    let size_y = NUM_LEDS_Y as i32;
    let size_x = NUM_LEDS_X as i32;
    let y_offset = 4.9;
    let length_x = 1;
    let length_y = 4;
    let length_z = 1;
    let z_offset = -1.0;
    let parent = commands
        // For the hierarchy to work certain Components need to exist. SpatialBundle provides those.
        .spawn_bundle(SpatialBundle::default())
        .insert(LedMatrix)
        .id();

    for side in 0..2 {
        let (x_offset, x_multiplier) = match side {
            0 => (-length_x as f32, -1.),
            _ => (length_x as f32, 1.),
        };
        for x in 0..size_x {
            let x_pos = (((x as f32 + 0.5) / size_x as f32) * length_x as f32
                - (length_x as f32 / 2.0))
                * x_multiplier
                + x_offset;
            let z_pos = ((x as f32 + 0.5) / size_x as f32) * length_z as f32 + z_offset;
            for y in 0..size_y {
                // for (supplier, y) in suppliers {
                // let dependency_map = trace.dependency_index.get(supplier).unwrap();
                // let size_x = dependency_map.len() as i32;
                // let mut dependencies: Vec<(&String, &usize)> = dependency_map.iter().collect();
                // dependencies.sort_unstable_by_key(|a| a.1);
                // for (dependency, x) in dependencies {
                // sphere
                let child = commands
                    .spawn_bundle(PbrBundle {
                        mesh: meshes.add(Mesh::from(shape::Icosphere {
                            radius: 0.020,
                            subdivisions: 16,
                        })),
                        material: materials.add(StandardMaterial {
                            base_color: Color::hex("0f0").unwrap(),
                            // vary key PBR parameters on a grid of spheres to show the effect
                            metallic: 0.5,
                            // emissive: Color::hsl(z as f32 * 36.0, 0.8, 0.8),
                            perceptual_roughness: 0.5,
                            unlit: true,
                            ..default()
                        }),
                        // transform: Transform::from_xyz(
                        //     ((x as f32 + 0.5) / size_x as f32) * length_x - (length_x / 2.0) + 0.5,
                        //     (y as f32 / size_y as f32) * length_y + y_offset,
                        //     ((z as f32 + 0.5) / size_z as f32) * -7.,
                        // ),
                        transform: Transform::from_xyz(
                            x_pos,
                            (y as f32 / size_y as f32) * length_y as f32 + y_offset,
                            z_pos,
                        ),
                        ..default()
                    })
                    .insert(LedPosition {
                        x: x as i32,
                        y: y as i32,
                        side: if side == 0 { Side::Left } else { Side::Right },
                    })
                    .insert(OnOff(false))
                    .id();

                commands.entity(parent).push_children(&[child]);
            }
        }
    }
    // let box_y = 10.;
    // let box_x = 12.;
    // let box_z = 14.;
    // let box_z_offset = -2.;
    // let wall_color = Color::rgba(5. / 255., 6. / 255., 14. / 255., 1.0);
    // ground plane
    // commands.spawn_bundle(PbrBundle {
    //     mesh: meshes.add(Mesh::from(shape::Box::new(box_x, 0.1, box_z))),
    //     material: materials.add(StandardMaterial {
    //         base_color: wall_color,
    //         reflectance: 0.8,
    //         perceptual_roughness: 0.0,
    //         ..default()
    //     }),
    //     transform: Transform::from_xyz(0., 0., box_z_offset),
    //     ..default()
    // });
    // let mut transform = Transform::from_xyz(0., box_y + 2.0, -5.);
    // transform.rotate_x(std::f32::consts::PI * 0.75);
    // commands.spawn_bundle(PbrBundle {
    //     mesh: meshes.add(Mesh::from(shape::Plane { size: 12.0 })),
    //     material: materials.add(StandardMaterial {
    //         base_color: wall_color,
    //         reflectance: 0.8,
    //         perceptual_roughness: 0.0,
    //         ..default()
    //     }),
    //     transform,
    //     ..default()
    // });
    // commands.spawn_bundle(PbrBundle {
    //     mesh: meshes.add(Mesh::from(shape::Box::new(box_x as f32, box_y as f32, 0.1))),
    //     transform: Transform::from_xyz(0., box_y as f32 * 0.5, box_z * -0.5 + box_z_offset),
    //     material: materials.add(StandardMaterial {
    //         base_color: wall_color,
    //         reflectance: 1.0,
    //         perceptual_roughness: 0.0,
    //         ..default()
    //     }),
    //     ..default()
    // });
    // commands.spawn_bundle(PbrBundle {
    //     mesh: meshes.add(Mesh::from(shape::Box::new(0.1, box_y as f32, box_z as f32))),
    //     transform: Transform::from_xyz(box_x as f32 * 0.5, box_y * 0.5, box_z_offset),
    //     material: materials.add(StandardMaterial {
    //         base_color: wall_color,
    //         reflectance: 1.0,
    //         perceptual_roughness: 0.0,
    //         ..default()
    //     }),
    //     ..default()
    // });
    // commands.spawn_bundle(PbrBundle {
    //     mesh: meshes.add(Mesh::from(shape::Box::new(0.1, box_y as f32, box_z as f32))),
    //     transform: Transform::from_xyz(box_x as f32 * -0.5, box_y * 0.5, box_z_offset),
    //     material: materials.add(StandardMaterial {
    //         base_color: wall_color,
    //         reflectance: 1.0,
    //         perceptual_roughness: 0.0,
    //         ..default()
    //     }),
    //     ..default()
    // });
    // Hall
    let transform = Transform::default();
    commands
        .spawn_bundle(SceneBundle {
            scene: asset_server.load("turbine_hall_from_obj.glb#Scene0"),
            transform,
            visibility: Visibility { is_visible: false },
            ..default()
        })
        .insert(TurbineHall);
    // light
    // commands.spawn_bundle(PointLightBundle {
    //     transform: Transform::from_xyz(50.0, 50.0, 50.0),
    //     point_light: PointLight {
    //         intensity: 600000.,
    //         range: 100.,
    //         ..default()
    //     },
    //     ..default()
    // });
}

/// Tags an entity as capable of panning and orbiting.
#[derive(Component)]
struct PanOrbitCamera {
    /// The "focus point" to orbit around. It is automatically updated when panning the camera
    pub focus: Vec3,
    pub radius: f32,
    pub upside_down: bool,
}

impl Default for PanOrbitCamera {
    fn default() -> Self {
        PanOrbitCamera {
            focus: Vec3::ZERO,
            radius: 5.0,
            upside_down: false,
        }
    }
}

/// Pan the camera with middle mouse click, zoom with scroll wheel, orbit with right mouse click.
fn pan_orbit_camera(
    windows: Res<Windows>,
    mut ev_motion: EventReader<MouseMotion>,
    mut ev_scroll: EventReader<MouseWheel>,
    input_mouse: Res<Input<MouseButton>>,
    keys: Res<Input<KeyCode>>,
    mut query: Query<(&mut PanOrbitCamera, &mut Transform, &Projection)>,
) {
    // change input mapping for orbit and panning here
    let orbit_button = MouseButton::Right;
    let pan_button = MouseButton::Middle;

    let mut pan = Vec2::ZERO;
    let mut rotation_move = Vec2::ZERO;
    let mut scroll = 0.0;
    let mut orbit_button_changed = false;

    if input_mouse.pressed(orbit_button) {
        for ev in ev_motion.iter() {
            rotation_move += ev.delta;
        }
    } else if input_mouse.pressed(pan_button) {
        // Pan only if we're not rotating at the moment
        for ev in ev_motion.iter() {
            pan += ev.delta;
        }
    }
    let keyboard_speed = 10.;
    if keys.pressed(KeyCode::W) {
        pan += Vec2::new(0., keyboard_speed);
    }
    if keys.pressed(KeyCode::S) {
        pan += Vec2::new(0., -keyboard_speed);
    }
    if keys.pressed(KeyCode::A) {
        pan += Vec2::new(keyboard_speed, 0.);
    }
    if keys.pressed(KeyCode::D) {
        pan += Vec2::new(-keyboard_speed, 0.);
    }
    for ev in ev_scroll.iter() {
        scroll += ev.y;
    }
    if input_mouse.just_released(orbit_button) || input_mouse.just_pressed(orbit_button) {
        orbit_button_changed = true;
    }

    for (mut pan_orbit, mut transform, projection) in query.iter_mut() {
        if orbit_button_changed {
            // only check for upside down when orbiting started or ended this frame
            // if the camera is "upside" down, panning horizontally would be inverted, so invert the input to make it correct
            let up = transform.rotation * Vec3::Y;
            pan_orbit.upside_down = up.y <= 0.0;
        }

        let mut any = false;
        if rotation_move.length_squared() > 0.0 {
            any = true;
            let window = get_primary_window_size(&windows);
            let delta_x = {
                let delta = rotation_move.x / window.x * std::f32::consts::PI * 2.0;
                if pan_orbit.upside_down {
                    -delta
                } else {
                    delta
                }
            };
            let delta_y = rotation_move.y / window.y * std::f32::consts::PI;
            let yaw = Quat::from_rotation_y(-delta_x);
            let pitch = Quat::from_rotation_x(-delta_y);
            transform.rotation = yaw * transform.rotation; // rotate around global y axis
            transform.rotation = transform.rotation * pitch; // rotate around local x axis
        } else if pan.length_squared() > 0.0 {
            any = true;
            // make panning distance independent of resolution and FOV,
            let window = get_primary_window_size(&windows);
            if let Projection::Perspective(projection) = projection {
                pan *= Vec2::new(projection.fov * projection.aspect_ratio, projection.fov) / window;
            }
            // translate by local axes
            let right = transform.rotation * Vec3::X * -pan.x;
            let up = transform.rotation * Vec3::Y * pan.y;
            // make panning proportional to distance away from focus point
            let translation = (right + up) * pan_orbit.radius;
            pan_orbit.focus += translation;
        } else if scroll.abs() > 0.0 {
            any = true;
            pan_orbit.radius -= scroll * pan_orbit.radius * 0.2;
            // dont allow zoom to reach zero or you get stuck
            pan_orbit.radius = f32::max(pan_orbit.radius, 0.05);
        }

        if any {
            // emulating parent/child to make the yaw/y-axis rotation behave like a turntable
            // parent = x and y rotation
            // child = z-offset
            let rot_matrix = Mat3::from_quat(transform.rotation);
            transform.translation =
                pan_orbit.focus + rot_matrix.mul_vec3(Vec3::new(0.0, 0.0, pan_orbit.radius));
        }
    }
}

fn get_primary_window_size(windows: &Res<Windows>) -> Vec2 {
    let window = windows.get_primary().unwrap();
    let window = Vec2::new(window.width() as f32, window.height() as f32);
    window
}

/// Spawn a camera like this
fn spawn_camera(mut commands: Commands) {
    let translation = Vec3::new(-2.0, 2.5, 5.0);
    let radius = translation.length();

    commands
        .spawn_bundle(Camera3dBundle {
            transform: Transform::from_translation(translation).looking_at(Vec3::ZERO, Vec3::Y),
            ..Default::default()
        })
        .insert(PanOrbitCamera {
            radius,
            ..Default::default()
        });
}

fn bevy_ui(
    _commands: Commands,
    mut settings: ResMut<GlobalSettings>,
    mut timer: ResMut<AnimationTimer>,
    mut trace: ResMut<Trace>,
    mut score: ResMut<Score>,
    mut turbine_hall_visibility: Query<&mut Visibility, With<TurbineHall>>,
    _query: Query<Entity, With<LedMatrix>>,
    mut egui_context: ResMut<EguiContext>,
) {
    if let Some(scheduler_com) = &mut trace.scheduler_com {
        score.update(scheduler_com);
    }
    egui::Window::new("Settings")
        .id(egui::Id::new(777333))
        .default_pos(egui::pos2(200., 300.))
        .resizable(true)
        .default_width(500.)
        .show(egui_context.ctx_mut(), |ui| {
            ui.checkbox(&mut settings.play, "Play");
            if settings.play != settings.old_play {
                settings.old_play = settings.play;
                if let Some(scheduler_com) = &mut trace.scheduler_com {
                    scheduler_com.play_tx.send(settings.play).unwrap();
                }
            }
            if ui.button("Start score").clicked() {
                if let Some(scheduler_com) = &mut trace.scheduler_com {
                    score.start(scheduler_com);
                }
            }
            if ui.button("Toggle hall visibility").clicked() {
                let mut v = turbine_hall_visibility.single_mut();
                v.is_visible = !v.is_visible;
            }
            ui.collapsing("Jump", |ui| {
                if ui.button("<- previous marker").clicked() {
                    trace.send_scheduler_message(SchedulerMessage::JumpPreviousMarker);
                }
                if ui.button("next marker ->").clicked() {
                    trace.send_scheduler_message(SchedulerMessage::JumpNextMarker);
                }
                if ui.button("next section ->").clicked() {
                    trace.send_scheduler_message(SchedulerMessage::JumpNextSection);
                }
                if ui.button("Start").clicked() {
                    trace.send_scheduler_message(SchedulerMessage::JumpToStart);
                }
                if ui.button("End").clicked() {
                    trace.send_scheduler_message(SchedulerMessage::JumpCloseToEnd);
                }

                ui.add(egui::Slider::new(&mut settings.min_length, 0..=1000).text("min length"));
                let min_length = settings.min_length;
                if ui.button("Deepest section").clicked() {
                    trace
                        .send_scheduler_message(SchedulerMessage::JumpToDeepestSection(min_length));
                }
                if ui.button("Shallowest section").clicked() {
                    trace.send_scheduler_message(SchedulerMessage::JumpToShallowestSection(
                        min_length,
                    ));
                }
                if ui.button("Most diverse section").clicked() {
                    trace.send_scheduler_message(SchedulerMessage::JumpToMostDiverseSection(
                        min_length,
                    ));
                }
                if ui.button("Least diverse section").clicked() {
                    trace.send_scheduler_message(SchedulerMessage::JumpToLeastDiverseSection(
                        min_length,
                    ));
                }
                if ui.button("Stop at next section").clicked() {
                    trace.send_scheduler_message(SchedulerMessage::StopAtNextSection);
                }
            });
            ui.collapsing("Open trace", |ui| {
                if ui.button("Open trace").clicked() {
                    let file = FileDialog::new()
                        .add_filter("deepika2", &["json", "postcard"])
                        .add_filter("All files", &["*"])
                        // .set_directory("/")
                        .pick_file();

                    if let Some(path) = file {
                        *trace = Trace::new(&Some(path));
                    }
                }
                ui.label("Open a .postcard or original unparsed .json trace file");
            });
            let mut seconds = timer.0.duration().as_secs_f32();
            let pre_seconds = seconds;
            ui.add(
                egui::Slider::new(&mut seconds, 0.001..=1.0)
                    .logarithmic(true)
                    .text("Step duration"),
            );
            if seconds != pre_seconds {
                if let Some(scheduler_com) = &mut trace.scheduler_com {
                    scheduler_com.event_duration_tx.send(seconds).unwrap();
                }
            }
            timer.0.set_duration(Duration::from_secs_f32(seconds));
            ui.label(&format!("Current call({}):", trace.current_index));
            if trace.trace.draw_trace.len() > 0 {
                egui::Grid::new("Current call:").show(ui, |ui| {
                    ui.label("Animation data:");
                    let current_index = trace.current_index;
                    ui.label(&format!(
                        "{:#?}:",
                        trace.get_animation_call_data(current_index)
                    ));
                    ui.end_row();
                    {
                        let Trace {
                            trace,
                            current_depth_envelope_index,
                            current_index,

                            num_calls_per_dependency,
                            num_calls_per_supplier,
                            num_calls_per_depth,
                            ..
                        } = &mut *trace;
                        let call = &trace.draw_trace[*current_index];
                        ui.label("Num:");
                        ui.label(&format!("{}", *current_index));
                        ui.end_row();
                        ui.label("Section num:");
                        ui.label(&format!("{}", current_depth_envelope_index));
                        ui.end_row();
                        ui.label("Section:");
                        // egui::ScrollArea::horizontal().show(ui, |ui| {
                        ui.label(&format!(
                            "{:#?}:",
                            trace.depth_envelope.sections[*current_depth_envelope_index]
                        ));
                        // });
                        ui.end_row();
                        ui.label("Call data:");
                        // egui::ScrollArea::horizontal().show(ui, |ui| {
                        ui.label(&format!("{:#?}:", call));
                        // });
                        ui.end_row();
                        ui.label("Depth:");
                        let depth = call.depth;
                        ui.label(&format!("{depth}"));
                        ui.end_row();
                        ui.label("Calls this depth: ");
                        let calls_this_depth = num_calls_per_depth[call.depth as usize];
                        ui.label(&format!("{calls_this_depth}"));
                        ui.end_row();
                        if let Some(supplier) = &call.supplier {
                            let calls_per_supplier = num_calls_per_supplier.get(supplier).unwrap();
                            ui.label("Calls in this supplier");
                            ui.label(&format!("{calls_per_supplier}"));
                            ui.end_row();
                            if let Some(dependency) = &call.dependency {
                                let calls_per_dependency = num_calls_per_dependency
                                    .get(supplier)
                                    .unwrap()
                                    .get(dependency)
                                    .unwrap();
                                ui.label("Calls in this dependency");
                                ui.label(&format!("{calls_per_dependency}"));
                                ui.end_row();
                            }
                        }
                        ui.end_row();
                    }
                });

                // if ui.button("Remove lights").clicked() {
                //     for entity in query.iter() {
                //         // despawn the entity and its children
                //         commands.entity(entity).despawn_recursive();
                //     }
                // }
            }
        });
}
