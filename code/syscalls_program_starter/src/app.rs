use std::{path::PathBuf, process::Command};

/// We derive Deserialize/Serialize so we can persist app state on shutdown.
#[derive(serde::Deserialize, serde::Serialize)]
#[serde(default)] // if we add new fields, give them default values when deserializing old state
pub struct TemplateApp {
    // Example stuff:
    label: String,

    // this how you opt-out of serialization of a member
    #[serde(skip)]
    value: f32,
}

impl Default for TemplateApp {
    fn default() -> Self {
        Self {
            // Example stuff:
            label: "Hello World!".to_owned(),
            value: 2.7,
        }
    }
}

impl TemplateApp {
    /// Called once before the first frame.
    pub fn new(cc: &eframe::CreationContext<'_>) -> Self {
        // This is also where you can customize the look and feel of egui using
        // `cc.egui_ctx.set_visuals` and `cc.egui_ctx.set_fonts`.

        // Load previous app state (if any).
        // Note that you must enable the `persistence` feature for this to work.
        if let Some(storage) = cc.storage {
            return eframe::get_value(storage, eframe::APP_KEY).unwrap_or_default();
        }

        Default::default()
    }
}

impl eframe::App for TemplateApp {
    /// Called by the frame work to save state before shutdown.
    fn save(&mut self, storage: &mut dyn eframe::Storage) {
        eframe::set_value(storage, eframe::APP_KEY, self);
    }

    /// Called each time the UI needs repainting, which may be many times per second.
    /// Put your widgets into a `SidePanel`, `TopPanel`, `CentralPanel`, `Window` or `Area`.
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        let Self { label, value } = self;

        egui::CentralPanel::default().show(ctx, |ui| {
            // The central panel the region left after adding TopPanel's and SidePanel's

            let strace_path =
                "/home/erik/code/kth/rethread/code/syscalls/target/release/strace_collector";
            let programs = ["gedit", "konqueror", "thunderbird", "htop", "rhythmbox"];
            for p in programs {
                if ui.button(p).clicked() {
                    start_program(strace_path, p);
                }
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
    }
}

pub fn start_program(strace_path: impl Into<PathBuf>, program: &'static str) {
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
            c.arg(format!("{:?} --command {program}", strace_path.into()));
            eprintln!("{:?}", c.spawn());
        }
        "xterm" | "gnome-terminal" => {
            let mut c = Command::new(terminal);
            c.arg("-e");
            c.arg(format!("{:?} --command {program}", strace_path.into()));
            eprintln!("{:?}", c.spawn());
        }
        _ => {
            let mut c = Command::new(terminal);
            c.arg("-e");
            c.arg(format!("{:?} --command {program}", strace_path.into()));
            eprintln!("{:?}", c.spawn());
        }
    }
}
