use std::{
    sync::{atomic::AtomicU32, Arc, Mutex},
    time::{Duration, Instant},
};

use super::phrase::*;
use crate::{note::Note, to_freq53, Sonifier};
use atomic_float::AtomicF32;
use knyst::{
    controller::{schedule_bundle, CallbackHandle, KnystCommands, StartBeat},
    gen::filter::one_pole::{one_pole_lpf, OnePoleLpfHandle},
    graph::Time,
    handles::{GenericHandle, GraphHandle, HandleData, MulHandle},
    knyst,
    prelude::*,
    time::Superbeats,
};
use knyst_waveguide2::half_sine_wt;
use knyst_waveguide2::waveguide;

#[derive(Debug, Clone, Copy)]
struct Program {
    counter: u32,
    max_counter: u32,
    activity_value: f32,
}
impl Program {
    pub fn new() -> Self {
        Self {
            counter: 0,
            max_counter: 1,
            activity_value: 0.,
        }
    }
    pub fn register_call(&mut self) {
        self.counter += 1;
    }
    pub fn update_interval(&mut self) {
        if self.counter > self.max_counter {
            self.max_counter = self.counter;
        }
        let new_activity = self.counter as f32 / self.max_counter as f32;
        self.activity_value = self.activity_value * 0.9 + new_activity * 0.1;
        self.counter = 0;
    }
    pub fn activity_value(&self) -> f32 {
        self.activity_value.powf(0.3)
    }
}

#[derive(Debug, Clone, Copy)]
struct Activity {
    htop: Program,
    konqueror: Program,
    gedit: Program,
    thunderbird: Program,
    rhythmbox: Program,
    last_update: Instant,
    interval_duration: Duration,
}
impl Activity {
    pub fn new() -> Activity {
        Self {
            thunderbird: Program::new(),
            htop: Program::new(),
            konqueror: Program::new(),
            gedit: Program::new(),
            rhythmbox: Program::new(),
            last_update: Instant::now(),
            interval_duration: Duration::from_millis(50),
        }
    }
    pub fn update(&mut self) {
        if self.last_update.elapsed() >= self.interval_duration {
            self.last_update = Instant::now();
            self.thunderbird.update_interval();
            self.htop.update_interval();
            self.konqueror.update_interval();
            self.rhythmbox.update_interval();
            self.gedit.update_interval();
        }
    }
}

pub struct ProgramThemes {
    callbacks: Vec<CallbackHandle>,
    inner_graph: Handle<GraphHandle>,
    bus: Handle<GenericHandle>,
    lpf: Handle<OnePoleLpfHandle>,
    mul: Handle<MulHandle>,
    root: Arc<AtomicF32>,
    chord: Arc<AtomicU32>,
    activity: Arc<Mutex<Activity>>,
}

fn plucked_waveguide() -> Handle<GraphHandle> {
    upload_graph(
        knyst()
            .default_graph_settings()
            .num_inputs(7)
            .num_outputs(1),
        || {
            let freq = graph_input(0, 1);
            let exciter_trig = graph_input(1, 1);
            let position = graph_input(2, 1);
            let feedback = graph_input(3, 1);
            let amp = graph_input(4, 1);
            let exciter_lpf = graph_input(5, 1);
            let damping = graph_input(6, 1);
            let exciter = half_sine_wt()
                .freq(freq * 0.4837) // Nice for plucking low notes
                // .freq(control.out("freq") * 2.2837) /// Nice for high notes and especially sustained
                .amp(0.1)
                .restart(exciter_trig);
            let exciter_to_wg = one_pole_lpf().sig(exciter).cutoff_freq(exciter_lpf);
            let wg = waveguide()
                .exciter(exciter_to_wg)
                .freq(freq)
                .position(position)
                .feedback(feedback)
                .damping(damping)
                .lf_damping(10.);
            graph_output(0, wg * amp);
        },
    )
}

