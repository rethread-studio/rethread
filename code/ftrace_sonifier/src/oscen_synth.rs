// Trying out using Oscen for our sound synthesis needs


use oscen::filters::Lpf;
use oscen::operators::Modulator;
use oscen::oscillators::{SineOsc, SquareOsc};
use oscen::signal::*;

pub struct SynthesisEngine {
    rack: Rack,
    sample_rate: Real,
}

impl SynthesisEngine {
    pub fn new(sample_rate: f64) -> Self {
        // Build the Synth.
        // A Rack is a collection of synth modules.
        let mut rack = Rack::new(vec![]);

        // Use a low frequencey sine wave to modulate the frequency of a square wave.
        // let sine = SineOsc::new().hz(1).rack(&mut rack);
        // let modulator = Modulator::new(sine.tag())
        //     .base_hz(440)
        //     .mod_hz(220)
        //     .mod_idx(1)
        //     .rack(&mut rack);

        // // Create a square wave oscillator and add it the the rack.
        // let square = SquareOsc::new().hz(modulator.tag()).rack(&mut rack);

        // // Create a low pass filter whose input is the square wave.
        // let lpf_sine = SineOsc::new().hz(0.1).rack(&mut rack);
        // let lpf_modulator = Modulator::new(lpf_sine.tag())
        //     .base_hz( 500)
        //     .mod_hz(320)
        //     .mod_idx(1)
        //     .rack(&mut rack);
        // Lpf::new(square.tag()).cutoff_freq(lpf_modulator.tag()).rack(&mut rack);

        let num_oscillators = 400;
        let amp = 1.0 / num_oscillators as f64;
        for i in 0..num_oscillators {
            let sine = SineOsc::new().amplitude(amp).hz(200).rack(&mut rack);
        }

        SynthesisEngine {
            rack,
            sample_rate
        }
    }
    pub fn next(&mut self) -> f64 {
        self.rack.signal(self.sample_rate)
    }
}