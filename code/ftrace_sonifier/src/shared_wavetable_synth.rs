use std::f64::consts::PI;
// use std::f32::consts::PI;
use nannou::rand::random;
use dasp::signal::{NoiseSimplex, Signal};
use super::dsp::prelude::*;
use super::dsp::basic::*;
use super::dsp::granular_synthesis::GranularSynthesiser;

pub struct SinglePitch {
    amp: Sample,
    target_amp: Sample,
    sensitivity: Sample,
    sensitivity_recovery: Sample,
    lpf_coeff: Sample,
    decay_coeff: Sample,
    oscillator: Oscillator,
    pan: Pan2,
    pan_signal: LFNoise1,
    lpf: LowPassFilter,
}

impl SinglePitch {
    pub fn new(freq: Sample, wavetable: WavetableIndex, sample_rate: Sample, decay_time: Sample, pan: Sample) -> Self {
        let duration_in_samples = decay_time * sample_rate;
        SinglePitch {
            amp: 0.0,
            target_amp: 0.0,
            sensitivity: 1.0,
            sensitivity_recovery: (1.0 / (decay_time * 0.9)) / sample_rate,
            lpf_coeff: 0.9,
            decay_coeff: (0.001_f64).powf(1.0/duration_in_samples),
            oscillator: Oscillator::from_freq(wavetable, sample_rate, freq, 1.0),
            pan: Pan2::new(pan),
            pan_signal: LFNoise1::new(3.0, -1.0, 1.0, sample_rate),
            lpf: LowPassFilter::new(0.0)
        }
    }

    pub fn add_energy(&mut self, energy: Sample) {
        self.target_amp += self.sensitivity * 0.005 * energy;
        self.target_amp = self.target_amp.max(0.0).min(0.1);
        self.sensitivity = (self.sensitivity - energy*0.002).max(0.0);
    }

    #[inline]
    fn next(&mut self, resources: &mut Resources) -> [Sample; 2] {
        self.pan.set_pan(self.pan_signal.next(resources));
        self.lpf.alpha = (0.9 - (self.amp * 9.0).powi(3)).min(1.0); 
        // self.lpf.alpha = 1.0 - self.sensitivity;
        self.amp = self.amp * self.lpf_coeff + self.target_amp * (1.0 - self.lpf_coeff);
        self.target_amp *= self.decay_coeff;
        self.sensitivity = (self.sensitivity + self.sensitivity_recovery).min(1.0);
        self.pan.next(self.lpf.next(self.oscillator.next(resources)) * self.amp)
    }
}

/// Group of oscillators for a certain frequency range
struct SynthesisGroup {
    min_freq: Sample,
    max_freq: Sample,
    oscillators: Vec<TriggeredOscillator>,
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
        let mut oscillators: Vec<TriggeredOscillator> = Vec::new();
        
