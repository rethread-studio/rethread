use super::Sample;

pub fn load_flac(path: &str, sample_rate: usize) -> (Vec<Sample>, f64) {
    let mut reader = claxon::FlacReader::open(path).unwrap();
    // Get sample rate
    let stream_info = reader.streaminfo();
    if stream_info.sample_rate as usize != sample_rate {
        println!("File has a different sample rate ({}) than what the audio driver is running at ({})", stream_info.sample_rate, sample_rate);
    }
    let mut samples: Vec<Sample> = reader.samples()
        .into_iter()
        // Convert to float and scale according to the source file bit depth
        .map(|sample| sample.unwrap() as f64 / 2_f64.powi(stream_info.bits_per_sample as i32 - 1))
        .collect();

    if stream_info.channels == 2 {
        // We only want one channel so we unzip the interleaved stereo samples and save just one channel
        // TODO: This could probably be more elegant with dasp::Frame 
        let mut single_channel = Vec::with_capacity(samples.len()/2);
        for (i, s) in samples.iter().enumerate() {
            if i % 2 == 0 {
                single_channel.push(*s);
            } 
        }
        samples = single_channel;
    }
    
    (samples, stream_info.sample_rate as f64)
}