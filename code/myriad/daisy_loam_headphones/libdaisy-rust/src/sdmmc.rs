use stm32h7xx_hal::{
    self as hal,
    gpio::{self, Analog, Speed},
    prelude::*,
    sdmmc::SdmmcPeripheral,
    stm32,
};

const SDMMC_SPEED: Speed = Speed::VeryHigh; // Should be able to go to VeryHigh

/// Boiler plate to create SDMMC1
pub fn init<P: SdmmcPeripheral>(
    daisy1: gpio::gpioc::PC11<Analog>,
    daisy2: gpio::gpioc::PC10<Analog>,
    daisy3: gpio::gpioc::PC9<Analog>,
    daisy4: gpio::gpioc::PC8<Analog>,
    daisy5: gpio::gpiod::PD2<Analog>,
    daisy6: gpio::gpioc::PC12<Analog>,

    device: stm32::SDMMC1,
    sdmmc1: hal::rcc::rec::Sdmmc1,
    clocks: &hal::rcc::CoreClocks,
) -> hal::sdmmc::Sdmmc<stm32::SDMMC1, P> {
    /*
     * libDaisy
     *  PC12 - SDMMC1 CK
     *  PD2  - SDMMC1 CMD
     *  PC8  - SDMMC1 D0
     *  PC9  - SDMMC1 D1 (optional)
     *  PC10 - SDMMC1 D2 (optional)
     *  PC11 - SDMMC1 D3 (optional)
     */

    // SDMMC pins
    let internal_pull_up = true;
    let clk = daisy6
        .into_alternate()
        .internal_pull_up(false)
        .speed(SDMMC_SPEED);
    let cmd = daisy5
        .into_alternate()
        .internal_pull_up(internal_pull_up)
        .speed(SDMMC_SPEED);
    let d0 = daisy4
        .into_alternate()
        .internal_pull_up(internal_pull_up)
        .speed(SDMMC_SPEED);
    let d1 = daisy3
        .into_alternate()
        .internal_pull_up(internal_pull_up)
        .speed(SDMMC_SPEED);
    let d2 = daisy2
        .into_alternate()
        .internal_pull_up(internal_pull_up)
        .speed(SDMMC_SPEED);
    let d3 = daisy1
        .into_alternate()
        .internal_pull_up(internal_pull_up)
        .speed(SDMMC_SPEED);

    // Create SDMMC
    device.sdmmc((clk, cmd, d0, d1, d2, d3), sdmmc1, clocks)
}
