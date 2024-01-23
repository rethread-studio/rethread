use std::{
    iter::Inspect,
    path::PathBuf,
    process::Command,
    time::{Duration, Instant},
};

use egui::Color32;
use syscalls_shared::score::Score;

use crate::websocket::{start_websocket_thread, WebsocketMess};

pub struct TemplateApp {
    last_movement: Instant,
    movement_data: Option<WebsocketMess>,
    ws_receiver: std::sync::mpsc::Receiver<WebsocketMess>,
    score: Score,
}

impl TemplateApp {
    /// Called once before the first frame.
    pub fn new(cc: &eframe::CreationContext<'_>) -> Self {
        // This is also where you can customize the look and feel of egui using
        // `cc.egui_ctx.set_visuals` and `cc.egui_ctx.set_fonts`.

        let ws_receiver = start_websocket_thread();
        Self {
            last_movement: Instant::now(),
            movement_data: Some(WebsocketMess::Movement {
                id: 0,
                is_break: false,
                next_mvt: Some(0),
                duration: 90.,
            }),
            ws_receiver,
            score: Score::new(),
        }
    }
}

impl eframe::App for TemplateApp {
    /// Called each time the UI needs repainting, which may be many times per second.
    /// Put your widgets into a `SidePanel`, `TopPanel`, `CentralPanel`, `Window` or `Area`.
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        let Self {
            last_movement,
            movement_data,
            ws_receiver,
            score,
        } = self;

        if let Ok(new_mess) = ws_receiver.try_recv() {
            if matches!(new_mess, WebsocketMess::Movement { .. }) {
                *last_movement = Instant::now();
                *movement_data = Some(new_mess);
            }
        }
        let my_frame = egui::containers::Frame {
            inner_margin: egui::style::Margin {
                left: 10.,
                right: 10.,
                top: 10.,
                bottom: 10.,
            },
            outer_margin: egui::style::Margin {
                left: 0.,
                right: 0.,
                top: 0.,
                bottom: 0.,
            },
            rounding: egui::Rounding {
                nw: 0.0,
                ne: 0.0,
                sw: 1.0,
                se: 1.0,
            },
            shadow: eframe::epaint::Shadow {
                extrusion: 1.0,
                color: Color32::GREEN,
            },
            fill: if last_movement.elapsed() < Duration::from_secs_f32(0.5) {
                Color32::GREEN
            } else {
                Color32::BLACK
            },
            stroke: egui::Stroke::new(2.0, Color32::GREEN),
        };
        egui::CentralPanel::default()
            .frame(my_frame)
            .show(ctx, |ui| {
                // The central panel the region left after adding TopPanel's and SidePanel's

                let strace_path =
                    "/home/assert/Documents/rethread/code/syscalls/target/release/strace_collector";
                let programs = ["gedit", "konqueror", "thunderbird", "htop"];

                egui::Grid::new("program grid").show(ui, |ui| {
                    for p in programs {
                        if ui.button(p).clicked() {
                            start_program(strace_path, p);
                        }
                        ui.end_row();
                    }
                });
                if let Some(WebsocketMess::Movement {
                    id,
                    is_break,
                    next_mvt,
                    duration,
                }) = movement_data
                {
                    egui::Grid::new("some_unique_id").show(ui, |ui| {
                        ui.label("Id:");
                        ui.label(format!("{id}"));
                        ui.end_row();

                        ui.label("Duration:");
                        ui.label(format!("{duration}s"));
                        ui.end_row();

                        ui.label("Programs:");
                        if let Some(mvt) = score.movements.iter().find(|m| m.id == *id as usize) {
                            ui.label(format!("{:?}", mvt.programs));
                        }
                        ui.end_row();
                    });
                }

                egui::warn_if_debug_build(ui);
            });

        if false {
            egui::Window::new("Window").show(ctx, |ui| {
                ui.label("Windows can be moved by dragging them.");
                ui.label("They are automatically sized based on contents.");
                ui.label("You can turn on resizing and scrolling if you like.");
                ui.label("You would normally choose either panels OR windows.");
            });
        }
        ctx.request_repaint_after(Duration::from_millis(250));
    }
}

pub fn start_program(strace_path: &'static str, program: &'static str) {
    // let mut c = Command::new(strace_path.into());
    // c.arg("--command");
    // c.arg(program);
    let terminal = match std::env::var("TERMINAL") {
        Ok(term) => term,
        Err(e) => "gnome-terminal".to_string(),
    };
    dbg!(&terminal);
    // Kill previous instances
    let mut kill_c = Command::new("sudo");
    kill_c.arg("pkill");
    kill_c.arg("-9");
    kill_c.arg(program);
    kill_c.output().unwrap();
    // Start command in new terminal
    match terminal.as_str() {
        "urxvt" => {
            let mut c = Command::new(terminal);
            c.arg("--hold");
            c.arg("-e");
            c.arg("sh");
            c.arg("-c");
            c.arg(format!("{} --command {program}", strace_path));
            eprintln!("{:?}", c.spawn());
        }
        "xterm" => {
            let mut c = Command::new(terminal);
            c.arg("-e");
            c.arg(format!("{} --command {program}", strace_path));
            eprintln!("{:?}", c.spawn());
        }
        "gnome-terminal" => {
            let mut c = Command::new(terminal);
            c.arg("--");
            c.arg(strace_path);
            c.arg("--command");
            c.arg(program);
            eprintln!("{:?}", c.spawn());
        }
        _ => {
            let mut c = Command::new(terminal);
            c.arg("-e");
            c.arg(format!("{} --command {program}", strace_path));
            eprintln!("{:?}", c.spawn());
        }
    }
}
