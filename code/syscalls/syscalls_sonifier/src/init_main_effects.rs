use knyst::{
    db_to_amplitude,
    gen::{
        dynamics::randja_compressor::{
            randja_compressor, RandjaCompressor, RandjaCompressorHandle,
        },
        filter::{
            self,
            one_pole::{one_pole_hpf, one_pole_lpf},
            svf::{svf_dynamic, svf_filter, SvfFilterType},
        },
        random::random_lin,
    },
    handles::{
        bus, graph_output, GenericHandle, Handle, HandleData, InputChannelHandle,
        OutputChannelHandle,
    },
};
use knyst_airwindows::galactic;

use crate::{gen::soft_clipper, background_noise::stderr_dump};

pub fn init_main_effects(out_bus: Handle<GenericHandle>) {
    // Channel 1: 0-3
    // Every other channel is also eventually passed here
    let main_out_bus = bus(4);
    for i in 0..4 {
        main_out_bus.set(i, out_bus.out(i));
    }
    // TODO: Multiband compressor
    // Limiter
    let l0 = limiter(-4.8)
        .input_left(main_out_bus.out(0))
        .input_right(main_out_bus.out(1));
    let l1 = limiter(-4.8)
        .input_left(main_out_bus.out(2))
        .input_right(main_out_bus.out(3));
    // Eq
    let mut eq = vec![];
    // LowShelf 75hz 3.7db
    for i in 0..4 {
        let limiter = if i < 2 { l0 } else { l1 };
        let sig = svf_filter(SvfFilterType::LowShelf, 75., 1.2, 3.7).input(limiter.out(i % 2));
        eq.push(sig);
    }
    // Bell 288 -0.6db
    for i in 0..4 {
        let sig = svf_filter(SvfFilterType::Bell, 288., 1.2, -0.6).input(eq[i]);
        eq[i] = sig;
    }
    // Bell 309 -1.7db
    for i in 0..4 {
        let sig = svf_filter(SvfFilterType::Bell, 309., 1.2, -5.7).input(eq[i]);
        eq[i] = sig;
    }
    // Bell 1947 -2db
    for i in 0..4 {
        let sig = svf_filter(SvfFilterType::Bell, 1947., 1.2, -3.0).input(eq[i]);
        eq[i] = sig;
    }
    // HighShelf 6139 -1.5db
    for i in 0..4 {
        let sig = svf_filter(SvfFilterType::HighShelf, 6139., 1.2, -3.5).input(eq[i]);
        eq[i] = sig;
    }
    for i in 0..4 {
        let sig = svf_filter(SvfFilterType::HighShelf, 10139., 1.2, -4.5).input(eq[i]);
        eq[i] = sig;
    }

    let mut eq2 = vec![];
    // Moving eq
    let f = random_lin().freq(2.5).powf(2.0) * 8000. + 200.;
    let g = random_lin().freq(0.1) * 13. - 6.;
    // stderr_dump().input(g).set_mortality(false);
    for i in 0..4 {
        let sig = svf_dynamic(SvfFilterType::Bell)
            .input(eq[i])
            .cutoff_freq(f)
            .q(0.8)
            .gain(g);
        eq2.push(sig);
    }

    // Add a soft clipper to the output and boost the output level
    let soft_clip = soft_clipper()
        .in0(eq2[0])
        .in1(eq2[1])
        .in2(eq2[2])
        .in3(eq2[3])
        .boost_db(9.)
        .limit_db(-1.);
    // graph_output(0, soft_clip * 0.1);

    let mut eq = vec![];
    for i in 0..4 {
        // let sig = one_pole_hpf().sig(one_pole_hpf().cutoff_freq(2000.).sig(soft_clip.out(i))).cutoff_freq(2000.);
        let sig = svf_filter(SvfFilterType::High, 100., 1.2, -120.).input(soft_clip.out(i));
        eq.push(sig);
    }
    for i in 0..4 {
        graph_output(i, eq[i] * 0.1);
    }

    // Subwoofer
    let sub = soft_clip.out(0) + soft_clip.out(1) + soft_clip.out(2) + soft_clip.out(3);
    let sub = one_pole_lpf().sig(sub * 0.25).cutoff_freq(150.);
    let sub = one_pole_lpf().sig(sub).cutoff_freq(150.);
    // let sub = compressor().input_left(sub);
    graph_output(4, sub.out(0) * db_to_amplitude(-20.));
    // for i in 0..4 {
    //     graph_output(i, main_out_bus.out(i));
    // }

    // Channel 2: 4-7 Gain up, compressor, reverb
    let c0 = compressor()
        .input_left(out_bus.out(4))
        .input_right(out_bus.out(5));
    let c1 = compressor()
        .input_left(out_bus.out(6))
        .input_right(out_bus.out(7));
    let rev0 = galactic()
        .size(1.0)
        .brightness(0.8)
        .detune(0.0)
        .mix(1.0)
        .replace(0.3)
        .left(one_pole_lpf().sig(c0.out(0)).cutoff_freq(4000.))
        .right(one_pole_lpf().sig(c0.out(1)).cutoff_freq(4000.));
    // .left(out_bus.out(4))
    // .right(out_bus.out(5));
    let rev1 = galactic()
        .size(1.0)
        .brightness(0.8)
        .detune(0.0)
        .mix(1.0)
        .replace(0.3)
        // .left(c1.out(0))
        // .right(c1.out(1));
        .left(one_pole_lpf().sig(c1.out(0)).cutoff_freq(4000.))
        .right(one_pole_lpf().sig(c1.out(1)).cutoff_freq(4000.));
    // .left(out_bus.out(6))
    // .right(out_bus.out(7));
    main_out_bus.set(0, (rev0 * 0.6 + c0 * 0.4) * 1.5);
    main_out_bus.set(2, (rev1 * 0.6 + c1 * 0.4) * 1.5);
    // graph_output(4, (rev0 * 0.4 + c0 * 0.6) * 1.5);
    // graph_output(6, (rev1 * 0.4 + c1 * 0.6) * 1.5);

    // Channel 3: 8-11
    // TODO: Multiband compressor
    // To compensate for the multiband compressor, lower gain
    let gain_compensation = db_to_amplitude(-20.);
    // Limiter
    let threshold = -16.8;
    // let threshold = -6.8;
    let l0 = limiter(threshold)
        .input_left(out_bus.out(8) * gain_compensation)
        .input_right(out_bus.out(9) * gain_compensation);
    let l1 = limiter(threshold)
        .input_left(out_bus.out(10) * gain_compensation)
        .input_right(out_bus.out(11) * gain_compensation);
    // Eq -4.8db at 321hz
    let mut eqs = vec![];
    for i in 0..4 {
        let input = if i < 2 { l0 } else { l1 };
        let sig = svf_filter(SvfFilterType::Bell, 321., 1.2, -4.8).input(input.out(i % 2));
        eqs.push(sig);
        main_out_bus.set(i, sig);
        // graph_output(i + 8, sig);
    }
    // Send 1 to smooth rev
    let ins = [eqs[0].out(0), eqs[1].out(0), eqs[2].out(0), eqs[3].out(0)];
    let outs = [
        main_out_bus.input_handle(0),
        main_out_bus.input_handle(1),
        main_out_bus.input_handle(2),
        main_out_bus.input_handle(3),
    ];
    smooth_rev_chain(&ins, &outs);
    // Send 2 to smooth bass
    // graph_output(8, l0);
    // graph_output(10, l1);
    // for i in 8..=11 {
    //     graph_output(i, out_bus.out(i));
    // }

    // Channel 4: 12-15
    let ch4_amp = db_to_amplitude(2.66);
    // Goes into channel 2 through the compressor, its first effect
    c0.input_left(out_bus.out(12) * ch4_amp);
    c0.input_right(out_bus.out(13) * ch4_amp);
    c1.input_left(out_bus.out(14) * ch4_amp);
    c1.input_right(out_bus.out(15) * ch4_amp);
    // for i in 12..=15 {
    //     graph_output(i, out_bus.out(i));
    // }

    // Channel 5: 16-19, background rumble
    // for i in 16..=19 {
    //     graph_output(i, out_bus.out(i));
    // }
    for i in 0..4 {
        graph_output(i, out_bus.out(i + 16));
    }
}

