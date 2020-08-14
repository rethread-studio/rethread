
use std::f64::consts::PI;
pub type Sample = f64;
pub mod shared_wavetable_synth;
pub mod audio_interface;
pub mod event_stats;
pub mod midi_input;
pub mod dsp;

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