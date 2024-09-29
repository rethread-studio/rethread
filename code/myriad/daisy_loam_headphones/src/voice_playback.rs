use core::{mem, sync::atomic::AtomicU32};

use alloc::vec::Vec;
use embedded_sdmmc::File;
use heapless::pool::arc::Arc;
use heapless::spsc::{Consumer, Producer, Queue};
use log::{info, warn};
#[allow(unused)]
use num_traits::Float;

use crate::{sd_card::SdCardLocal, Sample, NUM_ANCHORS};
#[derive(Copy, Clone, Debug, Eq, PartialEq, Hash)]
pub struct AnchorId(pub u8);
const BUFFER_SIZE: usize = 16384;
const SOUND_FILE_SIZE: u32 = 57600000;

/// Lives in the audio task and plays back
pub struct VoicePlayer {
    buffers: [Vec<i16>; 3],
    refill_tx: [Producer<'static, (Vec<i16>, AnchorId), 2>; 3],
    filled_rx: [Consumer<'static, (Vec<i16>, AnchorId), 2>; 3],
    pub closest_anchors: [AnchorId; 3],
    pub anchor_mix: [f32; 3],
    furthest_anchor_buffer: AnchorId,
    buffer_read_ptr: usize,
    /// The buffer loading position
    position: u32,
    position_tx: Producer<'static, u32, 2>,
}
impl VoicePlayer {
    pub fn new(
        sd_card: &mut SdCardLocal,
        queues: &'static mut [Queue<(Vec<i16>, AnchorId), 2>; 6],
        position_queue: &'static mut Queue<u32, 2>,
    ) -> (Self, VoiceLoader) {
        let buffers = [
            vec![0_i16; BUFFER_SIZE],
            vec![0; BUFFER_SIZE],
            vec![0; BUFFER_SIZE],
        ];
        let buffers_to_send = [
            vec![0_i16; BUFFER_SIZE],
            vec![0; BUFFER_SIZE],
            vec![0; BUFFER_SIZE],
        ];
        let anchors_in_buffers = [AnchorId(0), AnchorId(1), AnchorId(2)];
        let mut queues = queues.iter_mut();
        let (mut refill_tx, refill_rx) = {
            let (tx0, rx0) = queues.next().unwrap().split();
            let (tx1, rx1) = queues.next().unwrap().split();
            let (tx2, rx2) = queues.next().unwrap().split();
            ([tx0, tx1, tx2], [rx0, rx1, rx2])
        };
        // Send the buffers for immediate filling
        for ((buf, tx), &anchor) in buffers_to_send
            .into_iter()
            .zip(refill_tx.iter_mut())
            .zip(anchors_in_buffers.iter())
        {
            tx.enqueue((buf, anchor)).unwrap();
        }
        let (filled_tx, filled_rx) = {
            let (tx0, rx0) = queues.next().unwrap().split();
            let (tx1, rx1) = queues.next().unwrap().split();
            let (tx2, rx2) = queues.next().unwrap().split();
            ([tx0, tx1, tx2], [rx0, rx1, rx2])
        };
        let (position_tx, position_rx) = position_queue.split();
        let mut loader = VoiceLoader::new(sd_card, filled_tx, refill_rx, position_rx);
        // Fill up the first buffers
        loader.update(sd_card);
        (
            Self {
                buffers,
                closest_anchors: anchors_in_buffers,
                refill_tx,
                filled_rx,
                furthest_anchor_buffer: AnchorId(2),
                // Start at max buffer size in order to immediately fetch the filled buffers
                buffer_read_ptr: BUFFER_SIZE,
                anchor_mix: [0.5, 0.35, 0.15],
                position_tx,
                position: 0,
            },
            loader,
        )
    }
    pub fn next_frame(&mut self) -> (Sample, Sample) {
        if self.buffer_read_ptr >= BUFFER_SIZE {
            self.swap_buffers();
        }
        let mut l = 0.;
        let mut r = 0.;
        for (buf, &mix) in self.buffers.iter().zip(&self.anchor_mix) {
            l += sample_i16_to_f32(buf[self.buffer_read_ptr]) * mix;
            r += sample_i16_to_f32(buf[self.buffer_read_ptr + 1]) * mix;
        }

        self.buffer_read_ptr += 2;
        (l, r)
    }
    pub fn swap_buffers(&mut self) {
        self.position += BUFFER_SIZE as u32;
        if self.position >= SOUND_FILE_SIZE {
            self.position -= SOUND_FILE_SIZE;
        }
        if let Err(e) = self.position_tx.enqueue(self.position) {
            warn!("Unable to send position: {e}");
        }
        for (i, ((local_buf, filled_rx), refill_tx)) in self
            .buffers
            .iter_mut()
            .zip(self.filled_rx.iter_mut())
            .zip(self.refill_tx.iter_mut())
            .enumerate()
        {
            if let Some((mut buf, _anchor)) = filled_rx.dequeue() {
                mem::swap(local_buf, &mut buf);
                // Switch to a new anchor here if it has changed
                refill_tx.enqueue((buf, self.closest_anchors[i])).unwrap();
            } else {
                warn!("No buffer ready to be swapped");
            }
        }
        self.buffer_read_ptr = 0;
    }
}

pub struct VoiceLoader {
    voice_file_handles: [File; NUM_ANCHORS],
    filled_tx: [Producer<'static, (Vec<i16>, AnchorId), 2>; 3],
    refill_rx: [Consumer<'static, (Vec<i16>, AnchorId), 2>; 3],
    /// Receiving the sound position in i16s
    position_rx: Consumer<'static, u32, 2>,
    /// The file position, in bytes
    position: u32,
}
impl VoiceLoader {
    pub fn new(
        sd_card: &mut SdCardLocal,
        filled_tx: [Producer<'static, (Vec<i16>, AnchorId), 2>; 3],
        refill_rx: [Consumer<'static, (Vec<i16>, AnchorId), 2>; 3],
        position_rx: Consumer<'static, u32, 2>,
    ) -> Self {
        let anchor_voice_files = [
            "VOICE_0.BIN",
            "VOICE_1.BIN",
            "VOICE_2.BIN",
            "VOICE_3.BIN",
            "VOICE_4.BIN",
            "VOICE_5.BIN",
            "VOICE_6.BIN",
            "VOICE_7.BIN",
            "VOICE_8.BIN",
            "VOICE_9.BIN",
            "VOICE_10.BIN",
            "VOICE_11.BIN",
        ];
        let voice_file_handles =
            core::array::from_fn(|i| match sd_card.open_file(anchor_voice_files[i]) {
                Ok(file) => file,
                Err(e) => panic!("Failed to load {}", anchor_voice_files[i]),
            });
        Self {
            voice_file_handles,
            filled_tx,
            refill_rx,
            position_rx,
            position: 0,
        }
    }
    pub fn update(&mut self, sd_card: &mut SdCardLocal) {
        if let Some(new_pos) = self.position_rx.dequeue() {
            // Convert from i16s to u8s
            self.position = new_pos * 2;
        }
        for (refill_rx, filled_tx) in self.refill_rx.iter_mut().zip(self.filled_tx.iter_mut()) {
            if let Some((mut fill_me, anchor)) = refill_rx.dequeue() {
                self.voice_file_handles[anchor.0 as usize]
                    .seek_from_start(self.position)
                    .unwrap();
                sd_card.read_i16_from_file_cycling(
                    &mut self.voice_file_handles[anchor.0 as usize],
                    &mut fill_me,
                );
                while let Err(e) = filled_tx.enqueue((fill_me, anchor)) {
                    fill_me = e.0;
                    warn!("Error queuing");
                }
            }
        }
    }
}

fn sample_i16_to_f32(s: i16) -> f32 {
    const I16_MAX_RECIP: f32 = 1.0 / i16::MAX as f32;
    s as f32 * I16_MAX_RECIP
}

pub struct Anchors {
    pub distances: [f32; NUM_ANCHORS],
    pub buffer_anchors: [(AnchorId, f32); 3],
    pub anchor_in_top_three: [bool; NUM_ANCHORS],
}
impl Anchors {
    pub fn new() -> Self {
        Self {
            distances: [f32::MAX; NUM_ANCHORS],
            buffer_anchors: core::array::from_fn(|i| (AnchorId(i as u8), f32::MAX)),
            anchor_in_top_three: core::array::from_fn(|i| i < 3),
        }
    }
    /// Call after setting all the distances. Returns new mix values
    pub fn recalculate(&mut self) -> [f32; 3] {
        let mut mix = [0.0; 3];
        // Update the distances to the closest anchors
        for (anchor_id, dist) in &mut self.buffer_anchors {
            *dist = self.distances[anchor_id.0 as usize];
        }
        let mut anchors = [(f32::MAX, 0); NUM_ANCHORS];
        for i in 0..NUM_ANCHORS {
            anchors[i] = (self.distances[i], i);
        }
        anchors.sort_unstable_by(|&a, &b| a.0.partial_cmp(&b.0).unwrap());
        // The three closest anchors are now at the start of the array.
        let mut new_anchors = [(0.0, 0); 3];
        let mut num_new_anchors = 0;
        for (new_dist, index) in anchors.into_iter().take(3) {
            if let None = self
                .buffer_anchors
                .iter()
                .find(|(id, _)| id.0 as usize == index)
            {
                new_anchors[num_new_anchors] = (new_dist, index);
                num_new_anchors += 1;
            }
        }
        for i in 0..num_new_anchors {
            // There were new anchors, replace the largest distance in buffer_anchors
            let mut largest_dist = 0.0;
            let mut largest_index = 0;
            for (i, (_id, dist)) in self.buffer_anchors.iter().enumerate() {
                if *dist > largest_dist {
                    largest_index = i;
                    largest_dist = *dist;
                }
            }
            self.buffer_anchors[largest_index] =
                (AnchorId(new_anchors[i].1 as u8), new_anchors[i].0);
        }
        let distances: [f32; 3] =
            core::array::from_fn(|i| self.buffer_anchors[i].1.recip().powi(3));
        let distance_sum: f32 = distances
            .iter()
            // .map(|(_, dist)| dist.powi(2))
            .sum::<f32>()
            + 0.01; // Add a small distance to avoid division by zero
        for i in 0..3 {
            mix[i] = distances[i] / distance_sum;
        }
        // fade out at great distances
        for i in 0..3 {
            // let fade = distances[i].min(1.0);
            let fade = self.buffer_anchors[i].1.recip().min(1.0);
            mix[i] *= fade;
        }
        mix
    }
    pub fn closest_anchors(&self) -> [AnchorId; 3] {
        core::array::from_fn(|i| self.buffer_anchors[i].0)
    }
}
