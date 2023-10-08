use eframe::egui;
use egui::Color32;
use egui_plot::{CoordinatesFormatter, Corner, Legend, Line, Plot, PlotPoint};
use fxhash::FxHashMap;

use crate::{EguiUpdate, RecordingCommand, RecordingPlayback};

pub fn start_egui(
    packet_hq_command_sender: rtrb::Producer<RecordingCommand>,
    egui_update_receiver: rtrb::Consumer<EguiUpdate>,
) -> Result<(), eframe::Error> {
    let options = eframe::NativeOptions {
        initial_window_size: Some(egui::vec2(620.0, 440.0)),
        ..Default::default()
    };
    eframe::run_native(
        "My egui App",
        options,
        Box::new(|cc| {
            // This gives us image support:
            egui_extras::install_image_loaders(&cc.egui_ctx);

            Box::new(EguiApp::new(packet_hq_command_sender, egui_update_receiver))
        }),
    )
}
struct LineData {
    points: PlotPoint,
    name: String,
    color: Color32,
}
impl Into<Line> for LineData {
    fn into(self) -> Line {
        Line::new(self.points).color(self.color).name(self.name)
    }
}
struct PlotData {
    lines: Vec<Line>,
}

struct EguiApp {
    packet_hq_command_sender: rtrb::Producer<RecordingCommand>,
    egui_update_receiver: rtrb::Consumer<EguiUpdate>,
    recordings: Vec<RecordingPlayback>,
    plots: FxHashMap<String, PlotData>,
}
impl EguiApp {
    pub fn new(
        packet_hq_command_sender: rtrb::Producer<RecordingCommand>,
        egui_update_receiver: rtrb::Consumer<EguiUpdate>,
    ) -> Self {
        Self {
            packet_hq_command_sender,
            egui_update_receiver,
            recordings: vec![],
            plots: FxHashMap::default(),
        }
    }
}

impl eframe::App for EguiApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        // Receive messages
        while let Ok(update) = self.egui_update_receiver.pop() {
            match update {
                EguiUpdate::AllRecordings(recordings) => self.recordings = recordings,
                EguiUpdate::StartingPlaybackOfRecording(name) => {
                    if let Some(r) = self
                        .recordings
                        .iter_mut()
                        .find(|r| r.recorded_packets.name == name)
                    {
                        r.playing = true;
                    }
                }
                EguiUpdate::StoppingPlaybackOfRecording(name) => {
                    if let Some(r) = self
                        .recordings
                        .iter_mut()
                        .find(|r| r.recorded_packets.name == name)
                    {
                        r.playing = false;
                    }
                }
            }
        }
        egui::CentralPanel::default().show(ctx, |ui| {
            ui.heading("sys|calls data recording editor");
            let mut recordings_to_remove = vec![];
            for (i, recording) in self.recordings.iter_mut().enumerate() {
                let plot = self.plots.get(&recording.recorded_packets.name);
                if let Some(command) = recording_window(ctx, recording, plot) {
                    if matches!(command, RecordingCommand::CloseRecording(_)) {
                        recordings_to_remove.push(i)
                    }
                    self.packet_hq_command_sender.push(command).ok();
                }
            }
            for i in recordings_to_remove.iter().rev() {
                self.recordings.remove(*i);
            }
        });
    }
}

fn recording_window(
    ctx: &egui::Context,
    recording: &mut RecordingPlayback,
    plot: Option<&PlotData>,
) -> Option<RecordingCommand> {
    let mut command = None;
    egui::Window::new(&recording.recorded_packets.name)
        // .open(true)
        .resizable(true)
        .default_width(280.0)
        .show(ctx, |ui| {
            egui::Grid::new("recording data")
                .num_columns(2)
                .spacing([40.0, 4.0])
                .striped(true)
                .show(ui, |ui| {
                    ui.label("Name:");
                    ui.label(&recording.recorded_packets.name);
                    ui.end_row();
                    ui.label("Playing:");
                    ui.label(if recording.playing { "yes" } else { "no" });
                    ui.end_row();
                    ui.label("Playhead duration:");
                    ui.label(&humantime::format_duration(recording.current_duration).to_string());
                    ui.end_row();
                    ui.label("Last packet timestamp:");
                    ui.label(
                        &humantime::format_duration(recording.last_packet_timestamp).to_string(),
                    );
                    ui.end_row();
                });
            if ui.button("Trim start silence").clicked() {
                recording.trim_silence_before();
                command = Some(RecordingCommand::ReplaceRecording(recording.clone()));
            }
            if ui.button("Play").clicked() {
                recording.playing = true;
                command = Some(RecordingCommand::StartPlayback(
                    recording.recorded_packets.name.clone(),
                ));
            }
            if ui.button("Stop").clicked() {
                recording.playing = false;
                command = Some(RecordingCommand::StopPlayback(
                    recording.recorded_packets.name.clone(),
                ));
            }
            if ui.button("Split into programs").clicked() {
                todo!()
            }
            if ui.button("Close").clicked() {
                command = Some(RecordingCommand::CloseRecording(
                    recording.recorded_packets.name.clone(),
                ));
            }
            if let Some(plot_date) = plot {
                let mut plot = Plot::new("recording plot")
                    .legend(Legend::default())
                    .y_axis_width(4)
                    .show_axes(true)
                    .show_grid(true);
                // if self.square {
                //     plot = plot.view_aspect(1.0);
                // }
                // if self.proportional {
                //     plot = plot.data_aspect(1.0);
                // }
                plot =
                    plot.coordinates_formatter(Corner::LeftBottom, CoordinatesFormatter::default());
                plot.show(ui, |plot_ui| {
                    for line in &plot_date.lines {
                        plot_ui.line(*line);
                    }
                });
                // .response
            }
        });
    command
}
