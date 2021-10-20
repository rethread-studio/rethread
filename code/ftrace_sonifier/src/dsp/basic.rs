
pub type Sample = f64;

use std::f64::consts::PI;
use nannou::rand::random;

use super::wavetable::{WavetableArena, WavetableIndex};
use super::buffer::Buffer;
use super::envelope::ExponentialDecay;

/// Trait for a mono signal where resources are shared between signals
pub trait LocalSig {
    fn next(&mut self, resources: &mut Resources) -> Sample;
}

pub struct Resources {
    pub wavetable_arena: WavetableArena,
    pub busses: Vec<Sample>,
    pub buffers: Vec<Buffer>,
    /// The sample rate of the audio process
    pub sample_rate: Sample,
}

impl Resources {
    pub fn new(wavetable_arena: WavetableArena, sample_rate: Sample) -> Self {
        Resources {
            wavetable_arena,
            busses: vec![0.0; 200],
            buffers: vec![],
            sample_rate,
        }
    }
}

#[derive(Copy, Clone)]
pub struct Phase {
    pub value: Sample,
    pub step: Sample,
}

impl Phase {
    pub fn new() -> Self {
        Phase {
            value: 0.0,
            step: 0.0,
        }
    }
    pub fn from_freq(freq: Sample, sample_rate: Sample) -> Self {
        let mut phase = Phase::new();
        phase.set_freq(freq, sample_rate);
        phase
    }
    pub fn set_freq(&mut self, freq: Sample, sample_rate: Sample) {
        self.step = freq / sample_rate;
    }
    #[inline]
    pub fn next_raw(&mut self) -> Sample {
        // Use the phase to index into the wavetable
        let out = self.value;
        self.value += self.step;
        while self.value >= 1.0 {
            self.value -= 1.0;
        }
        out
    }
}
impl LocalSig for Phase {
    #[inline]
    fn next(&mut self, _resources: &mut Resources) -> Sample {
        self.next_raw()
    }
}


pub struct LFNoise1 {
    value: Sample,
    target: Sample,
    step: Sample,
    reset_counter: usize,
    steps_between: usize,
    min: Sample,
    max: Sample,
}

impl LFNoise1 {
    pub fn new(time_between: Sample, min: Sample, max: Sample, sample_rate: Sample) -> Self {
        LFNoise1 {
            value: 0.0,
            target: 0.0,
            step: 0.0,
            reset_counter: 0,
            steps_between: (time_between * sample_rate) as usize,
            min,
            max
        }
    }
}

impl LocalSig for LFNoise1 {
    fn next(&mut self, resources: &mut Resources) -> Sample {
        if self.reset_counter <= 0 {
            // TODO: use a real-time safe random number generator
            self.target = random::<f64>() * (self.max - self.min) + self.min;
            self.step = (self.target - self.value) / self.steps_between as f64;
            self.reset_counter = self.steps_between;
        } else {
            self.reset_counter -= 1;
        }
        self.value += self.step;
        self.value
    }
}

// It seems very hard to keep Oscillator being Signal **and** have it fetch the wavetable from
// a WavetableArena every call to next() since next() provides no state. The state has to be in the
// Signal. We could put the Wavetable inside the Osciallator, and be unable to share it between oscillators 
// or modify it. We could also put an Rc<Wavetable> in the Oscillator, but this is not Send unless we're resorting to unsafe.
pub struct Oscillator {
    step: Sample,
    phase: Sample,
    wavetable: WavetableIndex,
    amp: Sample,
}

impl Oscillator
{
    pub fn new(wavetable: WavetableIndex, sample_rate: Sample) -> Self {
        Oscillator {
            step: 0.0,
            phase: 0.0,
            wavetable,
            amp: 1.0,
        }
    }
    pub fn from_freq(wavetable: WavetableIndex, sample_rate: Sample, freq: Sample, amp: Sample) -> Self {
        let mut osc = Oscillator::new(wavetable, sample_rate);
        osc.amp = amp;
        osc.set_freq(freq, sample_rate);
        osc
    }
    pub fn set_freq(&mut self, freq: Sample, sample_rate: Sample) {
        self.step = freq/sample_rate;
    }
    pub fn reset_phase(&mut self) {
        self.phase = 0.0;
    }
}
impl LocalSig for Oscillator {
    #[inline]
    fn next(&mut self, resources: &mut Resources) -> Sample {
        let temp_phase = self.phase;
        self.phase += self.step;
        while self.phase >= 1.0 {
            self.phase -= 1.0;
        }
        // Use the phase to index into the wavetable
        match resources.wavetable_arena.get(self.wavetable) {
            Some(wt) => wt.get(temp_phase) * self.amp,
            None => 0.0
        }
    }
}

pub struct TriggeredOscillator {
    oscillator: Oscillator,
    env: ExponentialDecay,
}

impl TriggeredOscillator {
    pub fn new(wavetable: WavetableIndex, sample_rate: Sample) -> Self {
        TriggeredOscillator {
            oscillator: Oscillator::new(wavetable, sample_rate),
            env: ExponentialDecay::new(0.5, sample_rate),
        }
    }
    pub fn from_freq(wavetable: WavetableIndex, sample_rate: Sample, freq: Sample, amp: Sample) -> Self {
        let mut osc = Oscillator::new(wavetable, sample_rate);
        osc.amp = amp;
        osc.set_freq(freq, sample_rate);
        TriggeredOscillator {
            oscillator: osc,
            env: ExponentialDecay::new(0.5, sample_rate),
        }
    }
    pub fn trigger(&mut self, amp: Sample, decay: Sample) {
        self.oscillator.reset_phase();
        self.env.set_duration(decay);
        self.env.trigger(amp);
    }
    pub fn set_freq(&mut self, freq: Sample, sample_rate: Sample) {
        self.oscillator.set_freq(freq, sample_rate);
    }
}
impl LocalSig for TriggeredOscillator {
    #[inline]
    fn next(&mut self, resources: &mut Resources) -> Sample {
        self.oscillator.next(resources) * self.env.next(resources)
    }
}

#[derive(Copy, Clone)]
pub struct Sine {
    pub sample_rate: f64,
    pub phase: f64,
    pub freq: f64,
    pub amp: f64,
    pub add: f64,
}

impl Sine {
    pub fn new() -> Self {
        Sine {
            phase: 0.0,
            freq: 220.0,
            amp: 0.0,
            add: 0.0,
            sample_rate: 44100.0,
        }
    }

    pub fn from(freq: f64, amp: f64, add: f64, phase: f64, sample_rate: f64) -> Self {
        Sine {
            phase,
            freq,
            amp,
            add,
            sample_rate,
        }
    }

    pub fn set_range(&mut self, min: f64, max: f64) {
        self.amp = ((max - min)/2.0).abs();
        self.add = (max + min)/2.0;
    }
}
impl LocalSig for Sine {
    fn next(&mut self, resources: &mut Resources) -> f64 {
        let sine_amp = (2.0 * PI * self.phase).sin();
        self.phase += self.freq / self.sample_rate;
        self.phase %= self.sample_rate;
        return (sine_amp * self.amp) + self.add;
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