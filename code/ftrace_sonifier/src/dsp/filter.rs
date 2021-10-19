use std::f64::consts::PI;

use super::Sample;

#[derive(Copy, Clone)]
pub struct LowPassFilter {
    last_output: Sample,
    pub alpha: Sample,
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