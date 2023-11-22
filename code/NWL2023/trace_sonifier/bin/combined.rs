// TODOs:
// - Vary if both chords and melody play or just one of them
// - Vary waveguide melody internal BPF
// - Break sines tremolo based on a saw movement, i.e. accel -> a tempo subito
// - Interpolate beam value for waveguide chords

use std::{
    borrow::BorrowMut,
    os::unix::thread,
    sync::{
        atomic::{AtomicBool, AtomicUsize, Ordering},
        Arc, Mutex, OnceLock,
    },
    time::Duration,
};

use atomic_float::AtomicF32;
use color_eyre::Result;
use knyst::{
    audio_backend::JackBackend,
    envelope::{envelope_gen, Envelope, SustainMode},
    gen::filter::one_pole::{one_pole_hpf, one_pole_lpf},
    gen::random::random_lin,
    graph::GraphId,
    handles::{handle, AnyNodeHandle, GenericHandle},
    knyst,
    prelude::*,
    resources::BufferId,
    trig::interval_trig,
};
use knyst::{handles::Handle, prelude::OscillatorHandle, resources::WavetableId};
use knyst_reverb::{luff_verb, LuffVerbHandle};
use knyst_waveguide2::{
    half_sine_wt, waveguide, white_noise, HalfSineImpulseHandle, HalfSineWtHandle, WaveguideHandle,
};
use musical_matter::pitch::EdoChordSemantic;
use rand::{random, rngs::StdRng, seq::SliceRandom, thread_rng, Rng, SeedableRng};
use serde::{Deserialize, Serialize};
use tokio::{select, sync::mpsc::UnboundedSender, time::interval};
use trace_sonifier::{
    binary_instructions::machine_code_to_buffer,
    harmony::ChordMatrix,
    instances_of_instruction::{InstructionInstance, InstructionInstanceAbsolute},
    instruction_occurrence_by_name,
};

// const TRACE_PATH: &'static str = "C:/Users/erikn/Nextcloud/reinverse_traces/";

static TRACE_PATH: OnceLock<String> = OnceLock::new();

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
    latest_trace: String,
    latest_movement: usize,
    score: Vec<ScoreObject>,
    chord_change_sender: UnboundedSender<()>,
    is_on_break: bool,
    huge_reverb: Handle<LuffVerbHandle>,
}

