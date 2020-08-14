use super::basic::Sine;
use super::envelope::ExponentialDecay;
use super::{Sample, LocalSig, Resources};

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
}
impl LocalSig for Metronome {
    fn next(&mut self, resources: &mut Resources) -> Sample {
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

        self.synth.next(resources) * self.exponential_decay.next(resources)
    }
}