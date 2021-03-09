pub struct Audio {
    host: cpal::Host,
    device: cpal::Device,
    config: cpal::StreamConfig,
    stream: Box<cpal::Stream>,
}

impl Audio {
    fn new() -> Self {
        let host =
            cpal::host_from_id(cpal::available_hosts()
                               .into_iter()
                               .find(|id| *id == cpal::HostId::Jack)
                               .expect(
                                   "make sure --features jack is specified. only works on OSes where jack is available",
                               )).expect("jack host unavailable");

        let device = host.default_output_device();

        let config = device.default_output_config().unwrap();
        println!("Default output config: {:?}", config);

        // Create audio engine

        let stream = match config.sample_format() {
            cpal::SampleFormat::F32 => run::<f32>(&device, &config.into()),
            cpal::SampleFormat::I16 => run::<i16>(&device, &config.into()),
            cpal::SampleFormat::U16 => run::<u16>(&device, &config.into()),
        };

        Audio {
            host,
            device,
            config,
            stream,
        }
    }
}

pub fn run<T>(
    device: &cpal::Device,
    config: &cpal::StreamConfig,
) -> Result<Box<Stream>, anyhow::Error>
where
    T: cpal::Sample,
{
    let sample_rate = config.sample_rate.0 as f32;
    let channels = config.channels as usize;

    // Produce a sinusoid of maximum amplitude.
    let mut sample_clock = 0f32;
    let mut next_value = move || {
        sample_clock = (sample_clock + 1.0) % sample_rate;
        (sample_clock * 440.0 * 2.0 * std::f32::consts::PI / sample_rate).sin()
    };

    let err_fn = |err| eprintln!("an error occurred on stream: {}", err);

    let stream = device.build_output_stream(
        config,
        move |data: &mut [T], _: &cpal::OutputCallbackInfo| {
            write_data(data, channels, &mut next_value)
        },
        err_fn,
    )?;
    stream.play()?;

    Ok(Box::new(stream))
}

fn write_data<T>(output: &mut [T], channels: usize, next_sample: &mut dyn FnMut() -> f32)
where
    T: cpal::Sample,
{
    for frame in output.chunks_mut(channels) {
        let value: T = cpal::Sample::from::<f32>(&next_sample());
        for sample in frame.iter_mut() {
            *sample = value;
        }
    }
}
