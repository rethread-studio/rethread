use libdaisy::prelude::*;
use libdaisy::{audio, gpio::*, hid, sdmmc, system::System};

use stm32h7xx_hal::time::Hertz;
use stm32h7xx_hal::timer::Timer;
use stm32h7xx_hal::{adc, pac, stm32};

use crate::encoder;
use crate::rgbled::*;
use crate::sd_card::{self, SdCardLocal};
use crate::CONTROL_RATE_IN_MS;

// typedefs

pub type Pot1 = hid::AnalogControl<Daisy21<Analog>>;
pub type Pot2 = hid::AnalogControl<Daisy15<Analog>>;
pub type Led1 =
    RGBLed<Daisy20<Output<PushPull>>, Daisy19<Output<PushPull>>, Daisy18<Output<PushPull>>>;
pub type Led2 =
    RGBLed<Daisy17<Output<PushPull>>, Daisy24<Output<PushPull>>, Daisy23<Output<PushPull>>>;
pub type Switch1 = hid::Switch<Daisy27<Input>>;
pub type Switch2 = hid::Switch<Daisy28<Input>>;

pub type Encoder = encoder::RotaryEncoder<Daisy13<Input>, Daisy25<Input>, Daisy26<Input>>;

pub struct AudioRate {
    pub audio: audio::Audio,
    pub buffer: audio::AudioBuffer,
}

pub struct ControlRate {
    // HAL
    pub adc1: adc::Adc<stm32::ADC1, adc::Enabled>,
    pub timer2: Timer<stm32::TIM2>,

    // Libdaisy
    pub pot1: Pot1,
    pub pot2: Pot2,
    pub led1: Led1,
    pub led2: Led2,
    pub switch1: Switch1,
    pub switch2: Switch2,
    pub encoder: Encoder,
}

pub struct DaisyPod {
    pub audio_rate: AudioRate,
    pub control_rate: ControlRate,
    pub sdram: &'static mut [f32],
    pub sd_card: Option<SdCardLocal>,
}

impl DaisyPod {
    pub fn init(core: rtic::export::Peripherals, device: stm32::Peripherals) -> Self {
        let mut system = System::init(core, device);

        let rcc_p = unsafe { pac::Peripherals::steal().RCC };
        let pwr_p = unsafe { pac::Peripherals::steal().PWR };
        let syscfg_p = unsafe { pac::Peripherals::steal().SYSCFG };

        let mut ccdr = System::init_clocks(pwr_p, rcc_p, &syscfg_p);

        // set user led to low
        let mut seed_led = system.gpio.led;
        seed_led.set_high();

        // setting up SDRAM
        let sdram = system.sdram;
        sdram.fill(0.0);

        // setting up SD card connection
        let sdmmc_d = unsafe { pac::Peripherals::steal().SDMMC1 };
        let sd = sdmmc::init(
            system.gpio.daisy1.unwrap(),
            system.gpio.daisy2.unwrap(),
            system.gpio.daisy3.unwrap(),
            system.gpio.daisy4.unwrap(),
            system.gpio.daisy5.unwrap(),
            system.gpio.daisy6.unwrap(),
            sdmmc_d,
            ccdr.peripheral.SDMMC1,
            &mut ccdr.clocks,
        );

        let sd_card;

        // if cfg!(sd_card) {
        sd_card = Some(sd_card::SdCardLocal::new(sd));
        // } else {
        //     sd_card = None;
        // }

        // setup TIM2

        system.timer2.set_freq(Hertz::millis(CONTROL_RATE_IN_MS));

        // Setup ADC1

        let mut adc1 = system.adc1.enable();
        adc1.set_resolution(adc::Resolution::SixteenBit);
        let adc1_max_value = adc1.slope() as f32;

        // setup analog reads from potentiometer

        let pot1_pin = system
            .gpio
            .daisy21
            .take()
            .expect("Failed to get pin 21 of the daisy!")
            .into_analog();

        let pot1 = hid::AnalogControl::new(pot1_pin, adc1_max_value);

        let pot2_pin = system
            .gpio
            .daisy15
            .take()
            .expect("Failed to get pin 15 of the daisy!")
            .into_analog();

        let pot2 = hid::AnalogControl::new(pot2_pin, adc1_max_value);

        // setting up tactil switches

        let switch1_pin = system
            .gpio
            .daisy27
            .take()
            .expect("Failed to get pin 27 of the daisy!")
            .into_pull_up_input();
        let mut switch1 = hid::Switch::new(switch1_pin, hid::SwitchType::PullUp);
        switch1.set_held_thresh(Some(2));

        let switch2_pin = system
            .gpio
            .daisy28
            .take()
            .expect("Failed to get pin 28 of the daisy!")
            .into_pull_up_input();
        let mut switch2 = hid::Switch::new(switch2_pin, hid::SwitchType::PullUp);
        switch2.set_held_thresh(Some(2));

        // setup LEDs

        let led1_red = system
            .gpio
            .daisy20
            .take()
            .expect("Failed to get pin 20 of the daisy!")
            .into_push_pull_output();

        let led1_green = system
            .gpio
            .daisy19
            .take()
            .expect("Failed to get pin 19 of the daisy!")
            .into_push_pull_output();

        let led1_blue = system
            .gpio
            .daisy18
            .take()
            .expect("Failed to get pin 18 of the daisy!")
            .into_push_pull_output();

        let led1 = RGBLed::new(led1_red, led1_green, led1_blue, LEDConfig::ActiveLow, 1000);

        let led2_red = system
            .gpio
            .daisy17
            .take()
            .expect("Failed to get pin 17 of the daisy!")
            .into_push_pull_output();

        let led2_green = system
            .gpio
            .daisy24
            .take()
            .expect("Failed to get pin 24 of the daisy!")
            .into_push_pull_output();

        let led2_blue = system
            .gpio
            .daisy23
            .take()
            .expect("Failed to get pin 23 of the daisy!")
            .into_push_pull_output();

        let led2 = RGBLed::new(led2_red, led2_green, led2_blue, LEDConfig::ActiveLow, 1000);

        // setting up rotary encoder

        let rotary_switch_pin = system
            .gpio
            .daisy13
            .take()
            .expect("Failed to get pin 13 of the daisy!")
            .into_pull_up_input();

        let rotary_clock_pin = system
            .gpio
            .daisy25
            .take()
            .expect("Failed to get pin 25 of the daisy!")
            .into_pull_up_input();

        let rotary_data_pin = system
            .gpio
            .daisy26
            .take()
            .expect("Failed to get pin 26 of the daisy!")
            .into_pull_up_input();

        let mut encoder =
            encoder::RotaryEncoder::new(rotary_switch_pin, rotary_clock_pin, rotary_data_pin);
        encoder.switch.set_held_thresh(Some(2));

        // audio stuff

        let buffer = [(0.0, 0.0); audio::BLOCK_SIZE_MAX]; // audio ring buffer

        // Daisy Pod setup finished

        // set user led to low
        seed_led.set_low();

        Self {
            audio_rate: AudioRate {
                audio: system.audio,
                buffer,
            },
            control_rate: ControlRate {
                adc1,
                timer2: system.timer2,
                pot1,
                pot2,
                led1,
                led2,
                switch1,
                switch2,
                encoder,
            },
            sdram,
            sd_card,
        }
    }
}
