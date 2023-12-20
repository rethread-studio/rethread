use knyst::time::Superbeats;


pub struct Phrase<T> {
    events: Vec<NoteEvent<T>>,
}
impl<T> Phrase<T> {
    pub fn new() -> Self {
        Self { events: vec![] }
    }
    pub fn total_duration(&self) -> Superbeats {
        self.events.iter().map(|e| e.duration).sum()
    }
    pub fn events(&self) -> &Vec<NoteEvent<T>> {
        &self.events
    }
    pub fn events_mut(&mut self) -> &mut Vec<NoteEvent<T>> {
        &mut self.events
    }
    pub fn push(&mut self, ne: impl Into<NoteEvent<T>>) {
        self.events.push(ne.into());
    }
}

pub struct NoteEvent<T> {
    pub duration: Superbeats,
    pub kind: NoteEventKind<T>,
}
impl<T> Into<NoteEvent<T>> for (f32, T) {
    fn into(self) -> NoteEvent<T> {
        NoteEvent {
            duration: Superbeats::from_beats_f32(self.0),
            kind: NoteEventKind::Note(self.1),
        }
    }
}
impl<T> Into<NoteEvent<T>> for (u32, T) {
    fn into(self) -> NoteEvent<T> {
        NoteEvent {
            duration: Superbeats::from_beats(self.0),
            kind: NoteEventKind::Note(self.1),
        }
    }
}
impl<T> Into<NoteEvent<T>> for (Superbeats, T) {
    fn into(self) -> NoteEvent<T> {
        NoteEvent {
            duration: self.0,
            kind: NoteEventKind::Note(self.1),
        }
    }
}
impl<T> Into<NoteEvent<T>> for Superbeats {
    fn into(self) -> NoteEvent<T> {
        NoteEvent {
            duration: self,
            kind: NoteEventKind::Rest,
        }
    }
}
impl<T> Into<NoteEvent<T>> for f32 {
    fn into(self) -> NoteEvent<T> {
        NoteEvent {
            duration: Superbeats::from_beats_f32(self),
            kind: NoteEventKind::Rest,
        }
    }
}
pub enum NoteEventKind<T> {
    Rest,
    Note(T),
}

// How to play back?
//
// - Add playback of the entire phrase to the scheduler in a
// callback. The callback will be called by the Graph scheduler when it is close
// to the time for the next items to start. The callback will have the beat
// position offset of the next start. Callbacks are called a certain number of
// beats apart.
