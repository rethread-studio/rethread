use std::{ffi::OsStr, time::Duration};

use anyhow::Result;
use knyst::{handles::GenericHandle, knyst_commands, prelude::*, resources::BufferId};
use rand::{seq::SliceRandom, thread_rng};

use crate::sound_path;

pub struct SoundEffects {
    voice_focus: Vec<(String, BufferId)>,
    voice_movement: Vec<(i32, BufferId)>,
    bells_a: Vec<BufferId>,
    bells_b: Vec<BufferId>,
    out_bus: Handle<GenericHandle>,
}

impl SoundEffects {
    pub fn new(out_bus: Handle<GenericHandle>) -> Result<Self> {
        println!("Loading sound effects");
        let mut root_path = sound_path();
        root_path.push("voice/focus/");
        let mut voice_focus = Vec::new();
        for entry in std::fs::read_dir(root_path).unwrap() {
            let entry = entry?;
            let path = entry.path();
            if let Some("wav") = path.extension().and_then(OsStr::to_str) {
                let name = path.file_stem().unwrap().to_string_lossy().to_string();
                let sound_file = Buffer::from_sound_file(path)?;
                let buf = knyst_commands().insert_buffer(sound_file);
                voice_focus.push((name, buf));
            }
        }
        let mut root_path = sound_path();
        root_path.push("voice/movements/");
        let mut voice_movement = Vec::new();
        for entry in std::fs::read_dir(root_path).unwrap() {
            let entry = entry?;
            let path = entry.path();
            if let Some("wav") = path.extension().and_then(OsStr::to_str) {
                let name = path.file_stem().unwrap().to_string_lossy().to_string();
                let number = name.parse::<i32>().unwrap();
                let sound_file = Buffer::from_sound_file(path)?;
                let buf = knyst_commands().insert_buffer(sound_file);
                voice_movement.push((number, buf));
            }
        }
        let mut root_path = sound_path();
        root_path.push("bells/a/");
        let mut bells_a = Vec::new();
        for entry in std::fs::read_dir(root_path).unwrap() {
            let entry = entry?;
            let path = entry.path();
            if let Some("wav") = path.extension().and_then(OsStr::to_str) {
                let sound_file = Buffer::from_sound_file(path)?;
                let buf = knyst_commands().insert_buffer(sound_file);
                bells_a.push(buf);
            }
        }
        let mut root_path = sound_path();
        root_path.push("bells/b/");
        let mut bells_b = Vec::new();
        for entry in std::fs::read_dir(root_path).unwrap() {
            let entry = entry?;
            let path = entry.path();
            if let Some("wav") = path.extension().and_then(OsStr::to_str) {
                let sound_file = Buffer::from_sound_file(path)?;
                let buf = knyst_commands().insert_buffer(sound_file);
                bells_b.push(buf);
            }
        }
        Ok(Self {
            voice_focus,
            voice_movement,
            bells_a,
            bells_b,
            out_bus,
        })
    }
    pub fn play_bell_a(&self) {
        let mut rng = thread_rng();
        if let Some(buf) = self.bells_a.choose(&mut rng) {
            play_mono_sound_buffer(*buf, self.out_bus, 0.1);
        }
    }
    pub fn play_bell_b(&self) {
        let mut rng = thread_rng();
        if let Some(buf) = self.bells_b.choose(&mut rng) {
            play_mono_sound_buffer(*buf, self.out_bus, 0.1);
        }
    }
    pub fn play_movement_voice(&self, movement: i32) {
        if let Some((_mvt, buf)) = self.voice_movement.iter().find(|(mvt, _)| *mvt == movement) {
            play_mono_sound_buffer(*buf, self.out_bus, 0.05);
        }
    }
    pub fn play_focus_enabled(&self, category: impl Into<String>) {
        let category = category.into();
        if let Some((_, buf)) = self.voice_focus.iter().find(|(c, _)| *c == category) {
            let (_, focus) = self.voice_focus.iter().find(|(c, _)| c == "Focus").unwrap();
            let out_bus = self.out_bus;
            let buf = *buf;
            let focus = *focus;
            std::thread::spawn(move || {
                play_mono_sound_buffer(focus, out_bus, 0.05);
                std::thread::sleep(Duration::from_millis(1000));
                play_mono_sound_buffer(buf, out_bus, 0.05);
            });
        }
    }
    pub fn play_focus_disabled(&self) {
        if let Some((_, focus)) = self.voice_focus.iter().find(|(c, _)| c == "FocusDisabled") {
            play_mono_sound_buffer(*focus, self.out_bus, 0.05);
        } else {
            eprintln!("Warning: Couldn't find FocusDisabled");
        }
    }
}

fn play_mono_sound_buffer(buf: BufferId, out_bus: Handle<GenericHandle>, amp: f32) {
    knyst_commands().to_top_level_graph();
    let g = upload_graph(
        knyst_commands()
            .default_graph_settings()
            .num_inputs(0)
            .num_outputs(1),
        || {
            let buf = buffer_reader(buf, 1.0, false, knyst::gen::StopAction::FreeGraph);
            let sig = buf * amp;
            graph_output(0, sig);
        },
    );
    out_bus.set(0, g.channels(4));
}
