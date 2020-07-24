
use std::f64::consts::PI;

type Sample = f64;

pub mod synth;
pub mod oscen_synth;
pub mod shared_wavetable_synth;
pub mod dasp_synth;

pub mod audio_interface;

pub mod event_stats;


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
pub struct LowPassFilter {
    last_output: Sample,
    alpha: Sample,
}

impl LowPassFilter {
    pub fn new(alpha: Sample) -> Self {
        LowPassFilter{ last_output: 0.0, alpha }
    }

    pub fn next(&mut self, input: Sample) -> Sample {
        let value = self.last_output * self.alpha + (1.0-self.alpha) * input;
        self.last_output = value;
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

/// A fixed size circular buffer delay
/// ```
/// # use ftrace_sonifier::Delay;
/// let mut delay = Delay::new(20, 1).unwrap();
/// for i in 1..16 {
///     assert_eq!(delay.next(i as f64), (i-1) as f64);
/// }
/// delay.set_delay_samples(0);
/// // When the delay is 0 the input and output should be the same.
/// assert_eq!(delay.next(100.0), 100.0);
/// ```
pub struct Delay {
    buffer: Vec<f64>,
    write_ptr: usize,
    read_ptr: usize,
}

impl Delay {
    pub fn new(length: usize, delay_samples: usize) -> Result<Self, String> {
        if delay_samples <= length {
            Ok(Delay{
                // create a Vec of length+1 samples in order to support both a delay of 0 and of
                // `length` without too much confusion i.e. `length` and `delay_samples` can be
                // the same value
                buffer: vec![0.0; length+1],
                write_ptr: 0,
                read_ptr: length+1 - delay_samples, // initialise read position to the 
            })
        } else {
            Err("Delay supplied was longer than the length of the buffer".to_owned())
        }
    }
    pub fn set_delay_samples(&mut self, delay_samples: usize) {
        if delay_samples < self.buffer.len() {
            // Set the read_ptr to the desired distance from the write_ptr and make sure it's within bounds
            self.read_ptr = (self.write_ptr - delay_samples + self.buffer.len()) % self.buffer.len();
        }
    }
    pub fn next(&mut self, input: Sample) -> Sample {
        // First write to the buffer. If the delay is zero the read_ptr should read the current input.
        self.buffer[self.write_ptr] = input;
        let output = self.buffer[self.read_ptr];

        // Increment pointers
        self.write_ptr = (self.write_ptr + 1) % self.buffer.len();
        self.read_ptr = (self.read_ptr + 1) % self.buffer.len();

        output
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