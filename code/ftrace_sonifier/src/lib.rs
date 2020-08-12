
use std::f64::consts::PI;

type Sample = f64;

pub mod synth;
pub mod oscen_synth;
pub mod shared_wavetable_synth;
pub mod dasp_synth;

pub mod audio_interface;
pub mod load_sound;

pub mod event_stats;

pub mod midi_input;

#[derive(Clone, Copy)]
pub struct Trigger {
    value: f64,
    trigger_threshold: f64,
    equilibrium: f64, // The neutral "resting" point for the trigger
}

impl Trigger {
    pub fn new() -> Self {
        Trigger {
            value: 0.0,
            trigger_threshold: 1.0,
            equilibrium: 1.0,
        }
    }
    /// Returns if the trigger has triggered or not
    pub fn activate(&mut self) -> bool {
        self.value += 1.0;
        if self.value >= self.trigger_threshold {
            self.trigger();
            true
        } else {
            false
        }
    }
    pub fn trigger(&mut self) {
        self.value = 0.0;
        // Adjust the equilibrium point towards the trigger threshold
        self.equilibrium = self.equilibrium * 0.9 + self.trigger_threshold * 0.1;
        // Increase the threshold to the next trigger (will decrease towards the equilibrium over time)
        self.trigger_threshold *= 1.5;
    }
    pub fn update(&mut self) {
        // Lower the trigger_threshold slowly over time
        self.trigger_threshold = self.trigger_threshold * 0.9 + self.equilibrium * 0.1;
        // Lower the value slowly over time
        self.value *= 0.99;
        // Lower the equilibrium very very slowly over time
        self.equilibrium *= 0.999;
    }
}

#[derive(Clone, Copy)]
pub enum SelectionMode {
    EventFamily,
    Square
}

#[derive(Clone)]
/// State that is shared between the GUI thread, the OSC processing thread and the MIDI thread
pub struct SharedState {
    pub focus_point: nannou::geom::Point2,
    pub zoom: f32,
    pub decay_coeff_change: Option<f64>,
    pub amp_coeff_change: Option<f64>,
    pub param0: Option<f64>,
    pub param1: Option<f64>,
    pub param2: Option<f64>,
    pub density_threshold: f64,
    pub mute: Option<bool>,
    pub num_textures: usize,
    pub num_single_pitches: usize,
    pub set_synthesis_type_texture: Option<bool>,
    pub set_synthesis_type_pitch: Option<bool>,
    pub set_synthesis_type_bass: Option<bool>,
    pub tick_length: std::time::Duration,
    pub density_approach: event_stats::DensityApproach,
    pub selection_mode: SelectionMode,
    pub select_family: event_stats::EventFamily,
    pub triggers: Vec<Trigger>
}
impl SharedState {
    pub fn new() -> Self {
        SharedState {
            focus_point: nannou::geom::pt2(0.0, 0.0),
            zoom: 0.5, // Zoom 0.5 is the maximally outzoomed since it saves us an operation when checking if an event is inside
            decay_coeff_change: None,
            amp_coeff_change: None,
            param0: None,
            param1: None,
            param2: None,
            density_threshold: 10.0,
            mute: None,
            num_textures: 0,
            num_single_pitches: 0,
            set_synthesis_type_texture: None,
            set_synthesis_type_pitch: None,
            set_synthesis_type_bass: None,
            tick_length: std::time::Duration::from_millis(8),
            density_approach: event_stats::DensityApproach::DensityChange,
            selection_mode: SelectionMode::Square,
            select_family: event_stats::EventFamily::EXCEPTIONS,
            triggers: vec![Trigger::new(); 100],
        }
    }
    /// Reset settings carried over from midi input
    pub fn reset(&mut self) {
        self.decay_coeff_change = None;
        self.amp_coeff_change = None;
        self.param0 = None;
        self.param1 = None;
        self.param2 = None;
        self.mute = None;
        self.set_synthesis_type_texture = None;
        self.set_synthesis_type_pitch = None;
        self.set_synthesis_type_bass = None;
    }
}

#[derive(Copy, Clone)]
pub struct HighPassFilter {
    last_sample: Sample
}

impl HighPassFilter {
    pub fn new() -> Self {
        HighPassFilter{ last_sample: 0.0 }
    }

    pub fn next(&mut self, input: Sample) -> Sample {
        let value = input - self.last_sample;
        self.last_sample = input;
        value
    }
}

