use std::{
    sync::{Arc, Mutex},
    time::Duration,
};

use crate::{to_freq53, Sonifier};
use atomic_float::AtomicF32;
use knyst::{
    controller::{CallbackHandle, KnystCommands},
    graph::{Bus, NodeAddress, SimultaneousChanges},
    prelude::*,
    time::Superbeats,
};
use knyst_waveguide::interface::{Note, NoteOpt, PluckedWaveguide, Synth, TriggeredSynth};
use knyst_waveguide::phrase::*;

#[derive(Debug, Clone, Copy)]
struct Activity {
    thunderbird: f32,
    htop: f32,
    konqueror: f32,
    gedit: f32,
    rhythmbox: f32,
}
impl Activity {
    pub fn new() -> Activity {
        Self {
            thunderbird: 0.,
            htop: 0.,
            konqueror: 0.,
            gedit: 0.,
            rhythmbox: 0.,
        }
    }
}

pub struct ProgramThemes {
    callbacks: Vec<CallbackHandle>,
    inner_graph: NodeAddress,
    bus: NodeAddress,
    root: Arc<AtomicF32>,
    activity: Arc<Mutex<Activity>>,
    k: KnystCommands,
}

impl ProgramThemes {
    pub fn new(k: &mut KnystCommands) -> Self {
        k.change_musical_time_map(|mtm| {
            mtm.replace(0, knyst::scheduling::TempoChange::NewTempo { bpm: 80. })
        });
        let mut graph_settings = k.default_graph_settings();
        graph_settings.num_outputs = 4;
        graph_settings.num_inputs = 0;
        let inner_graph = Graph::new(graph_settings);
        let graph_id = inner_graph.id();
        let inner_graph = k.push(inner_graph, inputs![]);
        k.connect(inner_graph.to_graph_out().channels(4));
        let mut k = k.to_graph(graph_id);
        let bus = k.push(Bus(4), inputs![]);
        k.connect(bus.to_graph_out().channels(4).to_channel(0));
        let mut wg_thunderbird = PluckedWaveguide::new(&mut k, None, false);
        let mut wg_konqueror = PluckedWaveguide::new(&mut k, None, false);
        let mut wg_htop = PluckedWaveguide::new(&mut k, None, false);

        for out in wg_thunderbird.outputs() {
            k.connect(out.to_node(&bus).channels(4));
        }
        for out in wg_konqueror.outputs() {
            k.connect(out.to_node(&bus).channels(4));
        }
        for out in wg_htop.outputs() {
            k.connect(out.to_node(&bus).channels(4));
        }

        let activity = Arc::new(Mutex::new(Activity::new()));

        let rng = fastrand::Rng::new();
        let mut changes = SimultaneousChanges::duration_from_now(Duration::ZERO);
        let freq = rng.f32() * 200. + 200.;
        wg_thunderbird.trig(
            NoteOpt {
                freq: Some(freq),
                damping: Some(freq * 6.0),
                feedback: Some(0.9999),
                ..Default::default()
            },
            &mut changes,
        );
        k.schedule_changes(changes);

        let root = Arc::new(AtomicF32::new(25.));
        let phrases = thunderbird_phrases();

        let callback_root = root.clone();
        let callback_activity = activity.clone();
        let callback = k.schedule_beat_callback(
            move |mut time, k| {
                println!("Running callback");
                let root_freq = callback_root.load(std::sync::atomic::Ordering::Relaxed);
                let activity = callback_activity.lock().unwrap();
                dbg!(&activity);
                {
                    let mut time = time;
                    let phrase = &phrases[rng.usize(..phrases.len())];
                    for event in phrase.events() {
                        if rng.f32() < activity.thunderbird {
                            match event.kind {
                                NoteEventKind::Note(n) => {
                                    let mut changes = SimultaneousChanges::beats(time);
                                    let freq = to_freq53(n.0 + 53 * 4, root_freq);
                                    let amp = n.1 * 0.5;
                                    wg_thunderbird.trig(
                                        Note {
                                            freq,
                                            amp,
                                            damping: freq * (4.0 + amp * 16.0),
                                            position: 0.5,
                                            feedback: 0.999,
                                            exciter_lpf: 2600.,
                                            ..Default::default()
                                        }
                                        .into(),
                                        &mut changes,
                                    );
                                    k.schedule_changes(changes);
                                }
                                NoteEventKind::Rest => (),
                            }
                        }
                        time += event.duration * Superbeats::from_beats(4);
                    }
                }
                {
                    let mut time = time;
                    let phrase = &konqueror_phrases()[rng.usize(..konqueror_phrases().len())];
                    for event in phrase.events() {
                        if rng.f32() < activity.konqueror {
                            match event.kind {
                                NoteEventKind::Note(n) => {
                                    let mut changes = SimultaneousChanges::beats(time);
                                    let freq = to_freq53(n.0 + 53, root_freq);
                                    let amp = n.1;
                                    wg_konqueror.trig(
                                        Note {
                                            freq,
                                            amp: amp * 0.5,
                                            damping: freq * 8.0,
                                            position: 0.15,
                                            feedback: 0.999,
                                            exciter_lpf: 1000.,
                                            ..Default::default()
                                        }
                                        .into(),
                                        &mut changes,
                                    );
                                    k.schedule_changes(changes);
                                }
                                NoteEventKind::Rest => (),
                            }
                        }
                        time += event.duration * Superbeats::from_beats(4);
                    }
                }
                {
                    let mut time = time;
                    let phrase = &htop_phrases()[rng.usize(..htop_phrases().len())];
                    for event in phrase.events() {
                        if rng.f32() < activity.htop {
                            match event.kind {
                                NoteEventKind::Note(n) => {
                                    let mut changes = SimultaneousChanges::beats(time);
                                    let freq = to_freq53(n.0 + 159, root_freq);
                                    let amp = n.1;
                                    let feedback =
                                        if event.duration > Superbeats::from_beats_f32(1. / 32.) {
                                            0.99999
                                        } else {
                                            0.9
                                        };
                                    wg_htop.trig(
                                        Note {
                                            freq,
                                            amp: amp * 0.5,
                                            damping: freq * 10.0,
                                            position: 0.25,
                                            feedback,
                                            exciter_lpf: 1500.,
                                            ..Default::default()
                                        }
                                        .into(),
                                        &mut changes,
                                    );
                                    k.schedule_changes(changes);
                                }
                                NoteEventKind::Rest => (),
                            }
                        }
                        time += event.duration * Superbeats::from_beats(4);
                    }
                }
                Some(Superbeats::from_beats(2))
            },
            Superbeats::from_beats(1), // Time for the first time the
        );
        Self {
            callbacks: vec![callback],
            inner_graph,
            k,
            bus,
            root,
            activity,
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
                    activity.htop += 0.001;
                }
                "konqueror" => {
                    activity.konqueror += 0.01;
                }
                "gedit" => {
                    activity.gedit += 0.0001;
                }
                "thunderbird" => {
                    activity.thunderbird += 0.001;
                }
                "rhythmbox" => {
                    activity.rhythmbox += 0.0001;
                }
                _ => (),
            }
        }
    }

    fn patch_to_fx_chain(&mut self, fx_chain: usize) {
        self.k
            .connect(Connection::clear_to_graph_outputs(&self.inner_graph));
        self.k.connect(
            self.inner_graph
                .to_graph_out()
                .channels(4)
                .to_channel(fx_chain * 4),
        );
    }

    fn change_harmony(&mut self, scale: &[i32], root: f32) {
        self.root.store(root, std::sync::atomic::Ordering::Relaxed);
        // todo!()
    }

    fn update(&mut self, osc_sender: &mut nannou_osc::Sender<nannou_osc::Connected>) {
        // todo!()
        let mut activity = self.activity.lock().unwrap();
        let coeff = 0.99999;
        activity.gedit *= coeff;
        activity.thunderbird *= coeff;
        activity.konqueror *= coeff;
        activity.rhythmbox *= coeff;
        activity.htop *= coeff;
    }

    fn free(&mut self) {
        for callback in self.callbacks.drain(..) {
            callback.free();
        }
        self.k.free_node(self.inner_graph.clone());
        self.k.free_node(self.bus.clone());
    }
}

