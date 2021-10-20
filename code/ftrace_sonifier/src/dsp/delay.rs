use super::Sample;

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

/// Delay meant for panning a mono signal by delaying it to one of the speakers
struct StereoDelay {
    delays: Vec<Delay>,
    amps: [Sample; 2],
    output: [Sample; 2],
    sample_rate: usize,
}

impl StereoDelay {
    pub fn new(sample_rate: usize) -> Self {
        let mut delays = vec![];
        for n in 0..2 {
            delays.push(Delay::new(sample_rate, 0).unwrap());
        }
        StereoDelay {
            delays,
            amps: [1.0; 2],
            output: [0.0; 2],
            sample_rate
        }
    }
    pub fn set_pan(&mut self, pan: f64) {
        let del1 = (pan*-0.05).max(0.0);
        let del2 = (pan*0.05).max(0.0);
        self.delays[0].set_delay_samples((self.sample_rate as f64 * del1) as usize);
        self.delays[1].set_delay_samples((self.sample_rate as f64 * del2) as usize);
    }
    pub fn next(&mut self, input: Sample) -> [Sample; 2] {
        self.output[0] = self.delays[0].next(input);
        self.output[1] = self.delays[1].next(input);
        self.output
    }
}