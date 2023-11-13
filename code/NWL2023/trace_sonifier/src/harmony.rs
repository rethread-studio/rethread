use musical_matter::pitch::EdoChord;

pub struct ChordMatrix {
    chords: [EdoChord; 32],
    current_chord: EdoChord,
}
impl ChordMatrix {
  pub fn new() -> Self {
    let chords = std::array::from_fn(|i|);
    Self {
      current_chord: chords[0].clone(),
      chords,

    }
  }
}
