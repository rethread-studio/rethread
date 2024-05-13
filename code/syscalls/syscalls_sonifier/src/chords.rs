    use std::time::Duration;

use knyst::{prelude::*, envelope::envelope_gen, gen::filter::svf::{svf_dynamic, SvfFilterType, svf_filter}};
use rand::{thread_rng, Rng};

pub struct ChordPlayer {
    chord_amp: Handle<RampHandle>,
    chord_amp_setter: Handle<GenericHandle>,
    out_bus: Handle<GenericHandle>,
}
impl ChordPlayer {
    pub fn new(main_out: Handle<GenericHandle>) -> Self {

        knyst_commands().to_top_level_graph();
    let chord_amp_setter = bus(1).set(0, 1.0).set_mortality(false);
    let chord_amp = ramp(1.0)
        .value(chord_amp_setter)
        .time(0.01)
        .set_mortality(false);
    let out_bus = bus(4);

    let mut eq = vec![];
    for i in 0..4 {
        let sig = svf_filter(SvfFilterType::Bell, 1000., 1.2, -3.6).input(out_bus.out(i)*chord_amp);
        eq.push(sig);
    }
    for i in 0..4 {
    main_out.set(i,eq[i]);
    }
        Self {
            chord_amp,
            chord_amp_setter,
            out_bus ,
        }
    }
    pub fn set_amp(&mut self, amp:f32) {
        self.chord_amp_setter.set(0, amp);
    }
    pub fn set_amp_after_duration(&mut self, amp:f32, dur: Duration) {

                            let chord_amp = self.chord_amp_setter;
                            std::thread::spawn(move || {
                                std::thread::sleep(dur);
                                chord_amp.set(0, 0.0);
                            });
    }
    pub fn chord(&self,
    new_chord: &[f32],
    length_min: f32,
    length_max: f32,
    ) {
        changed_harmony_chord(new_chord, self.chord_amp, length_min, length_max, self.out_bus);
    }
}

fn changed_harmony_chord(
    new_chord: &[f32],
    amp: Handle<RampHandle>,
    length_min: f32,
    length_max: f32,
    out_bus: Handle<GenericHandle>,
) {
    knyst_commands().to_top_level_graph();
    let mut rng = thread_rng();
    if rng.gen::<f32>() > 0.1 {
        println!("Playing harmony change chord");
        for f in new_chord {
            let length = rng.gen_range(length_min..length_max);
            let speaker = rng.gen_range(0..4);
            let filtered_noise = upload_graph(
                knyst_commands()
                    .default_graph_settings()
                    .num_outputs(1)
                    .num_inputs(0),
                || {
                    let input_amp = graph_input(0, 1);
                    let env = envelope_gen(
                        0.0,
                        vec![(1.0, 3.), (1.0, length - 5.), (0.0, 2.)],
                        knyst::envelope::SustainMode::NoSustain,
                        StopAction::FreeGraph,
                    );
                    let source = white_noise();
                    let mut sigs = vec![];
                    for i in 0..5 {
                        let freq_detune = [1.0, 1.001, 0.999, 1.002, 0.998][i];
                        let q_env = envelope_gen(
                            1.0 / rng.gen_range(0.001..0.008),
                            vec![(1. / 0.0003, length)],
                            knyst::envelope::SustainMode::NoSustain,
                            StopAction::Continue,
                        );

                        let sig = svf_dynamic(SvfFilterType::Band)
                            .cutoff_freq(f * freq_detune)
                            .q(q_env)
                            .gain(0.0)
                            .input(source);
                        sigs.push(sig);
                    }
                    let sig = sigs[0] + sigs[1] + sigs[2] + sigs[3] + sigs[4];
                    let sig = sig * env * 0.0002 * rng.gen_range(0.3..1.0);
                    graph_output(0, sig);
                },
            );
            // filtered_noise.set(0, amp);
            out_bus.set(speaker, filtered_noise);
            // graph_output(speaker, filtered_noise);
        }
    }
}
