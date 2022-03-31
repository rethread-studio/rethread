// slowdown sound 1; remake from Brytpunkt
// 1. high pitched steady sine tone
// 2. mid freq noisy tone, crescendo up to nothing with click
// 3. suddenly cut high pitched and crescendo, play low frequency tone

(
SynthDef(\windy, { |gate = 1, amp = 1, ampLagTime = 0.1 freq = 200, freqLagTime = 0.1 |
	var osc = BrownNoise.ar(0.5), env, focus, outs, freqs;
	freq = Lag3.kr(freq, freqLagTime);
	amp = amp.lag(ampLagTime);
	env = EnvGen.kr(Env(
		levels: [0, 1, 0],
		times: [\atk.kr(1), \rel.kr(1)],
		curve: [\curve_atk.kr(0), \curve_rel.kr(0)],
		releaseNode: 1),
	gate: gate,
	doneAction: 2);

	freqs = [freq * [2, 2.2], freq * [1.0, 1.02], freq * 5, freq * 3 + 10];
	focus = [LFNoise1.kr(4).range(0.001, 0.001), LFNoise2.kr(1.1).range(0.0001, 0.01), LFNoise2.kr(0.2).range(0.001, 0.05)];
	outs = Resonz.ar(osc, freqs, focus);
	outs = Mix.ar(outs);

	outs = (outs*100).tanh * 0.1;

	Out.ar(\out.kr(0), Pan2.ar(outs*env*amp));
}).add;

SynthDef(\tick3, {
	var sig, env, rq = \rq.kr(0.3);
	env = Env.perc(\atk.kr(0), \rel.kr(0.5), curve: [\c0.kr(-4), \c1.kr(-4)]).ar(2);
	sig = Impulse.ar(0);
	sig = sig * 0.5;
	// high freq and rq values causes the filter to blow up violently
	sig = RHPF.ar(sig, \freq.kr(1000).min(18000).max(20), rq.min(5)) * env;
	sig = Pan2.ar(sig, \pan.kr(0)) * \amp.kr(1.0) * 10;
	sig = (sig*7).tanh;
	sig = AnalogTape.ar(sig, 0.0, 0.4, 0.1, oversample: 3);
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\low_rumble_filter, {
	var in = In.ar(\in.kr(10), 2), sig;
	sig = in;

	sig = AnalogTape.ar(sig, 0.8, 0.7, 0.5, oversample: 3);
	sig = AnalogVintageDistortion.ar(
        sig,
        drivegain: 0.5,
        bias: 0.1,
        lowgain: -3.dbamp,
        highgain: -9.dbamp,
        shelvingfreq: 600,
        oversample: 2,
    );
	sig = LPF.ar(sig, \lpf.kr(500)) * \amp.kr(0.5);

	Out.ar(\out.kr(0), sig);
}).add;
)


(
~lowBus = Bus.audio(s, 2);
~lowFilter = Synth(\low_rumble_filter,  [\in, ~lowBus, \lpf, 300, \amp, 0.2]);
Synth(\windy, [\freq, 15, \out, ~lowBus, \amp, 0.2, \atk, 0.01]);
Synth(\windy, [\freq, 20, \out, ~lowBus, \amp, 0.2, \atk, 0.01]);
)

(
var lead_up_time = 6, cresc_time = 2;

// with reverb
~revBus = Bus.audio(s, 2);
~rev = Synth(\medium_reverb, [\in, ~revBus, \mix, 0.15]);

~lowBus = Bus.audio(s, 2);
~lowFilter = Synth(\low_rumble_filter,  [\in, ~lowBus, \lpf, 100, \amp, 0.1, \out, ~revBus]);


{
// high pitch
{
	var sig = SinOsc.ar([3500, 3520], mul: 0.125);
	sig = sig * Env([0, 1.0, 0], [lead_up_time, 0.001]).ar(2);
	sig
}.play;

// mid freq noisy tone
	(lead_up_time - cresc_time).wait;
	~cresc = Synth(\windy, [\freq, 100, \out, ~revBus, \amp, 0.8, \atk, cresc_time, \curve_atk, 7, \rel, 0]);

	cresc_time.wait;
	~cresc.release;
	Synth(\tick3, [\freq, 8000, \out, ~revBus]);
	Synth(\tick3, [\freq, 12000, \out, ~revBus]);
	// low pitch rumble
	~lowRumble = Synth(\windy, [\freq, 15, \out, ~lowBus, \amp, 0.2, \atk, 0.0, \rel, 5]);
	// lower pitch
	{
		var sig = SinOsc.ar([3500, 3520]*0.25, mul: 0.125);
		sig = sig * Env([0.5, 0], [2]).ar(2);
		Out.ar(~revBus.index, sig);
	}.play;
	0.5.wait;
	~lowRumble.release;
	// Synth(\windy, [\freq, 20, \out, ~lowBus, \amp, 0.2, \atk, 0.01]);
}.fork;
)
[36].do {|midi| Synth(\fr_noisy, [\freq, midi.midicps, \duration, 10]); };


~lorenzSynth = Synth(\windy, [\freq, 300, \out, ~revBus, \amp, 0.1]);
~lorenzSynth = Synth(\windy, [\freq, 100, \out, ~revBus, \amp, 0.1]);
~lorenzSynth = Synth(\windy, [\freq, 20, \out, ~revBus, \amp, 0.1]);
~lorenzSynth = Synth(\windy, [\freq, 15, \out, ~revBus, \amp, 0.1]);

~lorenzSynth.release