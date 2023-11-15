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
    graph::GraphId,
    handles::{handle, AnyNodeHandle},
    prelude::*,
    resources::BufferId,
    trig::interval_trig,
};
use knyst::{handles::Handle, prelude::OscillatorHandle, resources::WavetableId};
use knyst_reverb::{luff_verb, LuffVerbHandle};
use knyst_waveguide2::{
    half_sine_wt, waveguide, HalfSineImpulseHandle, HalfSineWtHandle, WaveguideHandle,
};
use musical_matter::pitch::EdoChordSemantic;
use neodrs::SynthesisInterface;
use rand::{random, rngs::StdRng, seq::SliceRandom, thread_rng, Rng, SeedableRng};
use serde::{Deserialize, Serialize};
use tokio::select;
use trace_sonifier::{
    binary_instructions::machine_code_to_buffer,
    harmony::ChordMatrix,
    instances_of_instruction::{InstructionInstance, InstructionInstanceAbsolute},
    instruction_occurrence_by_name,
};

enum Messages {
    StartMovement(usize),
    Pulse(i32),
    Break,
    BeamWidth(f32),
}

struct ProcessInteractivity {
    stop_sender: tokio::sync::broadcast::Sender<()>,
    chord_sender: tokio::sync::broadcast::Sender<EdoChordSemantic>,
    beam_width_sender: tokio::sync::broadcast::Sender<f32>,
}
impl ProcessInteractivity {
    pub fn new() -> Self {
        let (stop_sender, _) = tokio::sync::broadcast::channel(1);
        let (chord_sender, _) = tokio::sync::broadcast::channel::<EdoChordSemantic>(10);
        let (beam_width_sender, _) = tokio::sync::broadcast::channel::<f32>(10);
        Self {
            stop_sender,
            chord_sender,
            beam_width_sender,
        }
    }
}

/// Global state
struct Vind {
    processes: Vec<ProcessInteractivity>,
    stop_application_sender: tokio::sync::broadcast::Sender<()>,
    /// If a trace cannot be loaded, use this instead
    emergency_trace: String,
    chord_matrix: ChordMatrix,
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

        // Start new sonification
        let process =
            play_waveguide_segments(&trace, true, true, self.chord_matrix.current()).await;
        self.processes.push(process);
        let process =
            instructions_to_melody_rewrite(&trace, 10, 20, 18, self.chord_matrix.current())
                .await
                .unwrap();
        self.processes.push(process);
        // let stop_channel = sines_n_most_uncommon(
        //     &trace,
        //     rng.gen_range(5..20),
        //     rng.gen_range(0..30),
        //     self.chord_matrix.current(),
        // )
        // .await
        // .unwrap();
        // let (stop_channel, chord_sender) =
        //     sines_n_most_uncommon(&trace, 10, 20, self.chord_matrix.current())
        //         .await
        //         .unwrap();
        // self.tokio_stop_channels.push(stop_channel);
        // self.new_chord_senders.push(chord_sender);
    }
    pub async fn stop_active_processes(&mut self) {
        for proc in &mut self.processes {
            if let Err(e) = proc.stop_sender.send(()) {
                eprintln!("Error stopping task: {e}");
            }
        }
        self.processes.clear();
    }
    pub async fn pulse(&mut self, num: i32) {}
    pub async fn perform_break(&mut self) {
        self.stop_active_processes().await;

        let process = break_sines(self.chord_matrix.current()).await;
        self.processes.push(process);
    }
    pub async fn set_beam_width(&mut self, value: f32) {
        for proc in &mut self.processes {
            proc.beam_width_sender.send(value);
        }
    }
    pub fn next_chord(&mut self) {
        self.chord_matrix.next_chord();
        for proc in &mut self.processes {
            proc.chord_sender.send(self.chord_matrix.current().clone());
        }
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
        processes: vec![],
        chord_matrix: ChordMatrix::new(),
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
    vind.start_movement(0).await;
    tokio::time::sleep(std::time::Duration::from_millis(2000)).await;
    vind.perform_break().await;
    // vind.start_movement(0).await;

    loop {
        tokio::select! {
            message = receiver.recv() => {
        if let Some(mess) = message {
            match mess {
                Messages::StartMovement(mvt) => vind.start_movement(mvt).await,
                Messages::Pulse(pulse) => vind.pulse(pulse).await,
                Messages::Break => vind.perform_break().await,
                Messages::BeamWidth(val) => vind.set_beam_width(val).await,
            }
        }
            }
            _ = stop_application_receiver.recv() => break,
            _ = tokio::time::sleep(std::time::Duration::from_millis(
                60000
                    )) => vind.next_chord(),
        }
    }

    Ok(())
}

