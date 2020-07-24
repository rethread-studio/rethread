use std::f64::consts::PI;
// use std::f32::consts::PI;

// Performance: Reusing one wavetable seems to double the performance looking at jack's DSP meter

// Wavetable player as Signal (use Phase)
// Wavetable generator to create wavetable buffers (sine, saw, custom wavetables, look at SC for inspiration)
// synth using the wavetable and some filters. Connect to some reverb.

pub type Sample = f64;

pub trait Signal {
    fn next(&mut self, resources: &WavetableArena) -> Sample;
}

pub struct Wavetable {
    buffer: Vec<Sample>, // Box<[Sample; 131072]>,
    // Store the size as an f64 to find fractional indexes without typecasting
    size: Sample,
}

impl Wavetable {
    fn new(wavetable_size: usize) -> Self {
        let w_size = if !is_power_of_2(wavetable_size) {
            // Make a power of two by taking the log2 and discarding the fractional part of the answer and then squaring again
            ((wavetable_size as f64).log2() as usize).pow(2)
        } else {
            wavetable_size
        };
        let buffer = vec![0.0; w_size];
        Wavetable {
            buffer,
            size: w_size as Sample,
        }
    }
    pub fn sine(wavetable_size: usize) -> Self {
        let mut wt = Wavetable::new(wavetable_size);
        // Fill buffer with a sine
        for i in 0..wavetable_size {
            wt.buffer[i] = ((i as Sample / wt.size) * PI * 2.0).sin();
        }
        wt
    }

    /// Linearly interpolate between the value in between which the phase points.
    /// The phase is assumed to be 0 <= phase < 1
    #[inline]
    fn get_linear_interp(&self, phase: Sample) -> Sample {
        let index = self.size * phase;
        let mix = index.fract();
        self.buffer[index.floor() as usize] * (1.0-mix) + self.buffer[index.ceil() as usize % self.buffer.len()] * mix
    }

    /// Get the closest sample with no interpolation
    #[inline]
    fn get(&self, phase: Sample) -> Sample {
        let index = (self.size * phase) as usize;
        // self.buffer[index]
        unsafe{ *self.buffer.get_unchecked(index) }
    }
}

fn is_power_of_2(num: usize) -> bool {
    return num > 0 && num&(num-1) == 0;
}

pub struct ExponentialDecay {
    value: Sample,
    sample_rate: f64,
    decay_scaler: f64,
    duration: Sample,
}

impl ExponentialDecay {
    pub fn new(duration: f64, sample_rate: f64) -> Self {
        let mut s = ExponentialDecay {
            value: 0.0,
            sample_rate,
            decay_scaler: 1.0,
            duration: 0.0,
        };
        s.set_duration(duration);
        s
    }
    pub fn set_duration(&mut self, duration: f64) {
        // From the SC XLine implementation: growth = pow(end / start, 1.0 / counter);
        let duration_in_samples = duration * self.sample_rate;
        // 0.001 = -60dB
        self.decay_scaler = (0.001_f64).powf(1.0/duration_in_samples);
    }
    pub fn trigger(&mut self, value: Sample) {
        self.value = value;
    }
    pub fn next(&mut self) -> Sample {
        self.value *= self.decay_scaler;
        self.value
    }
}

struct Phase {
    value: Sample,
    step: Sample,
}

