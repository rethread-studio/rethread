use std::time::Duration;

use bevy::{
    ecs::entity::Entities,
    input::mouse::{MouseButtonInput, MouseMotion, MouseWheel},
    prelude::*,
    reflect::TypeUuid,
    render::camera::Projection,
    render::render_resource::{AsBindGroup, ShaderRef},
    utils::HashMap,
    window::CursorMoved,
};
use bevy_egui::{egui, EguiContext, EguiPlugin};
use bevy_inspector_egui::{Inspectable, InspectorPlugin};

use bevy_inspector_egui::WorldInspectorPlugin;
use parser::deepika2::Deepika2;
use rand::prelude::*;
fn main() {
    App::new()
        .insert_resource(ClearColor(Color::rgb(0.1, 0.1, 0.1)))
        .insert_resource(AnimationTimer(Timer::from_seconds(0.1, true)))
        .insert_resource(Trace::new())
        .add_plugins(DefaultPlugins)
        .add_plugin(EguiPlugin)
        .add_plugin(InspectorPlugin::<GlobalSettings>::new())
        // .insert_resource(GlobalSettings::default())
        // .add_plugin(EguiPlugin)
        .add_plugin(WorldInspectorPlugin::new())
        .add_startup_system(setup)
        .add_startup_system(spawn_camera)
        .add_system(pan_orbit_camera)
        // .add_system(random_onoff)
        .add_system(led_animation_from_trace)
        .add_system(bevy_ui)
        .run();
}

#[derive(Component, PartialEq, Eq, Copy, Clone)]
struct MatrixPosition {
    x: i32,
    y: i32,
    z: i32,
}

#[derive(Component)]
struct OnOff(bool);

struct AnimationTimer(Timer);

#[derive(Inspectable)]
struct GlobalSettings {
    play: bool,
    use_point_lights: bool,
    #[inspectable(min = 1, max = 100)]
    num_leds_in_trace: usize,
    current_led_colour: Color,
}
impl Default for GlobalSettings {
    fn default() -> Self {
        Self {
            play: false,
            use_point_lights: true,
            num_leds_in_trace: 3,
            current_led_colour: Color::RED,
        }
    }
}

struct Trace {
    trace: Deepika2,
    current_index: usize,
    supplier_index: HashMap<String, usize>,
    // dependency per supplier
    dependency_index: HashMap<String, HashMap<String, usize>>,
    lit_leds: Vec<Entity>,
}

