use core::ops::Neg;

use display_interface_spi::SPIInterface;
use ili9341::{DisplaySize240x320, Ili9341, Orientation};
use stm32h7xx_hal::hal;

use embedded_graphics::{
    mono_font::{ascii, MonoTextStyle},
    pixelcolor::Rgb565,
    prelude::*,
    primitives::{Polyline, PrimitiveStyle, PrimitiveStyleBuilder, Rectangle},
    text::{Alignment, Text},
};

use micromath::F32Ext;

pub struct Lcd<SPI, DC, CS, RESET> {
    driver: Ili9341<SPIInterface<SPI, DC, CS>, RESET>,
}

impl<SPI, DC, CS, RESET> Lcd<SPI, DC, CS, RESET>
where
    SPI: hal::blocking::spi::Write<u8>,
    DC: hal::digital::v2::OutputPin,
    CS: hal::digital::v2::OutputPin,
    RESET: hal::digital::v2::OutputPin,
{
    pub fn new<DELAY>(spi: SPI, dc: DC, cs: CS, reset: RESET, mut delay: DELAY) -> Self
    where
        DELAY: libdaisy::prelude::_embedded_hal_blocking_delay_DelayMs<u16>,
    {
        let interface = SPIInterface::new(spi, dc, cs);

        let driver = Ili9341::new(
            interface,
            reset,
            &mut delay,
            Orientation::Landscape,
            DisplaySize240x320,
        )
        .unwrap();

        Self { driver }
    }

    pub fn clear(&mut self) {
        self.driver.clear(Rgb565::BLACK).unwrap();
    }

    pub fn setup(&mut self) {
        self.driver.clear(Rgb565::BLACK).unwrap();

        let character_style = MonoTextStyle::new(&ascii::FONT_10X20, Rgb565::WHITE);

        let middle_x: i32 = (self.driver.width() / 2) as i32;
        let middle_y: i32 = (self.driver.height() / 2) as i32;

        let start_text = "Sitira Synth\nby Max Genson\n\nWritten in Rust";
        let position = Point::new(middle_x, middle_y - ((4 * 22) / 2));

        Text::with_alignment(start_text, position, character_style, Alignment::Center)
            .draw(&mut self.driver)
            .unwrap();
    }

    pub fn clear_subsection(&mut self, area: Rectangle) {
        area.into_styled(PrimitiveStyle::with_fill(Rgb565::BLACK))
            .draw(&mut self.driver)
            .unwrap();
    }

    pub fn fill_subsection_with_corners(
        &mut self,
        top_left: Point,
        bottom_right: Point,
        color: Rgb565,
    ) {
        Rectangle::with_corners(top_left, bottom_right)
            .into_styled(PrimitiveStyle::with_fill(color))
            .draw(&mut self.driver)
            .unwrap();
    }

    pub fn draw_waveform(&mut self, audio_slice: &[f32]) {
        const WAVE_WIDTH: usize = 320;
        const WAVE_Y_OFFSET: i32 = 120;
        const WAVE_HEIGHT: i32 = 60;

        const X_SCALER: usize = 1;

        let buffer_length = audio_slice.len();
        let step = buffer_length / 320;

        let mut points_iter =
            audio_slice
                .iter()
                .enumerate()
                .step_by(step / X_SCALER)
                .map(|(i, sample)| {
                    let x = (i as f32 / buffer_length as f32) * (WAVE_WIDTH * X_SCALER) as f32;
                    let y = log_scale(log_scale(log_scale(sample.abs()))) * WAVE_HEIGHT as f32;

                    Point::new(
                        x as i32,
                        y.clamp(WAVE_HEIGHT.neg() as f32, WAVE_HEIGHT as f32) as i32,
                    )
                });

        let mut inversed_points_iter = points_iter.clone();

        let mut points: [Point; WAVE_WIDTH] = [Point::new(0, 0); WAVE_WIDTH];

        for i in 0..WAVE_WIDTH {
            points[i] = points_iter.next().unwrap();
            points[i].y = points[i].y + WAVE_Y_OFFSET;
        }

        let line_style = PrimitiveStyle::with_stroke(Rgb565::CSS_VIOLET, 1);

        Polyline::new(&points)
            .into_styled(line_style)
            .draw(&mut self.driver)
            .unwrap();

        for i in 0..WAVE_WIDTH {
            points[i] = inversed_points_iter.next().unwrap();
            points[i].y = -points[i].y + WAVE_Y_OFFSET;
        }

        Polyline::new(&points)
            .into_styled(line_style)
            .draw(&mut self.driver)
            .unwrap();

        let upper_bound = [
            Point::new(0, WAVE_Y_OFFSET - WAVE_HEIGHT),
            Point::new(320, WAVE_Y_OFFSET - WAVE_HEIGHT),
        ];

        let lower_bound = [
            Point::new(0, WAVE_Y_OFFSET + WAVE_HEIGHT),
            Point::new(320, WAVE_Y_OFFSET + WAVE_HEIGHT),
        ];

        let line_style = PrimitiveStyle::with_stroke(Rgb565::new(16, 32, 16), 1);

        Polyline::new(&lower_bound)
            .into_styled(line_style)
            .draw(&mut self.driver)
            .unwrap();

        Polyline::new(&upper_bound)
            .into_styled(line_style)
            .draw(&mut self.driver)
            .unwrap();
    }

    pub fn draw_loading_bar(&mut self, percentage: u32, filename: &str) {
        if percentage == 0 {
            let border_style = PrimitiveStyleBuilder::new()
                .stroke_color(Rgb565::WHITE)
                .stroke_width(3)
                .build();

            let position = Point::new(40, 200);

            // border
            Rectangle::new(
                position,
                Size {
                    width: 240,
                    height: 20,
                },
            )
            .into_styled(border_style)
            .draw(&mut self.driver)
            .unwrap();

            let character_style = MonoTextStyle::new(&ascii::FONT_6X9, Rgb565::WHITE);

            let position = Point::new((self.driver.width() / 2) as i32, 190);

            Text::with_alignment(filename, position, character_style, Alignment::Center)
                .draw(&mut self.driver)
                .unwrap();
        }

        let loading_bar_style = PrimitiveStyleBuilder::new()
            .fill_color(Rgb565::WHITE)
            .build();

        if percentage <= 100 {
            let position = Point::new(46, 206);

            Rectangle::new(
                position,
                Size {
                    width: (231 * percentage) / 100,
                    height: 8,
                },
            )
            .into_styled(loading_bar_style)
            .draw(&mut self.driver)
            .unwrap();
        }
    }

    pub fn print_on_screen(&mut self, x: usize, y: usize, message: &str) -> Rectangle {
        let character_style = MonoTextStyle::new(&ascii::FONT_6X9, Rgb565::WHITE);

        let position = Point::new(x as i32, y as i32);

        let text = Text::new(message, position, character_style);

        let bounding_box = text.bounding_box();

        text.draw(&mut self.driver).unwrap();

        bounding_box
    }
}

fn log_scale(value: f32) -> f32 {
    (value + 1.0).log10() * (1.0 / 2.0.log10())
}