#[derive(Copy, Clone)]
pub struct BiquadFilter {
    input_buffer: [Sample; 2],
    output_buffer: [Sample; 2],
    a1: Sample,
    a2: Sample,
    b0: Sample,
    b1: Sample,
    b2: Sample,
    ready: bool, // true if the coefficients have been calculated
}

impl BiquadFilter {
    pub fn new(sample_rate: f64,  frequency: f64,  q: f64) -> Self {
        let mut new_filter = BiquadFilter {
            input_buffer: [0.0; 2],
            output_buffer: [0.0; 2],
            a1: 0.0,
            a2: 0.0,
            b0: 0.0,
            b1: 0.0,
            b2: 0.0,
            ready: false,
        };
        new_filter.calculate_coefficients(sample_rate, frequency, q);
        new_filter
    }
    /// Calculate the filter coefficients based on the given parameters
    /// Borrows code from the Bela Biquad library, itself based on code by
    /// Nigel Redmon
    pub fn calculate_coefficients(&mut self, sample_rate: f64,  frequency: f64,  q: f64) {
        let k = (PI * frequency / sample_rate).tan();
        let norm = 1.0 / (1.0 + k / q + k * k);
        
        self.b0 = k * k * norm;
        self.b1 = 2.0 * self.b0;
        self.b2 = self.b0;
        self.a1 = 2.0 * (k * k - 1.0) * norm;
        self.a2 = (1.0 - k / q + k * k) * norm;	

        self.ready = true;
    }
    pub fn next(&mut self, input: Sample) -> Sample {
        if !self.ready {
            // if we haven't calculated the coefficients the output could be anything
            return input;
        }
        let mut output = self.b0*input + self.b1*self.input_buffer[0] + self.b2*self.input_buffer[1];
        output -= self.a1*self.output_buffer[0] + self.a2*self.output_buffer[1];

        self.input_buffer[1] = self.input_buffer[0];
        self.input_buffer[0] = input;
        self.output_buffer[1] = self.output_buffer[0];
        self.output_buffer[0] = output;
        output
    }
    /// Resets the history of the filter
    pub fn reset(&mut self) {
        self.input_buffer[0] = 0.0;
        self.input_buffer[1] = 0.0;
        self.output_buffer[0] = 0.0;
        self.output_buffer[1] = 0.0;
    }
}

pub struct Ramp {
    value: Sample,
    increment: Sample,
    sample_rate: usize,
    counter: usize,
}

impl Ramp {
    pub fn new(start: Sample, sample_rate: usize) -> Self {
        Ramp {
            value: start,
            increment: 0.0,
            sample_rate: sample_rate,
            counter: 0,
        }
    }
    pub fn set_value(&mut self, value: Sample) {
        self.value = value;
        self.increment = 0.0;
        self.counter = 0;
    }
    pub fn ramp_to(&mut self, end: Sample, duration: f64) {
        self.counter = (self.sample_rate as f64 * duration) as usize;
        self.increment = (end - self.value) / self.counter as Sample;
    }
    pub fn next(&mut self) -> Sample {
        if self.counter > 0 {
            self.value += self.increment;
            self.counter -= 1;
        }
        self.value
    }
    pub fn is_finished(&self) -> bool {
        self.counter <= 0
    }
}

/// The EnvelopeFollower uses two lowpass filters on the absolute value of a signal, 
/// one fast one for attack and one slow filter for release.
pub struct EnvelopeFollower {
    last_output: Sample,
    attack_coeff: Sample,
    release_coeff: Sample,
}

impl EnvelopeFollower {
    pub fn new(sample_rate: f64) -> Self {
        let attack_time = 0.002;
        let decay_time = 0.1;
        EnvelopeFollower {
            last_output: 0.0,
            attack_coeff: (-1.0_f64/attack_time).exp().powf(1.0/sample_rate),
            release_coeff: (-1.0_f64/decay_time).exp().powf(1.0/sample_rate),
        }
    }
    pub fn next(&mut self, input: Sample) -> Sample {
        let abs_in = input.abs();
        let value = if abs_in >= self.last_output {
            // attack
            self.last_output * self.attack_coeff + (1.0-self.attack_coeff) * abs_in
        } else {
            // release
            self.last_output * self.release_coeff + (1.0-self.release_coeff) * abs_in
        };
        
        self.last_output = value;
        value
    }
}