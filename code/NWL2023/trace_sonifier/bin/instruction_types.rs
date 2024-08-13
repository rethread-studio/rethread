//! Sonifies one instruction at a time. The time between events is determined by the number of instructions between instances of the chosen instruction.use std::time::Duration;
//!
//! Play through a large reverb
use knyst_reverb::{luff_verb, LuffVerb, LuffVerbHandle};
use rand::{thread_rng, Rng};
use std::{
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    thread::JoinHandle,
    time::Duration,
};

use atomic_float::AtomicF32;
use color_eyre::Result;
use knyst::{
    audio_backend::{CpalBackend, CpalBackendOptions, JackBackend},
    controller::print_error_handler,
    envelope::Envelope,
    gen::filter::one_pole::one_pole_hpf,
    handles::{graph_output, handle, Handle},
    knyst_commands,
    prelude::*,
    sphere::{KnystSphere, SphereSettings},
};
use trace_sonifier::{
    binary_instructions::{self, machine_code, machine_code_instruction_only},
    instances_of_instruction::InstructionInstance,
    instruction_occurrence_by_name,
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

    let cmp_instances = trace_sonifier::instances_of_instruction::instances_by_name("cmp", &trace)?;
    let mov_instances = trace_sonifier::instances_of_instruction::instances_by_name("mov", &trace)?;
    let add_instances = trace_sonifier::instances_of_instruction::instances_by_name("add", &trace)?;
    let jz_instances = trace_sonifier::instances_of_instruction::instances_by_name("jz", &trace)?;
    let ret_instances = trace_sonifier::instances_of_instruction::instances_by_name("ret", &trace)?;
    let xor_instances = trace_sonifier::instances_of_instruction::instances_by_name("xor", &trace)?;
    let vmovsd_instances =
        trace_sonifier::instances_of_instruction::instances_by_name("vmovsd", &trace)?;
    let jnbe_instances =
        trace_sonifier::instances_of_instruction::instances_by_name("jnbe", &trace)?;
    // println!("{instances:#?}");
    let root = Arc::new(AtomicF32::new(1.0));
    let pause = Arc::new(AtomicBool::new(false));
    // short_sines(jz_instances, 1000., root.clone(), pause.clone());
    // short_sines(jnbe_instances, 1500., root.clone(), pause.clone());
    // short_sines(mov_instances, 100., root.clone(), pause.clone());
    // short_sines(ret_instances, 500., root.clone(), pause.clone());
    // short_sines(vmovsd_instances, 4000., root.clone(), pause.clone());
    // short_sines(add_instances, 300., root.clone(), pause.clone());

    let verb = luff_verb(650 * 48, 0.60, 0.3)
        .lowpass(19000.)
        .damping(5000.);
    graph_output(
        0,
        one_pole_hpf()
            .sig(verb * 0.10)
            .cutoff_freq(100.)
            .repeat_outputs(1),
    );

    sines_n_most_uncommon(&trace, 15, 20, verb)?;
    println!("Sines done!");

    // let mut rng = thread_rng();
    // loop {
    //     std::thread::sleep(Duration::from_secs(4));
    //     root.store(rng.gen::<f32>() + 0.5, Ordering::SeqCst);
    //     if rng.gen::<f32>() > 0.7 {
    //         pause.store(true, Ordering::SeqCst);
    //     } else {
    //         pause.store(false, Ordering::SeqCst);
    //     }
    // }

    let mut buffer = String::new();
    let stdin = std::io::stdin(); // We get `Stdin` here.
    stdin.read_line(&mut buffer)?;

    Ok(())
}
fn sine() -> Handle<OscillatorHandle> {
    oscillator(WavetableId::cos())
}

fn sines_n_most_uncommon(
    trace: &str,
    num_instructions: usize,
    skip_most_uncommon: usize,
    output: Handle<LuffVerbHandle>,
) -> Result<()> {
    let map = instruction_occurrence_by_name(trace)?;
    let mut map = map.into_iter().collect::<Vec<_>>();
    map.sort_by_key(|(_, num)| *num);

    let root = Arc::new(AtomicF32::new(1.0));
    let stop = Arc::new(AtomicBool::new(false));

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
            stop.clone(),
        );
        handles.push(handle);
    }

    std::thread::sleep(Duration::from_secs(60));
    stop.store(true, Ordering::SeqCst);

    for handle in handles {
        handle.join().unwrap();
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
    stop: Arc<AtomicBool>,
) -> JoinHandle<()> {
    std::thread::spawn(move || {
        for instance in instances {
            // new graph
            knyst_commands().init_local_graph(knyst_commands().default_graph_settings());
            let sig = sine().freq(freq * root.load(Ordering::Acquire)) * 0.015;
            let env = Envelope {
                points: vec![(1.0, 0.02), (0.0, 0.4)],
                stop_action: StopAction::FreeGraph,
                ..Default::default()
            };
            let sig = sig * handle(env.to_gen());

            graph_output(0, sig.repeat_outputs(1));
            // push graph to sphere
            let graph = knyst_commands().upload_local_graph().unwrap();

            output.input(graph * 0.1);
            graph_output(0, graph);
            std::thread::sleep(std::time::Duration::from_millis(
                instance.num_ignored_instructions_until_next as u64 * millis_per_instruction,
            ));
            if stop.load(Ordering::Acquire) {
                println!("Stopping loop");
                break;
            }
        }
        println!("Instructions done");
    })
}