impl Vind {
    pub async fn start_movement(&mut self, num: usize) {
        self.is_on_break = false;
        // Stop previous movement
        self.stop_active_processes().await;

        // Select sonification method
        let movement = &self.score[num];
        println!("trace: {}", movement.trace_name);
        let trace_path = TRACE_PATH.get().expect("Trace path should be initialised");
        let trace =
            match std::fs::read_to_string(format!("{trace_path}{}.txt", movement.trace_name)) {
                Ok(trace) => trace,
                Err(e) => {
                    eprintln!("Failed to load trace: {e}");
                    self.emergency_trace.clone()
                }
            };

        // // Start new sonification
        let mut rng = thread_rng();
        let variation = rng.gen_range(0..=2);
        let variation = 0;
        match variation {
            0 => {
                let process = play_waveguide_segments(
                    &trace,
                    false,
                    random(),
                    &movement.source[0].matrix[..],
                    true,
                    self.chord_matrix.current(),
                )
                .await;
                self.processes.push(process);
            }
            1 => {
                let process = instructions_to_melody_rewrite(
                    &trace,
                    15,
                    15,
                    18,
                    self.chord_matrix.current(),
                    self.huge_reverb,
                )
                .await
                .unwrap();
                self.processes.push(process);
            }
            _ => {
                let process = play_waveguide_segments(
                    &trace,
                    false,
                    true,
                    &movement.source[0].matrix[..],
                    true,
                    self.chord_matrix.current(),
                )
                .await;
                self.processes.push(process);
                let process = instructions_to_melody_rewrite(
                    &trace,
                    15,
                    15,
                    18,
                    self.chord_matrix.current(),
                    self.huge_reverb,
                )
                .await
                .unwrap();
                self.processes.push(process);
            }
        }
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
        self.latest_trace = trace;
    }
    pub async fn stop_active_processes(&mut self) {
        for proc in &mut self.processes {
            if let Err(e) = proc.stop_sender.send(()) {
                eprintln!("Error stopping task: {e}");
            }
        }
        self.processes.clear();
        knyst().free_disconnected_nodes();
    }
    pub async fn pulse(&mut self, num: i32) {
        if num % 3 == 0 {
            self.next_chord();
        }
        play_pulse(num as u32, self.chord_matrix.current()).await;
    }
    pub async fn perform_break(&mut self) {
        self.is_on_break = true;
        self.stop_active_processes().await;

        let process = break_sines(
            self.chord_matrix.current(),
            &self.latest_trace,
            self.huge_reverb,
        )
        .await;
        self.processes.push(process);
        let process = chord_change_process(
            vec![Duration::from_secs_f32(5.0)],
            self.chord_change_sender.clone(),
        );
        self.processes.push(process);
    }
    pub async fn set_beam_width(&mut self, value: f32) {
        for proc in &mut self.processes {
            if let Err(e) = proc.beam_width_sender.send(value) {
                eprintln!("Error sending beam value: {e}");
            }
        }
    }
    pub fn next_chord(&mut self) {
        // self.chord_matrix.next_chord();
        let mut rng: StdRng = SeedableRng::from_entropy();
        if self.is_on_break {
            self.chord_matrix.next_from_matrix_probability(
                &self.score[self.latest_movement].result[0][..],
                &mut rng,
            );
        } else {
            self.chord_matrix.next_from_matrix_probability(
                &self.score[self.latest_movement].source[0].matrix[..],
                &mut rng,
            );
        }
        for proc in &mut self.processes {
            if let Err(e) = proc.chord_sender.send(self.chord_matrix.current().clone()) {
                eprintln!("Error sending next chord: {e}");
            }
        }
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok(); // This line loads the environment variables from the ".env" file.
    TRACE_PATH
        .set(std::env::var("TRACE_PATH").expect(
            "The TRACE_PATH environment variable should be set, optionally in the .env file",
        ))
        .expect("TRACE_PATH global static should not have been set before.");

    let score = load_score()?;
    let (stop_application_sender, mut stop_application_receiver) =
        tokio::sync::broadcast::channel(1);
    let traces = [
        "Inverse_random_0.txt",
        "Inverse_diagonal_0.txt",
        "Inverse_lower_triangular_0.txt",
        "SVD_lower_triangular_7.txt",
        "SVD_random_7.txt",
        "SVD_upper_triangular_7.txt",
        "Multiply_diagonal_42.txt",
        "Multiply_random_73.txt",
        "Normalize_random_0.txt",
    ];

    let trace_path = TRACE_PATH.get().unwrap();

    let (chord_change_sender, mut chord_change_receiver) =
        tokio::sync::mpsc::unbounded_channel::<()>();
    tokio::task::spawn(async move {
        loop {
            tokio::time::sleep(std::time::Duration::from_millis(50000)).await;
            // chord_change_sender.send(()).ok();
        }
    });

    let (sender, mut receiver) = tokio::sync::mpsc::unbounded_channel();

    receive_osc(sender)?;
    let mut backend = JackBackend::new("reinverse")?;
    let _sphere = KnystSphere::start(
        &mut backend,
        SphereSettings {
            num_inputs: 0,
            num_outputs: 5,
            ..Default::default()
        },
        knyst::controller::print_error_handler,
    );

    let emergency_trace = std::fs::read_to_string(format!("{trace_path}{}", traces[0]))?;
    let huge_reverb = luff_verb(48 * 2530, 0.90).damping(8000.).lowpass(19000.);
    graph_output(0, huge_reverb.repeat_outputs(1));
    let mut vind = Vind {
        processes: vec![],
        chord_matrix: ChordMatrix::new(),
        stop_application_sender,
        latest_trace: emergency_trace.clone(),
        latest_movement: 0,
        emergency_trace,
        score,
        chord_change_sender,
        is_on_break: false,
        huge_reverb,
    };
    let mut rng = thread_rng();
    // vind.perform_break().await;
    // tokio::time::sleep(std::time::Duration::from_millis(3000)).await;
    vind.start_movement(rng.gen_range(0..9)).await;
    // vind.perform_break().await;
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
            _ = chord_change_receiver.recv() => vind.next_chord(),
        }
    }

    Ok(())
}