        for n in 0..num_oscillators {
            let sig = TriggeredOscillator::from_freq(
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
    pub fn trigger_oscillator(&mut self, freq: Sample, amp: Sample, decay: Sample) {
        self.oscillators[self.next_oscillator].set_freq(freq, self.sample_rate);
        self.oscillators[self.next_oscillator].trigger(amp, decay);
        self.next_oscillator += 1;
        if self.next_oscillator >= self.oscillators.len() {
            self.next_oscillator = 0;
        }
    }
    pub fn contains_freq(&self, freq: Sample) -> bool {
        freq >= self.min_freq && freq <= self.max_freq
    }
}

impl LocalSig for SynthesisGroup {
    #[inline]
    fn next(&mut self, resources: &mut Resources) -> Sample {
        let mut amp = 0.0;
        for osc in &mut self.oscillators {
            amp += osc.next(resources);
        }
        amp
    }
}

/// Group of oscillators for a certain frequency range
struct TextureGroup {
    min_freq: Sample,
    oscillators: Vec<TriggeredOscillator>,
    num_oscillators: usize,
    sample_rate: Sample,
}

impl TextureGroup {
    pub fn new(
        sine_wt: WavetableIndex, 
        min_freq: Sample, 
        ratio: Sample,
        sample_rate: Sample,
        num_oscillators: usize
    ) -> Self {
        let mut oscillators: Vec<TriggeredOscillator> = Vec::new();
        
        for n in 0..num_oscillators {
            let sig = TriggeredOscillator::from_freq(
                sine_wt, 
                sample_rate, 
                min_freq * ratio.powi(n as i32),
                0.125 / num_oscillators as f64
            );
            oscillators.push(
                sig
            );
        }
        TextureGroup {
            min_freq,
            oscillators,
            num_oscillators,
            sample_rate,
        }
    }
    pub fn trigger_oscillator(&mut self, index: usize, amp: Sample, decay: Sample) {
        self.oscillators[index % self.num_oscillators].trigger(amp, decay);
    }
}

impl LocalSig for TextureGroup {
    #[inline]
    fn next(&mut self, resources: &mut Resources) -> Sample {
        let mut amp = 0.0;
        for osc in &mut self.oscillators {
            amp += osc.next(resources);
        }
        // Return a soft clipped amp
        (amp * 2.0).tanh() * 0.125
    }
}

struct BassSynthesis {
    freq: Sample,
    oscillators: Vec<TriggeredOscillator>,
    sample_rate: Sample,
    next_oscillator: usize,
}

impl BassSynthesis {
    pub fn new(sine_wt: WavetableIndex, 
        freq: Sample,
        sample_rate: Sample,
        num_oscillators: usize
    ) -> Self {
        let mut oscillators: Vec<TriggeredOscillator> = Vec::new();
        
        for n in 0..num_oscillators {
            let sig = TriggeredOscillator::from_freq(
                sine_wt, 
                sample_rate, 
                freq * (n*2+1) as Sample,
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
            next_oscillator: 0
        }
    }
    pub fn trigger(&mut self, amp: Sample, decay: Sample, index: usize) {
        let len = self.oscillators.len();
        self.oscillators[self.next_oscillator].trigger(amp, decay);
        self.next_oscillator = (random::<usize>()) % self.oscillators.len();
    }
    pub fn set_freq(&mut self, freq: Sample) {
        for (i, osc) in self.oscillators.iter_mut().enumerate() {
            osc.set_freq(freq * (i+1) as Sample, self.sample_rate)
        }
    }
}

impl LocalSig for BassSynthesis {
    #[inline]
    fn next(&mut self, resources: &mut Resources) -> Sample {
        let mut amp = 0.0;
        for osc in &mut self.oscillators {
            amp += osc.next(resources);
        }
        amp
    }
}

struct Pan2 {
    pan: Sample,
    amps: [Sample; 2],
}

impl Pan2 {
    pub fn new(pan: Sample) -> Self {
        let mut amps = [0.0; 2];
        amps[0] = pan * -0.5 + 0.5;
        amps[1] = pan * 0.5 + 0.5;
        Pan2 {
            pan,
            amps
        }
    }

    pub fn set_pan(&mut self, pan: Sample) {
        // TODO: implement pan law
        self.amps[0] = pan * -0.5 + 0.5;
        self.amps[1] = pan * 0.5 + 0.5;
    }

    pub fn next(&mut self, input: Sample) -> [Sample; 2] {
        [input * self.amps[0], input * self.amps[1]]
    }
}

#[derive(Copy, Clone)]
pub struct FMSynth {
    pub sample_rate: f64,
    pub freq: f64,
    pub m_ratio: f64,
    pub c_ratio: f64,
    pub m_index: f64,
    pub c_phase: f64,
    pub c_phase_step: f64,
    pub m_phase: f64,
    pub m_phase_step: f64,
    c_sample: f64,
    m_sample: f64,
    pub lfo_freq: f64,
    pub lfo_amp: f64,
    pub lfo_add: f64,
    pub lfo_phase: f64,
    lfo_val: f64,
    pub amp: f64,
    pub number_of_triggers: f64,
}

impl FMSynth {
    pub fn new(sample_rate: f64, freq: f64, amp: f64, m_ratio: f64, c_ratio: f64, m_index: f64) -> Self {

        // let mod_freq = signal::gen(|| [freq * m_ratio]);
        // let modulator = signal::rate(sample_rate).hz(mod_freq).sine();
        // let car_freq = signal::gen(|| [freq * c_ratio]).add_amp(modulator);
        // let carrier = signal::rate(sample_rate).hz(car_freq).sine();

        let mut synth = FMSynth {
            sample_rate,
            freq,
            m_ratio,
            c_ratio,
            m_index,
            c_phase: 0.0,
            c_phase_step: 0.0,
            m_phase: 0.0,
            m_phase_step: 0.0,
            c_sample: 0.0,
            m_sample: 0.0,
            lfo_freq: 3.0,
            lfo_amp: 4.0,
            lfo_add: 5.0,
            lfo_phase: 0.0,
            lfo_val: 0.0,
            amp,
            number_of_triggers: 0.0,
        };
        synth
    }
    pub fn next_stereo(&mut self) -> [f64; 2] {
        // LFO
        self.lfo_phase += (2.0 * std::f64::consts::PI * self.lfo_freq) / self.sample_rate;
        self.lfo_val = self.lfo_phase.sin() * self.lfo_amp + self.lfo_add;
        self.m_index = self.lfo_val;

        // Modulator
        self.m_phase_step = (2.0 * std::f64::consts::PI * self.freq * self.m_ratio) / self.sample_rate;
        self.m_phase += self.m_phase_step;
        self.m_sample = self.m_phase.sin() * self.freq * self.m_index;

        // Carrier
        // The frequency depends on the modulator so the phase step has to be calculated every step
        // let c_freq = self.freq * self.c_ratio + self.m_sample;
        self.c_phase_step = (2.0 * std::f64::consts::PI * self.freq * self.c_ratio + self.m_sample * self.c_ratio) / self.sample_rate;
        self.c_phase += self.c_phase_step;

        // The carrier output is the output of the synth
        self.c_sample = self.c_phase.sin() * self.amp;

        // Reset number of triggers
        self.number_of_triggers = 0.0;
        
        [self.c_sample, self.c_sample]
    }
    pub fn set_freq(&mut self, freq: f64) {
        self.freq = freq;
    }
    pub fn control_rate_update(&mut self) {
        self.amp *= 0.92;
    }
    pub fn trigger(&mut self, freq: f64, amp: f64) {
        self.number_of_triggers += 1.0;
        // Set the new frequencymp: f64
        // Set it so that it is an average of all triggers
        self.freq = (self.freq * (self.number_of_triggers-1.0)/self.number_of_triggers) + 
                    (freq * (1.0/self.number_of_triggers));
                    
        // Setting the amplitude triggers an attack
        self.amp = amp;
        // Reset all phases
        // self.lfo_phase = 0.0; // You may or may not want to reset the lfo phase based on how you use it
        // self.m_phase = 0.0;
        // self.c_phase = 0.0;
    }
}

pub struct SynthesisEngine {
    resources: Resources,
    sample_rate: Sample,
    synthesis_groups: Vec<SynthesisGroup>,
    texture_groups: Vec<TextureGroup>,
    single_pitches: Vec<SinglePitch>,
    bass_synthesis: BassSynthesis,
    triggers: Vec<TriggeredOscillator>,
    buf_readers: Vec<BufReader>,
    granular_synths: Vec<GranularSynthesiser>,
    output_frame: [Sample; 2],
}

impl SynthesisEngine {
    pub fn new(sample_rate: Sample) -> Self {
        let mut wavetable_arena = WavetableArena::new();
        // Add a wavetable to the arena
        let sine_wt = wavetable_arena.add(Wavetable::sine(131072));
        let multi_sine_wt = wavetable_arena.add(Wavetable::multi_sine(131072, 15));
        
        let mut synthesis_groups = vec![];
        let mid_group = SynthesisGroup::new(
            sine_wt,
            100.0,
            300.0,
            sample_rate,
            200
        );
        let mid_high_group = SynthesisGroup::new(
            sine_wt,
            300.0,
            800.0,
            sample_rate,
            200
        );
        let high_group = SynthesisGroup::new(
            sine_wt,
            800.0,
            2000.0,
            sample_rate,
            200
        );
        let high_high_group = SynthesisGroup::new(
            sine_wt,
            200.0,
            10000.0,
            sample_rate,
            200
        );
        let air_group = SynthesisGroup::new(
            sine_wt,
            1000.0,
            20000.0,
            sample_rate,
            200
        );
        synthesis_groups.push(mid_group);
        synthesis_groups.push(mid_high_group);
        synthesis_groups.push(high_group);
        synthesis_groups.push(high_high_group);
        synthesis_groups.push(air_group);

        // The ratio between pitches in a TextureGroup
        let texture_ratio = 2_f64.powf(1.0/159.0);

        let mut texture_groups = Vec::new();

        for n in 0..3 {
            texture_groups.push(TextureGroup::new(
                sine_wt,
                100.0 * 2_f64.powi(n*2+1),
                texture_ratio,
                sample_rate,
                159 * 1
            ));
        }

        let mut single_pitches = Vec::new();

        let ratio53 = 2_f64.powf(1.0/53.0);
        let chord: Vec<f64> = [ 0, 9, 14, 31, 40, 53, 62, 67, 84, 93, 106, 115, 120, 137, 146, 159, 168, 173, 190, 199, 212, 221, 226, 243, 252, 265, 274, 279, 296, 305, 318, 327 ].iter().map(|degree| 40.0 * ratio53.powi(*degree)).collect();
        for freq in chord {
            single_pitches.push(SinglePitch::new(freq, multi_sine_wt, sample_rate, 5.0, random::<f64>() * 2.0 - 1.0));
        }

        let bass_synthesis = BassSynthesis::new(
            multi_sine_wt,
            50.0,
            sample_rate,
            16,
        );

        // Load FLAC file
        let buffer = Buffer::from_file_flac("/home/erik/Musik/flac/Margaret_Hamilton_Language_of_control.flac", sample_rate as usize);

        println!("Building wavetables...");
        let mut triggers = Vec::with_capacity(100);
        for _ in 0..1 {
            let wt = wavetable_arena.add(Wavetable::crazy(131072));
            triggers.push(TriggeredOscillator::from_freq(wt, sample_rate, random::<Sample>().powi(2) * 0.0 + 20.0, 0.05));
        }
        println!("Wavetables built!");

        let mut resources = Resources::new(wavetable_arena, sample_rate);
        resources.buffers.push(buffer);

        let mut buf_readers = Vec::new();
        // buf_readers.push(BufReader::new(0, resources.buffers[0].buf_rate_scale(sample_rate), 0.5));

        let mut granular_synths = Vec::new();
        granular_synths.push(GranularSynthesiser::new(0, 512, &mut resources));

        SynthesisEngine {
            resources,
            sample_rate,
            synthesis_groups,
            bass_synthesis,
            single_pitches,
            texture_groups,
            triggers,
            buf_readers,
            granular_synths,
            output_frame: [0.0; 2],
        }
    }

    pub fn trigger_oscillator(&mut self, freq: Sample, amp: Sample, decay: Sample) {
        for synth_group in &mut self.synthesis_groups {
            if synth_group.contains_freq(freq) {
                synth_group.trigger_oscillator(freq, amp, decay);
                break;
            }
        }
    }

    pub fn trigger_texture(&mut self, texture_index: usize, index: usize, amp: Sample, decay: Sample) {
        self.texture_groups[texture_index].trigger_oscillator(index, amp, decay);
    }

    pub fn trigger_bass(&mut self, amp: Sample, decay: Sample, index: usize) {
        self.bass_synthesis.trigger(amp, decay, index);
    }

    pub fn trigger_trigger(&mut self, index: usize) {
        self.triggers[index].trigger(1.0, random::<Sample>().powi(3));
        if index % 10 == 0 {
            // self.buf_readers[0].jump_to(random::<f64>());
        }
    }

    pub fn add_energy_to_pitch(&mut self, index: usize, energy: Sample) {
        self.single_pitches[index].add_energy(energy);
    }

    pub fn next(&mut self) -> [Sample; 2] {
        let mut amp = 0.0;
        self.output_frame = [0.0; 2];

        for (i, trig) in self.triggers.iter_mut().enumerate() {
            amp += trig.next(&mut self.resources);
        }
        
        for group in &mut self.synthesis_groups {
            amp += group.next(&mut self.resources);
        }
        amp += self.bass_synthesis.next(&mut self.resources);
        for texture in &mut self.texture_groups {
            amp += texture.next(&mut self.resources);
        }
        for br in &mut self.buf_readers {
            amp += br.next(&mut self.resources);
        }
        for gs in &mut self.granular_synths {
            amp += gs.next(&mut self.resources);
        }
        self.output_frame[0] += amp;
        self.output_frame[1] += amp;
        for pitch in &mut self.single_pitches {
            let frame = pitch.next(&mut self.resources);
            self.output_frame[0] += frame[0];
            self.output_frame[1] += frame[1];
        }

        self.output_frame
    }

    pub fn num_textures(&self) -> usize {
        self.texture_groups.len()
    }

    pub fn num_single_pitches(&self) -> usize {
        self.single_pitches.len()
    }
}
