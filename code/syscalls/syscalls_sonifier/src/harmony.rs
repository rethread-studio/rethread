pub struct HarmonicChange {
    new_chord: Option<Vec<i32>>,
    transposition: Option<i32>,
}
impl HarmonicChange {
    pub fn new() -> Self {
        Self {
            new_chord: None,
            transposition: None,
        }
    }
    pub fn transpose(mut self, interval: i32) -> Self {
        self.transposition = Some(interval);
        self
    }
    pub fn new_chord(mut self, chord: Vec<i32>) -> Self {
        self.new_chord = Some(chord);
        self
    }
    pub fn apply(
        &self,
        current_chord: &mut Vec<i32>,
        current_root: &mut i32,
        transposition_within_octave_guard: bool,
    ) {
        if let Some(transposition) = self.transposition {
            *current_root += transposition;
            if transposition_within_octave_guard {
                *current_root = (*current_root + 53) % 53;
            }
        }
        if let Some(new_chord) = &self.new_chord {
            *current_chord = new_chord.clone();
        }
    }
}