impl ProgramThemes {
    pub fn new(amp: f32) -> Self {
        println!("Creating ProgramThemes");
        knyst().change_musical_time_map(|mtm| {
            mtm.replace(0, knyst::scheduling::TempoChange::NewTempo { bpm: 80. })
        });
        let mut graph_settings = knyst().default_graph_settings();
        graph_settings.num_outputs = 4;
        graph_settings.num_inputs = 0;
        let inner_graph = upload_graph(graph_settings, || {});
        // let inner_graph = Graph::new(graph_settings);
        // let graph_id = inner_graph.id();
        // let inner_graph = k.push(inner_graph, inputs![]);
        // k.connect(inner_graph.to_graph_out().channels(4));
        graph_output(0, inner_graph);

        inner_graph.activate();
        let main_bus = bus(4);
        graph_output(0, main_bus);
        let lpf = one_pole_lpf().cutoff_freq(10000.);
        let amp_bus = bus(1).set(0, amp);
        let mul = lpf * amp_bus;
        main_bus.set(0, mul.channels(4));
        // k.connect(mul.to(&bus).channels(4).to_channel(0));
        // k.connect(bus.to_graph_out().channels(4).to_channel(0));
        inner_graph.activate();
        let wg_thunderbird = plucked_waveguide();
        inner_graph.activate();
        let wg_konqueror = plucked_waveguide();
        inner_graph.activate();
        let wg_htop = plucked_waveguide();
        inner_graph.activate();
        let wg_gedit = plucked_waveguide();
        lpf.sig(wg_gedit);
        lpf.sig(wg_konqueror);
        lpf.sig(wg_thunderbird);
        lpf.sig(wg_htop);

        let activity = Arc::new(Mutex::new(Activity::new()));

        let rng = fastrand::Rng::new();
        // let mut changes = SimultaneousChanges::duration_from_now(Duration::ZERO);
        // let freq = rng.f32() * 200. + 200.;
        // wg_thunderbird.trig(
        //     NoteOpt {
        //         freq: Some(freq),
        //         damping: Some(freq * 6.0),
        //         feedback: Some(0.9999),
        //         ..Default::default()
        //     },
        //     &mut changes,
        // );
        // k.schedule_changes(changes);

        let root = Arc::new(AtomicF32::new(25.));
        let chord = Arc::new(AtomicU32::new(0));

        let callback_root = root.clone();
        let callback_chord = chord.clone();
        let callback_activity = activity.clone();
        let mut i = 0;
        let callback = knyst().schedule_beat_callback(
            move |time, k| {
                // println!("Running callback {i}, time: {time:?}");
                i += 1;
                let root_freq = callback_root.load(std::sync::atomic::Ordering::Relaxed);
                let current_chord = callback_chord.load(std::sync::atomic::Ordering::Relaxed);
                let activity = callback_activity.lock().unwrap();
                // dbg!(&activity);
                {
                    let mut time = time;
                    let theme = thunderbird_theme();
                    let phrases = match current_chord {
                        0 => &theme.chord0_phrases,
                        1 => &theme.chord1_phrases,
                        _ => &theme.chord0_phrases,
                    };
                    let phrase = &phrases[rng.usize(..phrases.len())];
                    let a = activity.thunderbird.activity_value();
                    for event in phrase.events() {
                        if rng.f32() < a {
                            match event.kind {
                                NoteEventKind::Note(n) => {
                                    schedule_bundle(Time::Beats(time), || {
                                        let freq = to_freq53(n.0 + 53 * 4, root_freq);
                                        // let amp = n.1 * 0.5;
                                        let amp = n.1
                                            * (0.1 + (a.powf(1.5) * 0.5 + rng.f32() * 0.5) * 0.9);
                                        wg_thunderbird
                                            .set(0, freq) // freq
                                            .trig(1) // exciter trigger
                                            .set(2, 0.5) // position
                                            .set(3, 0.999) // feedback
                                            .set(4, amp) // amp
                                            .set(5, 2600.) // exciter_lpf
                                            .set(6, freq * (4.0 + amp * 16.)); // damping

                                        // wg_thunderbird.trig(
                                        //     Note {
                                        //         freq,
                                        //         amp,
                                        //         damping: freq * (4.0 + amp * 16.0),
                                        //         position: 0.5,
                                        //         feedback: 0.999,
                                        //         exciter_lpf: 2600.,
                                        //         ..Default::default()
                                        //     }
                                        //     .into(),
                                        // );
                                    });
                                }
                                NoteEventKind::Rest => (),
                            }
                        }
                        time += event.duration * Superbeats::from_beats(4);
                    }
                }
                {
                    let mut time = time;
                    let theme = konqueror_theme();
                    let phrases = match current_chord {
                        0 => &theme.chord0_phrases,
                        1 => &theme.chord1_phrases,
                        _ => &theme.chord0_phrases,
                    };
                    let phrase = &phrases[rng.usize(..phrases.len())];
                    for event in phrase.events() {
                        let a = activity.konqueror.activity_value();
                        if rng.f32() < a {
                            match event.kind {
                                NoteEventKind::Note(n) => {
                                    schedule_bundle(Time::Beats(time), || {
                                        let freq = to_freq53(n.0 + 53, root_freq);
                                        // let amp = n.1;
                                        let amp = n.1
                                            * (0.1 + (a.powf(1.5) * 0.5 + rng.f32() * 0.5) * 0.9);

                                        wg_konqueror
                                            .set(0, freq) // freq
                                            .trig(1) // exciter trigger
                                            .set(2, 0.5) // position
                                            .set(3, 0.999) //feedback
                                            .set(4, amp * 0.5) // amp
                                            .set(5, 1000.) // exciter lpf
                                            .set(6, freq * 8.); // damping
                                                                // wg_konqueror.trig(
                                                                //     Note {
                                                                //         freq,
                                                                //         amp: amp * 0.5,
                                                                //         damping: freq * 8.0,
                                                                //         position: 0.15,
                                                                //         feedback: 0.999,
                                                                //         exciter_lpf: 1000.,
                                                                //         ..Default::default()
                                                                //     }
                                                                //     .into(),
                                                                // );
                                    })
                                }
                                NoteEventKind::Rest => (),
                            }
                        }
                        time += event.duration * Superbeats::from_beats(4);
                    }
                }
                {
                    let mut time = time;
                    let theme = htop_theme();
                    let phrases = match current_chord {
                        0 => &theme.chord0_phrases,
                        1 => &theme.chord1_phrases,
                        _ => &theme.chord0_phrases,
                    };
                    let phrase = &phrases[rng.usize(..phrases.len())];
                    for event in phrase.events() {
                        let a = activity.htop.activity_value();
                        if rng.f32() < a {
                            match event.kind {
                                NoteEventKind::Note(n) => {
                                    schedule_bundle(Time::Beats(time), || {
                                        let freq = to_freq53(n.0 + 159, root_freq);
                                        let amp = n.1 * (0.1 + a.powf(0.5) * 0.9);
                                        let feedback = if event.duration
                                            > Superbeats::from_beats_f32(1. / 32.)
                                        {
                                            0.99999
                                        } else {
                                            0.98
                                        };

                                        wg_htop
                                            .set(0, freq) // freq
                                            .trig(1) // exciter trigger
                                            .set(2, 0.25) // position
                                            .set(3, feedback) //feedback
                                            .set(4, amp * 0.5) // amp
                                            .set(5, 1500.) // exciter lpf
                                            .set(6, freq * 10.); // damping
                                                                 // wg_htop.trig(
                                                                 //     Note {
                                                                 //         freq,
                                                                 //         amp: amp * 0.5,
                                                                 //         damping: freq * 10.0,
                                                                 //         position: 0.25,
                                                                 //         feedback,
                                                                 //         exciter_lpf: 1500.,
                                                                 //         ..Default::default()
                                                                 //     }
                                                                 //     .into(),
                                                                 // );
                                    });
                                }
                                NoteEventKind::Rest => (),
                            }
                        }
                        time += event.duration * Superbeats::from_beats(4);
                    }
                }
                {
                    let mut time = time;
                    let theme = gedit_theme();
                    let phrases = match current_chord {
                        0 => &theme.chord0_phrases,
                        1 => &theme.chord1_phrases,
                        _ => &theme.chord0_phrases,
                    };
                    let phrase = &phrases[rng.usize(..phrases.len())];
                    for event in phrase.events() {
                        let a = activity.gedit.activity_value().powf(0.5);
                        if rng.f32() < a {
                            match event.kind {
                                NoteEventKind::Note(n) => {
                                    schedule_bundle(Time::Beats(time), || {
                                        let freq = to_freq53(n.0 + 212 + 53, root_freq);
                                        let amp = n.1 * (0.1 + a.powf(0.5) * 0.8);
                                        let feedback = if event.duration
                                            > Superbeats::from_beats_f32(1. / 32.)
                                        {
                                            0.999999
                                        } else {
                                            0.98
                                        };
                                        wg_gedit
                                            .set(0, freq) // freq
                                            .trig(1) // exciter trigger
                                            .set(2, 0.5) // position
                                            .set(3, feedback) //feedback
                                            .set(4, amp * 0.5) // amp
                                            .set(5, 2500.) // exciter lpf
                                            .set(6, freq * 10.); // damping
                                                                 // wg_gedit.trig(
                                                                 //     Note {
                                                                 //         freq,
                                                                 //         amp: amp * 0.5,
                                                                 //         damping: freq * 10.0,
                                                                 //         position: 0.5,
                                                                 //         feedback,
                                                                 //         exciter_lpf: 2500.,
                                                                 //         ..Default::default()
                                                                 //     }
                                                                 //     .into(),
                                                                 // );
                                    });
                                }
                                NoteEventKind::Rest => (),
                            }
                        }
                        time += event.duration * Superbeats::from_beats(4);
                    }
                }
                Some(Superbeats::from_beats(2))
            },
            // TODO: Add support for starting a callback at the next matching beat pattern
            StartBeat::Multiple(Superbeats::from_beats(1)), // Time for the first time the
        );
        Self {
            callbacks: vec![callback],
            inner_graph,
            bus: main_bus,
            root,
            activity,
            lpf,
            mul,
            chord,
        }
    }
}

