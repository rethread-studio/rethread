use super::{Sample, LocalSig, Resources};

#[derive(Copy, Clone)]
pub struct ExponentialDecay {
    value: Sample,
    target_value: Sample,
    sample_rate: f64,
    decay_scaler: f64,
    attack_lin_scaler: Sample,
    attack_time: Sample,
    duration: Sample,
}

impl ExponentialDecay {
    pub fn new(duration: f64, sample_rate: f64) -> Self {
        let mut s = ExponentialDecay {
            value: 0.0,
            target_value: 0.0,
            sample_rate,
            decay_scaler: 1.0,
            attack_lin_scaler: 0.0,
            attack_time: 0.002,
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
    // TODO: The linear attack sometimes blows up, why?
    pub fn trigger(&mut self, value: Sample) {
        self.target_value = value;
        // Take the absolute so that we never end up with negative amp values
        self.attack_lin_scaler = ((self.target_value - self.value) / (self.attack_time*self.sample_rate)).abs();
    }
}

impl LocalSig for ExponentialDecay {
    fn next(&mut self, resources: &mut Resources) -> Sample {
        if self.target_value > self.value {
            self.value += self.attack_lin_scaler;
            if self.value >= self.target_value {
                self.target_value = 0.0;
            }
        } else {
            self.value *= self.decay_scaler;
        }
        self.value
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