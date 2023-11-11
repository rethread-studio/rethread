use std::{
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    time::Duration,
};

use atomic_float::AtomicF32;
use color_eyre::Result;
use knyst::{
    audio_backend::JackBackend,
    commands,
    envelope::Envelope,
    filter::one_pole::{one_pole_hpf, one_pole_lpf},
    handles::{handle, AnyNodeHandle},
    prelude::*,
    resources::BufferId,
    trig::interval_trig,
};
use knyst::{handles::Handle, prelude::OscillatorHandle, resources::WavetableId};
use knyst_reverb::{luff_verb, LuffVerbHandle};
use knyst_waveguide2::waveguide;
use rand::{random, thread_rng, Rng};
use serde::{Deserialize, Serialize};
use tokio::select;
use trace_sonifier::{
    binary_instructions::machine_code_to_buffer, instances_of_instruction::InstructionInstance,
    instruction_occurrence_by_name,
};

/// Global state
struct Vind {
    tokio_stop_channels: Vec<tokio::sync::broadcast::Sender<()>>,
    current_harmony: (),
    score: Vec<ScoreObject>,
}

#[tokio::main]
async fn main() -> Result<()> {
    let score = load_score()?;
    let vind = Arc::new(Mutex::new(Vind {
        tokio_stop_channels: vec![],
        current_harmony: (),
        score,
    }));
    receive_osc(vind.clone())?;
    let mut backend = JackBackend::new("Knyst<3JACK")?;
    let _sphere = KnystSphere::start(
        &mut backend,
        SphereSettings {
            num_inputs: 0,
            num_outputs: 2,
            ..Default::default()
        },
        knyst::controller::print_error_handler,
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
    let verb = luff_verb(650 * 48, 0.60).lowpass(19000.).damping(5000.);
    graph_output(
        0,
        one_pole_hpf()
            .sig(verb * 0.10)
            .cutoff_freq(100.)
            .repeat_outputs(1),
    );

    sines_n_most_uncommon(&trace, 15, 5, verb).await?;
    println!("Sines done!");
    play_waveguide_segments(verb, &trace, random(), random()).await;

    Ok(())
}

async fn sines_n_most_uncommon(
    trace: &str,
    num_instructions: usize,
    skip_most_uncommon: usize,
    output: Handle<LuffVerbHandle>,
) -> Result<()> {
    let map = instruction_occurrence_by_name(trace)?;
    let mut map = map.into_iter().collect::<Vec<_>>();
    map.sort_by_key(|(_, num)| *num);

    let root = Arc::new(AtomicF32::new(1.0));
    let (stop_sender, stop_receiver) = tokio::sync::broadcast::channel(1);

    let mut handles = vec![];
    for (i, (name, num)) in map
        .into_iter()
        .skip(skip_most_uncommon)
        .take(num_instructions)
        .enumerate()
    {
        println!("{name}: {num}");
        let instances = trace_sonifier::instances_of_instruction::instances_by_name(&name, trace)?;

        let handle = short_sines(
            instances,
            100. * (i + 1) as f32,
            10,
            output,
            root.clone(),
            stop_sender.subscribe(),
        );
        handles.push(handle);
    }

    std::thread::sleep(Duration::from_secs(60));
    stop_sender.send(());

    for handle in handles {
        handle.await.unwrap();
    }
    Ok(())
}

/// Introduces some modulation through the enveloepd sines
fn short_sines(
    instances: Vec<InstructionInstance>,
    freq: f32,
    millis_per_instruction: u64,
    output: Handle<LuffVerbHandle>,
    root: Arc<AtomicF32>,
    mut stop: tokio::sync::broadcast::Receiver<()>,
) -> tokio::task::JoinHandle<()> {
    tokio::spawn(async move {
        for instance in instances {
            // new graph
            commands().init_local_graph(commands().default_graph_settings());
            let sig = sine().freq(freq * root.load(Ordering::Acquire)) * 0.015;
            let env = Envelope {
                points: vec![(1.0, 0.02), (0.0, 0.4)],
                stop_action: StopAction::FreeGraph,
                ..Default::default()
            };
            let sig = sig * handle(env.to_gen());

            graph_output(0, sig.repeat_outputs(1));
            // push graph to sphere
            let graph = commands().upload_local_graph();

            output.input(graph * 0.1);
            graph_output(0, graph);
            select! {
              _ = tokio::time::sleep(std::time::Duration::from_millis(
                instance.num_ignored_instructions_until_next as u64 * millis_per_instruction,
            )) => (),
            _ = stop.recv() => {break;}
            }
        }
    })
}
fn sine() -> Handle<OscillatorHandle> {
    oscillator(WavetableId::cos())
}
async fn play_waveguide_segments(
    verb: Handle<LuffVerbHandle>,
    trace: &str,
    random_interval: bool,
    pass_through_trigger: bool,
) {
    let buffer = machine_code_to_buffer(trace, true).unwrap();
    println!("Buffer length: {}", buffer.length_seconds());
    let buffer = commands().insert_buffer(buffer);

    let mut rng = thread_rng();
    let mut root = 1000.0;
    // .input(sig * 0.125);
    // .input(sig * 0.125 + graph_input(0, 1));
    let mut graphs = vec![];
    for _ in 0..4 {
        let mut gs = commands().default_graph_settings();
        gs.num_outputs = 1;
        commands().init_local_graph(gs);

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
        let g = commands().upload_local_graph();
        graphs.push(g);
        verb.input(g);
        graph_output(
            0,
            one_pole_lpf().sig(g).cutoff_freq(4000.).repeat_outputs(1),
        );

        root *= 0.5;
        tokio::time::sleep(Duration::from_secs(15)).await;
    }

    for g in graphs {
        g.free();
    }
}

#[derive(Clone, Copy, Serialize, Deserialize, Debug)]
enum Operation {
    Inverse,
    Normalize,
    Multiply,
    SVD,
}
type FlatMatrix = Vec<f64>;
#[derive(Serialize, Deserialize)]
struct SourceMatrix {
    matrix: FlatMatrix,
    name: String,
}
#[derive(Serialize, Deserialize)]
struct ScoreObject {
    operation: Operation,
    source: Vec<SourceMatrix>,
    result: Vec<FlatMatrix>,
    trace_name: String,
}

fn load_score() -> Result<Vec<ScoreObject>> {
    let data = std::fs::read_to_string("../score.json")?;
    let score = serde_json::from_str(&data)?;
    Ok(score)
}

fn receive_osc(vind: Arc<Mutex<Vind>>) -> Result<()> {
    let receiver = nannou_osc::receiver(7376)?;
    // let receiver = receiver.connect("0.0.0.0:7376")?;

    tokio::task::spawn_blocking(move || loop {
        if let Ok((packet, _socket)) = receiver.recv() {
            for mess in packet.into_msgs() {
                let mut args = mess.args.unwrap().into_iter();
                match mess.addr.as_str() {
                    "/start" => {
                        //
                        let mvt = args.next().unwrap().int().unwrap();
                        eprintln!("Start mvt: {mvt:?}");
                    }
                    "/pulse" => {
                        //
                        let pulse = args.next().unwrap().int().unwrap();
                        eprintln!("Pulse: {pulse:?}");
                    }
                    "/break" => {
                        //
                        eprintln!("break");
                    }
                    _ => (),
                }
            }
        }
    });

    Ok(())
}