impl Sonifier for ProgramThemes {
    fn apply_osc_message(&mut self, m: nannou_osc::Message) {
        if m.addr == "/syscall" {
            let mut args = m.args.unwrap().into_iter();
            let _id = args.next().unwrap().int().unwrap();
            let _kind = args.next().unwrap().string().unwrap();
            let mut func_args = [0_i32; 3];
            func_args[0] = args.next().unwrap().int().unwrap();
            func_args[1] = args.next().unwrap().int().unwrap();
            func_args[2] = args.next().unwrap().int().unwrap();
            let _return_value = args.next().unwrap();
            let _returns_error = args.next().unwrap();
            let program = args.next().unwrap().string().unwrap();
            let mut activity = self.activity.lock().unwrap();
            match program.as_str() {
                "htop" => {
                    activity.htop.register_call();
                }
                "konqueror" => {
                    activity.konqueror.register_call();
                }
                "gedit" => {
                    activity.gedit.register_call();
                }
                "thunderbird" => {
                    activity.thunderbird.register_call();
                }
                "rhythmbox" => {
                    activity.rhythmbox.register_call();
                }
                _ => (),
            }
        } else if m.addr == "/syscall_analysis/per_kind_interval" {
        }
    }

    fn patch_to_fx_chain(&mut self, fx_chain: usize) {
        self.inner_graph.clear_graph_output_connections();
        graph_output(fx_chain * 4, self.inner_graph.channels(4));
    }

