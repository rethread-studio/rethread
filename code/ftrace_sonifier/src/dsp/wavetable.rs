use super::Sample;

use std::f64::consts::PI;
use nannou::rand::random;

// We could later turn WavetableIndex into a generational index if we'd want
pub type WavetableIndex = usize;

pub struct Wavetable {
    buffer: Vec<Sample>, // Box<[Sample; 131072]>,
    // Store the size as an f64 to find fractional indexes without typecasting
    size: Sample,
}

impl Wavetable {
    pub fn new(wavetable_size: usize) -> Self {
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
    pub fn multi_sine(wavetable_size: usize, num_harmonics: usize) -> Self {
        let mut wt = Wavetable::new(wavetable_size);
        wt.fill_sine(num_harmonics, 1.0);
        wt.add_noise(0.95);
        wt.normalize();
        wt
    }
    pub fn crazy(wavetable_size: usize) -> Self {
        let mut wt = Wavetable::new(wavetable_size);
        wt.fill_sine(16, 1.0);
        for _ in 0..(random::<usize>() % 3 + 1) {
            wt.fill_sine(16, (random::<Sample>() * 32.0).floor());
        }
        wt.add_noise(1.0 - random::<Sample>()*0.05);
        wt.normalize();
        wt
    }
    pub fn fill_sine(&mut self, num_harmonics: usize, freq: Sample) {
        for n in 0..num_harmonics {
            let start_phase = random::<f64>() * 2.0 * PI * n as f64;
            let harmonic_amp = match n {
                0 => 1.0,
                _ => random::<f64>() * 0.05 + 0.001
            };
            for i in 0..self.size as usize {
                self.buffer[i] += ((i as Sample / self.size) * PI * 2.0 * freq * (n+1) as f64 + start_phase).sin() * harmonic_amp;
            }
        }
    }
    pub fn add_noise(&mut self, probability: f64) {
        for sample in &mut self.buffer {
            if random::<f64>() > probability {
                *sample += random::<f64>() - 0.5;
                if *sample > 1.0 {
                    *sample -= 1.0;
                }
                if *sample < -1.0 {
                    *sample += 1.0;
                }
            }
        }
    }
    pub fn normalize(&mut self) {
        // Find highest absolute value
        let mut loudest_sample = 0.0;
        for sample in &self.buffer {
            if sample.abs() > loudest_sample {
                loudest_sample = sample.abs();
            }
        }
        // Scale buffer
        let scaler = 1.0 / loudest_sample;
        for sample in &mut self.buffer {
            *sample *= scaler;
        }
    }

    /// Linearly interpolate between the value in between which the phase points.
    /// The phase is assumed to be 0 <= phase < 1
    #[inline]
    pub fn get_linear_interp(&self, phase: Sample) -> Sample {
        let index = self.size * phase;
        let mix = index.fract();
        self.buffer[index.floor() as usize] * (1.0-mix) + self.buffer[index.ceil() as usize % self.buffer.len()] * mix
    }

    /// Get the closest sample with no interpolation
    #[inline]
    pub fn get(&self, phase: Sample) -> Sample {
        let index = (self.size * phase) as usize;
        // self.buffer[index]
        unsafe{ *self.buffer.get_unchecked(index) }
    }
}

fn is_power_of_2(num: usize) -> bool {
    return num > 0 && num&(num-1) == 0;
}

pub struct WavetableArena {
    wavetables: Vec<Option<Wavetable>>,
    next_free_index: WavetableIndex,
    freed_indexes: Vec<WavetableIndex>,
}

impl WavetableArena {
    pub fn new() -> Self {
        let mut wavetables = Vec::with_capacity(200);
        for i in 0..200 {
            wavetables.push(None);
        }
        WavetableArena {
            wavetables,
            next_free_index: 0,
            freed_indexes: vec![]
        }
    }
    pub fn get(&self, index: WavetableIndex) -> &Option<Wavetable> {
        &self.wavetables[index]
    }
    pub fn add(&mut self, wavetable: Wavetable) -> WavetableIndex {
        // TODO: In order to do this safely in an audio thread we should pass the old value on to a helper thread for deallocation
        // since dropping it here would probably deallocate it.
        let old_wavetable = self.wavetables[self.next_free_index].replace(wavetable);
        let index = self.next_free_index;
        self.next_free_index += 1;
        // TODO: Check that the next free index is within the bounds of the wavetables Vec or else use the indexes that have been freed
        index
    }
}