fn chord_change_process(
    intervals: Vec<Duration>,
    chord_change_sender: UnboundedSender<()>,
) -> ProcessInteractivity {
    let process = ProcessInteractivity::new();
    {
        let mut stop_receiver = process.stop_sender.subscribe();
        tokio::task::spawn(async move {
            for interval in intervals.into_iter().cycle() {
                tokio::select! {
                    _ = tokio::time::sleep(interval) => (),
                    _ = stop_receiver.recv() => break,
                }
                chord_change_sender.send(()).ok();
            }
        });
    }
    process
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
    huge_reverb: Handle<LuffVerbHandle>,
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

    let mut o_exciter = None;
    let mut o_beam_setter = None;
    let mut o_verb = None;
    let mut o_wg = None;
    knyst().to_top_level_graph();
    let outer_graph = upload_graph(knyst().default_graph_settings(), || {
        let verb = luff_verb(650 * 48, 0.70).lowpass(19000.).damping(5000.);
        graph_output(1, one_pole_hpf().sig(verb * 0.30).cutoff_freq(100.));

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
        graph_output(3, sig);
        verb.input(sig * 0.2);
        o_exciter = Some(exciter);
        o_verb = Some(exciter);
        o_wg = Some(wg);
        o_beam_setter = Some(beam_setter);
    });
    let exciter = o_exciter.unwrap();
    let verb = o_verb.unwrap();
    let beam_setter = o_beam_setter.unwrap();
    let wg = o_wg.unwrap();
    graph_output(0, outer_graph);
    huge_reverb.input(outer_graph.out(0) * random_lin().freq(2.).powf(3.0) * 1.5);
    // huge_reverb.input(outer_graph.out(0));
    knyst().to_graph(outer_graph.graph_id());
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
        let skip_nr = rng.gen_range(0..instruction_score.score.len() / 2);
        let mut time_counter = instruction_score.score[skip_nr].1.absolute_position_in_list;
        let mut time_to_next;
        exciter.restart_trig();
        for (i, instance) in instruction_score.score.into_iter().skip(skip_nr) {
            let i = i.0;
            let octave = 2f32.powi((i / freqs.len()) as i32);
            let freq = freqs[i % freqs.len()] * octave;

            time_to_next =
                (instance.absolute_position_in_list - time_counter) * millis_per_instruction;
            time_counter = instance.absolute_position_in_list;

            // println!("{i}: {time_to_next}");

            // println!("{indent}{name}");

            if time_to_next > 100 {
                let ratio = [16. / 15., 9. / 8., 15. / 16.];
                let ornament_length = rng.gen_range(40..(time_to_next.min(200)));
                let num_ornaments = time_to_next.min(200) / ornament_length;
                let pre_delay = time_to_next - (ornament_length * num_ornaments);
                if pre_delay > 3000 {
                    select! {
                      _ = tokio::time::sleep(std::time::Duration::from_millis(
                        pre_delay/2
                    )) => (),
                    _ = stop_receiver.recv() => {break;}
                    }
                    wg.feedback(0.999);
                    select! {
                      _ = tokio::time::sleep(std::time::Duration::from_millis(
                        pre_delay/2
                    )) => (),
                    _ = stop_receiver.recv() => {break;}
                    }
                } else {
                    select! {
                      _ = tokio::time::sleep(std::time::Duration::from_millis(
                        pre_delay
                    )) => (),
                    _ = stop_receiver.recv() => {break;}
                    }
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
                                    .map(|p| p.to_freq_pitch(100.).frequency())
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
        exciter.free();
        beam_setter.free();
        verb.free();
        outer_graph.free();
    });

    Ok(process)
}

fn bus(arg: usize) -> Handle<GenericHandle> {
    let id = knyst().push_without_inputs(Bus(arg));
    Handle::new(GenericHandle::new(id, arg, arg))
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

    let outer_graph_id = knyst().init_local_graph(knyst().default_graph_settings());
    let outer_graph_handle = knyst().upload_local_graph();
    graph_output(0, outer_graph_handle);
    knyst().to_graph(outer_graph_id);
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
    // knyst().to_graph(outer_graph);
    // knyst().init_local_graph(knyst().default_graph_settings());

    // // push graph to sphere
    // let graph = knyst().upload_local_graph();
    // knyst().to_graph(outer_graph);
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
    matrix: &[f64],
    reverb: bool,
    chord: &EdoChordSemantic,
) -> ProcessInteractivity {
    println!("Start waveguide segments");

    let process = ProcessInteractivity::new();
    let mut stop_receiver = process.stop_sender.subscribe();
    let mut chord_receiver = process.chord_sender.subscribe();
    let buffer = machine_code_to_buffer(trace, true).unwrap();
    println!("Buffer length: {}", buffer.length_seconds());
    let buffer = knyst().insert_buffer(buffer);

    let mut freqs: Vec<_> = chord
        .to_edo_chord()
        .to_edo_pitches()
        .into_iter()
        .map(|p| p.to_freq_pitch(100.).frequency())
        .collect();

    let mut interval_index = Arc::new(AtomicUsize::new(0));

    // .input(sig * 0.125);
    // .input(sig * 0.125 + graph_input(0, 1));
    {
        let stop_sender = process.stop_sender.clone();

        let chord_sender = process.chord_sender.clone();
        let beam_width_sender = process.beam_width_sender.clone();
        let matrix = matrix.to_vec();
        tokio::task::spawn(async move {
            let mut root = 4.0;
            let mut rng: StdRng = SeedableRng::from_entropy();
            knyst().to_top_level_graph();
            let outer_graph = upload_graph(knyst().default_graph_settings(), || {});
            graph_output(0, outer_graph);
            knyst().to_graph(outer_graph.graph_id());

            let main_env = envelope_gen(
                0.0,
                vec![(1.0, 2.0), (0.0, 5.0)],
                SustainMode::SustainAtPoint(0),
                StopAction::Continue,
            );

            let verb = luff_verb(1065 * 48, 0.29).lowpass(19000.).damping(10000.);
            let wave_movement_amp = sine().freq(0.1).range(0.02, 1.0).powf(2.0);
            graph_output(
                4,
                one_pole_hpf()
                    .sig(verb * wave_movement_amp)
                    .cutoff_freq(100.)
                    * main_env,
            );
            let beam_setter = bus(1).set(0, 0.5);
            let exciter = buffer_reader(
                buffer,
                // rng.gen_range(0.25..1.0),
                1.2,
                true,
                StopAction::FreeGraph,
            );
            let exciter_to_wg = one_pole_lpf().sig(exciter * 0.15).cutoff_freq(1000.);

            let mut stop_received = false;
            for _ in 0..4 {
                {
                    let root = root;
                    let freqs = freqs.clone();
                    let mut stop_receiver = stop_sender.subscribe();
                    let mut chord_receiver = chord_sender.subscribe();
                    let mut beam_receiver = beam_width_sender.subscribe();
                    let matrix = matrix.clone();
                    let interval_index = interval_index.clone();
                    tokio::task::spawn(async move {
                        let mut rng: StdRng = SeedableRng::from_entropy();
                        let mut gs = knyst().default_graph_settings();
                        gs.num_outputs = 1;
                        gs.num_inputs = 1;
                        knyst().to_graph(outer_graph.graph_id());
                        let mut wgs = vec![];
                        let inner_graph = upload_graph(gs, || {
                            let env = Envelope {
                                start_value: 0.0,
                                points: vec![(1.0, 0.01), (0.25, 0.1), (0.0, 0.5)],
                                ..Default::default()
                            };
                            // let feedback = random_lin().freq(0.1).powf(0.2)*0.1 + 0.901;
                            let feedback = 1.0001;
                            let freqs = if pass_through_trigger {
                                &freqs[..]
                            } else {
                                &freqs[0..1]
                            };
                            for &freq in freqs {
                                let freq = freq * root;
                                let exciter_to_wg = graph_input(0, 1);

                                let exciter_to_wg: AnyNodeHandle = if pass_through_trigger {
                                    // Take the interval times from the matrix
                                    let interval_time = if random_interval {
                                        rng.gen_range(1.0f32..2.0)
                                    } else {
                                        let i = interval_index.fetch_add(4, Ordering::SeqCst);
                                        let interval = matrix[i]
                                            + matrix[i + 32]
                                            + matrix[i + 64]
                                            + matrix[i + 96];
                                        interval as f32 + 0.1
                                        // 64. / 60.
                                    };
                                    (exciter_to_wg
                                        * handle(env.to_gen()).set(
                                            "restart",
                                            interval_trig().interval(interval_time),
                                        ))
                                    .into()
                                } else {
                                    exciter_to_wg.into()
                                };
                                let exciter_to_wg = one_pole_hpf().cutoff_freq(freq * 0.25).sig(
                                    one_pole_lpf().sig(&exciter_to_wg).cutoff_freq(freq * 2.0),
                                );
                                let wg = waveguide()
                                    .freq(freq)
                                    .exciter(exciter_to_wg)
                                    .feedback(feedback)
                                    // .feedback(1.001)
                                    .damping(freq * 9. + 2000.)
                                    .lf_damping(6.)
                                    .position(0.5)
                                    .stiffness(0.0);
                                wgs.push(wg);
                                let sig = wg * 0.3;
                                graph_output(0, sig);
                            }
                        });
                        knyst().to_graph(outer_graph.graph_id());
                        inner_graph.set(0, exciter_to_wg);
                        let g = inner_graph * (beam_setter + 0.01) * main_env;
                        if reverb {
                            verb.input(g);
                            graph_output(4, g * wave_movement_amp);
                        } else {
                            graph_output(4, one_pole_lpf().sig(g).cutoff_freq(6000.));
                        }
                        graph_output(4, g * (wave_movement_amp + 0.1));
                        loop {
                            tokio::select! {
                                new_chord = chord_receiver.recv() => {
                                    let new_freqs: Vec<_> = new_chord.unwrap()
                                        .to_edo_chord()
                                        .to_edo_pitches()
                                        .into_iter()
                                        .map(|p| p.to_freq_pitch(100.).frequency())
                                        .collect();
                                    for (freq, wg) in new_freqs.into_iter().zip(wgs.iter_mut()) {
                                        wg.freq(freq * root);
                                    }
                                },
                                beam = beam_receiver.recv() => {
                                    if let Ok(val) = beam{
                                        beam_setter.set(0, val.powi(2));
                                    }
                                }
                                _ = stop_receiver.recv() => {
                                    break
                                },
                            }
                        }
                    });
                }

                root *= 0.5;
                tokio::select! {
                    _ = tokio::time::sleep(Duration::from_secs(15)) => (),
                    _ = stop_receiver.recv() => {
                        stop_received = true;
                        break},
                }
                // Check for new chords since last time
                while let Ok(new_chord) = chord_receiver.try_recv() {
                    let new_freqs: Vec<_> = new_chord
                        .to_edo_chord()
                        .to_edo_pitches()
                        .into_iter()
                        .map(|p| p.to_freq_pitch(100.).frequency())
                        .collect();
                    freqs = new_freqs;
                }
            }

            knyst().to_top_level_graph();
            if !stop_received {
                stop_receiver.recv().await.ok();
            }
            // stop_sender.send(()).ok();
            main_env.release_trig();
            tokio::time::sleep(Duration::from_secs(20)).await;
            verb.free();
            outer_graph.free();
            knyst().remove_buffer(buffer);
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
                        if let Err(e) = sender.send(Messages::StartMovement(mvt as usize)) {
                            eprintln!("Error sending from OSC: {e}")
                        }
                    }
                    "/pulse" => {
                        let mut args = mess.args.unwrap().into_iter();
                        //
                        let pulse = args.next().unwrap().int().unwrap();
                        // eprintln!("Pulse: {pulse:?}");
                        if let Err(e) = sender.send(Messages::Pulse(pulse)) {
                            eprintln!("Error sending from OSC: {e}")
                        }
                    }
                    "/beam_width" => {
                        let mut args = mess.args.unwrap().into_iter();
                        //
                        let val = args.next().unwrap().float().unwrap();
                        eprintln!("Beam value: {val}");
                        if let Err(e) = sender.send(Messages::BeamWidth(val)) {
                            eprintln!("Error sending from OSC: {e}")
                        }
                    }
                    "/break" => {
                        //
                        eprintln!("break");
                        if let Err(e) = sender.send(Messages::Break) {
                            eprintln!("Error sending from OSC: {e}")
                        }
                    }
                    _ => (),
                }
            }
        }
    });

    Ok(())
}