struct InstructionId(usize);
struct InstructionScore {
    score: Vec<(InstructionId, InstructionInstanceAbsolute)>,
}
impl InstructionScore {
    fn join_list(&mut self, new_instruction_list: Vec<InstructionInstance>, id: usize) {
        let mut list_absolute = vec![];
        let mut i = 0;
        for instr in new_instruction_list {
            let length = instr.num_ignored_instructions_until_next;
            list_absolute.push(InstructionInstanceAbsolute::from_instruction_instance(
                instr, i,
            ));
            i += length as u64;
        }
        let mut i = 0;
        for instr in list_absolute {
            if i == self.score.len() {
                self.score.push((InstructionId(id), instr));
                i += 1;
            } else {
                while self.score[i].1.absolute_position_in_list < instr.absolute_position_in_list {
                    i += 1;
                    if i == self.score.len() {
                        break;
                    }
                }
                self.score.insert(i, (InstructionId(id), instr));
            }
        }
    }
}

async fn instructions_to_melody_rewrite(
    trace: &str,
    num_instructions: usize,
    skip_most_uncommon: usize,
    millis_per_instruction: u64,
    chord: &EdoChordSemantic,
) -> Result<ProcessInteractivity> {
    println!("Starting instruction melody");

    let map = instruction_occurrence_by_name(trace)?;
    let mut map = map.into_iter().collect::<Vec<_>>();
    map.sort_by_key(|(_, num)| *num);

    // Consolidate the instructions we want into one list
    let mut instruction_score = InstructionScore { score: vec![] };
    for (i, (name, num_occurrences)) in map
        .into_iter()
        .skip(skip_most_uncommon)
        .take(num_instructions)
        .enumerate()
    {
        let instances = trace_sonifier::instances_of_instruction::instances_by_name(&name, trace)?;
        instruction_score.join_list(instances, i);
    }

    let process = ProcessInteractivity::new();
    let mut stop_receiver = process.stop_sender.subscribe();
    let mut chord_receiver = process.chord_sender.subscribe();
    let mut beam_receiver = process.beam_width_sender.subscribe();

    commands().to_top_level_graph();
    let outer_graph_id = commands().init_local_graph(commands().default_graph_settings());
    let outer_graph_handle = commands().upload_local_graph();
    graph_output(0, outer_graph_handle);
    commands().to_graph(outer_graph_id);
    let verb = luff_verb(650 * 48, 0.70).lowpass(19000.).damping(5000.);
    graph_output(
        0,
        one_pole_hpf()
            .sig(verb * 0.20)
            .cutoff_freq(100.)
            .repeat_outputs(1),
    );

    let exciter = half_sine_wt()
        .freq(200. * 0.4837) // Nice for plucking low notes
        // .freq(control.out("freq") * 2.2837) /// Nice for high notes and especially sustained
        .amp(0.2);
    let exciter_to_wg = one_pole_lpf().sig(exciter).cutoff_freq(2600.);
    // let exciter_input = one_pole_hpf()
    // .sig(one_pole_lpf().sig(white_noise() * 0.1).cutoff_freq(100.))
    // .cutoff_freq(40.);
    let wg = waveguide()
        .freq(100.)
        .exciter(exciter_to_wg)
        .feedback(0.99999)
        .damping(5000.)
        .lf_damping(6.)
        .position(0.5)
        .stiffness(0.0);
    let beam_setter = bus(1).set(0, 0.5);
    let sig = wg * (0.2 * beam_setter + 0.02);
    graph_output(0, sig.repeat_outputs(1));
    let mut freqs: Vec<_> = chord
        .to_edo_chord()
        .to_edo_pitches()
        .into_iter()
        .map(|p| p.to_freq_pitch(100.).frequency())
        .collect();

    tokio::spawn(async move {
        let mut rng: StdRng = SeedableRng::from_entropy();
        // let indent = name.chars().map(|c| c as u8 as u32).sum::<u32>() % 120;
        // let indent = " ".repeat(indent as usize);
        let mut time_counter = 0;
        let mut time_to_next = 0;
        exciter.restart_trig();
        for (i, instance) in instruction_score.score {
            let i = i.0;
            let octave = 2f32.powi((i / freqs.len()) as i32);
            let freq = freqs[i % freqs.len()] * octave;

            time_to_next =
                (instance.absolute_position_in_list - time_counter) * millis_per_instruction;
            time_counter = instance.absolute_position_in_list;

            println!("{i}: {time_to_next}");

            // println!("{indent}{name}");

            if time_to_next > 100 {
                let ratio = [16. / 15., 9. / 8., 15. / 16.];
                let ornament_length = rng.gen_range(40..(time_to_next.min(200)));
                let num_ornaments = time_to_next.min(200) / ornament_length;
                let pre_delay = time_to_next - (ornament_length * num_ornaments);
                select! {
                  _ = tokio::time::sleep(std::time::Duration::from_millis(
                    pre_delay
                )) => (),
                _ = stop_receiver.recv() => {break;}
                }
                for i in 0..num_ornaments {
                    if i % 2 == 0 {
                        wg.freq(freq * ratio.choose(&mut rng).unwrap());
                    } else {
                        wg.freq(freq);
                    }

                    select! {
                      _ = tokio::time::sleep(std::time::Duration::from_millis(
                        ornament_length
                    )) => (),
                    _ = stop_receiver.recv() => {break;}
                    }
                }
            } else {
                select! {
                    new_chord = chord_receiver.recv() => {
                        if let Ok(new_chord) = new_chord {
                                freqs = new_chord
                                    .to_edo_chord()
                                    .to_edo_pitches()
                                    .into_iter()
                                    .map(|p| p.to_freq_pitch(200.).frequency())
                                    .collect();

                        }
                    }
                    beam = beam_receiver.recv() => {
                        if let Ok(val) = beam{
                            beam_setter.set(0, (1.0-val).powi(2));
                        }
                    }
                  _ = tokio::time::sleep(std::time::Duration::from_millis(
                    time_to_next
                )) => (),
                _ = stop_receiver.recv() => {break;}
                }
            }

            exciter.freq(freq * 0.48);
            wg.freq(freq);
            wg.feedback(1.0 + rng.gen::<f32>() * 0.03);
            wg.damping(freq * rng.gen_range(5.0..9.0));
            if time_to_next > 2000 || (rng.gen::<f32>() > 0.9 && time_to_next > 100) {
                exciter.restart_trig();
            }
        }
        println!("Stopping melody");
        wg.feedback(0.99);
        tokio::time::sleep(Duration::from_secs(5)).await;
        verb.free();
        outer_graph_handle.free();
    });

    Ok(process)
}

