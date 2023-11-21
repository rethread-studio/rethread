use musical_matter::pitch::{EdoChord, EdoChordSemantic, EdoInterval, EdoPitch};
use rand::{distributions::WeightedIndex, prelude::Distribution, rngs::StdRng, Rng};

pub struct ChordMatrix {
    chords: [EdoChordSemantic; 32],
    current_chord: usize,
}
impl ChordMatrix {
    pub fn new() -> Self {
        let mut archetypes = [
            EdoChordSemantic::from_chord_symbol("Cv7", 53).unwrap(),
            EdoChordSemantic::from_chord_symbol("C^m7", 53).unwrap(),
            EdoChordSemantic::from_chord_symbol("CvM9", 53).unwrap(),
            EdoChordSemantic::from_chord_symbol("C5,2,4", 53).unwrap(),
        ];
        let mut chords = std::array::from_fn(|_| EdoChordSemantic::from_root(EdoPitch::new(0, 53)));
        for i in 0..32 {
            if i % 4 == 0 && i != 0 {
                for c in &mut archetypes {
                    c.transpose(EdoInterval::new(31, 53));
                }
            }
            chords[i] = archetypes[i % 4].clone();
        }
        Self {
            current_chord: 0,
            chords,
        }
    }
    pub fn next_chord(&mut self) {
        self.current_chord = (self.current_chord + 1) % self.chords.len();
    }
    pub fn next_from_matrix_probability(&mut self, matrix: &[f64], rng: &mut StdRng) {
        let start_column = 32 * self.current_chord;
        let probabilities = &matrix[start_column..start_column + 32];
        let weighted_index = WeightedIndex::new(probabilities).unwrap();
        let new_index = weighted_index.sample(rng);
        self.current_chord = new_index;
    }
    pub fn current(&self) -> &EdoChordSemantic {
        &self.chords[self.current_chord]
    }
}

impl Default for ChordMatrix {
    fn default() -> Self {
        Self::new()
    }
}