impl Phase {
    fn new() -> Self {
        Phase {
            value: 0.0,
            step: 0.0,
        }
    }
    fn from_freq(freq: Sample, sample_rate: Sample) -> Self {
        let mut phase = Phase::new();
        phase.set_freq(freq, sample_rate);
        phase
    }
    fn set_freq(&mut self, freq: Sample, sample_rate: Sample) {
        self.step = freq / sample_rate;
    }
    #[inline]
    fn next(&mut self) -> Sample {
        // Use the phase to index into the wavetable
        let out = self.value;
        self.value = (self.value + self.step) % 1.0;
        out
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
    env: ExponentialDecay,
}

impl Oscillator
{
    pub fn new(wavetable: WavetableIndex, sample_rate: Sample) -> Self {
        Oscillator {
            step: 0.0,
            phase: 0.0,
            wavetable,
            amp: 1.0,
            env: ExponentialDecay::new(0.5, sample_rate),
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
    pub fn trigger(&mut self, decay: Sample) {
        self.phase = 0.0;
        self.env.set_duration(decay);
        self.env.trigger(1.0);
    }
    #[inline]
    fn next(&mut self, wavetable_arena: &WavetableArena) -> Sample {
        let temp_phase = self.phase;
        self.phase += self.step;
        while self.phase >= 1.0 {
            self.phase -= 1.0;
        }
        // Use the phase to index into the wavetable
        match wavetable_arena.get(self.wavetable) {
            Some(wt) => wt.get(temp_phase) * self.amp * self.env.next(),
            None => 0.0
        }
    }
}

/// Group of oscillators for a certain frequency range
struct SynthesisGroup {
    min_freq: Sample,
    max_freq: Sample,
    oscillators: Vec<Oscillator>,
    next_oscillator: usize,
    sample_rate: Sample,
}

impl SynthesisGroup {
    pub fn new(sine_wt: WavetableIndex, 
        min_freq: Sample, 
        max_freq: Sample,
        sample_rate: Sample,
        num_oscillators: usize
    ) -> Self {
        let mut oscillators: Vec<Oscillator> = Vec::new();
        
        for n in 0..num_oscillators {
            let sig = Oscillator::from_freq(
                sine_wt, 
                sample_rate, 
                200.0,
                0.005
            );
            oscillators.push(
                sig
            );
        }
        SynthesisGroup {
            min_freq,
            max_freq,
            oscillators,
            next_oscillator: 0,
            sample_rate,
        }
    }
    pub fn trigger_oscillator(&mut self, freq: Sample, decay: Sample) {
        self.oscillators[self.next_oscillator].set_freq(freq, self.sample_rate);
        self.oscillators[self.next_oscillator].trigger(decay);
        self.next_oscillator += 1;
        if self.next_oscillator >= self.oscillators.len() {
            self.next_oscillator = 0;
        }
    }
    pub fn contains_freq(&self, freq: Sample) -> bool {
        freq >= self.min_freq && freq <= self.max_freq
    }
}

impl Signal for SynthesisGroup {
    #[inline]
    fn next(&mut self, wavetable_arena: &WavetableArena) -> Sample {
        let mut amp = 0.0;
        for osc in &mut self.oscillators {
            amp += osc.next(wavetable_arena);
        }
        amp
    }
}

struct BassSynthesis {
    freq: Sample,
    oscillators: Vec<Oscillator>,
    sample_rate: Sample,
}

impl BassSynthesis {
    pub fn new(sine_wt: WavetableIndex, 
        freq: Sample,
        sample_rate: Sample,
        num_oscillators: usize
    ) -> Self {
        let mut oscillators: Vec<Oscillator> = Vec::new();
        
        for n in 0..num_oscillators {
            let sig = Oscillator::from_freq(
                sine_wt, 
                sample_rate, 
                freq * (n+1) as Sample,
                0.05 / (n+1) as Sample
            );
            oscillators.push(
                sig
            );
        }
        BassSynthesis {
            freq,
            oscillators,
            sample_rate,
        }
    }
    pub fn trigger(&mut self, decay: Sample, index: usize) {
        let len = self.oscillators.len();
        self.oscillators[index % len].trigger(decay);
    }
    pub fn set_freq(&mut self, freq: Sample) {
        for (i, osc) in self.oscillators.iter_mut().enumerate() {
            osc.set_freq(freq * (i+1) as Sample, self.sample_rate)
        }
    }
}

impl Signal for BassSynthesis {
    #[inline]
    fn next(&mut self, wavetable_arena: &WavetableArena) -> Sample {
        let mut amp = 0.0;
        for osc in &mut self.oscillators {
            amp += osc.next(wavetable_arena);
        }
        amp
    }
}

// We could later turn WavetableIndex into a generational index if we'd want
type WavetableIndex = usize;
pub struct WavetableArena {
    wavetables: Vec<Option<Wavetable>>,
    next_free_index: WavetableIndex,
    freed_indexes: Vec<WavetableIndex>,
}

impl WavetableArena {
    fn new() -> Self {
        let mut wavetables = Vec::with_capacity(100);
        for i in 0..100 {
            wavetables.push(None);
        }
        WavetableArena {
            wavetables,
            next_free_index: 0,
            freed_indexes: vec![]
        }
    }
    fn get(&self, index: WavetableIndex) -> &Option<Wavetable> {
        &self.wavetables[index]
    }
    fn add(&mut self, wavetable: Wavetable) -> WavetableIndex {
        // TODO: In order to do this safely in an audio thread we should pass the old value on to a helper thread for deallocation
        // since dropping it here would probably deallocate it.
        let old_wavetable = self.wavetables[self.next_free_index].replace(wavetable);
        let index = self.next_free_index;
        self.next_free_index += 1;
        // TODO: Check that the next free index is within the bounds of the wavetables Vec or else use the indexes that have been freed
        index
    }

}

pub struct SynthesisEngine {
    wavetable_arena: WavetableArena,
    sample_rate: Sample,
    synthesis_groups: Vec<SynthesisGroup>,
    bass_synthesis: BassSynthesis,
}

impl SynthesisEngine {
    pub fn new(sample_rate: Sample) -> Self {
        let mut wavetable_arena = WavetableArena::new();
        // Add a wavetable to the arena
        let sine_wt = wavetable_arena.add(Wavetable::sine(131072));
        let mut synthesis_groups = vec![];
        let mid_group = SynthesisGroup::new(
            sine_wt,
            100.0,
            300.0,
            sample_rate,
            100
        );
        let mid_high_group = SynthesisGroup::new(
            sine_wt,
            300.0,
            800.0,
            sample_rate,
            100
        );
        let high_group = SynthesisGroup::new(
            sine_wt,
            800.0,
            2000.0,
            sample_rate,
            100
        );
        let high_high_group = SynthesisGroup::new(
            sine_wt,
            200.0,
            10000.0,
            sample_rate,
            100
        );
        let air_group = SynthesisGroup::new(
            sine_wt,
            1000.0,
            20000.0,
            sample_rate,
            100
        );
        synthesis_groups.push(mid_group);
        synthesis_groups.push(mid_high_group);
        synthesis_groups.push(high_group);
        synthesis_groups.push(high_high_group);
        synthesis_groups.push(air_group);

        let bass_synthesis = BassSynthesis::new(
            sine_wt,
            50.0,
            sample_rate,
            16,
        );

        SynthesisEngine {
            wavetable_arena,
            sample_rate,
            synthesis_groups,
            bass_synthesis
        }
    }

    pub fn trigger_oscillator(&mut self, freq: Sample, decay: Sample) {
        for synth_group in &mut self.synthesis_groups {
            if synth_group.contains_freq(freq) {
                synth_group.trigger_oscillator(freq, decay);
                break;
            }
        }
    }

    pub fn trigger_bass(&mut self, index: usize, decay: Sample) {
        self.bass_synthesis.trigger(decay, index);
    }

    pub fn next(&mut self) -> Sample {
        let mut amp = 0.0;
        
        for group in &mut self.synthesis_groups {
            amp += group.next(&self.wavetable_arena);
        }
        amp += self.bass_synthesis.next(&self.wavetable_arena);
        amp
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

    pub fn next(&mut self) -> f64 {
        let sine_amp = (2.0 * PI * self.phase).sin();
        self.phase += self.freq / self.sample_rate;
        self.phase %= self.sample_rate;
        return (sine_amp * self.amp) + self.add;
    }
}

pub struct Metronome {
    tick_duration: usize,
    sample_counter: usize,
    ticks_per_bar: usize,
    current_tick: usize,
    exponential_decay: ExponentialDecay,
    synth: Sine,
}


impl Metronome {
    pub fn new(bpm: usize, ticks_per_bar: usize, sample_rate: usize) -> Self {
        let mut m = Metronome{
            tick_duration: 60 * sample_rate / bpm,
            sample_counter: 0,
            ticks_per_bar,
            current_tick: 0,
            exponential_decay: ExponentialDecay::new(0.5, sample_rate as f64),
            synth: Sine::from(2000.0, 0.1, 0.0, 0.0, sample_rate as f64),
        };
        m.exponential_decay.trigger(1.0);
        m
    }
    pub fn next(&mut self) -> Sample {
        // Progress state machine
        self.sample_counter += 1;
        if self.sample_counter >= self.tick_duration {
            self.exponential_decay.trigger(1.0);
            self.sample_counter = 0;
            self.current_tick += 1;
            if self.current_tick >= self.ticks_per_bar {
                self.synth.freq = 2000.0;
                self.current_tick = 0;
            } else {
                self.synth.freq = 1000.0;
            }
        }

        self.synth.next() * self.exponential_decay.next()
    }
}