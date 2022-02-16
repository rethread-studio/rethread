use super::*;
use nannou_egui::{egui, egui_wgpu_backend::epi};

pub struct EguiInterface {
    pub camera_mode: CameraMode,
    pub pixel_display_mode: PixelDisplayMode,
    pub zoom: f32,
    pub pixels_per_frame: f64,
    pub visible: bool,
    pub follow_mode: bool,
}

impl EguiInterface {
    pub fn name(&self) -> &str {
        "egui interface for image manipulation"
    }

    pub fn setup(
        &mut self,
        _ctx: &egui::CtxRef,
        _frame: &mut epi::Frame,
        _storage: Option<&dyn epi::Storage>,
    ) {
        #[cfg(feature = "persistence")]
        if let Some(storage) = _storage {
            *self = epi::get_value(storage, epi::APP_KEY).unwrap_or_default();
        }
    }

    #[cfg(feature = "persistence")]
    fn save(&mut self, storage: &mut dyn epi::Storage) {
        epi::set_value(storage, epi::APP_KEY, self);
    }

    fn max_size_points(&self) -> egui::Vec2 {
        egui::Vec2::new(1920.0, 1080.)
    }

    fn clear_color(&self) -> egui::Rgba {
        egui::Rgba::TRANSPARENT // we set a `CentralPanel` fill color in `demo_windows.rs`
    }

    pub fn update(&mut self, ctx: &egui::CtxRef, frame: &mut epi::Frame) {

        if self.visible || ctx.memory().everything_is_visible() {
        egui::TopBottomPanel::top("wrap_app_top_bar").show(ctx, |ui| {
            egui::trace!(ui);
                egui::ComboBox::from_label("Camera mode")
                    .selected_text(format!("{:?}", self.camera_mode))
                    .show_ui(ui, |ui| {
                        ui.selectable_value(
                            &mut self.camera_mode,
                            CameraMode::FullImage,
                            "Full image",
                        );
                        ui.selectable_value(
                            &mut self.camera_mode,
                            CameraMode::SinglePixel,
                            "Single pixel",
                        );
                        ui.selectable_value(
                            &mut self.camera_mode,
                            CameraMode::Text,
                            "Text",
                        );
                    });
                egui::ComboBox::from_label("Pixel mode")
                    .selected_text(format!("{:?}", self.pixel_display_mode))
                    .show_ui(ui, |ui| {
                        ui.selectable_value(
                            &mut self.pixel_display_mode,
                            PixelDisplayMode::Color,
                            "Color",
                        );
                        ui.selectable_value(
                            &mut self.pixel_display_mode,
                            PixelDisplayMode::Numbers,
                            "Numbers",
                        );
                        ui.selectable_value(
                            &mut self.pixel_display_mode,
                            PixelDisplayMode::RGB,
                            "RGB",
                        );
                    });

                ui.separator();
                ui.add(
                    egui::Slider::new(&mut self.zoom, 1.0..=2000.0)
                        .logarithmic(true)
                        .text("zoom"),
                );
                ui.add(
                    egui::Slider::new(&mut self.pixels_per_frame, 0.01..=200.0)
                        .logarithmic(true)
                        .text("pixels per frame"),
                );
            ui.checkbox(&mut self.follow_mode, "follow");

                ui.horizontal(|ui| {
                    if ui
                        .button("Reset egui")
                        .on_hover_text("Forget scroll, positions, sizes etc")
                        .clicked()
                    {
                        *ui.ctx().memory() = Default::default();
                    }
                });
            });
        }
    }
}
