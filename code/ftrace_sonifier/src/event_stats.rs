use std::collections::HashMap;
use std::rc::Rc;
use std::cell::RefCell;
use nannou::rand::random;
use std::sync::{Arc, Mutex};
use nannou::geom::point::{Point2, pt2};
type ArcMutex<T> = Arc<Mutex<T>>;

use super::dsp::Sample;

#[derive(Debug, PartialEq, Eq, Hash, Copy, Clone)]
pub enum EventFamily{
    FS,
    RANDOM,
    TCP,
    IRQ,
    DRM,
    EXCEPTIONS
}

impl EventFamily {
    pub fn str(&self) -> &'static str {
        match self {
            EventFamily::TCP => "tcp",
            EventFamily::FS => "fs",
            EventFamily::RANDOM => "random",
            EventFamily::DRM => "drm",
            EventFamily::EXCEPTIONS => "exceptions",
            EventFamily::IRQ => "irq",
        }
    }
}

#[derive(Clone)]
pub struct EventStat {
    pub event_family: EventFamily,
    pub name: String,
    pub density: f64,
    pub lpf_density: f64,
    pub density_change: f64,
    pub pos: Point2,
    pub last_triggered_timestamp: f64,
    pub decay_coeff: f64,
    pub amp_coeff: f64,
    pub gain: f64,
    pub mute: bool,
    pub synth_texture: Option<SynthesisType>,
    pub synth_pitch: Option<SynthesisType>,
    pub index: usize, // a unique index for this event
    /// If this EventStat should be expanded into its children
    pub do_expand_children: bool, 
    pub children: HashMap<String, ArcMutex<EventStat>>
}

impl EventStat {
    pub fn new(name: String, event_family: EventFamily, index: usize) -> Self {
        EventStat {
            event_family,
            name,
            density: 0.0,
            lpf_density: 0.0,
            density_change: 0.0,
            pos: pt2(0.0, 0.0),
            last_triggered_timestamp: 0.0,
            decay_coeff: 1.0,
            amp_coeff: 1.0,
            gain: 0.5,
            mute: true,
            synth_texture: None,
            synth_pitch: Some(SynthesisType::SinglePitch{index: index, energy: 0.5}),
            index,
            do_expand_children: false,
            children: HashMap::new(),
        }
    }

    pub fn register_occurrence(&mut self) {
        self.density += 1.0;
    }

    pub fn decay_density(&mut self, decay: f64) {
        self.density *= decay;
        let lpf_decay = 1.0 - (1.0 - decay) * 0.001;
        self.lpf_density = self.lpf_density * lpf_decay + self.density * (1.0 - lpf_decay);
        if self.lpf_density > 0.0 {
            self.density_change = (self.density - self.lpf_density).abs() / self.lpf_density;
        }
        
    }
}

pub fn init_stats() -> (
    HashMap<EventFamily, ArcMutex<EventStat>>, 
    HashMap<String, EventFamily>
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

    let mut main_map: HashMap<String, ArcMutex<EventStat>> = HashMap::new();

    let mut index = 0;

    let mut family_positions = HashMap::new();
    family_positions.insert(EventFamily::RANDOM, pt2(0.0, 0.25));
    family_positions.insert(EventFamily::FS, pt2(0.0, -0.25));
    family_positions.insert(EventFamily::IRQ, pt2(0.0, 0.0));
    family_positions.insert(EventFamily::EXCEPTIONS, pt2(0.25, 0.0));
    family_positions.insert(EventFamily::TCP, pt2(0.25, 0.25));
    family_positions.insert(EventFamily::DRM, pt2(-0.25, -0.25));

    let mut family_map = HashMap::new();
    let all_families = vec![EventFamily::RANDOM, EventFamily::FS, EventFamily::IRQ, EventFamily::EXCEPTIONS, EventFamily::TCP, EventFamily::DRM];
    for event_family in all_families {
        let mut entry = EventStat::new(event_family.str().to_owned(), event_family, index);
        entry.pos = family_positions.get(&event_family).unwrap_or(&pt2(0.0, 0.0)).clone();
        family_map.insert(event_family, Arc::new(Mutex::new(entry)));
        index += 1;
    }

    let mut event_to_family_map = HashMap::new();
    for event in all_events.iter() {
        event_to_family_map.insert(event.0.to_owned(), event.1);
    }

    
    for event in all_events.iter() {
        // Create the stat entry
        let mut entry = EventStat::new(event.0.to_owned(), event.1.clone(), index);
        index += 1;
        entry.pos = family_positions.get(&event.1).unwrap_or(&pt2(0.0, 0.0)).clone();
        entry.pos = entry.pos + pt2(random::<f32>() * 0.2 - 0.1, random::<f32>() * 0.2 - 0.1);
        
        let arc_entry = Arc::new(Mutex::new(entry));
        let event_family_stat = family_map.get_mut(&event.1).unwrap();
        let mut locked_event_family_stat = event_family_stat.lock().unwrap();
        locked_event_family_stat.children.insert(event.0.to_owned(), arc_entry);
    }

    // The main_map should now contain all of the event types pointing to all of the family maps
    (family_map, event_to_family_map)
}

#[derive(Clone, Copy)]
pub enum DensityApproach {
    Density,
    LpfDensity,
    DensityChange,
}

impl DensityApproach {
    pub fn next(&self) -> Self {
        match self {
            DensityApproach::Density => DensityApproach::LpfDensity,
            DensityApproach::LpfDensity => DensityApproach::DensityChange,
            DensityApproach::DensityChange => DensityApproach::Density
        }
    }
}

#[derive(Copy, Clone)]
pub enum SynthesisType {
    NoSynthesis,
    Frequency {freq: Sample, amp: Sample, decay: Sample },
    Bass {amp: Sample, decay: Sample, index: usize },
    Texture {index: usize, amp: Sample, decay: Sample },
    SinglePitch {index: usize, energy: Sample }
}

impl std::fmt::Display for SynthesisType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SynthesisType::Frequency { freq, amp, decay} => write!(f, "Frequency: (freq: {}, amp: {}, decay: {})", freq, amp, decay),
            SynthesisType::Bass { amp, decay, index} => write!(f, "Bass: (amp: {}, decay: {}, index: {})", amp, decay, index),
            SynthesisType::Texture { index, amp, decay} => write!(f, "Texture: (index: {}, amp: {}, decay: {})", index, amp, decay),
            SynthesisType::SinglePitch { index, energy} => write!(f, "SinglePitch: (index: {}, energy: {})", index, energy),
            SynthesisType::NoSynthesis => write!(f, "NoSynthesis")
        }
    }
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
    pub synthesis_type: Vec<SynthesisType>,
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