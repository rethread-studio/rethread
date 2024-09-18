use core::num::NonZero;

use libdaisy::prelude::*;
use libdaisy::{audio, gpio::*, hid, sdmmc, system::System};

use log::{info, warn};
use stm32h7xx_hal::rcc::rec::Spi1;
use stm32h7xx_hal::spi::Enabled;
use stm32h7xx_hal::time::Hertz;
use stm32h7xx_hal::timer::Timer;
use stm32h7xx_hal::{adc, pac, spi, stm32};

use crate::encoder;
use crate::rgbled::*;
use crate::sd_card::{self, SdCardLocal};
use crate::CONTROL_RATE_IN_MS;

pub type DataReady = Daisy11<Input>;
pub type SeedLed = stm32h7xx_hal::gpio::Pin<'C', 7, Output>;

pub struct AudioRate {
    pub audio: audio::Audio,
    pub buffer: audio::AudioBuffer,
}

pub struct ControlRate {
    // HAL
    pub adc1: adc::Adc<stm32::ADC1, adc::Enabled>,
    pub timer2: Timer<stm32::TIM2>,
    pub data_ready: DataReady,
    pub spi: spi::Spi<stm32::SPI1, Enabled>,
    pub seed_led: SeedLed,
}

pub struct DaisySeed {
    pub audio_rate: AudioRate,
    pub control_rate: ControlRate,
    pub sdram: &'static mut [f32],
    pub sd_card: Option<SdCardLocal>,
    // pub spi:
}

impl DaisySeed {
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
        // sdram.fill(0.0); // This takes a long time and creates a beep at startup

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
        // if false {
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

        // audio stuff

        let buffer = [(0.0, 0.0); audio::BLOCK_SIZE_MAX]; // audio ring buffer

        // SPI
        // let gpioc = unsafe { pac::Peripherals::steal().GPIOC }.split(ccdr.peripheral.GPIOC);
        // let sck = gpioc.pc10.into_alternate();
        // let miso = gpioc.pc11.into_alternate();
        // let mosi = gpioc.pc12.into_alternate();

        // // Initialise the SPI peripheral.
        // let mut spi = dp.SPI1.spi(
        //     (sck, miso, mosi),
        //     spi::MODE_0,
        //     3.MHz(),
        //     ccdr.peripheral.SPI1,
        //     &ccdr.clocks,
        //
        // );

        // D10 MOSI PB5
        // D9 MISO PB4
        // D8 CLK PG11
        // D7 CS PG10
        // let mosi = system.gpio.daisy10.unwrap();
        // let miso = system.gpio.daisy9.unwrap();
        // let sck = system.gpio.daisy8.unwrap();
        // let hcs = system.gpio.daisy7.unwrap();
        let mosi = system.gpio.daisy10.unwrap().into_alternate();
        let miso = system.gpio.daisy9.unwrap().into_alternate();
        let sck = system.gpio.daisy8.unwrap().into_alternate::<5>();
        let hcs = system.gpio.daisy7.unwrap().into_alternate();
        // let sck = gpiog.pg11.into_alternate::<5>();
        // let miso = gpiob.pb4.into_alternate();
        // let mosi = gpiob.pb5.into_alternate();
        // // Because we want to use the hardware chip select, we need to provide that too
        // let hcs = gpiog.pg10.into_alternate();
        // let hcs = hcs.into_push_pull_output_in_state(stm32h7xx_hal::gpio::PinState::High);
        // Initialise the SPI peripheral.
        let mut spi = unsafe { pac::Peripherals::steal() }.SPI1.spi(
            // Give ownership of the pins
            (sck, miso, mosi, hcs),
            // Create a config with the hardware chip select given
            spi::Config::new(spi::MODE_0)
                // Put 1 us idle time between every word sent. (the max is 15 spi peripheral ticks)
                .inter_word_delay(0.000001)
                // Specify that we use the hardware cs
                .hardware_cs(spi::HardwareCS {
                    // See the docs of the HardwareCSMode to see what the different modes do
                    mode: spi::HardwareCSMode::FrameTransaction,
                    // Put 1 us between the CS being asserted and the first clock
                    assertion_delay: 0.000001,
                    // Our CS should be high when not active and low when asserted
                    polarity: spi::Polarity::IdleHigh,
                }),
            3.MHz(),
            ccdr.peripheral.SPI1,
            &ccdr.clocks,
        );
        spi.setup_transaction(NonZero::new(8).unwrap()).unwrap();
        let mut buf = [0, 0, 0, 0, 0, 0, 0, 0];
        match spi.transfer(&mut buf) {
            Ok(rx) => info!("{rx:?}"),
            Err(e) => warn!("Transfer failed: {e:?}"),
        }
        spi.end_transaction().unwrap();

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
                data_ready: system.gpio.daisy11.unwrap().into(),
                spi,
                seed_led,
            },
            sdram,
            sd_card,
        }
    }
}
