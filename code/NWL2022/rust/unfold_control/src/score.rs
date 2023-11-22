use log::*;
use std::time::{Duration, Instant};

use crate::scheduler::{SchedulerCom, SchedulerMessage};

/// Unfold score
///
/// Use this to play back a subset of a trace according to a specific score
///

struct ScoreEvent {
    message: SchedulerMessage,
    duration: Duration,
}
pub struct Score {
    playing: bool,
    time_at_event_start: Instant,
    events: Vec<ScoreEvent>,
    current_event: usize,
}

impl Score {
    pub fn feet_under_80() -> Self {
        let events = vec![
            ScoreEvent {
                message: SchedulerMessage::Start,
                duration: Duration::from_secs_f32(60. * 2.0),
            },
            ScoreEvent {
                message: SchedulerMessage::JumpToDeepestSection(200),
                duration: Duration::from_secs_f32(60. * 0.5),
            },
            ScoreEvent {
                message: SchedulerMessage::JumpToShallowestSection(200),
                duration: Duration::from_secs_f32(60. * 1.0),
            },
            ScoreEvent {
                message: SchedulerMessage::JumpToDeepestSection(400),
                duration: Duration::from_secs_f32(60. * 1.0),
            },
            ScoreEvent {
                message: SchedulerMessage::JumpToShallowestSection(500),
                duration: Duration::from_secs_f32(60. * 1.0),
            },
            ScoreEvent {
                message: SchedulerMessage::JumpToMostDiverseSection(50),
                duration: Duration::from_secs_f32(60. * 0.5),
            },
            ScoreEvent {
                message: SchedulerMessage::JumpToMostDiverseSection(300),
                duration: Duration::from_secs_f32(60. * 1.),
            },
            ScoreEvent {
                message: SchedulerMessage::JumpToLeastDiverseSection(50),
                duration: Duration::from_secs_f32(60. * 0.5),
            },
            ScoreEvent {
                message: SchedulerMessage::JumpToLeastDiverseSection(300),
                duration: Duration::from_secs_f32(60. * 1.),
            },
            ScoreEvent {
                message: SchedulerMessage::JumpToSection(198),
                duration: Duration::from_secs_f32(60. * 1.),
            },
            ScoreEvent {
                message: SchedulerMessage::StopAtNextSection,
                duration: Duration::from_secs_f32(60. * 1.00),
            },
            ScoreEvent {
                message: SchedulerMessage::Stop,
                duration: Duration::from_secs_f32(60. * 0.001),
            },
            ScoreEvent {
                message: SchedulerMessage::FadeOut,
                duration: Duration::from_secs_f32(10.),
            },
        ];
        let score_length = events.iter().map(|e| e.duration).sum();
        println!(
            "Score total duration: {}",
            humantime::format_duration(score_length)
        );
        Score {
            playing: false,
            time_at_event_start: Instant::now(),
            events,
            current_event: 0,
        }
    }
    pub fn update(&mut self, scheduler_com: &mut SchedulerCom) {
        if self.playing {
            if self.time_at_event_start.elapsed() >= self.events[self.current_event].duration {
                self.current_event += 1;
                self.time_at_event_start = Instant::now();
                if self.current_event >= self.events.len() {
                    self.playing = false;
                    self.current_event = 0;
                } else {
                    scheduler_com.send_message(self.events[self.current_event].message);
                }
            }
        }
    }
    pub fn start(&mut self, scheduler_com: &mut SchedulerCom) {
        self.playing = true;
        self.time_at_event_start = Instant::now();
        self.current_event = 0;
        scheduler_com.send_message(self.events[self.current_event].message);
    }
}