async fn sines_n_most_uncommon(
    trace: &str,
    num_instructions: usize,
    skip_most_uncommon: usize,
    chord: &EdoChordSemantic,
) -> Result<ProcessInteractivity> {
    println!("Starting sines");
    let map = instruction_occurrence_by_name(trace)?;
    let mut map = map.into_iter().collect::<Vec<_>>();
    map.sort_by_key(|(_, num)| *num);

    let outer_graph_id = commands().init_local_graph(commands().default_graph_settings());
    let outer_graph_handle = commands().upload_local_graph();
    graph_output(0, outer_graph_handle);
    commands().to_graph(outer_graph_id);
    let root = Arc::new(AtomicF32::new(1.0));

    let process = ProcessInteractivity::new();
    let mut stop_receiver = process.stop_sender.subscribe();
    let mut chord_receiver = process.chord_sender.subscribe();
    let verb = luff_verb(650 * 48, 0.70).lowpass(19000.).damping(5000.);
    graph_output(
        0,
        one_pole_hpf()
            .sig(verb * 0.20)
            .cutoff_freq(100.)
            .repeat_outputs(1),
    );

    let freqs: Vec<_> = chord
        .to_edo_chord()
        .to_edo_pitches()
        .into_iter()
        .map(|p| p.to_freq_pitch(100.).frequency())
        .collect();
    let mut handles = vec![];

    let exciter = half_sine_wt()
        .freq(200. * 0.4837) // Nice for plucking low notes
        // .freq(control.out("freq") * 2.2837) /// Nice for high notes and especially sustained
        .amp(0.2);
    let exciter_to_wg = one_pole_lpf().sig(exciter).cutoff_freq(2600.);
    // let exciter_input = one_pole_hpf()
    // .sig(one_pole_lpf().sig(white_noise() * 0.1).cutoff_freq(100.))
    // .cutoff_freq(40.);
    let wg = waveguide()
        .freq(100.)
        .exciter(exciter_to_wg)
        .feedback(1.001)
        .damping(5000.)
        .lf_damping(6.)
        .position(0.5)
        .stiffness(0.0);

    let sig = wg * 0.2;
    graph_output(0, sig.repeat_outputs(1));
    let mut freq_setters = vec![];
    for (i, (name, num)) in map
        .into_iter()
        .skip(skip_most_uncommon)
        .take(num_instructions)
        .enumerate()
    {
        println!("{name}: {num}");
        let instances = trace_sonifier::instances_of_instruction::instances_by_name(&name, trace)?;
        let octave = 2u32.pow(i as u32 / freqs.len() as u32);
        let freq = Arc::new(AtomicF32::new(freqs[i % freqs.len()] * octave as f32));
        freq_setters.push(freq.clone());

        let handle = short_sines(
            name,
            instances,
            freq,
            18,
            verb,
            root.clone(),
            outer_graph_id,
            wg,
            exciter,
            process.stop_sender.subscribe(),
        );
        handles.push(handle);
    }
    tokio::task::spawn(async move {
        loop {
            tokio::select! {
                new_chord = chord_receiver.recv() => {
                    if let Ok(new_chord) = new_chord {
                    let freqs: Vec<_> = new_chord
                        .to_edo_chord()
                        .to_edo_pitches()
            .into_iter()
            .map(|p| p.to_freq_pitch(100.).frequency())
            .collect();
                    for (i, freq) in freq_setters.iter_mut().enumerate() {
                        let octave = 2u32.pow(i as u32 / freqs.len() as u32);
                        freq.store(freqs[i % freqs.len()] * octave as f32, Ordering::SeqCst);
                    }

                    }
                }

                _ = stop_receiver.recv() => {
                println!("Stopping sines");

                for handle in handles {
                    handle.await.unwrap();
                }
                std::thread::sleep(Duration::from_secs(20));
                verb.free();
                outer_graph_handle.free();
                println!("Stopping sines reverb");
                break;

                }
                    }
        }
    });

    Ok(process)
}

