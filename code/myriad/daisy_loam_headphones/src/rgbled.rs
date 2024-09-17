use libdaisy::hid::Led;
use LEDConfig::*;
use RGBColors::*;

use core::fmt::Debug;
use stm32h7xx_hal::hal::digital::v2::OutputPin;

pub enum LEDConfig {
    ActiveLow,
    ActiveHigh,
}

pub struct RGBLed<R, G, B> {
    red: Led<R>,
    green: Led<G>,
    blue: Led<B>,
    pub color: RGBColors,
}

pub enum RGBColors {
    Black,
    Blue,
    Green,
    Cyan,
    Red,
    Magenta,
    Yellow,
    White,
    Complex,
}

impl<R, G, B> RGBLed<R, G, B>
where
    R: OutputPin,
    <R as OutputPin>::Error: Debug,
    G: OutputPin,
    <G as OutputPin>::Error: Debug,
    B: OutputPin,
    <B as OutputPin>::Error: Debug,
{
    pub fn new(red: R, green: G, blue: B, config: LEDConfig, resolution: u32) -> Self {
        let invert;

        match config {
            ActiveHigh => invert = false,
            ActiveLow => invert = true,
        }

        RGBLed {
            red: Led::new(red, invert, resolution),
            green: Led::new(green, invert, resolution),
            blue: Led::new(blue, invert, resolution),
            color: Black,
        }
    }

    pub fn update(&mut self) {
        self.red.update();
        self.green.update();
        self.blue.update();
    }

    pub fn set_simple_color(&mut self, color: RGBColors) {
        let mut rgb = 0b000;
        match color {
            Black => self.color = Black,
            Blue => {
                rgb = 0b001;
                self.color = Blue;
            }
            Green => {
                rgb = 0b010;
                self.color = Green;
            }
            Cyan => {
                rgb = 0b011;
                self.color = Cyan;
            }
            Red => {
                rgb = 0b100;
                self.color = Red;
            }
            Magenta => {
                rgb = 0b101;
                self.color = Magenta;
            }
            Yellow => {
                rgb = 0b110;
                self.color = Yellow;
            }
            White => {
                rgb = 0b111;
                self.color = White;
            }
            Complex => {}
        }

        match (rgb & 0b100) >> 2 {
            0 => self.red.set_brightness(0.0),
            1 => self.red.set_brightness(1.0),
            _ => {}
        }

        match (rgb & 0b010) >> 1 {
            0 => self.green.set_brightness(0.0),
            1 => self.green.set_brightness(1.0),
            _ => {}
        }

        match (rgb & 0b001) >> 0 {
            0 => self.blue.set_brightness(0.0),
            1 => self.blue.set_brightness(1.0),
            _ => {}
        }
    }

    pub fn set_color(&mut self, r: f32, g: f32, b: f32) {
        self.red.set_brightness(r);
        self.green.set_brightness(g);
        self.blue.set_brightness(b);
        self.color = Complex;
    }

    pub fn cycle_color(&mut self) {
        match self.color {
            Blue => self.set_simple_color(Green),
            Green => self.set_simple_color(Cyan),
            Cyan => self.set_simple_color(Red),
            Red => self.set_simple_color(Magenta),
            Magenta => self.set_simple_color(Yellow),
            Yellow => self.set_simple_color(White),
            White => self.set_simple_color(Blue),
            _ => self.set_simple_color(White),
        }
    }
}
