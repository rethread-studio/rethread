#[derive(Clone, Copy, Debug)]
pub struct Note {
    pub freq: f32,
    pub amp: f32,
    pub damping: f32,
    pub feedback: f32,
    pub stiffness: f32,
    pub hpf: f32,
    pub exciter_lpf: f32,
    pub exciter_amp: f32,
    pub position: f32,
}

impl Default for Note {
    fn default() -> Self {
        Self {
            freq: 220.,
            amp: 1.0,
            damping: 20000.,
            feedback: 0.999,
            stiffness: 0.0,
            hpf: 5.,
            exciter_lpf: 20000.,
            exciter_amp: 0.25,
            position: 0.2,
        }
    }
}
#[derive(Clone, Copy, Debug)]
pub struct NoteOpt {
    pub freq: Option<f32>,
    pub amp: Option<f32>,
    pub damping: Option<f32>,
    pub feedback: Option<f32>,
    pub stiffness: Option<f32>,
    pub hpf: Option<f32>,
    pub exciter_lpf: Option<f32>,
    pub exciter_amp: Option<f32>,
    pub position: Option<f32>,
}
impl NoteOpt {
    pub fn transfer_to_note(&self, note: &mut Note) {
        if let Some(freq) = self.freq {
            note.freq = freq;
        }
        if let Some(amp) = self.amp {
            note.amp = amp;
        }
        if let Some(damping) = self.damping {
            note.damping = damping;
        }
        if let Some(feedback) = self.feedback {
            note.feedback = feedback;
        }
        if let Some(stiffness) = self.stiffness {
            note.stiffness = stiffness;
        }
        if let Some(hpf) = self.hpf {
            note.hpf = hpf;
        }
        if let Some(exciter_lpf) = self.exciter_lpf {
            note.exciter_lpf = exciter_lpf;
        }
        if let Some(exciter_amp) = self.exciter_amp {
            note.exciter_amp = exciter_amp;
        }
        if let Some(position) = self.position {
            note.position = position;
        }
    }
}
impl From<Note> for NoteOpt {
    fn from(v: Note) -> Self {
        NoteOpt {
            freq: Some(v.freq),
            amp: Some(v.amp),
            damping: Some(v.damping),
            feedback: Some(v.feedback),
            stiffness: Some(v.stiffness),
            hpf: Some(v.hpf),
            exciter_lpf: Some(v.exciter_lpf),
            exciter_amp: Some(v.exciter_amp),
            position: Some(v.position),
        }
    }
}
impl Default for NoteOpt {
    fn default() -> Self {
        Self {
            freq: None,
            amp: None,
            damping: None,
            feedback: None,
            stiffness: None,
            hpf: None,
            exciter_lpf: None,
            exciter_amp: None,
            position: None,
        }
    }
}