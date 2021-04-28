use std::time::Duration;

use crate::audio_interface::{AudioInterface, EventMsg};
use erael_dsp::dsp::*;
use erael_dsp::envelope2::Envelope;
use erael_dsp::synthesis_node::SynthesisNode;
use erael_dsp::wave_guide::WaveGuide;
use erael_dsp::Sample;

use crate::profile::*;

/// Goal:
/// Analyse the call graph and map it to sound parameters in such a way that similarities in different graphs result in similar sounds. Radical differences in the execution result in high level overarching differences in sonification while recognisable gestures are preserved across call graphs.

pub fn generate_wave_guide_synthesis_node(freq: f32, sample_rate: f32) -> SynthesisNode {
    let mut wave_guide = WaveGuide::new(sample_rate);
    let mut envelope = Envelope::new(
        0.0,
        vec![(1.0, 0.01), (1.0, 1.0), (0.0, 1.0)],
        sample_rate as f64,
    );
    wave_guide
        .feedback_level(1.14)
        .exciter_release(3.0)
        .exciter_filter_freq(300.0)
        .feedback_filter_freq(5000.0);
    wave_guide.start(freq);
    envelope.start();
    let mut has_finished = false;

    SynthesisNode::new(Box::new(
        move |resources: &mut Resources, output: &mut [Sample; 2]| -> bool {
            let mut sig = wave_guide.next(resources);
            sig *= envelope.next();
            has_finished = !envelope.playing;
            output[0] += sig;
            output[1] += sig;
            has_finished
        },
    ))
}

pub fn synthesis_node_from_graph_data(graph_data: &GraphData, sample_rate: f32) -> SynthesisNode {
    let mut wave_guide = WaveGuide::new(sample_rate);
    let mut envelope = Envelope::new(
        0.0,
        vec![(1.0, 0.01), (1.0, 5.0), (0.0, 1.0)],
        sample_rate as f64,
    );
    wave_guide
        .feedback_level(0.9999)
        .exciter_release(3.0)
        .exciter_filter_freq(300.0)
        .feedback_filter_freq(5000.0);
    let freq = if let Some(indent) = &graph_data.indentation_profile {
        indent.len() as f64 * 0.001 + 10.
    } else {
        50.
    };
    // wave_guide.start(graph_data.depth_tree.len().min(10000) as f32 + 20.);
    wave_guide.start(freq.clamp(1.0, 15000.) as f32);
    envelope.start();
    let mut has_finished = false;

    SynthesisNode::new(Box::new(
        move |resources: &mut Resources, output: &mut [Sample; 2]| -> bool {
            let mut sig = wave_guide.next(resources);
            sig *= envelope.next();
            has_finished = !envelope.playing;
            output[0] += sig;
            output[1] += sig;
            has_finished
        },
    ))
}

/// Generate a bunch of synthesis nodes and send them to be played all at once
pub fn synthesize_call_graph(
    graph_data: &GraphData,
    duration: f64,
    sample_rate: f32,
    audio_interface: &mut AudioInterface,
) {
    println!("New call graph synth");
    let duration_per_tick = duration / graph_data.depth_tree.len() as f64;
    for (i, tree_node) in graph_data.depth_tree.iter().enumerate() {
        if tree_node.ticks > 2 {
            let delay = i as f64 * duration_per_tick;
            audio_interface.schedule(
                EventMsg::AddSynthesisNode(Some(synthesis_node_from_tree_node(
                    tree_node,
                    sample_rate,
                ))),
                Duration::from_micros((delay * 1000000.) as u64),
            );
        }
    }
}

pub fn synthesis_node_from_tree_node(tree_node: &TreeNode, sample_rate: f32) -> SynthesisNode {
    let mut wave_guide = WaveGuide::new(sample_rate);
    let mut envelope = Envelope::new(
        0.0,
        vec![
            (1.0, 0.01),
            (1.0, tree_node.ticks as f64 * 0.25),
            (0.0, 0.2),
        ],
        sample_rate as f64,
    );
    let freq = (20.0 + tree_node.depth as f32 * 20.).clamp(1.0, 15000.);
    println!("freq: {}", freq);
    wave_guide
        .feedback_level(0.92)
        .exciter_release(0.05)
        .exciter_filter_freq(3000.0)
        .feedback_filter_freq(freq * 2000. / hz_to_midi(freq).powf(1.3));

    // wave_guide.start(graph_data.depth_tree.len().min(10000) as f32 + 20.);
    wave_guide.start(freq.clamp(1.0, 15000.) as f32);
    envelope.start();
    let mut has_finished = false;

    SynthesisNode::new(Box::new(
        move |resources: &mut Resources, output: &mut [Sample; 2]| -> bool {
            let mut sig = wave_guide.next(resources);
            sig *= envelope.next();
            has_finished = !envelope.playing;
            output[0] += sig;
            output[1] += sig;
            has_finished
        },
    ))
}
