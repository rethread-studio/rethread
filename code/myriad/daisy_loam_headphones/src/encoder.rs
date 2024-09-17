use libdaisy::hid::{Switch, SwitchType};
use stm32h7xx_hal::hal::digital::v2::InputPin;

pub struct RotaryEncoder<S, C, D> {
    pub switch: Switch<S>, // gives access to the underlying Switch functions
    clock: Switch<C>,
    data: Switch<D>,
    pub current_value: i32,
    clock_state: bool,
}

impl<S, C, D> RotaryEncoder<S, C, D>
where
    S: InputPin,
    <S as InputPin>::Error: core::fmt::Debug,
    C: InputPin,
    <C as InputPin>::Error: core::fmt::Debug,
    D: InputPin,
    <D as InputPin>::Error: core::fmt::Debug,
{
    pub fn new(switch_pin: S, clock_pin: C, data_pin: D) -> Self {
        // create switches from pins
        let switch = Switch::new(switch_pin, SwitchType::PullUp);
        let clock = Switch::new(clock_pin, SwitchType::PullUp);
        let data = Switch::new(data_pin, SwitchType::PullUp);
        let current_value = 0;
        let clock_state = false;

        Self {
            switch,
            clock,
            data,
            current_value,
            clock_state,
        }
    }

    pub fn update(&mut self) {
        self.clock.update();
        self.data.update();
        self.switch.update();

        let current_clock_state: bool;
        let current_data_state: bool;

        // update clock pin
        if self.clock.is_high() {
            current_clock_state = true;
        } else {
            current_clock_state = false;
        }

        // update data pin
        if self.data.is_high() {
            current_data_state = true;
        } else {
            current_data_state = false;
        }

        // skip double state reading by only reading change from 1 to 0
        if self.clock_state != current_clock_state && current_clock_state == true {
            if current_clock_state != current_data_state {
                self.current_value += 1; // CW rotation
            } else {
                self.current_value -= 1; // CCW rotation
            }
        }

        self.clock_state = current_clock_state;
    }
}