/// Introduces some modulation through the enveloepd sines
fn short_sines(
    name: String,
    instances: Vec<InstructionInstance>,
    freq: Arc<AtomicF32>,
    millis_per_instruction: u64,
    output: Handle<LuffVerbHandle>,
    root: Arc<AtomicF32>,
    outer_graph: GraphId,
    wg: Handle<WaveguideHandle>,
    exciter: Handle<HalfSineWtHandle>,
    mut stop: tokio::sync::broadcast::Receiver<()>,
) -> tokio::task::JoinHandle<()> {
    // commands().to_graph(outer_graph);
    // commands().init_local_graph(commands().default_graph_settings());

    // // push graph to sphere
    // let graph = commands().upload_local_graph();
    // commands().to_graph(outer_graph);
    // output.input(graph * 0.1);
    // graph_output(0, graph);
    tokio::spawn(async move {
        let mut rng: StdRng = SeedableRng::from_entropy();
        let indent = name.chars().map(|c| c as u8 as u32).sum::<u32>() % 120;
        let indent = " ".repeat(indent as usize);
        let mut time_to_next = 0;
        for instance in instances {
            let freq = freq.load(Ordering::SeqCst);
            exciter.freq(freq * 0.48);
            wg.freq(freq);
            wg.feedback(1.0 + rng.gen::<f32>() * 0.03);
            wg.damping(freq * rng.gen_range(5.0..9.0));
            if rng.gen::<f32>() > 0.9 && time_to_next > 100 {
                exciter.restart_trig();
            }

            time_to_next =
                instance.num_ignored_instructions_until_next as u64 * millis_per_instruction;

            println!("{indent}{name}");

            if time_to_next > 100 {
                let ratio = [16. / 15., 9. / 8., 15. / 16.];
                let ornament_length = rng.gen_range(40..(time_to_next.min(200)));
                let num_ornaments = time_to_next.min(200) / ornament_length;
                let pre_delay = time_to_next - (ornament_length * num_ornaments);
                select! {
                  _ = tokio::time::sleep(std::time::Duration::from_millis(
                    pre_delay
                )) => (),
                _ = stop.recv() => {break;}
                }
                for i in 0..num_ornaments {
                    if i % 2 == 0 {
                        wg.freq(freq * ratio.choose(&mut rng).unwrap());
                    } else {
                        wg.freq(freq);
                    }

                    select! {
                      _ = tokio::time::sleep(std::time::Duration::from_millis(
                        ornament_length
                    )) => (),
                    _ = stop.recv() => {break;}
                    }
                }
            } else {
                select! {
                  _ = tokio::time::sleep(std::time::Duration::from_millis(
                    time_to_next
                )) => (),
                _ = stop.recv() => {break;}
                }
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
    chord: &EdoChordSemantic,
) -> ProcessInteractivity {
    println!("Start waveguide segments");

    let process = ProcessInteractivity::new();
    let mut stop_receiver = process.stop_sender.subscribe();
    let mut chord_receiver = process.chord_sender.subscribe();
    let buffer = machine_code_to_buffer(trace, true).unwrap();
    println!("Buffer length: {}", buffer.length_seconds());
    let buffer = commands().insert_buffer(buffer);

    let mut freqs: Vec<_> = chord
        .to_edo_chord()
        .to_edo_pitches()
        .into_iter()
        .map(|p| p.to_freq_pitch(200.).frequency())
        .collect();
    dbg!(&freqs);

    // .input(sig * 0.125);
    // .input(sig * 0.125 + graph_input(0, 1));
    {
        let stop_sender = process.stop_sender.clone();
        let chord_sender = process.chord_sender.clone();
        let beam_width_sender = process.beam_width_sender.clone();
        tokio::task::spawn(async move {
            let mut root = 4.0;
            let mut rng: StdRng = SeedableRng::from_entropy();
            commands().to_top_level_graph();
            let outer_graph_id = commands().init_local_graph(commands().default_graph_settings());
            let outer_graph_handle = commands().upload_local_graph();
            graph_output(0, outer_graph_handle);
            commands().to_graph(outer_graph_id);

            let verb = luff_verb(1650 * 48, 0.60).lowpass(19000.).damping(5000.);
            graph_output(
                0,
                one_pole_hpf()
                    .sig(verb * sine().freq(0.1).range(0.02, 0.25))
                    .cutoff_freq(100.)
                    .repeat_outputs(1),
            );
            let beam_setter = bus(1).set(0, 0.5);

            for _ in 0..4 {
                {
                    let root = root;
                    let freqs = freqs.clone();
                    let mut stop_receiver = stop_sender.subscribe();
                    let mut chord_receiver = chord_sender.subscribe();
                    let mut beam_receiver = beam_width_sender.subscribe();
                    tokio::task::spawn(async move {
                        let mut rng: StdRng = SeedableRng::from_entropy();
                        let mut gs = commands().default_graph_settings();
                        gs.num_outputs = 1;
                        commands().to_graph(outer_graph_id);
                        commands().init_local_graph(gs);

                        let exciter = buffer_reader(buffer, 1.0, true, StopAction::FreeGraph);
                        let exciter_to_wg = one_pole_lpf().sig(exciter * 0.15).cutoff_freq(3600.);
                        let env = Envelope {
                            start_value: 0.0,
                            points: vec![(1.0, 0.01), (0.25, 0.1), (0.0, 0.5)],
                            ..Default::default()
                        };
                        let mut wgs = vec![];
                        for &freq in &freqs {
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
                            let exciter_to_wg =
                                one_pole_lpf().sig(&exciter_to_wg).cutoff_freq(freq * 3.0);
                            let wg = waveguide()
                                .freq(freq)
                                .exciter(exciter_to_wg)
                                .feedback(0.9999)
                                // .feedback(1.001)
                                .damping(freq * 7. + 1000.)
                                .lf_damping(6.)
                                .position(0.4)
                                .stiffness(0.0);
                            wgs.push(wg);
                            let sig = wg * 0.2;
                            graph_output(0, sig);
                        }
                        let inner_graph = commands().upload_local_graph();
                        let g = inner_graph * (beam_setter + 0.01);
                        verb.input(g);
                        commands().to_graph(outer_graph_id);
                        graph_output(
                            0,
                            one_pole_lpf().sig(g).cutoff_freq(4000.).repeat_outputs(1),
                        );
                        loop {
                            tokio::select! {
                            new_chord = chord_receiver.recv() => {
                                let freqs: Vec<_> = new_chord.unwrap()
                                    .to_edo_chord()
                                    .to_edo_pitches()
                                    .into_iter()
                                    .map(|p| p.to_freq_pitch(200.).frequency())
                                    .collect();
                                for (freq, wg) in freqs.into_iter().zip(wgs.iter_mut()) {
                                    wg.freq(freq * root);
                                }
                            },
                            beam = beam_receiver.recv() => {
                                if let Ok(val) = beam{
                                    beam_setter.set(0, val.powi(2));
                                }
                            }
                            _ = stop_receiver.recv() => break,
                            }
                        }
                        g.free();
                    });
                }

                root *= 0.5;
                tokio::select! {
                    _ = tokio::time::sleep(Duration::from_secs(15)) => (),
                    _ = stop_receiver.recv() => break,
                }
            }

            commands().to_top_level_graph();
            stop_sender.send(()).ok();
            tokio::time::sleep(Duration::from_secs(30)).await;
            verb.free();
            outer_graph_handle.free();
        });
    }

    process
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
                    "/beam_width" => {
                        let mut args = mess.args.unwrap().into_iter();
                        //
                        let val = args.next().unwrap().float().unwrap();
                        eprintln!("Beam value: {val}");
                        sender.send(Messages::BeamWidth(val));
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

async fn break_sines(chord: &EdoChordSemantic) -> ProcessInteractivity {
    let process = ProcessInteractivity::new();
    let mut stop_receiver = process.stop_sender.subscribe();
    let mut chord_receiver = process.chord_sender.subscribe();
    let mut beam_receiver = process.beam_width_sender.subscribe();

    commands().to_top_level_graph();
    let outer_graph_id = commands().init_local_graph(commands().default_graph_settings());
    let outer_graph_handle = commands().upload_local_graph();
    graph_output(0, outer_graph_handle);
    commands().to_graph(outer_graph_id);
    let verb = luff_verb(650 * 48, 0.70).lowpass(19000.).damping(5000.);
    graph_output(
        0,
        one_pole_hpf()
            .sig(verb * 0.20)
            .cutoff_freq(100.)
            .repeat_outputs(1),
    );
    let freqs: Vec<_> = chord
        .to_edo_chord()
        .to_edo_pitches()
        .into_iter()
        .map(|p| p.to_freq_pitch(200.).frequency())
        .collect();

    let beam_setter = bus(1).set(0, 0.5);

    let beam = lag().value(beam_setter).time(1.0);

    let s0 = sine().freq(freqs[0] * 2.0);
    let sig = s0 * (sine().freq(sine().freq(0.1).range(2.0, 10.0)) * beam + 1.0) * 0.1;
    graph_output(0, sig.repeat_outputs(1));
    let s1 = sine().freq(freqs[2] * 2.0);
    let sig =
        s1 * sine().freq(sine().freq((sine().freq(0.15) + 2.0) * 20. * beam) * beam + 1.0) * 0.1;
    graph_output(0, sig.repeat_outputs(1));
    let s2 = sine().freq(freqs[1] * 8.0);
    let sig = s2 * (sine().freq((sine().freq(0.15) + 2.0) * 12. * beam) * beam + 1.0) * 0.1 * beam;
    graph_output(0, sig.repeat_outputs(1));
    let s3 = sine().freq(freqs[1] * 4.0);
    // let sig = s3
    //     * (sine().freq((sine().freq(0.15) + 2.0) * 12. * beam) * beam + 1.0)
    //     * 0.1
    //     * (1.0 - beam);
    // graph_output(0, sig.repeat_outputs(1));

    tokio::task::spawn(async move {
        loop {
            tokio::select! {
            new_chord = chord_receiver.recv() => {
                if let Ok(new_chord) = new_chord {
                let freqs: Vec<_> = new_chord
                    .to_edo_chord()
                    .to_edo_pitches()
                    .into_iter()
                    .map(|p| p.to_freq_pitch(200.).frequency())
                    .collect();
                s0.freq(freqs[0]*2.0);
                s1.freq(freqs[2]*2.0);
                s2.freq(freqs[1]*8.0);

                }
            },
            new_beam_value = beam_receiver.recv() => {
                if let Ok(v) = new_beam_value {
                    beam_setter.set(0, v);}
                }
            _ = stop_receiver.recv() => break,
            }
        }
        outer_graph_handle.free();
        println!("Break sines freed");
    });

    process
}
