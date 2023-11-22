use std::time::Duration;

use knyst_waveguide::interface::NoteOpt;
use rand::random;

use crate::{asm_data::AsmFunction, Sonifier};

#[derive(Clone)]
pub struct Gesture {
    pub function_name: String,
    events: Vec<Event>,
}
impl Gesture {
    pub fn from_asm_function(f: &AsmFunction) -> Self {
        let function_name = f.name.clone();
        let mut events = Vec::with_capacity(f.instructions.len());
        let step_per_instruction = 1.0 / f.instructions.len() as f32;
        for (i, ins) in f.instructions.iter().enumerate() {
            let mut jump_to_other = None;
            let mut note = match ins.instruction.as_str() {
                "mov" => note()
                    .degree_53(53.0 * (ins.arguments.len() as f32 - 1.))
                    .damping_from_freq(8.0, 200.)
                    .feedback(0.99)
                    .into(),
                "movaps" => note()
                    .degree_53(53.0 - 17.)
                    .damping_from_freq(10.0, 200.)
                    .position(0.2)
                    .into(),
                "subss" => note()
                    .degree_53(53.0 + 14.)
                    .damping_from_freq(10.0, 200.)
                    .position(0.2)
                    .into(),
                "shufps" => note()
                    .degree_53(53.0)
                    .damping_from_freq(10.0, 200.)
                    .position(0.2)
                    .into(),
                "mulss" => note()
                    .degree_53(53.0 + 17.)
                    .damping_from_freq(8.0, 200.)
                    .position(0.5)
                    .into(),
                "divss" => note()
                    .degree_53(-17.)
                    .damping_from_freq(16.0, 2000.)
                    .feedback(0.9999)
                    .position(0.15)
                    .into(),
                "jmp" | "je" | "jnp" | "jb" | "jne" => note()
                    .degree_53(53.0 + 31.)
                    .damping_from_freq(20.0, 200.)
                    .feedback(1.001)
                    .position(0.1)
                    .into(),
                "call" => note()
                    .degree_53(53.0 + 31. + 17.)
                    .damping_from_freq(20.0, 200.)
                    .feedback(1.001)
                    .position(0.2)
                    .into(),
                "lea" => NoteOpt {
                    freq: Some(220.0),
                    ..Default::default()
                },
                "add" => note()
                    .degree_53(31. + 31.)
                    .damping_from_freq(7.0, 200.)
                    .feedback(0.9999)
                    .position(0.3)
                    .into(),
                "xor" => NoteOpt {
                    freq: Some(220.0),
                    position: Some(0.1),
                    ..Default::default()
                },
                "cmp" => note()
                    .degree_53(31. + 31.)
                    .damping_from_freq(7.0, 200.)
                    .feedback(0.9999)
                    .position(0.3)
                    .into(),
                _ => NoteOpt::default(),
            };
            note.exciter_amp = Some((i as f32 * step_per_instruction).powi(2) * 0.25 + 0.01);
            // note.exciter_lpf = Some(2500.);
            if let Some(f) = &note.freq {
                note.exciter_lpf = Some(f * 6.0);
                note.freq = Some(f * 2.0);
            }
            match ins.instruction.as_str() {
                "jne" | "jnp" | "je" | "jb" => {
                    jump_to_other = Some(Jump {
                        conditional: true,
                        label: ins.arguments[0].clone(),
                    });
                }
                "jmp" => {
                    jump_to_other = Some(Jump {
                        conditional: false,
                        label: ins.arguments[0].clone(),
                    });
                }
                "call" => {
                    jump_to_other = Some(Jump {
                        conditional: false,
                        label: ins.arguments[0].clone(),
                    });
                }
                _ => (),
            }
            // if let Some(j) = &jump_to_other {
            //     println!("{j:?}, this function: {function_name}");
            // }
            let e = Event {
                note,
                duration_to_next: Duration::from_millis(if jump_to_other.is_some() {
                    400
                } else {
                    100
                }),
                jump_to_other,
            };
            events.push(e);
        }
        Self {
            function_name,
            events,
        }
    }
    pub fn play(&self, s: &mut Sonifier) -> Option<Jump> {
        for e in &self.events {
            s.play_note(e.note);
            std::thread::sleep(e.duration_to_next);
            if let Some(j) = &e.jump_to_other {
                if j.conditional {
                    if random::<f32>() > 0.5 {
                        return Some(j.clone());
                    }
                } else {
                    return Some(j.clone());
                }
            }
        }
        None
    }
}

#[derive(Clone, Debug)]
pub struct Event {
    note: NoteOpt,
    duration_to_next: Duration,
    /// If the function contains a jump instruction, the target of that is recorded here
    jump_to_other: Option<Jump>,
}

#[derive(Clone, Debug)]
pub struct Jump {
    pub conditional: bool,
    pub label: String,
}

pub struct Note {
    n: NoteOpt,
}
impl Note {
    pub fn freq(mut self, freq: f32) -> Self {
        self.n.freq = Some(freq);
        self
    }
    pub fn degree_53(mut self, degree: f32) -> Self {
        let freq = 2.0_f32.powf(degree / 53.0) * 440.0 / 8.0;
        self.n.freq = Some(freq);
        self
    }
    pub fn position(mut self, pos: f32) -> Self {
        self.n.position = Some(pos);
        self
    }
    pub fn feedback(mut self, feedback: f32) -> Self {
        self.n.feedback = Some(feedback);
        self
    }
    pub fn damping(mut self, damping: f32) -> Self {
        self.n.damping = Some(damping);
        self
    }
    pub fn exciter_amp(mut self, amp: f32) -> Self {
        self.n.exciter_amp = Some(amp * 0.25 + 0.01);
        self
    }
    pub fn damping_from_freq(mut self, mul: f32, add: f32) -> Self {
        let freq = self.n.freq.unwrap_or(100.0);
        let damping = freq * mul + add;
        self.n.damping = Some(damping);
        self
    }
}

pub fn note() -> Note {
    Note {
        n: NoteOpt::default(),
    }
}

impl Into<NoteOpt> for Note {
    fn into(self) -> NoteOpt {
        self.n
    }
}
