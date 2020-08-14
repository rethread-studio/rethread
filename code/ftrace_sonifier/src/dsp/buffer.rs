use super::load_sound::load_flac;
use super::{Sample, Resources, LocalSig};

use std::f64::consts::PI;

pub type BufferIndex = usize;

/// The Buffer is currently very similar to Wavetable, but they may evolve differently
pub struct Buffer {
    buffer: Vec<Sample>,
    size: Sample,
    /// The sample rate of the buffer, can be different from the sample rate of the audio server
    sample_rate: Sample, 
}

impl Buffer {
    pub fn new(size: usize, sample_rate: Sample) -> Self {
        Buffer {
            buffer: vec![0.0; size],
            size: size as Sample,
            sample_rate,
        }
    }
    pub fn from_vec(buffer: Vec<Sample>, sample_rate: Sample) -> Self {
        let size = buffer.len() as Sample;
        Buffer {
            buffer,
            size,
            sample_rate
        }
    }
    pub fn from_file_flac(path: &str, sample_rate: usize)-> Self {
        let (buffer, buf_sample_rate) = load_flac(path, sample_rate);
        Buffer::from_vec(buffer, buf_sample_rate)
    }
    /// Returns the rate parameter for playing this buffer with the correct speed given that the playhead moves between 0 and 1
    pub fn buf_rate_scale(&self, server_sample_rate: Sample) -> Sample {
        let sample_rate_conversion = server_sample_rate / self.sample_rate;
        1.0 / (self.size * sample_rate_conversion)
    }
    /// Linearly interpolate between the value in between to samples
    #[inline]
    pub fn get_linear_interp(&self, index: Sample) -> Sample {
        let mix = index.fract();
        let index_u = index as usize;
        unsafe {
            *self.buffer.get_unchecked(index_u) * (1.0-mix) + *self.buffer.get_unchecked((index_u + 1) % self.buffer.len()) * mix
        }
    }
    /// Get the sample at the index discarding the fraction with no interpolation
    #[inline]
    pub fn get(&self, index: usize) -> Sample {
        // self.buffer[index]
        unsafe{ *self.buffer.get_unchecked(index) }
    }
    pub fn size(&self) -> Sample {
        self.size
    }
}

/// Reads a sample from a buffer and plays it back
/// TODO: Support multi-channel buffers
pub struct BufReader {
    buf_index: usize,
    read_pointer: f64,
    rate: f64,
    amp: Sample,
}

impl BufReader {
    pub fn new(buf_index: usize, rate: f64, amp: Sample) -> Self {
        BufReader {
            buf_index,
            read_pointer: 0.0,
            rate,
            amp,
        }
    }
    pub fn jump_to(&mut self, new_pointer_pos: f64) {
        self.read_pointer = new_pointer_pos;
    }
}

impl LocalSig for BufReader {
    fn next(&mut self, resources: &mut Resources) -> Sample {
        let buffer = &resources.buffers[self.buf_index];
        let sample = buffer.get((self.read_pointer * buffer.size) as usize);
        self.read_pointer += self.rate;
        while self.read_pointer > 1.0 {
            self.read_pointer -= 1.0;
        }
        sample * self.amp
    }
}