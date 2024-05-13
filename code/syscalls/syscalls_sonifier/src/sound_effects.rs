use std::{ffi::OsStr, path::PathBuf, time::Duration};

use anyhow::{anyhow, Result};
use knyst::{handles::GenericHandle, knyst_commands, prelude::*, resources::BufferId};
use rand::{seq::SliceRandom, thread_rng, Rng};

use crate::sound_path;

#[derive(Clone)]
pub struct SoundEffects {
    voice_focus: Vec<(String, BufferId)>,
    voice_movement: Vec<(i32, BufferId)>,
    end_movement_voices: Option<BufferId>,
    bells_a: Vec<BufferId>,
    bells_b: Vec<BufferId>,
    out_bus: Handle<GenericHandle>,
}

fn load_movement_wav(path: &PathBuf) -> Result<(i32, BufferId)> {
    let name = path
        .file_stem()
        .ok_or(anyhow!("No file stem in movement wav path"))?
        .to_string_lossy()
        .to_string();
    let number = name.parse::<i32>()?;
    let sound_file = Buffer::from_sound_file(path)?;
    let buf = knyst_commands().insert_buffer(sound_file);
    Ok((number, buf))
}
fn load_focus_wav(path: &PathBuf) -> Result<(String, BufferId)> {
    let name = path
        .file_stem()
        .ok_or(anyhow!("No file stem in focus wav path"))?
        .to_string_lossy()
        .to_string();

    let sound_file = Buffer::from_sound_file(path)?;
    let buf = knyst_commands().insert_buffer(sound_file);
    Ok((name, buf))
}

impl SoundEffects {
    pub fn new(out_bus: Handle<GenericHandle>) -> Result<Self> {
        println!("Loading sound effects");
        let mut root_path = sound_path();
        root_path.push("voice/focus/");
        let mut voice_focus = Vec::new();

        let Ok(read_dir) = std::fs::read_dir(root_path.clone()) else {
            return Err(anyhow!("Failed to open {:?}", root_path));
        };
        for entry in read_dir {
            let entry = entry?;
            let path = entry.path();
            if let Some("wav") = path.extension().and_then(OsStr::to_str) {
                if let Ok((name, buf)) = load_focus_wav(&path) {
                    voice_focus.push((name, buf));
                }
            }
        }
        let mut root_path = sound_path();
        root_path.push("voice/movements/");
        let mut voice_movement = Vec::new();
        let Ok(read_dir) = std::fs::read_dir(root_path.clone()) else {
            return Err(anyhow!("Failed to open {:?}", root_path));
        };
        for entry in read_dir {
            let entry = entry?;
            let path = entry.path();
            if let Some("wav") = path.extension().and_then(OsStr::to_str) {
                if let Ok((number, buf)) = load_movement_wav(&path) {
                    voice_movement.push((number, buf));
                }
            }
        }
        let mut root_path = sound_path();
        root_path.push("bells/a/");
        let mut bells_a = Vec::new();
        let Ok(read_dir) = std::fs::read_dir(root_path.clone()) else {
            return Err(anyhow!("Failed to open {:?}", root_path));
        };
        for entry in read_dir {
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
        let Ok(read_dir) = std::fs::read_dir(root_path.clone()) else {
            return Err(anyhow!("Failed to open {:?}", root_path));
        };
        for entry in read_dir {
            let entry = entry?;
            let path = entry.path();
            if let Some("wav") = path.extension().and_then(OsStr::to_str) {
                let sound_file = Buffer::from_sound_file(path)?;
                let buf = knyst_commands().insert_buffer(sound_file);
                bells_b.push(buf);
            }
        }
        let mut root_path = sound_path();
        root_path.push("end_movement_voices.wav");
        let end_movement_voices = if let Ok(sound_file) = Buffer::from_sound_file(root_path.clone())
        {
            Some(knyst_commands().insert_buffer(sound_file))
        } else {
            eprintln!(
                "Failed to load end_movement_voices.wav at path {:?}",
                root_path
            );
            None
        };

        Ok(Self {
            voice_focus,
            voice_movement,
            bells_a,
            bells_b,
            out_bus,
            end_movement_voices,
        })
    }
    pub fn play_bell_a(&self) {
        let mut rng = thread_rng();
        if let Some(buf) = self.bells_a.choose(&mut rng) {
            play_mono_sound_buffer(*buf, self.out_bus, 0.25);
        }
    }
    pub fn play_bell_b(&self) {
        let mut rng = thread_rng();
        if let Some(buf) = self.bells_b.choose(&mut rng) {
            play_mono_sound_buffer(*buf, self.out_bus, 0.1);
        }
    }
    pub fn play_movement_voice(&self, movement: i32, mvt_before_duration: f32) {
        if let Some((_mvt, buf)) = self.voice_movement.iter().find(|(mvt, _)| *mvt == movement) {
            let out_bus = self.out_bus;
            let buf = *buf;
            std::thread::spawn(move || {
                std::thread::sleep(Duration::from_secs_f32(mvt_before_duration-buf.duration().to_seconds_f64() as f32));
            play_mono_sound_buffer(buf, out_bus, 0.05);
            });
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
                play_mono_sound_buffer(buf, out_bus, 0.08);
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
    pub fn play_end_movement_effects(&self, duration_secs: f32) {
        if let Some(buf) = self.end_movement_voices {
            play_mono_sound_buffer_end_ramp(buf, self.out_bus, 0.3, buf.duration());
        } else {
            eprintln!("end_movement_voices was never loaded");
        }

        // let s = self.clone();
        // std::thread::spawn(move || {
        //     let mut rng = thread_rng();
        //     std::thread::sleep(Duration::from_secs_f32(3.));
        //     let num_bufs = s.voice_movement.len() as f32;
        //     for (i, (_, buf)) in s.voice_movement.iter().enumerate() {
        //         let gap = rng.gen_range(0.3..0.4) * (3.0 - (i as f32 / num_bufs) * 2.5);
        //         play_mono_sound_buffer(*buf, s.out_bus, 0.05);
        //         std::thread::sleep(Duration::from_secs_f32(gap));
        //     }
        // });
        let s = self.clone();
        std::thread::spawn(move || {
            std::thread::sleep(Duration::from_secs_f32(duration_secs));
            println!("Playing end bell now");
            s.play_bell_a();
        });
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

fn play_mono_sound_buffer_end_ramp(buf: BufferId, out_bus: Handle<GenericHandle>, amp: f32, duration: Seconds) {
    knyst_commands().to_top_level_graph();
    let g = upload_graph(
        knyst_commands()
            .default_graph_settings()
            .num_inputs(0)
            .num_outputs(1),
        || {
            let buf = buffer_reader(buf, 1.0, false, knyst::gen::StopAction::FreeGraph);
            let sig = buf * exp_line_segment(amp, amp*1.5, duration );
            graph_output(0, sig);
        },
    );
    out_bus.set(0, g.channels(4));
}