use std::time::Duration;

use knyst::{
    audio_backend::JackBackend,
    envelope::{Curve, Envelope},
    prelude::*,
    wavetable::{Wavetable, WavetableOscillatorOwned},
};
use rand::{thread_rng, Rng};

pub struct AudioEngine {
    graph: Graph,
    backend: JackBackend,
    graph_settings: GraphSettings,
}

impl AudioEngine {
    pub fn new() -> Self {
        let mut backend = JackBackend::new("unfold").unwrap();

        let sample_rate = backend.sample_rate() as f32;
        let block_size = backend.block_size().unwrap_or(64);
        println!("sr: {sample_rate}, block: {block_size}");
        let resources = Resources::new(ResourcesSettings {
            sample_rate,
            ..Default::default()
        });
        let graph_settings = GraphSettings {
            block_size,
            sample_rate,
            latency: Duration::from_millis(50),
            num_outputs: 2,
            ..Default::default()
        };
        let mut graph: Graph = Graph::new(graph_settings);
        backend.start_processing(&mut graph, resources).unwrap();
        println!("AudioEngine started with settings {graph_settings:#?}");
        Self {
            backend,
            graph,
            graph_settings,
        }
    }

    pub fn spawn_sine(&mut self, freq: f32, pan: f32) {
        let node = self
            .graph
            .push_graph(sine_tone_graph(freq, 0.01, 0.05, 2.0, pan, self.graph_settings).unwrap());
        self.graph.connect(node.to_graph_out().channels(2));
        self.graph.commit_changes();
        self.graph.update();
    }
}
impl Default for AudioEngine {
    fn default() -> Self {
        Self::new()
    }
}

/// Returns a Graph containing a sine oscillator multiplied by an envelope that frees the Graph when it reaches the end.
fn sine_tone_graph(
    freq: f32,
    attack: f32,
    amp: f32,
    duration_secs: f32,
    pan_value: f32,
    graph_settings: GraphSettings,
) -> anyhow::Result<Graph> {
    let mut g = Graph::new(graph_settings);
    let sin = g.push_gen(WavetableOscillatorOwned::new(Wavetable::sine()));
    g.connect(constant(freq).to(sin).to_label("freq"))?;
    let env = Envelope {
        points: vec![(amp, attack), (0.0, duration_secs)],
        curves: vec![Curve::Linear, Curve::Exponential(2.0)],
        stop_action: StopAction::FreeGraph,
        ..Default::default()
    };
    let mut env = env.to_gen();
    // TODO: It is very unintuitive that you have to manually start the envelope
    env.start();
    let env = g.push_gen(env);
    let mult = g.push_gen(Mult);
    g.connect(sin.to(mult))?;
    g.connect(env.to(mult).to_index(1))?;
    let pan = g.push_gen(PanMonoToStereo);
    g.connect(mult.to(pan))?;
    // let mut rng = thread_rng();
    g.connect(constant(pan_value).to(pan).to_label("pan"))?;
    // g.connect(Connection::graph_output(pan).channels(2))?;
    g.connect(Connection::graph_output(pan))?;
    g.connect(Connection::graph_output(pan).from_index(1).to_index(1))?;
    g.commit_changes();
    Ok(g)
}
