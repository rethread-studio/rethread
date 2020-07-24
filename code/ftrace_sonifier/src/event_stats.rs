use std::collections::HashMap;
use std::rc::Rc;
use std::cell::RefCell;
use nannou::rand::random;
use std::sync::{Arc, Mutex};
use nannou::geom::point::{Point2, pt2};
type ArcMutex<T> = Arc<Mutex<T>>;

use super::shared_wavetable_synth::Sample;

#[derive(Debug, PartialEq, Eq, Hash, Copy, Clone)]
pub enum EventFamily{
    FS,
    RANDOM,
    TCP,
    IRQ,
    DRM,
    EXCEPTIONS
}
pub struct EventStat {
    pub event_family: EventFamily,
    pub name: &'static str,
    pub density: f64,
    pub pos: Point2,
    pub last_triggered_timestamp: f64,
}

impl EventStat {
    pub fn new(name: &'static str, event_family: EventFamily) -> Self {
        EventStat {
            event_family,
            name,
            density: 0.0,
            pos: pt2(0.0, 0.0),
            last_triggered_timestamp: 0.0,
        }
    }

    pub fn register_occurrence(&mut self, ) {
        self.density += 1.0;
    }

    pub fn decay_density(&mut self, decay: f64, ticks: f64) {
        self.density *= decay.powf(ticks);
    }
}



pub fn init_stats() -> (
    HashMap<&'static str, ArcMutex<HashMap<&'static str, EventStat>>>, 
    HashMap<EventFamily, ArcMutex<HashMap<&'static str, EventStat>>>
) {

    let all_events = [
        ("urandom_read", EventFamily::RANDOM),
        ("mix_pool_bytes_nolock", EventFamily::RANDOM),
        ("credit_entropy_bits", EventFamily::RANDOM),
        ("mix_pool_bytes", EventFamily::RANDOM),
        ("add_input_randomness", EventFamily::RANDOM),
        ("xfer_secondary_pool", EventFamily::RANDOM),
        ("extract_entropy", EventFamily::RANDOM),
        ("debit_entropy", EventFamily::RANDOM),
        ("push_to_pool", EventFamily::RANDOM),
        ("add_device_randomness", EventFamily::RANDOM),
        ("get_random_bytes", EventFamily::RANDOM),

        ("tcp_probe", EventFamily::TCP),
        ("tcp_rcv_space_adjust", EventFamily::TCP),
        ("tcp_destroy_sock", EventFamily::TCP),
        ("tcp_retransmit_skb", EventFamily::TCP),
        ("tcp_receive_reset", EventFamily::TCP),
        ("tcp_send_reset", EventFamily::TCP),

        ("do_sys_open", EventFamily::FS),
        ("open_exec", EventFamily::FS),

        ("softirq_raise", EventFamily::IRQ),
        ("softirq_entry", EventFamily::IRQ),
        ("softirq_exit", EventFamily::IRQ),
        ("irq_handler_entry", EventFamily::IRQ),
        ("irq_handler_exit", EventFamily::IRQ),

        ("drm_vblank_event_delivered", EventFamily::DRM),
        ("drm_vblank_event", EventFamily::DRM),
        ("drm_vblank_event_queued", EventFamily::DRM),

        ("page_fault_user", EventFamily::EXCEPTIONS),
        ("page_fault_kernel", EventFamily::EXCEPTIONS),
    ];

    let mut main_map: HashMap<&str, ArcMutex<HashMap<&str, EventStat>>> = HashMap::new();

    let mut family_map = HashMap::new();
    family_map.insert(EventFamily::RANDOM, Arc::new(Mutex::new(HashMap::new())));
    family_map.insert(EventFamily::FS, Arc::new(Mutex::new(HashMap::new())));
    family_map.insert(EventFamily::IRQ, Arc::new(Mutex::new(HashMap::new())));
    family_map.insert(EventFamily::EXCEPTIONS, Arc::new(Mutex::new(HashMap::new())));
    family_map.insert(EventFamily::TCP, Arc::new(Mutex::new(HashMap::new())));
    family_map.insert(EventFamily::DRM, Arc::new(Mutex::new(HashMap::new())));

    let mut family_positions = HashMap::new();
    family_positions.insert(EventFamily::RANDOM, pt2(0.0, 0.25));
    family_positions.insert(EventFamily::FS, pt2(0.0, -0.25));
    family_positions.insert(EventFamily::IRQ, pt2(0.0, 0.0));
    family_positions.insert(EventFamily::EXCEPTIONS, pt2(0.25, 0.0));
    family_positions.insert(EventFamily::TCP, pt2(0.25, 0.25));
    family_positions.insert(EventFamily::DRM, pt2(-0.25, -0.25));

    for event in all_events.iter() {
        let map = family_map.get(&event.1).unwrap();
        let mut map_mut = map.lock().unwrap();
        // Create the stat entry
        let mut entry = EventStat::new(event.0, event.1.clone());
        entry.pos = family_positions.get(&event.1).unwrap_or(&pt2(0.0, 0.0)).clone();
        entry.pos = entry.pos + pt2(random::<f32>() * 0.2 - 0.1, random::<f32>() * 0.2 - 0.1);
        map_mut.insert(event.0, entry);
        // Make the family map 
        main_map.insert(event.0, map.clone());
    }

    // The main_map should now contain all of the event types pointing to all of the family maps
    (main_map, family_map)
}

pub enum SynthesisType {
    NoSynthesis,
    Frequency {freq: Sample, decay: Sample },
    Bass {index: usize, decay: Sample }
}

/// The struct for an event sent from the receiving OSC thread to the audio processing thread
pub struct EventMsg {
    /// Timestamp in samples for when this event should be played
    pub timestamp: f64,
    pub has_been_parsed: bool, /// If the event has been parsed by the audio scheduler and should be removed
    /// Other values that can be sent to the audio thread
    pub event_type: usize,
    pub pid: i32,
    pub cpu: i32,
    pub synthesis_type: SynthesisType,
}

impl EventMsg {
    pub fn is_time(&self, time_cursor: f64) -> bool {
        if time_cursor >= self.timestamp {
            true
        } else {
            false
        }
    }
}