pub mod instruction_types;
mod waveguide_segments;

use std::{path::PathBuf, time::Duration};

use color_eyre::Result;
use knyst::{
    audio_backend::{CpalBackend, CpalBackendOptions, JackBackend},
    controller::print_error_handler,
    handles::graph_output,
    modal_interface::commands,
    prelude::*,
    sphere::{KnystSphere, SphereSettings},
};
use trace_sonifier::binary_instructions::{self, machine_code, machine_code_instruction_only};

fn main() -> Result<()> {
    // Start knyst
    // let mut backend = CpalBackend::new(CpalBackendOptions::default())?;
    let mut backend = JackBackend::new("Knyst<3JACK")?;
    let _sphere = KnystSphere::start(
        &mut backend,
        SphereSettings {
            num_inputs: 0,
            num_outputs: 2,
            ..Default::default()
        },
        print_error_handler,
    );

    // let trace =
    //     std::fs::read_to_string("/home/erik/Nextcloud/reinverse_traces/inverse_test_trace.txt")?;
    // let trace =
    //     std::fs::read_to_string("/home/erik/Nextcloud/reinverse_traces/Inverse_diagonal_0.txt")?;
    let buffers: Result<Vec<_>> = [
        "/home/erik/Nextcloud/reinverse_traces/Inverse_random_0.txt",
        "/home/erik/Nextcloud/reinverse_traces/Inverse_diagonal_0.txt",
        "/home/erik/Nextcloud/reinverse_traces/Inverse_lower_triangular_0.txt",
        "/home/erik/Nextcloud/reinverse_traces/SVD_lower_triangular_7.txt",
        "/home/erik/Nextcloud/reinverse_traces/SVD_random_7.txt",
        "/home/erik/Nextcloud/reinverse_traces/SVD_upper_triangular_7.txt",
        "/home/erik/Nextcloud/reinverse_traces/Multiply_diagonal_42.txt",
        "/home/erik/Nextcloud/reinverse_traces/Multiply_random_73.txt",
        "/home/erik/Nextcloud/reinverse_traces/Normalize_random_0.txt",
    ]
    .into_iter()
    .map(|path| {
        let trace = std::fs::read_to_string(path)?;
        let path = PathBuf::from(path);
        let file_name = path.file_name().unwrap().to_string_lossy();

        let machine_code = machine_code(&trace)?;
        // let machine_code = machine_code_instruction_only(&trace)?;
        // Convert from 8bit unsigned to f32 samples
        let buffer: Vec<_> = machine_code
            .into_iter()
            .map(|byte| (byte as i16 - (u8::MAX / 2) as i16) as f32 / (u8::MAX / 2) as f32)
            .collect();
        let buffer = Buffer::from_vec(buffer, 48000.);
        // treat them as 16bit values
        // buffer.save_to_disk("/home/erik/buf_dc_removed.wav")?;

        println!("buffer length: {}", buffer.length_seconds());

        let buffer_id = commands().insert_buffer(buffer);
        Ok(buffer_id)
    })
    .collect();
    let buffers = buffers?;
    let num_buffers = buffers.len() as f32 - 1.0;
    for (i, buffer_id) in buffers.into_iter().enumerate() {
        // let play_buf = buffer_reader(buffer_id, 1.0, StopAction::FreeSelf);
        // let sig = play_buf.repeat_outputs(1);
        // let sig = buffer_reader_multi(buffer_id, 4.0, StopAction::FreeSelf) * 0.1;
        // let sig = buffer_reader_multi(buffer_id, 1.0, StopAction::FreeSelf) * 0.1;
        let sig = buffer_reader_multi(buffer_id, 0.1, false, StopAction::FreeSelf) * 0.1;
        // let sig = sig + buffer_reader_multi(buffer_id, 2.0, StopAction::FreeSelf) * 0.2;
        // let sig = sig + buffer_reader_multi(buffer_id, 3.0, StopAction::FreeSelf) * 0.2;
        // let sig = sig + buffer_reader_multi(buffer_id, 8.0, StopAction::FreeSelf) * 0.2;

        let pan = (i as f32 / num_buffers) * 2.0 - 1.0;
        graph_output(0, pan_mono_to_stereo().pan(pan).signal(sig));
        std::thread::sleep(Duration::from_millis(2000));
    }

    let mut buffer = String::new();
    let stdin = std::io::stdin(); // We get `Stdin` here.
    stdin.read_line(&mut buffer)?;

    Ok(())
}