impl Trace {
    pub fn new() -> Self {
        let trace = Deepika2::new("/home/erik/Hämtningar/nwl2022/data-varna-startup-shutdown.json");
        // let trace =
        //     Deepika2::new("/home/erik/Hämtningar/nwl2022/data-varna-copy-paste-isolated.json");

        let mut supplier_index = HashMap::new();
        let mut dependency_index = HashMap::new();
        for call in &trace.draw_trace {
            if let Some(supplier) = &call.supplier {
                let new_index = supplier_index.len();
                supplier_index.entry(supplier.clone()).or_insert(new_index);
                if let Some(dependency) = &call.dependency {
                    let dependency_map = dependency_index
                        .entry(supplier.clone())
                        .or_insert(HashMap::new());
                    let new_index = dependency_map.len();
                    dependency_map
                        .entry(dependency.clone())
                        .or_insert(new_index);
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
            supplier_index,
            dependency_index,
            lit_leds: Vec::new(),
        }
    }
}

fn led_animation_from_trace(
    time: Res<Time>,
    settings: Res<GlobalSettings>,
    mut commands: Commands,
    mut timer: ResMut<AnimationTimer>,
    mut trace: ResMut<Trace>,
    mut materials: ResMut<Assets<StandardMaterial>>,
    mut query: Query<(
        &MatrixPosition,
        &mut Handle<StandardMaterial>,
        &mut OnOff,
        Entity,
        Option<&Children>,
    )>,
    mut lights: Query<(&mut PointLight, Entity)>,
) {
    if settings.play {
        if timer.0.tick(time.delta()).just_finished() {
            // Set old lights to white
            for old_light in &trace.lit_leds {
                for (matrix_position, mut material, onoff, entity, children) in query.iter_mut() {
                    if entity == *old_light {
                        let material = materials.get_mut(&material).unwrap();
                        material.base_color = Color::WHITE;
                        material.emissive = Color::WHITE;

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
            let call = &trace.trace.draw_trace[trace.current_index];
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
            let new_matrix_position = MatrixPosition {
                x: dependency as i32,
                y: supplier as i32,
                z: call.depth % 10,
            };
            for (matrix_position, mut material, mut onoff, entity, children) in query.iter_mut() {
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
                                        intensity: 6.,
                                        range: 50.,
                                        color: settings.current_led_colour.clone(),
                                        ..default()
                                    },
                                    ..default()
                                })
                                .id();
                            commands.entity(entity).add_child(light);
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

            while trace.lit_leds.len() > settings.num_leds_in_trace {
                let removed = trace.lit_leds.remove(0);
                if !trace.lit_leds.contains(&removed) {
                    // The same function can be called many times in close succession. Don't turn the LED off if it is still in the list of LEDs that should be lit.
                    // Turn off the last light
                    for (matrix_position, mut material, mut onoff, entity, children) in
                        query.iter_mut()
                    {
                        if entity == removed {
                            if onoff.0 {
                                let material = materials.get_mut(&material).unwrap();
                                material.base_color = Color::hex("000").unwrap();
                                material.emissive = Color::hex("000").unwrap();
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
        }
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
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<StandardMaterial>>,
) {
    // TODO: Create the grid based on the trace size. Make the supplier/dependency order deterministic.
    let size_y = 10;
    let size_x = 10;
    let size_z = 10;
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
        let mut suppliers: Vec<(&String, &usize)> = trace.supplier_index.iter().collect();
        suppliers.sort_unstable_by_key(|a| a.1);

        for (supplier, y) in suppliers {
            let dependency_map = trace.dependency_index.get(supplier).unwrap();
            let size_x = dependency_map.len() as i32;
            let mut dependencies: Vec<(&String, &usize)> = dependency_map.iter().collect();
            dependencies.sort_unstable_by_key(|a| a.1);
            for (dependency, x) in dependencies {
                // sphere
                let child = commands
                    .spawn_bundle(PbrBundle {
                        mesh: meshes.add(Mesh::from(shape::Icosphere {
                            radius: 0.05,
                            subdivisions: 32,
                        })),
                        material: materials.add(StandardMaterial {
                            base_color: Color::hex("000").unwrap(),
                            // vary key PBR parameters on a grid of spheres to show the effect
                            metallic: 0.5,
                            // emissive: Color::hsl(z as f32 * 36.0, 0.8, 0.8),
                            perceptual_roughness: 0.5,
                            unlit: true,
                            ..default()
                        }),
                        transform: Transform::from_xyz(
                            ((*x as f32 + 0.5) / size_x as f32) * 10. - 5. + 0.5,
                            (*y as f32 / size_y as f32) * 10.0 + 0.5,
                            ((z as f32 + 0.5) / size_z as f32) * 10. - 5.,
                        ),
                        ..default()
                    })
                    .insert(MatrixPosition {
                        x: *x as i32,
                        y: *y as i32,
                        z: size_z - z - 1,
                    })
                    .insert(OnOff(false))
                    .id();

                commands.entity(parent).push_children(&[child]);
            }
        }
    }
    // ground plane
    commands.spawn_bundle(PbrBundle {
        mesh: meshes.add(Mesh::from(shape::Plane { size: 12.0 })),
        material: materials.add(StandardMaterial {
            base_color: Color::BLACK,
            reflectance: 0.8,
            perceptual_roughness: 0.0,
            ..default()
        }),
        ..default()
    });
    let mut transform = Transform::from_xyz(0., size_y as f32 + 1.0, -5.);
    transform.rotate_x(std::f32::consts::PI * 0.75);
    commands.spawn_bundle(PbrBundle {
        mesh: meshes.add(Mesh::from(shape::Plane { size: 12.0 })),
        material: materials.add(StandardMaterial {
            base_color: Color::BLACK,
            reflectance: 0.8,
            perceptual_roughness: 0.0,
            ..default()
        }),
        transform,
        ..default()
    });
    commands.spawn_bundle(PbrBundle {
        mesh: meshes.add(Mesh::from(shape::Box::new(
            size_x as f32 + 2.0,
            size_y as f32,
            0.1,
        ))),
        transform: Transform::from_xyz(0., size_y as f32 * 0.5, size_z as f32 * -0.5 - 4.0),
        material: materials.add(StandardMaterial {
            base_color: Color::BLACK,
            reflectance: 1.0,
            perceptual_roughness: 0.0,
            ..default()
        }),
        ..default()
    });
    commands.spawn_bundle(PbrBundle {
        mesh: meshes.add(Mesh::from(shape::Box::new(
            0.1,
            size_y as f32,
            size_z as f32 + 1.0,
        ))),
        transform: Transform::from_xyz(size_x as f32 * 0.6, size_y as f32 * 0.5, 0.),
        material: materials.add(StandardMaterial {
            base_color: Color::BLACK,
            reflectance: 1.0,
            perceptual_roughness: 0.0,
            ..default()
        }),
        ..default()
    });
    commands.spawn_bundle(PbrBundle {
        mesh: meshes.add(Mesh::from(shape::Box::new(
            0.1,
            size_y as f32,
            size_z as f32 + 1.0,
        ))),
        transform: Transform::from_xyz(size_x as f32 * -0.6, size_y as f32 * 0.5, 0.),
        material: materials.add(StandardMaterial {
            base_color: Color::BLACK,
            reflectance: 1.0,
            perceptual_roughness: 0.0,
            ..default()
        }),
        ..default()
    });
    // // light
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
    mut timer: ResMut<AnimationTimer>,
    trace: Res<Trace>,
    query: Query<Entity, With<LedMatrix>>,
    mut egui_context: ResMut<EguiContext>,
) {
    egui::Window::new("Settings")
        .id(egui::Id::new(777333))
        .default_pos(egui::pos2(200., 0.))
        .show(egui_context.ctx_mut(), |ui| {
            ui.checkbox(&mut settings.play, "Play");
            let mut seconds = timer.0.duration().as_secs_f32();
            ui.add(
                egui::Slider::new(&mut seconds, 0.001..=1.0)
                    .logarithmic(true)
                    .text("Step duration"),
            );
            timer.0.set_duration(Duration::from_secs_f32(seconds));
            ui.label(&format!("Current call({}):", trace.current_index));
            let call = &trace.trace.draw_trace[trace.current_index];
            ui.label(&format!("{:#?}:", call));

            // if ui.button("Remove lights").clicked() {
            //     for entity in query.iter() {
            //         // despawn the entity and its children
            //         commands.entity(entity).despawn_recursive();
            //     }
            // }
        });
}