    fn change_harmony(&mut self, scale: &[i32], root: f32) {
        self.root.store(root, std::sync::atomic::Ordering::Relaxed);
        if scale[0] == 0 {
            self.chord.store(0, std::sync::atomic::Ordering::SeqCst);
        } else if scale[0] == 5 {
            self.chord.store(1, std::sync::atomic::Ordering::SeqCst);
        }
        // todo!()
    }

    fn update(&mut self, osc_sender: &mut nannou_osc::Sender<nannou_osc::Connected>) {
        // todo!()
        let mut activity = self.activity.lock().unwrap();
        activity.update();
    }

    fn free(&mut self) {
        for callback in self.callbacks.drain(..) {
            callback.free();
        }
        self.inner_graph.free();
        self.bus.free();
        self.lpf.free();
        self.mul.free();
    }
}

fn thunderbird_theme() -> Theme {
    let mut chord0_phrases = vec![];
    {
        let mut p = Phrase::new();
        p.push((1. / 16., (31, 0.5)));
        p.push((1. / 16., (26, 0.25)));
        p.push((1. / 16., (17, 0.25)));
        p.push((1. / 16., (0, 0.25)));
        p.push((1. / 4., (-5, 0.15)));
        chord0_phrases.push(p);
    }
    {
        let mut p = Phrase::new();
        p.push(1. / 16.);
        p.push((1. / 16., (0, 0.25)));
        p.push((1. / 16., (17, 0.35)));
        p.push((1. / 16., (26, 0.5)));
        p.push((1. / 16., (31, 0.25)));
        p.push((1. / 16., (26, 0.25)));
        p.push((1. / 16., (31, 0.25)));
        p.push((1. / 16., (48, 0.25)));
        chord0_phrases.push(p);
    }
    {
        let mut p = Phrase::new();
        p.push(1. / 8.);
        p.push((1. / 16., (-22, 0.35)));
        p.push((1. / 16., (-5, 0.25)));
        p.push((1. / 16., (0, 0.5)));
        p.push((1. / 16., (17, 0.15)));
        p.push((1. / 16., (26, 0.35)));
        p.push((1. / 16., (31, 0.25)));
        chord0_phrases.push(p);
    }
    let mut chord1_phrases = vec![];
    {
        let mut p = Phrase::new();
        p.push((1. / 16., (36, 0.5)));
        p.push((1. / 16., (22, 0.25)));
        p.push((1. / 16., (14, 0.25)));
        p.push((1. / 16., (5, 0.25)));
        p.push((1. / 4., (-53 + 49, 0.15)));
        chord1_phrases.push(p);
    }
    {
        let mut p = Phrase::new();
        p.push(1. / 8.);
        p.push((1. / 16., (-53 + 49, 0.35)));
        p.push((1. / 16., (5, 0.25)));
        p.push((1. / 16., (14, 0.5)));
        p.push((1. / 16., (36, 0.15)));
        p.push((1. / 8., (14, 0.35)));
        chord1_phrases.push(p);
    }
    {
        let mut p = Phrase::new();
        p.push(1. / 16.);
        p.push((1. / 16., (36, 0.25)));
        p.push((1. / 16., (14, 0.35)));
        p.push((1. / 16., (36, 0.5)));
        p.push((1. / 16., (14, 0.25)));
        p.push((1. / 16., (36, 0.25)));
        p.push((1. / 8., (14, 0.25)));
        chord1_phrases.push(p);
    }
    {
        let mut p = Phrase::new();
        p.push(1. / 8.);
        p.push((1. / 16., (5, 0.35)));
        p.push((1. / 16., (36, 0.25)));
        p.push((1. / 16., (5, 0.5)));
        p.push((1. / 16., (36, 0.15)));
        p.push((1. / 8., (5, 0.35)));
        chord1_phrases.push(p);
    }
    Theme {
        chord0_phrases,
        chord1_phrases,
    }
}

