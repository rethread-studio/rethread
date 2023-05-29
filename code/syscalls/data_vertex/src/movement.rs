use std::time::{Duration, Instant};

use crate::send_osc::OscSender;

pub struct Score {
    current_movement: usize,
    movements: Vec<Movement>,
    start_of_last_movement: Instant,
    is_playing: bool,
}
impl Score {
    pub fn new() -> Self {
        let movements = vec![
            Movement {
                id: 0,
                is_break: false,
                description: "direct,categories".to_string(),
                duration: Duration::from_secs(10),
            },
            Movement {
                id: 1,
                is_break: true,
                description: "break".to_string(),
                duration: Duration::from_secs(10),
            },
            Movement {
                id: 2,
                is_break: false,
                description: "direct,function calls".to_string(),
                duration: Duration::from_secs(10),
            },
            Movement {
                id: 3,
                is_break: true,
                description: "break".to_string(),
                duration: Duration::from_secs(10),
            },
        ];
        Self {
            current_movement: 0,
            movements,
            start_of_last_movement: Instant::now(),
            is_playing: false,
        }
    }
    pub fn play_from(&mut self, mvt: usize, osc_sender: &mut OscSender) {
        self.current_movement = mvt;
        self.is_playing = true;
        self.start_of_last_movement = Instant::now();
        osc_sender.send_movement(&self.movements[self.current_movement]);
    }
    pub fn stop(&mut self, osc_sender: &mut OscSender) {
        self.is_playing = false;
        osc_sender.send_score_stop();
    }
    pub fn update(&mut self, osc_sender: &mut OscSender) {
        if self.is_playing {
            if self.start_of_last_movement.elapsed()
                >= self.movements[self.current_movement].duration
            {
                self.current_movement += 1;
                if self.current_movement >= self.movements.len() {
                    self.stop(osc_sender);
                } else {
                    osc_sender.send_movement(&self.movements[self.current_movement]);
                }
                self.start_of_last_movement = Instant::now();
            }
        }
    }
}

pub struct Movement {
    /// Hardcoded id so that we can link other data to the movement and also
    /// move them around in the score.
    pub id: usize,
    pub is_break: bool,
    pub description: String,
    pub duration: Duration,
}
