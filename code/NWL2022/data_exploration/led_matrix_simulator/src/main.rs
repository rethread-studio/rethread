use std::time::Duration;

use bevy::{
    ecs::entity::Entities,
    input::mouse::{MouseButtonInput, MouseMotion, MouseWheel},
    math::vec3,
    prelude::*,
    reflect::TypeUuid,
    render::camera::Projection,
    render::render_resource::{AsBindGroup, ShaderRef},
    utils::HashMap,
    window::CursorMoved,
};
use bevy_egui::{egui, EguiContext, EguiPlugin};
use bevy_inspector_egui::{Inspectable, InspectorPlugin};

mod audio;
use audio::AudioEngine;

use bevy_inspector_egui::WorldInspectorPlugin;
use parser::deepika2::{Call, CallDrawData, Deepika2};
use rand::prelude::*;

fn main() {
    App::new()
        // .insert_resource(ClearColor(Color::rgb(0.1, 0.1, 0.1)))
        .insert_resource(ClearColor(Color::rgb(0.01, 0.01, 0.03)))
        .insert_resource(AnimationTimer(Timer::from_seconds(0.1, true)))
        .insert_resource(Trace::new())
        .insert_resource(OscCommunicator::new())
        // .insert_resource(audio::AudioEngine::new())
        .insert_non_send_resource(AudioEngine::new())
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
        // .add_system(random_onoff)
        .add_system(led_animation_from_trace)
        .add_system(bevy_ui)
        .run();
}