fn konqueror_theme() -> Theme {
    let mut chord0_phrases = vec![];
    {
        let mut p = Phrase::new();
        p.push(3. / 8.);
        p.push((1. / 8., (-22, 0.25)));
        p.push((1. / 4., (0, 0.5)));
        chord0_phrases.push(p);
    }
    {
        let mut p = Phrase::new();
        p.push(3. / 8.);
        p.push((1. / 8., (31, 0.25)));
        p.push((1. / 4., (53, 0.5)));
        chord0_phrases.push(p);
    }
    {
        let mut p = Phrase::new();
        p.push(3. / 8.);
        p.push((1. / 8., (31, 0.25)));
        p.push((1. / 4., (53 + 17, 0.5)));
        p.push((1. / 4., (48, 0.35)));
        chord0_phrases.push(p);
    }
    let mut chord1_phrases = vec![];
    {
        let mut p = Phrase::new();
        p.push(3. / 8.);
        p.push((1. / 8., (-53 + 22, 0.25)));
        p.push((1. / 4., (5, 0.5)));
        chord1_phrases.push(p);
    }
    {
        let mut p = Phrase::new();
        p.push(3. / 8.);
        p.push((1. / 8., (-53 + 49, 0.25)));
        p.push((1. / 4., (36, 0.5)));
        chord1_phrases.push(p);
    }
    {
        let mut p = Phrase::new();
        p.push(3. / 8.);
        p.push((1. / 8., (22, 0.25)));
        p.push((1. / 8., (49, 0.5)));
        p.push((1. / 4., (36, 0.35)));
        p.push((1. / 8., (14, 0.25)));
        chord1_phrases.push(p);
    }
    Theme {
        chord0_phrases,
        chord1_phrases,
    }
}

