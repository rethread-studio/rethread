use color_eyre::eyre::Result;
use egui::{vec2, Align2, Color32, FontId, Vec2};
use multilateration::{multilaterate, Measurement, Point};
use std::{sync::mpsc::Receiver, time::Duration};

use eframe::egui;
mod parse;

fn main() -> Result<()> {
    color_eyre::install()?;
    // env_logger::init(); // Log to stderr (if you run with `RUST_LOG=debug`).
    let options = eframe::NativeOptions {
        initial_window_size: Some(egui::vec2(320.0, 240.0)),
        ..Default::default()
    };

    let ports = serialport::available_ports().expect("No ports found!");
    for p in &ports {
        println!("{}", p.port_name);
    }

    let mut port = serialport::new(&ports.first().unwrap().port_name, 115_200)
        .timeout(Duration::from_millis(10))
        .open()
        .expect("Failed to open port");

    let (tx_tag_distance, rx_tag_distance) = std::sync::mpsc::channel();
    std::thread::spawn(move || {
        let mut serial_buf: Vec<u8> = vec![0; 32];
        let mut parse_buffer = vec![];
        loop {
            if let Ok(bytes) = port.read(serial_buf.as_mut_slice()) {
                parse_buffer.extend_from_slice(&serial_buf[0..bytes]);
                // parse_buffer.push_str(&String::from_utf8_lossy(&serial_buf[..bytes]));
            }
            // println!("Parse_buffer: {}", String::from_utf8_lossy(&serial_buf));
            let mut start_char = 0;
            let mut end_char = 0;
            for i in 0..parse_buffer.len() {
                if parse_buffer[i] == b',' || parse_buffer[i] == b'\n' {
                    let input = &parse_buffer[start_char..i];
                    // dbg!(String::from_utf8_lossy(input));
                    match parse::parse_value(input) {
                        Ok((anchor_id, distance)) => {
                            println!("Sending distance {distance} to {}", anchor_id.0);
                            tx_tag_distance.send((anchor_id, distance)).unwrap();
                        }
                        Err(e) => eprintln!("{e}"),
                    }
                    end_char = i + 1;
                    start_char = i + 1;
                }
            }
            // println!(
            //     "end_char: {end_char}, parse_buffer.len(): {}",
            //     parse_buffer.len()
            // );
            parse_buffer.drain(0..end_char);
        }
    });

    let tags = vec![Tag {
        position: vec2(0.0, 0.),
        id: 0,
        distances: vec![(AnchorId(0), 0.5), (AnchorId(1), 0.5), (AnchorId(2), 0.5)],
        rx_distances: rx_tag_distance,
    }];
    eframe::run_native(
        "My egui App",
        options,
        Box::new(|_cc| {
            // This gives us image support:

            Box::new(MyApp::new(tags))
        }),
    )
    .unwrap();
    Ok(())
}

struct MyApp {
    name: String,
    age: u32,
    world: World,
}
impl MyApp {
    pub fn new(tags: Vec<Tag>) -> Self {
        Self {
            name: "Arthur".to_owned(),
            age: 42,
            world: World::new(tags),
        }
    }
}

pub struct World {
    anchors: Vec<Anchor>,
    tags: Vec<Tag>,
}
impl World {
    fn new(tags: Vec<Tag>) -> Self {
        Self {
            anchors: vec![
                Anchor {
                    position: vec2(0., 0.0),
                    id: AnchorId(0),
                },
                Anchor {
                    position: vec2(1.54, 9.7),
                    id: AnchorId(1),
                },
                Anchor {
                    position: vec2(3.57, 3.72),
                    id: AnchorId(2),
                },
            ],
            tags,
        }
    }
    pub fn update(&mut self) {
        for tag in &mut self.tags {
            tag.update(&self.anchors);
        }
    }
}

impl eframe::App for MyApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        self.world.update();
        egui::CentralPanel::default().show(ctx, |ui| {
            ui.heading("My egui Application");
            // ui.horizontal(|ui| {
            //     let name_label = ui.label("Your name: ");
            //     ui.text_edit_singleline(&mut self.name)
            //         .labelled_by(name_label.id);
            // });
            // ui.add(egui::Slider::new(&mut self.age, 0..=120).text("age"));
            // if ui.button("Click each year").clicked() {
            //     self.age += 1;
            // }
            // ui.label(format!("Hello '{}', age {}", self.name, self.age));
            draw_world(ui, &mut self.world);
        });
        ctx.request_repaint();
    }
}

