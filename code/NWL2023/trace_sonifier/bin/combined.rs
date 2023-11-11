// TODOs:
// - Place each sound producing process in a graph and free that graph at the end. This means we need to spawn a graph and then set that graph as the default graph before every time we spawn a new inner graph.

use std::{
    borrow::BorrowMut,
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
use rand::{random, rngs::StdRng, thread_rng, Rng, SeedableRng};
use serde::{Deserialize, Serialize};
use tokio::select;
use trace_sonifier::{
    binary_instructions::machine_code_to_buffer, instances_of_instruction::InstructionInstance,
    instruction_occurrence_by_name,
};

enum Messages {
    StartMovement(usize),
    Pulse(i32),
    Break,
}

/// Global state
struct Vind {
    tokio_stop_channels: Vec<tokio::sync::broadcast::Sender<()>>,
    stop_application_sender: tokio::sync::broadcast::Sender<()>,
    /// If a trace cannot be loaded, use this instead
    emergency_trace: String,
    current_harmony: (),
    score: Vec<ScoreObject>,
}

impl Vind {
    pub async fn start_movement(&mut self, num: usize) {
        // Stop previous movement
        self.stop_active_processes().await;

        // Select sonification method
        let movement = &self.score[num];
        println!("trace: {}", movement.trace_name);
        let trace = match std::fs::read_to_string(format!(
            "/home/erik/Nextcloud/reinverse_traces/{}.txt",
            movement.trace_name
        )) {
            Ok(trace) => trace,
            Err(e) => {
                eprintln!("Failed to load trace: {e}");
                self.emergency_trace.clone()
            }
        };

        let mut rng: StdRng = SeedableRng::from_entropy();

        // Start new sonification
        let stop_channel = play_waveguide_segments(&trace, random(), random()).await;
        self.tokio_stop_channels.push(stop_channel);
        let stop_channel =
            sines_n_most_uncommon(&trace, rng.gen_range(5..30), rng.gen_range(0..50))
                .await
                .unwrap();
        self.tokio_stop_channels.push(stop_channel);
    }
    pub async fn stop_active_processes(&mut self) {
        for stop_chan in &mut self.tokio_stop_channels {
            if let Err(e) = stop_chan.send(()) {
                eprintln!("Error stopping task: {e}");
            }
        }
        self.tokio_stop_channels.clear();
    }
    pub async fn pulse(&mut self, num: i32) {}
    pub async fn perform_break(&mut self) {
        self.stop_active_processes().await;
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    let score = load_score()?;
    let (stop_application_sender, mut stop_application_receiver) =
        tokio::sync::broadcast::channel(1);
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

    let emergency_trace = std::fs::read_to_string(traces[0])?;
    let mut vind = Vind {
        tokio_stop_channels: vec![],
        current_harmony: (),
        stop_application_sender,
        emergency_trace,
        score,
    };

    let (sender, mut receiver) = tokio::sync::mpsc::unbounded_channel();

    receive_osc(sender)?;
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

    loop {
        tokio::select! {
            message = receiver.recv() => {
        if let Some(mess) = message {
            match mess {
                Messages::StartMovement(mvt) => vind.start_movement(mvt).await,
                Messages::Pulse(pulse) => vind.pulse(pulse).await,
                Messages::Break => vind.perform_break().await,
            }
        }
            }
            _ = stop_application_receiver.recv() => break
        }
    }

    Ok(())
}

async fn sines_n_most_uncommon(
    trace: &str,
    num_instructions: usize,
    skip_most_uncommon: usize,
) -> Result<tokio::sync::broadcast::Sender<()>> {
    println!("Starting sines");
    let map = instruction_occurrence_by_name(trace)?;
    let mut map = map.into_iter().collect::<Vec<_>>();
    map.sort_by_key(|(_, num)| *num);

    let root = Arc::new(AtomicF32::new(1.0));
    let (stop_sender, mut stop_receiver) = tokio::sync::broadcast::channel(1);
    let verb = luff_verb(650 * 48, 0.60).lowpass(19000.).damping(5000.);
    graph_output(
        0,
        one_pole_hpf()
            .sig(verb * 0.10)
            .cutoff_freq(100.)
            .repeat_outputs(1),
    );

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
            verb,
            root.clone(),
            stop_sender.subscribe(),
        );
        handles.push(handle);
    }
    tokio::task::spawn(async move {
        stop_receiver.recv().await.ok();
        println!("Stopping sines");

        for handle in handles {
            handle.await.unwrap();
        }
        std::thread::sleep(Duration::from_secs(20));
        verb.free();
        println!("Stopping sines reverb");
    });

    Ok(stop_sender)
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
    trace: &str,
    random_interval: bool,
    pass_through_trigger: bool,
) -> tokio::sync::broadcast::Sender<()> {
    println!("Start waveguide segments");
    let (stop_sender, mut stop_receiver) = tokio::sync::broadcast::channel(1);
    let buffer = machine_code_to_buffer(trace, true).unwrap();
    println!("Buffer length: {}", buffer.length_seconds());
    let buffer = commands().insert_buffer(buffer);

    // .input(sig * 0.125);
    // .input(sig * 0.125 + graph_input(0, 1));
    {
        tokio::task::spawn(async move {
            let mut root = 1000.0;
            let mut graphs = vec![];
            let mut rng: StdRng = SeedableRng::from_entropy();
            let outer_graph_id = commands().init_local_graph(commands().default_graph_settings());
            let outer_graph_handle = commands().upload_local_graph();
            todo!(); // Set graph as default

            let verb = luff_verb(650 * 48, 0.60).lowpass(19000.).damping(5000.);
            graph_output(
                0,
                one_pole_hpf()
                    .sig(verb * 0.10)
                    .cutoff_freq(100.)
                    .repeat_outputs(1),
            );
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
                            * handle(env.to_gen())
                                .set("restart", interval_trig().interval(interval_time)))
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
                tokio::select! {
                    _ = tokio::time::sleep(Duration::from_secs(15)) => (),
                    _ = stop_receiver.recv() => break,
                }
            }

            for g in graphs {
                g.free();
            }
            tokio::time::sleep(Duration::from_secs(30)).await;
            verb.free();
        });
    }

    stop_sender
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

fn receive_osc(sender: tokio::sync::mpsc::UnboundedSender<Messages>) -> Result<()> {
    let receiver = nannou_osc::receiver(7376)?;
    // let receiver = receiver.connect("0.0.0.0:7376")?;

    tokio::task::spawn_blocking(move || loop {
        if let Ok((packet, _socket)) = receiver.recv() {
            for mess in packet.into_msgs() {
                match mess.addr.as_str() {
                    "/start" => {
                        let mut args = mess.args.unwrap().into_iter();
                        //
                        let mvt = args.next().unwrap().int().unwrap();
                        eprintln!("Start mvt: {mvt:?}");
                        sender.send(Messages::StartMovement(mvt as usize));
                    }
                    "/pulse" => {
                        let mut args = mess.args.unwrap().into_iter();
                        //
                        let pulse = args.next().unwrap().int().unwrap();
                        eprintln!("Pulse: {pulse:?}");
                        sender.send(Messages::Pulse(pulse));
                    }
                    "/break" => {
                        //
                        eprintln!("break");
                        sender.send(Messages::Break);
                    }
                    _ => (),
                }
            }
        }
    });

    Ok(())
}
