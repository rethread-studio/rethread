use super::{Sample, Resources, LocalSig};
use super::basic::Phase;
use super::buffer::{BufferIndex, Buffer};
use super::wavetable::Wavetable;
use nannou::rand::random;

#[derive(Copy, Clone)]
struct Grain {
    counter: i32, // Over 0 if the grain is active
    playhead: Phase,
    envelope_phase: Phase,
}

impl Grain {
    fn new() -> Self {
        Grain {
            counter: 0,
            playhead: Phase::new(),
            envelope_phase: Phase::new(),
        }
    }
    fn activate(&mut self, dur_samples: i32, start: Sample, rate: Sample) {
        self.counter = dur_samples;
        self.playhead.value = start;
        self.playhead.step = rate;
        self.envelope_phase.value = 0.0;
        self.envelope_phase.step = 1.0 / dur_samples as Sample;
    }

    fn next(&mut self, sound_buffer: &Buffer, envelope: &Wavetable) -> Sample {
        let mut output = 0.0;
        if self.counter > 0 {
            self.counter -= 1;
            let amp = envelope.get(self.envelope_phase.next_raw());
            output = sound_buffer.get((self.playhead.next_raw() * sound_buffer.size()) as usize) * amp;
        }
        output
    }
}

struct TrigImpulse {
    counter: i32,
    density: i32,
    jitter: Sample,
}

impl TrigImpulse {
    fn new(density: i32, jitter: Sample) -> Self {
        TrigImpulse{
            counter: 0,
            density,
            jitter
        }
    }
    fn next(&mut self) -> bool {
        if self.counter == 0 {
            let jitter_value = self.density as Sample * self.jitter * (random::<f64>() - 0.5);
            self.counter = self.density + jitter_value as i32;
            true
        } else {
            self.counter -= 1;
            false
        }
    }
}

pub struct GranularSynthesiser {
    grains: Vec<Grain>,
    sound_buffer: BufferIndex,
    playhead: Phase, // NB: A Phase will not loop around if it goes negative, maybe change to a custom Playhead
    speed: Sample,
    /// The reciprocal of the number of frames it will take to play back the buffer at normal speed
    buffer_rate: Sample,
    density: Sample,
    jitter: Sample,
    grain_dur: Sample,
    grain_rate: Sample,
    envelope: Wavetable,
    next_grain: usize,
    trigger: TrigImpulse,
    jump_trigger: TrigImpulse,
}

impl GranularSynthesiser {
    pub fn new(sound_buffer: BufferIndex, max_grains: usize, resources: &mut Resources) -> Self {
        let grain_envelope_buffer = Wavetable::hann_window(4096);
        let snd = &mut resources.buffers[sound_buffer];
        let buffer_rate = snd.buf_rate_scale(resources.sample_rate);
        let mut playhead = Phase::new();
        playhead.step = buffer_rate;
        GranularSynthesiser {
            grains: vec![Grain::new(); max_grains],
            sound_buffer,
            playhead, 
            speed: 1.0,
            /// The reciprocal of the number of frames it will take to play back the buffer at normal speed
            buffer_rate,
            density: 10.0,
            jitter: 0.1,
            grain_dur: 0.1,
            grain_rate: 1.0,
            envelope: grain_envelope_buffer,
            next_grain: 0,
            trigger: TrigImpulse::new((resources.sample_rate / 20.0) as i32, 0.1),
            jump_trigger: TrigImpulse::new((resources.sample_rate / 1.0) as i32, 0.5),
        }
    }
}

impl LocalSig for GranularSynthesiser {
    fn next(&mut self, resources: &mut Resources) -> Sample {
        let buffer = &resources.buffers[self.sound_buffer];
        if self.jump_trigger.next() == true {
            self.playhead.value = random::<f64>();
        }
        let position = self.playhead.next_raw();
        // Do we start a new grain?
        if self.trigger.next() == true {
            
            self.grains[self.next_grain].activate(
                (self.grain_dur * buffer.size()) as i32, 
                position,
                self.buffer_rate * self.grain_rate
            );
            self.next_grain += 1;
            if self.next_grain >= self.grains.len() {
                self.next_grain = 0;
            }
        }

        let mut output = 0.0;
        
        for g in &mut self.grains {
            output += g.next(buffer, &self.envelope);
        }
        output
    }
}