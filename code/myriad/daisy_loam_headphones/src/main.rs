#![no_main]
#![no_std]

pub mod daisy_pod;

pub mod daisy_seed;
pub mod encoder;
mod hsv;
pub mod rgbled;
pub mod sd_card;
mod voice_playback;
// mod wav_reader;

pub const CONTROL_RATE_IN_MS: u32 = 10;
pub const NUM_ANCHORS: usize = 12;

pub type Sample = f32;

#[macro_use]
extern crate alloc;

use alloc::vec::Vec;
/* use core::panic::PanicInfo;
use cortex_m_rt::entry; */
use embedded_alloc::Heap;

#[global_allocator]
static HEAP: Heap = Heap::empty();

#[rtic::app(
    device = stm32h7xx_hal::stm32,
    peripherals = true,
)]
mod app {
    use core::{mem, num::NonZero};

    use crate::{
        // daisy_pod::{AudioRate, ControlRate, DaisyPod},
        daisy_seed::{AudioRate, ControlRate, DaisySeed},
        hsv::hsv_to_rgb,
        sd_card::SdCardLocal,
        voice_playback::{AnchorId, Anchors, VoiceLoader},
        HEAP,
        NUM_ANCHORS,
    };
    use alloc::vec::Vec;
    use embedded_sdmmc::File;
    use heapless::spsc::{Consumer, Producer, Queue};
    use libdaisy::prelude::*;
    use log::warn;
    use num_traits::Float;

    use crate::voice_playback::VoicePlayer;
    #[cfg(feature = "log")]
    use log::info;
    #[cfg(feature = "log")]
    use rtt_target::rprintln;

    #[shared]
    struct Shared {
        // pot1: f32,
        // pot2: f32,
        // encoder: i32,
        // encoder_button: bool,
        // button1: bool,
        // button2: bool,
        mix: [f32; 3],
        closest_anchors: [AnchorId; 3],
    }

    #[local]
    struct Local {
        ar: AudioRate,
        cr: ControlRate,
        sd_card: SdCardLocal,
        voice_player: VoicePlayer,
        voice_loader: VoiceLoader,
        anchors: Anchors,
    }