#[derive(Copy, Clone, Debug, PartialEq, Eq, Ord, PartialOrd)]
pub struct AnchorId(u32);
struct Anchor {
    position: Vec2,
    id: AnchorId,
}
struct Tag {
    position: Vec2,
    id: u32,
    distances: Vec<(AnchorId, f32)>,
    rx_distances: Receiver<(AnchorId, f32)>,
}
impl Tag {
    fn update(&mut self, anchors: &[Anchor]) {
        while let Ok((anchor_id, distance)) = self.rx_distances.try_recv() {
            for (id, dist) in &mut self.distances {
                if *id == anchor_id {
                    *dist = *dist * 0.9 + distance * 0.1;
                }
            }
        }
        self.trilaterate_position(anchors);
    }
    fn trilaterate_position(&mut self, anchors: &[Anchor]) {
        // let measurements = vec![
        //     Measurement::new(Point(vec![1.0, 1.0, 1.0]), 1.0),
        //     Measurement::new(Point(vec![3.0, 1.0, 1.0]), 1.0),
        //     Measurement::new(Point(vec![2.0, 2.0, 1.0]), 1.0),
        // ];
        let measurements = self
            .distances
            .iter()
            .map(|(id, distance)| {
                let anchor = anchors.iter().find(|&a| a.id == *id).unwrap();
                Measurement::new(
                    Point(vec![anchor.position.x as f64, anchor.position.y as f64]),
                    *distance as f64,
                )
            })
            .collect::<Vec<_>>();

        let coordinates = multilaterate(measurements).unwrap().0;
        // println!("Coordinates are: {:?}", coordinates);
        self.position = vec2(coordinates[0] as f32, coordinates[1] as f32);
    }
}

pub fn draw_world(ui: &mut egui::Ui, world: &mut World) -> egui::Response {
    // Widget code can be broken up in four steps:
    //  1. Decide a size for the widget
    //  2. Allocate space for it
    //  3. Handle interactions with the widget (if any)
    //  4. Paint the widget

    // 1. Deciding widget size:
    // You can query the `ui` how much space is available,
    // but in this example we have a fixed size widget based on the height of a standard button:
    let desired_size = ui.available_size();

    // 2. Allocating space:
    // This is where we get a region of the screen assigned.
    // We also tell the Ui to sense clicks in the allocated region.
    let (rect, mut response) = ui.allocate_exact_size(desired_size, egui::Sense::click());

    // 3. Interact: Time to check for clicks!
    if response.clicked() {
        // *on = !*on;
        response.mark_changed(); // report back that the value changed
    }

    // Attach some meta-data to the response which can be used by screen readers:
    // response.widget_info(|| egui::WidgetInfo::selected(egui::WidgetType::Checkbox, *on, ""));
    let zoom = 70.0;

    let origin = vec2(
        (rect.width() * 0.5) + rect.left(),
        (rect.height() * 0.5) + rect.top(),
    );

    // 4. Paint!
    // Make sure we need to paint:
    if ui.is_rect_visible(rect) {
        // Let's ask for a simple animation from egui.
        // egui keeps track of changes in the boolean associated with the id and
        // returns an animated value in the 0-1 range for how much "on" we are.
        // let how_on = ui.ctx().animate_bool(response.id, *on);
        // We will follow the current style by asking
        // "how should something that is being interacted with be painted?".
        // This will, for instance, give us different colors when the widget is hovered or clicked.
        // let visuals = ui.style().interact_selectable(&response, *on);
        let visuals = ui.style().interact(&response);
        // All coordinates are in absolute screen coordinates so we use `rect` to place the elements.
        // let rect = rect.expand(visuals.expansion);
        let radius = 0.5 * rect.height();
        // ui.painter()
        //     .rect(rect, radius, visuals.bg_fill, visuals.bg_stroke);
        // Paint the circle, animating it from left to right with `how_on`:
        let circle_x = egui::lerp((rect.left() + radius)..=(rect.right() - radius), 1.0);
        let center = egui::pos2(circle_x, rect.center().y);
        // ui.painter()
        //     .circle(center, 10.0, visuals.bg_fill, visuals.fg_stroke);

        for anchor in &world.anchors {
            let anchor_x = anchor.position.x * zoom + origin.x;
            let anchor_y = anchor.position.y * zoom + origin.y;
            ui.painter().circle(
                egui::pos2(anchor_x, anchor_y),
                8.,
                visuals.bg_fill,
                visuals.fg_stroke,
            );
            ui.painter().text(
                egui::pos2(anchor_x, anchor_y),
                Align2::CENTER_CENTER,
                format!("{}", anchor.id.0),
                FontId::default(),
                Color32::GREEN,
            );
        }
        for tag in &world.tags {
            let x = tag.position.x * zoom + origin.x;
            let y = tag.position.y * zoom + origin.y;
            ui.painter()
                .circle(egui::pos2(x, y), 15.0, Color32::RED, visuals.fg_stroke);
        }
    }

    // All done! Return the interaction response so the user can check what happened
    // (hovered, clicked, ...) and maybe show a tooltip:
    response
}
