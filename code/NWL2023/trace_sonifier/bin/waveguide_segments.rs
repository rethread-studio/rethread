//! Plays the audified machine code as the exciter in a waveguide
//!
//! Play through a large reverb
use rand::{thread_rng, Rng};
use std::{
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    time::Duration,
};

use atomic_float::AtomicF32;
use color_eyre::Result;
use knyst::{
    audio_backend::{CpalBackend, CpalBackendOptions, JackBackend},
    controller::print_error_handler,
    envelope::Envelope,
    handles::{graph_output, handle, Handle},
    modal_interface::commands,
    prelude::*,
    sphere::{KnystSphere, SphereSettings},
    trig::interval_trig,
};
use knyst_waveguide2::{one_pole_lpf, waveguide};
use trace_sonifier::{
    binary_instructions::{
        self, machine_code, machine_code_instruction_only, machine_code_to_buffer,
    },
    instances_of_instruction::InstructionInstance,
};

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

    let traces = [
        "/home/erik/Nextcloud/reinverse_traces/Inverse_random_0.txt",
        "/home/erik/Nextcloud/reinverse_traces/Inverse_diagonal_0.txt",
        "/home/erik/Nextcloud/reinverse_traces/Inverse_lower_triangular_0.txt",
        "/home/erik/Nextcloud/reinverse_traces/SVD_lower_triangular_7.txt",
        "/home/erik/Nextcloud/reinverse_traces/SVD_random_7.txt",
        "/home/erik/Nextcloud/reinverse_traces/SVD_upper_triangular_7.txt",
        "/home/erik/Nextcloud/reinverse_traces/Multiply_diagonal_42.txt",
        "/home/erik/Nextcloud/reinverse_traces/Multiply_random_73.txt",
        "/home/erik/Nextcloud/reinverse_traces/Normalize_random_0.txt",
    ];

    let trace = std::fs::read_to_string(traces[0])?;

    let mut rng = thread_rng();
    let buffer = machine_code_to_buffer(&trace, true)?;
    println!("Buffer length: {}", buffer.length_seconds());
    let buffer = commands().insert_buffer(buffer);

    let mut root = 1000.0;
    loop {
        commands().init_local_graph(commands().default_graph_settings());

        let exciter = buffer_reader(buffer, 1.0, true, StopAction::FreeGraph);
        let exciter_to_wg = one_pole_lpf().sig(exciter * 0.15).cutoff_freq(3600.);
        let env = Envelope {
            start_value: 0.0,
            points: vec![(1.0, 0.01), (0.25, 0.1), (0.0, 0.5)],
            ..Default::default()
        };
        for &freq in [1.0, 3. / 2., 6. / 5., 2.0, 3.].iter() {
            let freq = freq * root;

            // Take the interval times from the matrix
            let interval_time = rng.gen_range(1.0f32..2.0);
            let interval_time = 0.5;
            let exciter_to_wg = exciter_to_wg
                * handle(env.to_gen()).set("restart", interval_trig().interval(interval_time));
            let exciter_to_wg = one_pole_lpf().sig(exciter_to_wg).cutoff_freq(freq * 3.0);
            let wg = waveguide()
                .freq(freq as f32)
                .exciter(exciter_to_wg)
                .feedback(0.9999)
                // .feedback(1.001)
                .damping(freq as f32 * 7. + 1000.)
                .lf_damping(6.)
                .position(0.4)
                .stiffness(0.0);
            let sig = wg * 0.1;
            graph_output(0, sig.repeat_outputs(1));
        }
        let g = commands().upload_local_graph();
        graph_output(0, g);

        root *= 0.5;
        std::thread::sleep(Duration::from_secs(15));
    }

    let mut buffer = String::new();
    let stdin = std::io::stdin(); // We get `Stdin` here.
    stdin.read_line(&mut buffer)?;

    Ok(())
}
fn sine() -> Handle<OscillatorHandle> {
    oscillator(WavetableId::cos())
}
