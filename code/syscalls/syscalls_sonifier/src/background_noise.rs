use std::path::PathBuf;

use knyst::{handles::GenericHandle, knyst_commands, prelude::*, resources::BufferId};

pub struct BackgroundNoise {
    noise_buffers: Vec<BufferId>,
    amp: Handle<GenericHandle>,
    resonant_filters_mix: Handle<GenericHandle>,
    buf_reader: Handle<BufferReaderMultiHandle>,
}

impl BackgroundNoise {
    /// Load all the required buffers etc to prepare to start the background noise, then start the noise.
    pub fn new(
        start_channel: usize,
        output_bus: Handle<GenericHandle>,
        mut sounds_path: PathBuf,
    ) -> Self {
        sounds_path.push("noise/");
        let noise_sound_files = ["noise_4ch_0.wav", "noise_4ch_1.wav", "noise_4ch_2.wav"];
        let noise_buffers: Vec<_> = noise_sound_files
            .into_iter()
            .map(|filename| {
                let mut path = sounds_path.clone();
                path.push(filename);
                let sound_buffer = Buffer::from_sound_file(path).unwrap();
                let channels = sound_buffer.num_channels();
                if channels != 4 {
                    eprintln!("Noise buffer was not 4 channels, but {channels}");
                }
                let buffer = knyst_commands().insert_buffer(sound_buffer);
                buffer
            })
            .collect();
        let amp = bus(1).set(0, 1.0);
        let resonant_filters_mix = bus(1).set(0, 0.0);
        let buf_reader = BufferReaderMulti::new(noise_buffers[1], 1.0, StopAction::FreeSelf)
            .channels(4)
            .looping(true)
            .upload();
        let sig = buf_reader * ramp().value(amp).time(5.0);
        graph_output(start_channel, sig);
        // let output_channels = sig.out_channels().count();
        // println!("Output channels from sig: {output_channels}");
        // for i in 0..4 {
        //     output_bus.set(start_channel + i, sig.out(i));
        // }
        Self {
            noise_buffers,
            amp,
            resonant_filters_mix,
            buf_reader,
        }
    }
}