async fn break_sines(
    chord: &EdoChordSemantic,
    last_trace: &str,
    huge_reverb: Handle<LuffVerbHandle>,
) -> ProcessInteractivity {
    let process = ProcessInteractivity::new();
    let mut stop_receiver = process.stop_sender.subscribe();
    let mut chord_receiver = process.chord_sender.subscribe();
    let mut beam_receiver = process.beam_width_sender.subscribe();

    let buffer = machine_code_to_buffer(last_trace, false).unwrap();
    let buffer = knyst().insert_buffer(buffer);

    knyst().to_top_level_graph();
    let outer_graph_id = knyst().init_local_graph(knyst().default_graph_settings());
    let outer_graph_handle = knyst().upload_local_graph();
    graph_output(0, outer_graph_handle);
    knyst().to_graph(outer_graph_id);

    // let main_env = Envelope {
    //     points: vec![(1.0, 2.0), (0.0, 5.0)],
    //     sustain: knyst::envelope::SustainMode::SustainAtPoint(0),
    //     ..Default::default()
    // };
    // let main_env = handle(main_env.to_gen());
    let main_env = envelope_gen(
        0.0,
        vec![(1.0, 2.0), (0.0, 5.0)],
        SustainMode::SustainAtPoint(0),
        StopAction::Continue,
    );
    let freqs: Vec<_> = chord
        .to_edo_chord()
        .to_edo_pitches()
        .into_iter()
        .map(|p| p.to_freq_pitch(200.).frequency())
        .collect();

    let beam_setter = bus(1).set(0, 0.5);

    let beam = lag().value(beam_setter).time(1.0);
    let mut sines = vec![];

    let trace_sound = buffer_reader(buffer, 0.5, true, StopAction::Continue);
    let trace_sound = one_pole_lpf().sig(trace_sound * 0.1).cutoff_freq(3600.);

    for i in 0..2 {
        let freq_mult = 2.0 * (1.0 + i as f32 * 0.005);
        let s0 = sine().freq(freqs[0] * freq_mult * (random_lin().freq(3.0) * 0.01 + 1.0));
        sines.push((s0, freq_mult, 0));
        let sig = s0
            * (sine().freq(random_lin().freq(0.1) * 8. + 2.) * beam + 1.0)
            * 0.1
            * random_lin().freq(0.2).powf(3.0);
        graph_output(1, sig * main_env);
        let freq_mult = 2.0 + i as f32 * 0.005;
        let s1 = sine().freq(freqs[2] * freq_mult);
        sines.push((s1, freq_mult, 2));
        let sig = s1
            * sine().freq(sine().freq((random_lin().freq(0.15) + 2.0) * 10. * beam) * beam + 1.0)
            * 0.1
            * random_lin().freq(0.5).powf(3.0);
        graph_output(2, sig * main_env);
        // let s2 = sine().freq(freqs[1] * 8.0);
        let s2 = waveguide()
            .freq(freqs[1] * (8.0 + i as f32 * 0.005))
            .damping(12000.)
            .exciter(white_noise() * 0.01 + trace_sound)
            .feedback(random_lin().freq(0.5).powf(2.0) * 0.1 + 1.0)
            // .feedback(1.001)
            .lf_damping(6.)
            .position(0.5)
            .stiffness(0.0);
        let sig = s2
            * (sine().freq((sine().freq(0.15) + 2.0) * 7. * beam) * beam + 1.0)
            * 0.1
            * beam
            * random_lin().freq(0.7).powf(2.0);
        graph_output(2, sig * main_env);
        // let s3 = sine().freq(freqs[1] * 4.0);
        // let sig = s3
        //     * (sine().freq((sine().freq(0.15) + 2.0) * 12. * beam) * beam + 1.0)
        //     * 0.1
        //     * (1.0 - beam);
        // graph_output(0, sig.repeat_outputs(1));
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
                    .map(|p| p.to_freq_pitch(200.).frequency())
                    .collect();
                for (sine, freq_mult, chord_note) in &mut sines {
                    sine.freq(freqs[*chord_note]* *freq_mult);
                }

                }
            },
            new_beam_value = beam_receiver.recv() => {
                if let Ok(v) = new_beam_value {
                    beam_setter.set(0, v);}
                }
            _ = stop_receiver.recv() => break,
            }
        }
        main_env.release_trig();
        println!("Releasing break sines");
        tokio::time::sleep(Duration::from_secs(10)).await;
        outer_graph_handle.free();
        println!("Break sines freed");
        knyst().remove_buffer(buffer);
    });

    process
}