fn compressor() -> Handle<RandjaCompressorHandle> {
    let sample_rate = 48000.;
    let attack = 0.001;
    let release = 0.118;
    let mut com = RandjaCompressor::new();
    let threshold = 0.4;
    com.set_threshold(threshold);
    com.set_attack(attack * sample_rate);
    com.set_release(release * sample_rate);
    com.set_ratio(1.0 / 2.61);
    com.set_output(1.0);
    com.upload()
}

fn limiter(threshold_db: f32) -> Handle<RandjaCompressorHandle> {
    let sample_rate = 48000.;
    let attack = 0.01;
    let release = 0.25;
    let mut com = RandjaCompressor::new();
    let threshold = db_to_amplitude(threshold_db);
    println!(
        "Limiter threshold db: {threshold_db}, output: {}",
        1.0 / threshold
    );
    com.set_threshold(threshold);
    com.set_attack(attack * sample_rate);
    com.set_release(release * sample_rate);
    com.set_ratio(1.0 / 100.);
    com.set_output(1.0 / threshold);
    com.upload()
}

/// Start the smooth_rev effects chain
fn smooth_rev_chain(input: &[Handle<OutputChannelHandle>], output: &[Handle<InputChannelHandle>]) {
    // Gain up 3.49 db
    // Limiter -19db

    let l0 = limiter(-19.).input_left(input[0]).input_right(input[1]);
    let l1 = limiter(-19.).input_left(input[2]).input_right(input[3]);
    //
    let mut eq = vec![];
    // Eq
    // LowShelf 61hz -20db
    for i in 0..4 {
        let limiter = if i < 2 { l0 } else { l1 };
        let sig = svf_filter(SvfFilterType::LowShelf, 61., 1.2, -20.0).input(limiter.out(i % 2));
        eq.push(sig);
    }
    // Bell 105hz -5db
    for i in 0..4 {
        let sig = svf_filter(SvfFilterType::Bell, 105., 1.2, -5.0).input(eq[i]);
        eq[i] = sig;
    }
    // Bell 1060hz -5.4b
    for i in 0..4 {
        let sig = svf_filter(SvfFilterType::Bell, 1060., 1.2, -5.4).input(eq[i]);
        eq[i] = sig;
    }
    // HighShelf 7546hz -9.4db
    for i in 0..4 {
        let sig = svf_filter(SvfFilterType::HighShelf, 7546., 1.2, -9.4).input(eq[i]);
        eq[i] = sig;
    }

    // Galactic2
    // Galactic
    let rev0 = galactic()
        .size(1.0)
        .brightness(0.93)
        .detune(0.062)
        .mix(1.0)
        .replace(0.77)
        .left(eq[0])
        .right(eq[1]);
    let rev1 = galactic()
        .size(1.0)
        .brightness(0.93)
        .detune(0.062)
        .mix(1.0)
        .replace(0.77)
        .left(eq[2])
        .right(eq[3]);
    let out_amp = db_to_amplitude(-5.89);
    output[0].set(0, rev0.out(0) * out_amp);
    output[1].set(0, rev0.out(1) * out_amp);
    output[2].set(0, rev1.out(0) * out_amp);
    output[3].set(0, rev1.out(1) * out_amp);
}