    #[init(local = [
        queues: [Queue<(Vec<i16>, AnchorId), 2>; 6] = [Queue::new(),Queue::new(),Queue::new(),Queue::new(),Queue::new(),Queue::new()],
        position_queue: Queue<u32, 2> = Queue::new(),
    ])]
    fn init(ctx: init::Context) -> (Shared, Local, init::Monotonics) {
        libdaisy::logger::init();
        info!("Test");
        // initiate system
        let daisy = DaisySeed::init(ctx.core, ctx.device);
        info!("Init done");

        #[cfg(feature = "log")]
        {
            // init logging via RTT
            info!("RTT loggging initiated!");
            // rtt_init_print!();
            rprintln!("RTT manual init");
        }

        // Initialize the allocator BEFORE you use it
        // Must come after initialising the Daisy
        {
            use core::mem::MaybeUninit;
            const HEAP_SIZE: usize = 60108864;
            #[no_mangle]
            #[link_section = ".sdram_bss"]
            static mut HEAP_MEM: [MaybeUninit<u8>; HEAP_SIZE] = [MaybeUninit::uninit(); HEAP_SIZE];
            unsafe { HEAP.init(HEAP_MEM.as_ptr() as usize, HEAP_SIZE) }
        }

        let mut sd_card = daisy.sd_card.unwrap();
        sd_card.print_files_in_root();
        // let size = sd_card.file_size("S0.WAV").unwrap();
        // info!("File read");
        // let wav_file = vec![0.0; 1];
        let queues = ctx.local.queues;
        let position_queue = ctx.local.position_queue;
        let (voice_player, voice_loader) = VoicePlayer::new(&mut sd_card, queues, position_queue);

        (
            Shared {
                // pot1: 0.5,
                // pot2: 0.5,
                // encoder: 0,
                // encoder_button: false,
                // button1: false,
                // button2: false,
                mix: [0.33; 3],
                closest_anchors: [AnchorId(0), AnchorId(1), AnchorId(2)],
            },
            Local {
                ar: daisy.audio_rate,
                cr: daisy.control_rate,
                sd_card,
                voice_player,
                voice_loader,
                anchors: Anchors::new(),
            },
            init::Monotonics(),
        )
    }

    // Non-default idle ensures chip doesn't go to sleep which causes issues for
    // probe.rs currently
    #[idle]
    fn idle(_ctx: idle::Context) -> ! {
        loop {
            cortex_m::asm::nop();
        }
    }

    // Interrupt handler for audio
    #[task(binds = DMA1_STR1, local = [ar, voice_player], shared = [mix, closest_anchors], priority = 8)]
    fn audio_handler(mut ctx: audio_handler::Context) {
        let audio = &mut ctx.local.ar.audio;
        let mut buffer = ctx.local.ar.buffer;
        let voice_player = ctx.local.voice_player;

        voice_player.anchor_mix = ctx.shared.mix.lock(|mix| *mix);
        voice_player.closest_anchors = ctx.shared.closest_anchors.lock(|c| *c);
        audio.get_stereo(&mut buffer);
        // ctx.shared.pot1.lock(|pot| s.set_damping_mod(*pot as f64));
        // ctx.shared.pot2.lock(|pot| s.set_feedback_mod(*pot as f64));
        // ctx.shared.encoder.lock(|enc| {
        //     s.set_pitch_step(*enc);
        // });

        // for (left, right) in buffer {
        for _ in 0..buffer.len() {
            // let sine = {
            //     *phase += *pitch / libdaisy::AUDIO_SAMPLE_RATE as f32;
            //     libm::sinf(*phase)
            // };
            // let sig = s.next();
            let (l, r) = voice_player.next_frame();
            // let l = (l * 3.0).clamp(-1.0, 1.0);
            // let r = (r * 3.0).clamp(-1.0, 1.0);
            audio.push_stereo((l, r)).unwrap();
        }
    }

    #[task(binds = TIM2, local = [cr, sd_card, voice_loader, anchors], shared = [mix, closest_anchors])]
    fn update_handler(mut ctx: update_handler::Context) {
        // clear TIM2 interrupt flag
        ctx.local.cr.timer2.clear_irq();

        let data_ready = &mut ctx.local.cr.data_ready;
        let seed_led = &mut ctx.local.cr.seed_led;
        let spi = &mut ctx.local.cr.spi;
        let anchors = &mut ctx.local.anchors;
        let mut mix = ctx.shared.mix;
        let mut closets_anchors = ctx.shared.closest_anchors;
        if data_ready.is_high() {
            // info!("Data ready");
            seed_led.set_high();

            spi.setup_transaction(NonZero::new(8).unwrap()).unwrap();
            let mut buf = [0, 0, 0, 0, 0, 0, 0, 0];
            match spi.transfer(&mut buf) {
                Ok(rx) => {
                    // info!("{rx:?}");
                    // Validate the data as well as possible
                    if &rx[5..8] == &[254, 0, 255] && ((rx[0] as usize) < NUM_ANCHORS) {
                        anchors.distances[rx[0] as usize] = f32::from_le_bytes(
                            rx[1..5].try_into().expect("slice with incorrect length"),
                        );
                        if rx[0] == NUM_ANCHORS as u8 - 1 {
                            let new_mix = anchors.recalculate();
                            info!("new_mix: {new_mix:?}");
                            info!("buffer_anchors: {:?}", anchors.buffer_anchors);
                            info!("closest_anchors: {:?}", anchors.closest_anchors());
                            mix.lock(|mix| *mix = new_mix);
                            closets_anchors.lock(|c| *c = anchors.closest_anchors());
                        }
                    }
                }
                Err(e) => warn!("Transfer failed: {e:?}"),
            }
            spi.end_transaction().unwrap();
        } else {
            seed_led.set_low();
        }

        // get all hardware
        // let adc1 = &mut ctx.local.cr.adc1;

        // update all the hardware
        // if let Ok(data) = adc1.read(pot1.get_pin()) {
        //     pot1.update(data);
        //     ctx.shared.pot1.lock(|pot| *pot = pot1.get_value());
        // }
        // if let Ok(data) = adc1.read(pot2.get_pin()) {
        //     pot2.update(data);
        //     ctx.shared.pot2.lock(|pot| *pot = pot2.get_value());
        // }
        // led1.update();
        // led2.update();
        // switch1.update();
        // switch2.update();
        // encoder.update();

        let voice_loader = ctx.local.voice_loader;
        let sd_card = ctx.local.sd_card;
        voice_loader.update(sd_card);
    }
}