fn thunderbird_phrases() -> Vec<Phrase<(i32, f32)>> {
    let mut phrases = vec![];
    {
        let mut p = Phrase::new();
        p.push((1. / 16., (31, 0.5)));
        p.push((1. / 16., (26, 0.25)));
        p.push((1. / 16., (17, 0.25)));
        p.push((1. / 16., (0, 0.25)));
        p.push((1. / 4., (-5, 0.15)));
        phrases.push(p);
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
        phrases.push(p);
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
        phrases.push(p);
    }
    phrases
}

fn konqueror_phrases() -> Vec<Phrase<(i32, f32)>> {
    let mut phrases = vec![];
    {
        let mut p = Phrase::new();
        p.push(3. / 8.);
        p.push((1. / 8., (-22, 0.25)));
        p.push((1. / 4., (0, 0.5)));
        phrases.push(p);
    }
    {
        let mut p = Phrase::new();
        p.push(3. / 8.);
        p.push((1. / 8., (31, 0.25)));
        p.push((1. / 4., (53, 0.5)));
        phrases.push(p);
    }
    {
        let mut p = Phrase::new();
        p.push(3. / 8.);
        p.push((1. / 8., (31, 0.25)));
        p.push((1. / 4., (53 + 17, 0.5)));
        p.push((1. / 4., (48, 0.35)));
        phrases.push(p);
    }
    phrases
}

fn htop_phrases() -> Vec<Phrase<(i32, f32)>> {
    let mut phrases = vec![];
    {
        let mut p = Phrase::new();
        p.push((1. / 32., (-53 + 31, 0.25)));
        p.push((1. / 32., (0, 0.25)));
        p.push((1. / 32., (31, 0.25)));
        p.push((7. / 32., (0, 0.25)));
        p.push((1. / 32., (-53 + 31, 0.25)));
        p.push((1. / 32., (0, 0.25)));
        p.push((1. / 32., (31, 0.25)));
        p.push((3. / 32., (0, 0.25)));
        phrases.push(p);
    }
    {
        let mut p = Phrase::new();
        p.push((1. / 32., (-53 + 48, 0.25)));
        p.push((1. / 32., (17, 0.25)));
        p.push((1. / 32., (26, 0.25)));
        p.push((3. / 32., (17, 0.25)));
        phrases.push(p);
    }
    {
        let mut p = Phrase::new();
        p.push((1. / 32., (-53 + 31, 0.25)));
        p.push((1. / 32., (-53 + 48, 0.25)));
        p.push((1. / 32., (31, 0.25)));
        p.push((7. / 32., (-53 + 48, 0.25)));
        p.push((1. / 32., (-53 + 26, 0.25)));
        p.push((1. / 32., (-53 + 48, 0.25)));
        p.push((1. / 32., (17, 0.25)));
        p.push((3. / 32., (-53 + 48, 0.25)));
        phrases.push(p);
    }
    {
        let mut p = Phrase::new();
        p.push((1. / 32., (-53, 0.25)));
        p.push((1. / 32., (-53 + 31, 0.25)));
        p.push((1. / 32., (17, 0.25)));
        p.push((3. / 32., (-53 + 31, 0.25)));
        phrases.push(p);
    }
    phrases
}
