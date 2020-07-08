
use std::f64::consts::PI;

type Sample = f64;

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
    }
    pub fn next(&mut self, input: Sample) -> Sample {
        let mut output = self.b0*input + self.b1*self.input_buffer[0] + self.b2*self.input_buffer[1];
        output -= self.a1*self.output_buffer[0] + self.a2*self.output_buffer[1];

        self.input_buffer[1] = self.input_buffer[0];
        self.input_buffer[0] = input;
        self.output_buffer[1] = self.output_buffer[0];
        self.output_buffer[0] = output;
        output
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
        if delay_samples < length {
            Ok(Delay{
                buffer: vec![0.0; length],
                write_ptr: 0,
                read_ptr: length - delay_samples, // initialise read position to the 
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
    pub lfo_freq: f64,
    pub lfo_amp: f64,
    pub lfo_add: f64,
    pub lfo_phase: f64,
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
            lfo_freq: 3.0,
            lfo_amp: 4.0,
            lfo_add: 5.0,
            lfo_phase: 0.0,
            amp,
            number_of_triggers: 0.0,
        };
        synth
    }
    pub fn next_stereo(&mut self) -> [f64; 2] {
        // LFO
        self.lfo_phase += (2.0 * std::f64::consts::PI * self.lfo_freq) / self.sample_rate;
        let lfo = self.lfo_phase.sin() * self.lfo_amp + self.lfo_add;
        self.m_index = lfo;

        // Modulator
        self.m_phase_step = (2.0 * std::f64::consts::PI * self.freq * self.m_ratio) / self.sample_rate;
        self.m_phase += self.m_phase_step;
        let m_sample = self.m_phase.sin() * self.freq * self.m_index;

        // Carrier
        // The frequency depends on the modulator so the phase step has to be calculated every step
        let c_freq = self.freq * self.c_ratio + m_sample;
        self.c_phase_step = (2.0 * std::f64::consts::PI * c_freq * self.c_ratio) / self.sample_rate;
        self.c_phase += self.c_phase_step;

        // The carrier output is the output of the synth
        let c_sample = self.c_phase.sin() * self.amp;

        // Reset number of triggers
        self.number_of_triggers = 0.0;
        
        [c_sample, c_sample]
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