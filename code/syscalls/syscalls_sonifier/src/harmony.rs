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

pub fn default_harmonic_changes() -> Vec<HarmonicChange> {
    let chord_maj7sharp11 = vec![0, 17, 31, 48, 53, 53 + 26, 53 + 31];
    let chord_9 = vec![0 + 5, 17 + 5, 31 + 5, 44 + 5, 53 + 5, 62 + 5, 53 + 17 + 5];
    vec![
        HarmonicChange::new().transpose(5),
        HarmonicChange::new()
            .new_chord(chord_9.clone())
            .transpose(-5),
        HarmonicChange::new()
            .new_chord(chord_maj7sharp11.clone())
            .transpose(5),
        HarmonicChange::new().transpose(5),
        HarmonicChange::new()
            .new_chord(chord_9.clone())
            .transpose(9),
        HarmonicChange::new().new_chord(chord_maj7sharp11.clone()),
    ]
}
// Alternative harmonic changes for random mode
pub fn ii_v_i_harmonic_changes() -> Vec<HarmonicChange> {
    vec![
        HarmonicChange::new().transpose(22),
        HarmonicChange::new().transpose(-31),
        HarmonicChange::new().transpose(22),
        HarmonicChange::new().transpose(-5),
    ]
}

pub fn spicier_harmonies() -> Vec<HarmonicChange> {
    let chord_maj7sharp11 = vec![0, 17, 31, 36, 48, 53, 53 + 5, 53 + 26, 53 + 31];
    let chord_9 = vec![0 + 5, 12 + 5, 31 + 5, 43 + 5, 53 + 5, 61 + 5, 53 + 17 + 5];
    vec![
        HarmonicChange::new().transpose(5),
        HarmonicChange::new()
            .new_chord(chord_9.clone())
            .transpose(-5),
        HarmonicChange::new()
            .new_chord(chord_maj7sharp11.clone())
            .transpose(5),
        HarmonicChange::new().transpose(5),
        HarmonicChange::new()
            .new_chord(chord_9.clone())
            .transpose(9),
        HarmonicChange::new().new_chord(chord_maj7sharp11.clone()),
    ]
}