#[derive(Component, PartialEq, Eq, Copy, Clone, Debug)]
struct MatrixPosition {
    x: i32,
    y: i32,
    z: i32,
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

struct OscCommunicator {
    sender: nannou_osc::Sender<nannou_osc::Connected>,
}
impl OscCommunicator {
    pub fn new() -> Self {
        let sender = nannou_osc::sender()
            .unwrap()
            .connect("localhost:57120")
            .unwrap();
        Self { sender }
    }
    pub fn send_call(&mut self, depth: i32, state: parser::deepika2::DepthState) {
        use nannou_osc::Type;
        let state = match state {
            parser::deepika2::DepthState::Stable => 0,
            parser::deepika2::DepthState::Increasing => 1,
            parser::deepika2::DepthState::Decreasing => -1,
        };
        let addr = "/call/";
        let args = vec![Type::Int(depth), Type::Int(state)];
        self.sender.send((addr, args)).ok();
    }
    pub fn send_speed(&mut self, time_between_events: f32) {
        use nannou_osc::Type;
        let addr = "/speed";
        let args = vec![Type::Float(time_between_events)];
        self.sender.send((addr, args)).ok();
    }
}

#[derive(Inspectable)]
struct GlobalSettings {
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
}
impl Default for GlobalSettings {
    fn default() -> Self {
        Self {
            play: false,
            use_point_lights: true,
            interpolate_depth: false,
            num_leds_in_trace: 3,
            current_led_colour: Color::RED,
            led_depth: 10,
            led_radius: 0.,
            led_intensity: 1000.,
            call_to_coordinate_mapping: CallToCoordinateMapping::DepthSupplierDependency,
            mouse_position: bevy::math::vec2(0., 0.),
        }
    }
}

struct Trace {
    trace: Deepika2,
    current_index: usize,
    current_depth_envelope_index: usize,
    supplier_index: HashMap<String, usize>,
    // dependency per supplier
    dependency_index: HashMap<String, HashMap<String, usize>>,
    num_calls_per_supplier: HashMap<String, usize>,
    num_calls_per_dependency: HashMap<String, HashMap<String, usize>>,
    num_calls_per_depth: Vec<usize>,
    lit_leds: Vec<Entity>,
}

impl Trace {
    pub fn new() -> Self {
        let trace = Deepika2::open_or_parse("/home/erik/Hämtningar/nwl2022/data-imagej-copy-paste")
            .unwrap();
        // let trace = Deepika2::new("/home/erik/Hämtningar/nwl2022/data-varna-startup-shutdown.json");
        // let trace =
        //     Deepika2::new("/home/erik/Hämtningar/nwl2022/data-varna-copy-paste-isolated.json");
        // trace.save_to_file_json("/home/erik/Hämtningar/nwl2022/data-jedit-copy-paste_parsed.json");

        let mut num_calls_per_depth = vec![0; trace.max_depth as usize + 1];
        let mut supplier_index = HashMap::new();
        let mut dependency_index = HashMap::new();
        let mut num_calls_per_supplier = HashMap::new();
        let mut num_calls_per_dependency = HashMap::new();
        for call in &trace.draw_trace {
            if let Some(supplier) = &call.supplier {
                num_calls_per_depth[call.depth as usize] += 1;
                let new_index = supplier_index.len();
                supplier_index.entry(supplier.clone()).or_insert(new_index);
                *(num_calls_per_supplier.entry(supplier.clone()).or_insert(0)) += 1;
                if let Some(dependency) = &call.dependency {
                    let dependency_map = dependency_index
                        .entry(supplier.clone())
                        .or_insert(HashMap::new());
                    let new_index = dependency_map.len();
                    dependency_map
                        .entry(dependency.clone())
                        .or_insert(new_index);

                    let mut calls_per_dep = num_calls_per_dependency
                        .entry(supplier.clone())
                        .or_insert(HashMap::new());
                    *calls_per_dep.entry(dependency.clone()).or_insert(0) += 1;
                } else {
                    let dependency_map = dependency_index
                        .entry(supplier.clone())
                        .or_insert(HashMap::new());
                    let new_index = dependency_map.len();
                    dependency_map.entry(String::new()).or_insert(new_index);
                }
            }
        }

        Self {
            trace,
            current_index: 0,
            current_depth_envelope_index: 0,
            supplier_index,
            dependency_index,
            lit_leds: Vec::new(),
            num_calls_per_supplier,
            num_calls_per_dependency,
            num_calls_per_depth,
        }
    }
}

fn matrix_position(
    call: &CallDrawData,
    trace: &Trace,
    call_num: usize,
    size_x: i32,
    size_y: i32,
    size_z: i32,
    settings: &GlobalSettings,
) -> MatrixPosition {
    let supplier = if let Some(supplier) = &call.supplier {
        *trace.supplier_index.get(supplier).unwrap_or(&0)
    } else {
        0
    };
    let dependency_map = if let Some(supplier) = &call.supplier {
        trace.dependency_index.get(supplier)
    } else {
        None
    };
    let dependency = if let Some(map) = dependency_map {
        if let Some(dep) = &call.dependency {
            *map.get(dep).unwrap_or(&0)
        } else {
            0
        }
    } else {
        0
    };

    let new_matrix_position = match settings.call_to_coordinate_mapping {
        CallToCoordinateMapping::DepthSupplierDependency => {
            let x = call.depth % 7;
            let y = supplier as i32 % 7;
            let z = dependency as i32 % num_in_layer_z_at_coordinate(x, y);
            MatrixPosition { x, y, z }
        }
        CallToCoordinateMapping::SupplierDependencyDepth => {
            let x = supplier as i32 % 7;
            let y = dependency as i32 % 7;
            let z = call.depth % num_in_layer_z_at_coordinate(x, y);
            MatrixPosition { x, y, z }
        }
        CallToCoordinateMapping::TimeSupplierDependency => {
            let x = call_num as i32 % 7;
            let y = supplier as i32 % 7;
            let z = dependency as i32 % num_in_layer_z_at_coordinate(x, y);
            MatrixPosition { x, y, z }
        }
    };
    new_matrix_position
}

fn led_animation_from_trace(
    time: Res<Time>,
    settings: Res<GlobalSettings>,
    mut commands: Commands,
    mut timer: ResMut<AnimationTimer>,
    mut trace: ResMut<Trace>,
    mut osc_communicator: ResMut<OscCommunicator>,
    mut materials: ResMut<Assets<StandardMaterial>>,
    mut query: Query<(
        &MatrixPosition,
        &mut Handle<StandardMaterial>,
        &mut OnOff,
        &mut Transform,
        Entity,
        Option<&Children>,
    )>,
    mut lights: Query<(&mut PointLight, Entity)>,
    mut audio_engine: NonSendMut<AudioEngine>,
) {
    if settings.play {
        if timer.0.tick(time.delta()).just_finished() {
            let max_depth = trace.trace.max_depth as f32;
            // Set old lights to white
            for old_light in &trace.lit_leds {
                for (matrix_position, mut material, onoff, mut transform, entity, children) in
                    query.iter_mut()
                {
                    if entity == *old_light {
                        let material = materials.get_mut(&material).unwrap();
                        // material.base_color = Color::WHITE;
                        material.base_color = Color::rgba(1., 1., 1., 0.5);
                        // material.emissive = Color::WHITE;

                        if let Some(children) = children {
                            for child in children {
                                for (mut pl, pl_entity) in lights.iter_mut() {
                                    if pl_entity == *child {
                                        pl.color = Color::WHITE;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            // Turn on the new light
            trace.current_index += 1;
            if trace.current_index >= trace.trace.draw_trace.len() {
                trace.current_index = 0;
            }
            let num_depth_points = trace.trace.depth_envelope.sections.len();
            let mut depth_point =
                trace.trace.depth_envelope.sections[trace.current_depth_envelope_index];
            while trace.current_index > depth_point.end_index {
                trace.current_depth_envelope_index += 1;
                trace.current_depth_envelope_index %= num_depth_points;
                depth_point =
                    trace.trace.depth_envelope.sections[trace.current_depth_envelope_index];
            }
            let state = depth_point.state;
            audio_engine.spawn_sine(
                trace.trace.draw_trace[trace.current_index].depth as f32 * 10.0 + 20.0,
                settings.mouse_position.x,
            );
            // Send osc message to SuperCollider
            {
                let call = &trace.trace.draw_trace[trace.current_index];
                osc_communicator.send_call(call.depth, state);
            }
            let num_calls_into_the_future = match settings.call_to_coordinate_mapping {
                CallToCoordinateMapping::DepthSupplierDependency => 1,
                CallToCoordinateMapping::SupplierDependencyDepth => 1,
                CallToCoordinateMapping::TimeSupplierDependency => 7,
            };
            for call_num in 0..num_calls_into_the_future {
                let call = &trace.trace.draw_trace[trace.current_index + call_num];
                let new_matrix_position =
                    matrix_position(call, &*trace, call_num, 7, 7, 10, &*settings);

                // Test the matrix
                // let x = trace.current_index as i32 % 7;
                // let y = trace.current_index as i32 / 7 % 7;
                // let z = trace.current_index as i32 / 49 % num_in_layer_z_at_coordinate(x, y);
                // let new_matrix_position = MatrixPosition { x, y, z };
                // println!("{new_matrix_position:?}");
                for (matrix_position, mut material, mut onoff, mut transform, entity, children) in
                    query.iter_mut()
                {
                    if *matrix_position == new_matrix_position {
                        let material = materials.get_mut(&material).unwrap();
                        material.base_color = settings.current_led_colour.clone();
                        material.emissive = settings.current_led_colour.clone();
                        if !trace.lit_leds.contains(&entity) {
                            if settings.use_point_lights {
                                let light = commands
                                    .spawn_bundle(PointLightBundle {
                                        // transform: transform.clone(),
                                        point_light: PointLight {
                                            intensity: settings.led_intensity,
                                            range: 50.,
                                            radius: settings.led_radius,
                                            color: settings.current_led_colour.clone(),
                                            shadows_enabled: true,
                                            ..default()
                                        },
                                        ..default()
                                    })
                                    .id();
                                commands.entity(entity).add_child(light);

                                transform.scale = vec3(3., 3., 3.);
                            }
                        } else {
                            // The light already exists, but we want to set it to the active colour
                            if let Some(children) = children {
                                for child in children {
                                    for (mut pl, pl_entity) in lights.iter_mut() {
                                        if pl_entity == *child {
                                            pl.color = settings.current_led_colour.clone();
                                        }
                                    }
                                }
                            }
                        }
                        onoff.0 = true;
                        trace.lit_leds.push(entity);
                    }
                }
            }

            while trace.lit_leds.len() > settings.num_leds_in_trace {
                let removed = trace.lit_leds.remove(0);
                if !trace.lit_leds.contains(&removed) {
                    // The same function can be called many times in close succession. Don't turn the LED off if it is still in the list of LEDs that should be lit.
                    // Turn off the last light
                    for (
                        matrix_position,
                        mut material,
                        mut onoff,
                        mut transform,
                        entity,
                        children,
                    ) in query.iter_mut()
                    {
                        if entity == removed {
                            if onoff.0 {
                                // let material = materials.get_mut(&material).unwrap();
                                // material.base_color = Color::hex("000").unwrap();
                                // material.emissive = Color::hex("000").unwrap();
                                // transform.scale = vec3(1., 1., 1.);
                                if let Some(children) = children {
                                    for child in children {
                                        // despawn_recursive also removes the child from the parent
                                        commands.entity(*child).despawn_recursive();
                                    }
                                }
                                onoff.0 = false;
                            }
                        }
                    }
                }
            }

            for (matrix_position, mut material, mut onoff, mut transform, entity, children) in
                query.iter_mut()
            {
                if onoff.0 == false {
                    const FALLOFF: f32 = 0.95;
                    let material = materials.get_mut(&material).unwrap();
                    let mut color = material.base_color.as_hsla_f32();
                    color[2] *= FALLOFF;
                    transform.scale *= FALLOFF;

                    // transform.scale = vec3(1., 1., 1.);
                    if let Some(children) = children {
                        for child in children {
                            // despawn_recursive also removes the child from the parent
                            commands.entity(*child).despawn_recursive();
                        }
                    }
                }
            }
        }
    }
}

fn num_in_layer_y_at_coordinate(x: i32, z: i32) -> i32 {
    let size_y = 7;
    let size_z = 10;
    let start_y = ((size_y - 1) as f32 / size_z as f32 * z as f32).floor() as i32;
    size_y - start_y
}
fn num_in_layer_z_at_coordinate(x: i32, y: i32) -> i32 {
    // How many layers exist in the z direction at a given point. At a high Y value the number of Z layers is low.
    // this is the number of strata in the y direction in reverse.
    let size_z = 10;
    size_z - ((size_z as f32 / 7.) * y as f32).floor() as i32
}
fn cursor_position(windows: Res<Windows>, mut settings: ResMut<GlobalSettings>) {
    // Games typically only have one window (the primary window).
    // For multi-window applications, you need to use a specific window ID here.
    let window = windows.get_primary().unwrap();

    if let Some(position) = window.cursor_position() {
        // cursor is inside the window, position given
        settings.mouse_position = position / Vec2::new(window.width(), window.height());

        let pan_pos_radians = settings.mouse_position.x * std::f32::consts::FRAC_PI_2;
        let left_gain = (pan_pos_radians).cos();
        let right_gain = (pan_pos_radians).sin();
        // println!("left: {left_gain:.3} right: {right_gain:.3}");
    } else {
        // cursor is not inside the window
    }
}

fn random_onoff(
    time: Res<Time>,
    mut commands: Commands,
    mut timer: ResMut<AnimationTimer>,
    mut materials: ResMut<Assets<StandardMaterial>>,
    mut query: Query<(
        &MatrixPosition,
        &mut Handle<StandardMaterial>,
        &mut OnOff,
        &Transform,
        Entity,
        Option<&Children>,
    )>,
) {
    if timer.0.tick(time.delta()).just_finished() {
        let mut rng = thread_rng();
        for (matrix_position, mut material, mut onoff, transform, entity, children) in
            query.iter_mut()
        {
            if rng.gen::<f32>() > 0.99 {
                let material = materials.get_mut(&material);
                if let Some(material) = material {
                    if onoff.0 == true {
                        // material.emissive = Color::hex("000").unwrap();
                        material.base_color = Color::hex("000").unwrap();
                        if let Some(children) = children {
                            for child in children {
                                // despawn_recursive also removes the child from the parent
                                commands.entity(*child).despawn_recursive();
                            }
                        }
                    } else {
                        // material.emissive = Color::hex("fff").unwrap();
                        material.base_color = Color::hex("fff").unwrap();

                        let light = commands
                            .spawn_bundle(PointLightBundle {
                                // transform: transform.clone(),
                                point_light: PointLight {
                                    intensity: 600.,
                                    range: 3.,
                                    ..default()
                                },
                                ..default()
                            })
                            .id();
                        commands.entity(entity).add_child(light);
                    }
                    onoff.0 = !onoff.0;
                }
            }
        }
    }
}

#[derive(Component)]
struct LedMatrix {
    size_x: i32,
    size_y: i32,
    size_z: i32,
}

/// set up a simple 3D scene
fn setup(
    trace: Res<Trace>,
    settings: Res<GlobalSettings>,
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<StandardMaterial>>,
    asset_server: Res<AssetServer>,
) {
    // TODO: Create the grid based on the trace size. Make the supplier/dependency order deterministic.
    let size_y = 7;
    let size_x = 7;
    let size_z = 10;
    let y_offset = 4.9;
    let parent = commands
        // For the hierarchy to work certain Components need to exist. SpatialBundle provides those.
        .spawn_bundle(SpatialBundle::default())
        .insert(LedMatrix {
            size_x,
            size_y,
            size_z,
        })
        .id();
    // add entities to the world
    for z in 0..size_z {
        // let mut suppliers: Vec<(&String, &usize)> = trace.supplier_index.iter().collect();
        // suppliers.sort_unstable_by_key(|a| a.1);
        let start_y = ((size_y - 1) as f32 / size_z as f32 * z as f32).floor() as i32;

        for y in start_y..size_y {
            // for (supplier, y) in suppliers {
            // let dependency_map = trace.dependency_index.get(supplier).unwrap();
            // let size_x = dependency_map.len() as i32;
            // let mut dependencies: Vec<(&String, &usize)> = dependency_map.iter().collect();
            // dependencies.sort_unstable_by_key(|a| a.1);
            // for (dependency, x) in dependencies {
            for x in 0..size_x {
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
                        transform: Transform::from_xyz(
                            ((x as f32 + 0.5) / size_x as f32) * 4. - 2. + 0.5,
                            (y as f32 / size_y as f32) * 4.0 + y_offset,
                            ((z as f32 + 0.5) / size_z as f32) * -7.,
                        ),
                        ..default()
                    })
                    .insert(MatrixPosition {
                        x: x as i32,
                        y: y as i32 - start_y,
                        z: z,
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
    let mut transform = Transform::from_xyz(0., 0., -8.);
    transform.rotate_x(-0.3);
    commands.spawn_bundle(SceneBundle {
        scene: asset_server.load("curved_mirror.glb#Scene0"),
        transform,
        ..default()
    });
    // Hall
    let mut transform = Transform::default();
    commands.spawn_bundle(SceneBundle {
        scene: asset_server.load("turbine_hall_from_obj.glb#Scene0"),
        transform,
        ..default()
    });
    // light
    commands.spawn_bundle(PointLightBundle {
        transform: Transform::from_xyz(50.0, 50.0, 50.0),
        point_light: PointLight {
            intensity: 600000.,
            range: 100.,
            ..default()
        },
        ..default()
    });
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
    mut query: Query<(&mut PanOrbitCamera, &mut Transform, &Projection)>,
) {
    // change input mapping for orbit and panning here
    let orbit_button = MouseButton::Right;
    let pan_button = MouseButton::Left;

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
    mut commands: Commands,
    mut settings: ResMut<GlobalSettings>,
    mut osc_communicator: ResMut<OscCommunicator>,
    mut timer: ResMut<AnimationTimer>,
    trace: Res<Trace>,
    query: Query<Entity, With<LedMatrix>>,
    mut egui_context: ResMut<EguiContext>,
) {
    egui::Window::new("Settings")
        .id(egui::Id::new(777333))
        .default_pos(egui::pos2(200., 300.))
        .resizable(true)
        .default_width(500.)
        .show(egui_context.ctx_mut(), |ui| {
            ui.checkbox(&mut settings.play, "Play");
            let mut seconds = timer.0.duration().as_secs_f32();
            ui.add(
                egui::Slider::new(&mut seconds, 0.001..=1.0)
                    .logarithmic(true)
                    .text("Step duration"),
            );
            osc_communicator.send_speed(seconds);
            timer.0.set_duration(Duration::from_secs_f32(seconds));
            ui.label(&format!("Current call({}):", trace.current_index));
            egui::Grid::new("Current call:").show(ui, |ui| {
                let call = &trace.trace.draw_trace[trace.current_index];
                ui.label("Num:");
                ui.label(&format!("{}", trace.current_index));
                ui.end_row();
                ui.label("Data:");
                // egui::ScrollArea::horizontal().show(ui, |ui| {
                ui.label(&format!("{:#?}:", call));
                // });
                ui.end_row();
                let matrix_position = matrix_position(call, &*trace, 0, 7, 7, 10, &*settings);
                ui.label("Position:");
                ui.label(&format!("{matrix_position:#?}"));
                ui.end_row();
                ui.label("Depth:");
                let depth = call.depth;
                ui.label(&format!("{depth}"));
                ui.end_row();
                ui.label("Calls this depth: ");
                let calls_this_depth = trace.num_calls_per_depth[call.depth as usize];
                ui.label(&format!("{calls_this_depth}"));
                ui.end_row();
                if let Some(supplier) = &call.supplier {
                    let calls_per_supplier = trace.num_calls_per_supplier.get(supplier).unwrap();
                    ui.label("Calls in this supplier");
                    ui.label(&format!("{calls_per_supplier}"));
                    ui.end_row();
                    if let Some(dependency) = &call.dependency {
                        let calls_per_dependency = trace
                            .num_calls_per_dependency
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
            })

            // if ui.button("Remove lights").clicked() {
            //     for entity in query.iter() {
            //         // despawn the entity and its children
            //         commands.entity(entity).despawn_recursive();
            //     }
            // }
        });
}
