//! Plays the audified machine code as the exciter in a waveguide
//!
//! Play through a large reverb
use rand::{thread_rng, Rng};
use std::time::Duration;

use color_eyre::Result;
use knyst::{
    audio_backend::JackBackend,
    controller::print_error_handler,
    envelope::Envelope,
    gen::filter::one_pole::{one_pole_hpf, one_pole_lpf},
    handles::{graph_output, handle, AnyNodeHandle, Handle},
    modal_interface::knyst,
    prelude::*,
    resources::BufferId,
    sphere::{KnystSphere, SphereSettings},
    trig::interval_trig,
};
use knyst_reverb::{luff_verb, LuffVerbHandle};
use knyst_waveguide2::waveguide;
use trace_sonifier::binary_instructions::machine_code_to_buffer;

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

    let verb = luff_verb(1050 * 48, 0.30).lowpass(19000.).damping(15000.);
    graph_output(
        0,
        one_pole_hpf()
            .sig(verb * 0.10)
            .cutoff_freq(100.)
            .repeat_outputs(1),
    );
    for path in traces {
        println!("Playing trace: {path}");
        let trace = std::fs::read_to_string(path)?;

        let buffer = machine_code_to_buffer(&trace, true)?;
        println!("Buffer length: {}", buffer.length_seconds());
        let buffer = knyst().insert_buffer(buffer);

        play_waveguide_segments(verb, buffer, true, true);
        std::thread::sleep(Duration::from_secs(5));
    }

    let mut buffer = String::new();
    let stdin = std::io::stdin(); // We get `Stdin` here.
    stdin.read_line(&mut buffer)?;

    Ok(())
}

fn play_waveguide_segments(
    verb: Handle<LuffVerbHandle>,
    buffer: BufferId,
    random_interval: bool,
    pass_through_trigger: bool,
) {
    let mut rng = thread_rng();
    let mut root = 1000.0;
    // .input(sig * 0.125);
    // .input(sig * 0.125 + graph_input(0, 1));
    let mut graphs = vec![];
    for _ in 0..4 {
        let mut gs = knyst().default_graph_settings();
        gs.num_outputs = 1;
        knyst().init_local_graph(gs);

        let exciter = buffer_reader(buffer, 1.0, true, StopAction::FreeGraph);
        let exciter_to_wg = one_pole_lpf().sig(exciter * 0.15).cutoff_freq(3600.);
        let env = Envelope {
            start_value: 0.0,
            points: vec![(1.0, 0.01), (0.25, 0.1), (0.0, 0.5)],
            ..Default::default()
        };
        for &freq in [1.0, 3. / 2., 6. / 5., 2.0, 3.].iter() {
            let freq = freq * root;

            let exciter_to_wg: AnyNodeHandle = if pass_through_trigger {
                // Take the interval times from the matrix
                let interval_time = if random_interval {
                    rng.gen_range(1.0f32..2.0)
                } else {
                    64. / 60.
                };
                (exciter_to_wg
                    * handle(env.to_gen()).set("restart", interval_trig().interval(interval_time)))
                .into()
            } else {
                exciter_to_wg.into()
            };
            let exciter_to_wg = one_pole_lpf().sig(&exciter_to_wg).cutoff_freq(freq * 3.0);
            let wg = waveguide()
                .freq(freq)
                .exciter(exciter_to_wg)
                .feedback(0.9999)
                // .feedback(1.001)
                .damping(freq * 7. + 1000.)
                .lf_damping(6.)
                .position(0.4)
                .stiffness(0.0);
            let sig = wg * 0.1;
            graph_output(0, sig);
        }
        let g = knyst().upload_local_graph();
        graphs.push(g);
        verb.input(g);
        graph_output(
            0,
            one_pole_lpf().sig(g).cutoff_freq(4000.).repeat_outputs(1),
        );

        root *= 0.5;
        std::thread::sleep(Duration::from_secs(15));
    }

    for g in graphs {
        g.free();
    }
}
fn sine() -> Handle<OscillatorHandle> {
    oscillator(WavetableId::cos())
}
