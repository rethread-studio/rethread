use std::time::Duration;
#[cfg(not(target_arch = "wasm32"))]
use std::time::Instant;

pub struct Score {
    pub current_movement: usize,
    pub movements: Vec<Movement>,
    #[cfg(not(target_arch = "wasm32"))]
    pub start_of_last_movement: Instant,
    pub is_playing: bool,
}
impl Score {
    pub fn new() -> Self {
        let movement_dur = 1 * 60;
        let break_dur = 30;
        let movements = vec![
            Movement {
                id: 0,
                is_break: false,
                is_interlude: false,
                description: "direct,categories".to_string(),
                duration: Duration::from_secs(4 * 60),
            },
            Movement {
                id: 1,
                is_break: true,
                is_interlude: false,
                description: "break".to_string(),
                duration: Duration::from_secs(break_dur),
            },
            Movement {
                id: 100,
                is_break: false,
                is_interlude: true,
                description: "direct,categories,interlude".to_string(),
                duration: Duration::from_secs(2 * 60),
            },
            Movement {
                id: 201,
                is_break: true,
                is_interlude: false,
                description: "break".to_string(),
                duration: Duration::from_secs(break_dur),
            },
            Movement {
                id: 2,
                is_break: false,
                is_interlude: false,
                description: "direct,function calls".to_string(),
                duration: Duration::from_secs(3 * 60),
            },
            Movement {
                id: 3,
                is_break: true,
                is_interlude: false,
                description: "break".to_string(),
                duration: Duration::from_secs(break_dur),
            },
            Movement {
                id: 102,
                is_break: false,
                is_interlude: true,
                description: "interlude,direct,function calls,lower and lower sensitivity"
                    .to_string(),
                duration: Duration::from_secs(2 * 60),
            },
            Movement {
                id: 201,
                is_break: true,
                is_interlude: false,
                description: "break".to_string(),
                duration: Duration::from_secs(break_dur),
            },
            Movement {
                id: 6,
                is_break: false,
                is_interlude: false,
                description: "direct,function calls,focus shifting,chorus".to_string(),
                duration: Duration::from_secs(7 * 60),
            },
            Movement {
                id: 7,
                is_break: true,
                is_interlude: false,
                description: "break".to_string(),
                duration: Duration::from_secs(break_dur),
            },
            Movement {
                id: 106,
                is_break: false,
                is_interlude: true,
                description: "interlude,direct,function calls,focus shifting (fast, few types),chorus".to_string(),
                duration: Duration::from_secs(60),
            },
            Movement {
                id: 207,
                is_break: true,
                is_interlude: false,
                description: "break".to_string(),
                duration: Duration::from_secs(break_dur),
            },
            Movement {
                id: 4,
                is_break: false,
                is_interlude: false,
                description: "quantised,categories,clear".to_string(),
                duration: Duration::from_secs(4 * 60),
            },
            Movement {
                id: 8,
                is_break: true,
                is_interlude: false,
                description: "break".to_string(),
                duration: Duration::from_secs(break_dur),
            },
            Movement {
                id: 104,
                is_break: false,
                is_interlude: true,
                description: "interlude,quantised,categories,clear".to_string(),
                duration: Duration::from_secs(2 * 60),
            },
            Movement {
                id: 108,
                is_break: true,
                is_interlude: false,
                description: "break".to_string(),
                duration: Duration::from_secs(break_dur),
            },
            Movement {
                id: 5,
                is_break: false,
                is_interlude: false,
                description:
                    "quantised,categories,smoothed,occasional snippets of the binaries as sound,performer makes breaks and variation in the interaction"
                        .to_string(),
                duration: Duration::from_secs(3 * 60),
            },
            Movement {
                id: 9,
                is_break: true,
                is_interlude: false,
                description: "break".to_string(),
                duration: Duration::from_secs(break_dur),
            },
            Movement {
                id: 10,
                is_break: false,
                is_interlude: false,
                description: "themes,many programs open (open and close), quickly rising harmony"
                    .to_string(),
                duration: Duration::from_secs(5 * 60),
            },
            Movement {
                id: 110,
                is_break: false,
                is_interlude: false,
                description: "themes,many programs open (open and close),smoothed direct functions in the background, steady harmony"
                    .to_string(),
                duration: Duration::from_secs(1 * 60),
            },
            Movement {
                id: 203,
                is_break: true,
                is_interlude: false,
                description: "break".to_string(),
                duration: Duration::from_secs(break_dur),
            },
            Movement {
                id: 11,
                is_break: false,
                is_interlude: false,
                description: "binaries"
                    .to_string(),
                duration: Duration::from_secs(15),
            },
            Movement {
                id: 42,
                is_interlude: false,
                is_break: false,
                description: "ending,steadily get lower into the sub frequencies and smoother,image goes to white"
                    .to_string(),
                duration: Duration::from_secs(30),
            },
            Movement {
                id: 1000,
                is_break: true,
                is_interlude: false,
                description: "break".to_string(),
                duration: Duration::from_secs(break_dur),
            },
        ];
        Self {
            current_movement: 0,
            movements,
            #[cfg(not(target_arch = "wasm32"))]
            start_of_last_movement: Instant::now(),
            is_playing: false,
        }
    }
    pub fn is_playing(&self) -> bool {
        self.is_playing
    }
    #[cfg(not(target_arch = "wasm32"))]
    pub fn play_from(&mut self, mvt: usize) -> &Movement {
        self.current_movement = mvt;
        self.is_playing = true;
        self.start_of_last_movement = Instant::now();
        &self.movements[self.current_movement]
    }
    pub fn stop(&mut self) {
        self.is_playing = false;
        self.current_movement = 0;
    }
    pub fn total_duration(&self) -> Duration {
        self.movements
            .iter()
            .fold(Duration::ZERO, |acc, m| acc + m.duration)
    }
    #[cfg(not(target_arch = "wasm32"))]
    pub fn update(&mut self) -> ScoreUpdate {
        if self.is_playing {
            if self.start_of_last_movement.elapsed()
                >= self.movements[self.current_movement].duration
            {
                self.current_movement += 1;
                self.start_of_last_movement = Instant::now();
                if self.current_movement >= self.movements.len() {
                    self.stop();
                    ScoreUpdate::ScoreStop
                } else {
                    ScoreUpdate::NewMovement(self.movements[self.current_movement].clone())
                }
            } else {
                ScoreUpdate::Nothing
            }
        } else {
            ScoreUpdate::Nothing
        }
    }
    #[cfg(not(target_arch = "wasm32"))]
    pub fn score_playback_data(&self) -> ScorePlaybackData {
        ScorePlaybackData {
            current_index: self.current_movement,
            max_index: self.movements.len(),
            current_timestamp_for_mvt: if self.is_playing {
                self.start_of_last_movement.elapsed()
            } else {
                Duration::ZERO
            },
            current_mvt: if self.is_playing {
                Some(self.movements[self.current_movement].clone())
            } else {
                None
            },
            next_mvt: {
                let next_index = if self.is_playing {
                    self.current_movement + 1
                } else {
                    self.current_movement
                };
                if next_index < self.movements.len() {
                    Some(self.movements[next_index].clone())
                } else {
                    None
                }
            },
            playing: self.is_playing,
        }
    }
}

pub enum ScoreUpdate {
    Nothing,
    ScoreStop,
    NewMovement(Movement),
}

#[derive(Debug, Clone)]
pub struct Movement {
    /// Hardcoded id so that we can link other data to the movement and also
    /// move them around in the score.
    pub id: usize,
    pub is_break: bool,
    pub is_interlude: bool,
    pub description: String,
    pub duration: Duration,
}

#[derive(Clone, Debug)]
pub struct ScorePlaybackData {
    pub current_index: usize,
    pub max_index: usize,
    pub current_timestamp_for_mvt: Duration,
    pub playing: bool,
    pub current_mvt: Option<Movement>,
    pub next_mvt: Option<Movement>,
}
impl Default for ScorePlaybackData {
    fn default() -> Self {
        Self {
            current_index: 0,
            max_index: 0,
            current_timestamp_for_mvt: Duration::ZERO,
            current_mvt: None,
            next_mvt: None,
            playing: false,
        }
    }
}
