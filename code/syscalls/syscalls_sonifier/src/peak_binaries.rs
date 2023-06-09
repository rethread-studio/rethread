use enum_iterator::{all, cardinality};
use knyst::prelude::{Buffer, KnystCommands};
use nannou_osc::Type;
use syscalls_shared::SyscallKind;

use crate::Sonifier;

pub enum SoundKind {
    Binary,
    FilteredNoise,
}

pub struct PeakBinaries {
    // sound_files: Vec<BufferId>,
    category_peaks: Vec<(String, f32)>,
    pub threshold: f32,
    pub sound_kind: SoundKind,
    root_freq: f32,
}

impl PeakBinaries {
    pub fn new(k: &mut KnystCommands) -> Self {
        println!("Creating PeakBinaries");
        // Load sound files
        // let thunderbird =
        //     Buffer::from_sound_file("/home/erik/Musik/syscalls_binaries/thunderbird_8bit.wav");
        // let category_peaks = vec![0.; cardinality::<SyscallKind>()];
        let category_peaks = all::<SyscallKind>()
            .map(|k| (format!("{k:?}"), 0.0))
            .collect();
        Self {
            category_peaks,
            threshold: 1.0,
            sound_kind: SoundKind::Binary,
            root_freq: 25.,
        }
    }
}

impl Sonifier for PeakBinaries {
    fn apply_osc_message(&mut self, m: nannou_osc::Message) {
        if m.addr == "/syscall_analysis/category_peak" {
            let mut args = m.args.unwrap().into_iter();
            let kind = args.next().unwrap().string().unwrap();
            let peak = args.next().unwrap().float().unwrap();

            for (k, value) in self.category_peaks.iter_mut() {
                if *k == kind {
                    *value = peak;
                }
            }
        }
    }

    fn patch_to_fx_chain(&mut self, fx_chain: usize) {
        // Does nothing for now
    }

    fn change_harmony(&mut self, scale: &[i32], root: f32) {
        // Does nothing
        self.root_freq = root;
    }

    fn update(&mut self, osc_sender: &mut nannou_osc::Sender<nannou_osc::Connected>) {
        for (_kind, peak_value) in &mut self.category_peaks {
            if *peak_value > self.threshold {
                match self.sound_kind {
                    SoundKind::Binary => {
                        let length = (*peak_value * 0.02).clamp(0.0, 1.0) * 1.2 + 0.01;
                        let addr = "/peak_binary";
                        let args = vec![Type::Float(length)];
                        osc_sender.send((addr, args)).ok();
                    }
                    SoundKind::FilteredNoise => {
                        let length = (*peak_value * 0.2).clamp(1.0, 3.0);
                        let freq = self.root_freq;
                        let addr = "/background_noise";
                        let args = vec![Type::Float(length), Type::Float(freq)];
                        osc_sender.send((addr, args)).ok();
                    }
                }
                *peak_value = 0.0;
            }
        }
    }

    fn free(&mut self) {
        // Does nothing for now
    }
}