async fn play_pulse(num: u32, chord: &EdoChordSemantic) -> ProcessInteractivity {
    let process = ProcessInteractivity::new();
    let mut stop_receiver = process.stop_sender.subscribe();
    let mut chord_receiver = process.chord_sender.subscribe();
    let mut beam_receiver = process.beam_width_sender.subscribe();

    knyst().to_top_level_graph();
    let outer_graph_id = knyst().init_local_graph(knyst().default_graph_settings());
    let outer_graph_handle = knyst().upload_local_graph();
    graph_output(0, outer_graph_handle);
    knyst().to_graph(outer_graph_id);

    // let main_env = Envelope {
    //     points: vec![(1.0, 2.0), (0.0, 5.0)],
    //     sustain: knyst::envelope::SustainMode::SustainAtPoint(0),
    //     ..Default::default()
    // };
    // let main_env = handle(main_env.to_gen());
    let amp = 1.0 / ((num % 3) as f32 + 1.0);
    let main_env = envelope_gen(
        0.0,
        vec![(amp.powi(2) * 0.5, 0.02), (0.0, 1.0)],
        SustainMode::NoSustain,
        StopAction::FreeGraph,
    );
    let freqs: Vec<_> = chord
        .to_edo_chord()
        .to_edo_pitches()
        .into_iter()
        .map(|p| p.to_freq_pitch(200.).frequency())
        .collect();

    let beam_setter = bus(1).set(0, 0.5);

    let beam = lag().value(beam_setter).time(1.0);
    let mut sines = vec![];

    for i in 0..2 {
        let freq_mult = 2.0 * (1.0 + i as f32 * 0.005);
        let s0 = sine().freq(freqs[0] * freq_mult * (random_lin().freq(3.0) * 0.01 + 1.0));
        sines.push((s0, freq_mult, 0));
        let sig = s0 * 0.1;
        graph_output(1, sig * main_env);
        let freq_mult = 2.0 + i as f32 * 0.005;
        let s1 = sine().freq(freqs[2] * freq_mult);
        sines.push((s1, freq_mult, 2));
        let sig = s1 * 0.1;
        graph_output(1, sig * main_env);
        // let s2 = sine().freq(freqs[1] * 8.0);
        let s2 = waveguide()
            .freq(freqs[1] * (8.0 + i as f32 * 0.005))
            .damping(12000.)
            .exciter(white_noise() * 0.01)
            .feedback(random_lin().freq(0.5).powf(2.0) * 0.1 + 1.0)
            // .feedback(1.001)
            .lf_damping(6.)
            .position(0.5)
            .stiffness(0.0);
        let sig =
            s2 * (sine().freq((sine().freq(0.15) + 2.0) * 7. * beam) * beam + 1.0) * 0.1 * beam;
        graph_output(1, sig * main_env);
        // let s3 = sine().freq(freqs[1] * 4.0);
        // let sig = s3
        //     * (sine().freq((sine().freq(0.15) + 2.0) * 12. * beam) * beam + 1.0)
        //     * 0.1
        //     * (1.0 - beam);
        // graph_output(0, sig.repeat_outputs(1));
    }

    tokio::task::spawn(async move {
        tokio::time::sleep(Duration::from_secs(3)).await;
        // outer_graph_handle.free();
        // println!("Pulse freed");
    });

    process
}
