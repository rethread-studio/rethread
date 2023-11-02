use color_eyre::Result;
use knyst::{
    audio_backend::{CpalBackend, CpalBackendOptions},
    handles::graph_output,
    modal_interface::commands,
    osc::{buffer_reader, buffer_reader_multi},
    prelude::*,
    sphere::{KnystSphere, SphereSettings},
};
use trace_sonifier::binary_instructions::{self, machine_code, machine_code_instruction_only};

fn main() -> Result<()> {
    // Start knyst
    let mut backend = CpalBackend::new(CpalBackendOptions::default())?;
    let _sphere = KnystSphere::start(&mut backend, SphereSettings::default());

    let trace =
        std::fs::read_to_string("/home/erik/Nextcloud/reinverse_traces/inverse_test_trace.txt")?;

    let machine_code = machine_code(&trace)?;
    // let machine_code = machine_code_instruction_only(&trace)?;
    // Convert from 8bit unsigned to f32 samples
    let buffer: Vec<_> = machine_code
        .into_iter()
        .map(|byte| (byte as i16 - (u8::MAX / 2) as i16) as f32 / (u8::MAX / 2) as f32)
        .collect();

    // let buffer = Buffer::from_vec(buffer, 48000.);
    let mut buffer = Buffer::from_vec_interleaved(buffer, 1, 48000.);
    buffer.save_to_disk("/home/erik/buf_org.wav")?;
    buffer.remove_dc();
    // buffer.save_to_disk("/home/erik/buf_dc_removed.wav")?;

    println!("buffer length: {}", buffer.length_seconds());

    let buffer_id = commands().insert_buffer(buffer);

    // let play_buf = buffer_reader(buffer_id, 1.0, StopAction::FreeSelf);
    // let sig = play_buf.repeat_outputs(1);
    let sig = buffer_reader_multi(buffer_id, 1.0, StopAction::FreeSelf) * 0.2;
    // let sig = sig + buffer_reader_multi(buffer_id, 2.0, StopAction::FreeSelf) * 0.2;
    // let sig = sig + buffer_reader_multi(buffer_id, 3.0, StopAction::FreeSelf) * 0.2;
    // let sig = sig + buffer_reader_multi(buffer_id, 8.0, StopAction::FreeSelf) * 0.2;

    graph_output(0, sig);

    let mut buffer = String::new();
    let stdin = std::io::stdin(); // We get `Stdin` here.
    stdin.read_line(&mut buffer)?;

    Ok(())
}