fn htop_theme() -> Theme {
    let mut chord0_phrases = vec![];
    {
        let mut p = Phrase::new();
        p.push((1. / 32., (-53 + 31, 0.55)));
        p.push((1. / 32., (0, 0.15)));
        p.push((1. / 32., (31, 0.35)));
        p.push((7. / 32., (0, 0.45)));
        p.push((1. / 32., (-53 + 31, 0.15)));
        p.push((1. / 32., (0, 0.25)));
        p.push((1. / 32., (31, 0.55)));
        p.push((3. / 32., (0, 0.35)));
        chord0_phrases.push(p);
    }
    {
        let mut p = Phrase::new();
        p.push((1. / 32., (-53 + 48, 0.55)));
        p.push((1. / 32., (17, 0.25)));
        p.push((1. / 32., (26, 0.35)));
        p.push((3. / 32., (17, 0.55)));
        chord0_phrases.push(p);
    }
    {
        let mut p = Phrase::new();
        p.push((1. / 32., (-53 + 31, 0.55)));
        p.push((1. / 32., (-53 + 48, 0.15)));
        p.push((1. / 32., (31, 0.35)));
        p.push((7. / 32., (-53 + 48, 0.45)));
        p.push((1. / 32., (-53 + 26, 0.15)));
        p.push((1. / 32., (-53 + 48, 0.25)));
        p.push((1. / 32., (17, 0.55)));
        p.push((3. / 32., (-53 + 48, 0.35)));
        chord0_phrases.push(p);
    }
    {
        let mut p = Phrase::new();
        p.push((1. / 32., (-53, 0.55)));
        p.push((1. / 32., (-53 + 31, 0.25)));
        p.push((1. / 32., (17, 0.35)));
        p.push((3. / 32., (-53 + 31, 0.55)));
        chord0_phrases.push(p);
    }
    let mut chord1_phrases = vec![];
    {
        let mut p = Phrase::new();
        p.push((1. / 32., (-53 + 49, 0.55)));
        p.push((1. / 32., (14, 0.25)));
        p.push((1. / 32., (22, 0.35)));
        p.push((5. / 32., (14, 0.55)));
        chord1_phrases.push(p);
    }
    {
        let mut p = Phrase::new();
        p.push((1. / 32., (-53 + 36, 0.55)));
        p.push((1. / 32., (14, 0.15)));
        p.push((1. / 32., (36, 0.35)));
        p.push((7. / 32., (14, 0.45)));
        p.push((1. / 32., (-53 + 36, 0.15)));
        p.push((1. / 32., (5, 0.25)));
        p.push((1. / 32., (36, 0.55)));
        p.push((3. / 32., (5, 0.35)));
        chord1_phrases.push(p);
    }
    {
        let mut p = Phrase::new();
        p.push((1. / 32., (-53 + 49, 0.55)));
        p.push((1. / 32., (22, 0.25)));
        p.push((1. / 32., (36, 0.35)));
        p.push((5. / 32., (22, 0.55)));
        chord1_phrases.push(p);
    }
    {
        let mut p = Phrase::new();
        p.push((1. / 32., (-53 + 36, 0.55)));
        p.push((1. / 32., (5, 0.15)));
        p.push((1. / 32., (36, 0.35)));
        p.push((7. / 32., (5, 0.45)));
        p.push((1. / 32., (-53 + 36, 0.15)));
        p.push((1. / 32., (14, 0.25)));
        p.push((1. / 32., (36, 0.55)));
        p.push((3. / 32., (14, 0.35)));
        chord1_phrases.push(p);
    }
    {
        let mut p = Phrase::new();
        p.push((1. / 32., (-53 + 49, 0.55)));
        p.push((1. / 32., (5, 0.15)));
        p.push((1. / 32., (14, 0.35)));
        p.push((7. / 32., (22, 0.45)));
        p.push((1. / 32., (5, 0.35)));
        p.push((1. / 32., (14, 0.25)));
        p.push((1. / 32., (22, 0.15)));
        p.push((3. / 32., (36, 0.55)));
        chord1_phrases.push(p);
    }

    Theme {
        chord0_phrases,
        chord1_phrases,
    }
}
fn gedit_theme() -> Theme {
    let mut chord0_phrases = vec![];
    {
        let mut p = Phrase::new();
        p.push(1. / 16.);
        p.push((1. / 16., (31, 0.25)));
        p.push((1. / 16., (17, 0.25)));
        p.push((1. / 16., (31, 0.25)));
        p.push((1. / 16., (9, 0.25)));
        p.push((1. / 16., (31, 0.25)));
        p.push((1. / 8., (0, 0.5)));
        chord0_phrases.push(p);
    }
    {
        let mut p = Phrase::new();
        p.push(1. / 16.);
        p.push((1. / 16., (31, 0.25)));
        p.push((1. / 16., (0, 0.45)));
        p.push((1. / 16., (31, 0.25)));
        p.push((1. / 16., (-53 + 48, 0.55)));
        chord0_phrases.push(p);
    }
    {
        let mut p = Phrase::new();
        p.push(1. / 16.);
        p.push((1. / 16., (31, 0.25)));
        p.push((1. / 16., (17, 0.35)));
        p.push((1. / 16., (26, 0.25)));
        p.push((1. / 16., (0, 0.45)));
        p.push((1. / 16., (26, 0.25)));
        p.push((1. / 16., (-53 + 48, 0.5)));
        p.push((1. / 16., (26, 0.25)));
        chord0_phrases.push(p);
    }
    {
        let mut p = Phrase::new();
        p.push(1. / 16.);
        p.push((1. / 16., (0, 0.25)));
        p.push((1. / 16., (-53 + 48, 0.35)));
        p.push((1. / 16., (0, 0.25)));
        p.push((1. / 16., (-53 + 31, 0.45)));
        p.push((1. / 16., (0, 0.25)));
        p.push((1. / 16., (-53 + 17, 0.5)));
        p.push((1. / 16., (0, 0.25)));
        chord0_phrases.push(p);
    }
    let mut chord1_phrases = vec![];
    {
        let mut p = Phrase::new();
        p.push(1. / 16.);
        p.push((1. / 16., (22, 0.25)));
        p.push((1. / 16., (14, 0.45)));
        p.push((1. / 16., (22, 0.25)));
        p.push((1. / 16., (5, 0.55)));
        chord1_phrases.push(p);
    }
    {
        let mut p = Phrase::new();
        p.push(1. / 16.);
        p.push((1. / 16., (31, 0.25)));
        p.push((1. / 16., (14, 0.35)));
        p.push((1. / 16., (31, 0.25)));
        p.push((1. / 16., (5, 0.45)));
        p.push((1. / 16., (31, 0.25)));
        p.push((1. / 16., (-53 + 49, 0.5)));
        p.push((1. / 16., (31, 0.25)));
        chord1_phrases.push(p);
    }
    {
        let mut p = Phrase::new();
        p.push(1. / 16.);
        p.push((1. / 16., (5, 0.25)));
        p.push((1. / 16., (-53 + 49, 0.35)));
        p.push((1. / 16., (5, 0.25)));
        p.push((1. / 16., (-53 + 36, 0.45)));
        p.push((1. / 16., (5, 0.25)));
        p.push((1. / 16., (-53 + 22, 0.5)));
        p.push((1. / 16., (5, 0.25)));
        chord1_phrases.push(p);
    }

    Theme {
        chord0_phrases,
        chord1_phrases,
    }
}

pub struct Theme {
    chord0_phrases: Vec<Phrase<(i32, f32)>>,
    chord1_phrases: Vec<Phrase<(i32, f32)>>,
}
