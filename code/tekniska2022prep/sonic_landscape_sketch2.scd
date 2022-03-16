// sonic landscape 2

// Snabb hög aktivitet tonar in successivt
// Nedsaktningsljud följt av mer detaljer





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

SynthDef(\sine, {
	var sig, env;
	env = Env.linen(\atk.kr(0.01), \sus.kr(0.5), \rel.kr(0.2)).ar(2);
	sig = SinOsc.ar(\freq.kr(220), mul: \amp.kr(0.5)) * env;
	sig = Pan2.ar(sig, \pan.kr(0));
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\sine_sweep, {
	var sig, env, freq, length = \length.kr(20), atk = \atk.kr(0.1), rel = \rel.kr(0.5);
	freq = Env(levels: [\start_freq.kr(100), \end_freq.kr(20)], times: [length], curve: \curve.kr(-4)).ar(0);
	env = Env.linen(atk, length - atk - rel, rel).kr(2);
	sig = SinOsc.ar(freq) * env * \amp.kr(0.5);
	sig = Pan2.ar(sig);
	Out.ar(\out.kr(0), sig);
}).add;


SynthDef(\dist_noise, {
	var sig, env, trig = Dust.ar(700);
	sig = PinkNoise.ar() * Decay2.ar(trig, 0.0001, 0.1);
	sig = HPF.ar(sig, 1000);
	sig = Resonz.ar(sig, \freq.kr(12500), 0.003) * 100;
	/*sig = Klank.ar(`[
	[8500, 9000, 9500],         // frequencies
	nil,                             // amplitudes (default to 1.0)
	Array.rand(5, 0.1, 2)                // ring times
	],
	sig) * 0.3;*/
	sig = sig + (DPW3Tri.ar(9050, mul: 0.1) * Env.perc(0.5, 0.6, curve: 3).ar(0));
	sig = (sig * 7).tanh * 0.5;
	sig = AnalogVintageDistortion.ar(sig,0,0, highgain: 0.2, oversample:3);
	sig = LeakDC.ar(sig);
	sig = sig * \amp.kr(0.5);
	sig = LPF.ar(sig, \lpf.kr(7000));
	sig = Pan2.ar(sig);
	Env.linen(0.01, 0.03, \rel.kr(0.05)).kr(2);
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\medium_reverb, { | out = 0, amp = 1, mix = 0.3  |
	var sig, wet, in;

	in = In.ar(\in.kr(10), 2);
	mix = mix.lag(\mixLag.kr(10));

	sig = HPF.ar(in, 120);

	/*wet = JPverb.ar(sig, 3.0, 0.9, 4.0, 0.8);
	wet = GVerb.ar(sig, 300, 103, 0.43, 0.51, 15, -5.dbamp, -26.dbamp, -20.dbamp);*/
	wet = Greyhole.ar(sig, \delayTime.kr(0.1), \damp.kr(0.7), \size.kr(1.0), \diff.kr(0.8), \feedback.kr(0.9));

	wet = HPF.ar(wet, 60);

	sig = (in * (1-mix)) + (wet*mix);
	sig = Limiter.ar(sig, 0.95);
	Out.ar(out, sig);
}).add;

SynthDef(\mixer_channel, {
	var sig = In.ar(\in.kr(0), 2);
	Out.ar(\out.kr(0), sig * \amp.kr(1.0));
}).add;
)


(
// with reverb

~revBus = Bus.audio(s, 2);
~rev = Synth(\medium_reverb, [\in, ~revBus, \mix, 0.15]);

~lowBus = Bus.audio(s, 2);
~lowFilter = Synth(\low_rumble_filter,  [\in, ~lowBus, \lpf, 100, \amp, 0.1, \out, ~revBus]);

~highActivityBus = Bus.audio(s, 2);
~highActivityChannel = Synth(\mixer_channel, [\in, ~highActivityBus, \out, ~revBus]);

)
// Hög aktivitet


(
Pdef(\t2_1, Pbind(\instrument, \tick2,
	\freq, Pwhite(5000, 10500),
	\rq, 0.03,
	\dur, Prand([Pseq([0.125], 2), Pseq([0.33, 0.33, 0.33]*0.125)], inf),
	\amp, 0.25,
	\atk, 0.001,
	\out, ~highActivityBus
)).play;
Pdef(\t2_2, Pbind(\instrument, \tick2,
	\freq, Pwhite(100, 150),
	\rq, 0.03,
	\dur, Prand([Pseq([0.125], 2), Pseq([0.33, 0.33, 0.33]*0.125)], inf),
	\amp, 0.25,
	\atk, 0.001,
	\pan, Pwhite(-0.25, 0),
	\out, ~highActivityBus
)).play;
Pdef(\t2_3, Pbind(\instrument, \tick2,
	\freq, Pwhite(10000, 10650),
	\rq, 0.03,
	\dur, Prand([Pseq([0.125], 2), Pseq([0.33, 0.33, 0.33]*0.125)], inf),
	\amp, 0.25,
	\atk, 0.001,
	\pan, Pwhite(0, 0.25),
	\out, ~highActivityBus
)).play;
Pdef(\r2d2, Pbind(\instrument, \sine,
	\dur, Pseq([0.08], inf),
	\atk, 0.0001,
	\sus, 0.07,
	\rel, 0.001,
	\amp, Prand([Pgeom(0.02, 1.08, 20), Pgeom(0.04, 1.1, 10),Pgeom(0.1, 0.95, 20), Pgeom(0.08, 0.92, 10)], inf) *  Prand([Pgeom(0.5, 1.01, 50), Pgeom(1.0, 0.98, 40),Pgeom(0.7, 0.95, 20), Pgeom(0.7, 1.02, 15)], inf),
	\freq, Prand([Pseq([1500], 10), Prand(([60, 61, 62, 63 ,64 ,65, 66, 67, 68, 69, 70, 71, 72].midicps * 4.5), 5)], inf),
	\out, ~highActivityBus,
)).play;
)
(
Pdef(\dn4, Pbind(\instrument, \dist_noise,
	\freq, Pwhite(14000, 15000),
	\dur, Prand([1, 3, 3, 8], inf),
	\rel, Pwhite(1.0, 3.0),
	\amp, Pwhite(0.05,0.1) * 0.75,
	\out, ~highActivityBus
)).play;
Pdef(\dn3, Pbind(\instrument, \dist_noise,
	\freq, Pwhite(5000, 5100),
	\dur, Prand([1, 1.25, 1.5, 2.0], inf),
	\rel, Pwhite(0.5, 1.0),
	\amp, Pwhite(0.05,0.1) * 0.5,
	\out, ~highActivityBus
)).play;
Pdef(\dn1, Pbind(\instrument, \dist_noise,
	\freq, Pwhite(12000, 12500),
	\dur, Prand([01.25, 1.0, 1.5], inf),
	\rel, Pwhite(0.5, 1.0),
	\amp, Pwhite(0.05,0.1) * 0.5,
	\out, ~highActivityBus
)).play;
Pdef(\dn2, Pbind(\instrument, \dist_noise,
	\freq, Pwhite(7000, 7100),
	\dur, Prand([0.33, 0.66], inf),
	\rel, 0.45,
	\amp, Pwhite(0.05,0.08) * 0.5,
	\out, ~highActivityBus
)).play;

)

// Nedsaktning

(
var lead_up_time = 6, cresc_time = 2;

Pdef(\r2d2, Pbind(\instrument, \sine,
	\dur, Pseq([0.08], inf),
	\atk, 0.0001,
	\sus, 0.07,
	\rel, 0.001,
	\amp, Prand([Pgeom(0.02, 1.08, 20), Pgeom(0.04, 1.1, 10),Pgeom(0.1, 0.95, 20), Pgeom(0.08, 0.92, 10)], inf) *  Prand([Pgeom(0.5, 1.01, 50), Pgeom(1.0, 0.98, 40),Pgeom(0.7, 0.95, 20), Pgeom(0.7, 1.02, 15)], inf),
	\freq, Prand([Pseq([1400], 7), Prand(([60, 61, 62, 63 ,64 ,65, 66, 67, 68, 69, 70, 71, 72].midicps * 4.5), 3)], inf),
	\out, ~highActivityBus,
)).play;
{
// high pitch
{
	var sig = SinOsc.ar([3500, 3520], mul: 0.1);
	sig = sig * Env([0, 1.0, 0], [lead_up_time, 0.001]).ar(2);
	sig
}.play;

// mid freq noisy tone
	(lead_up_time - cresc_time).wait;
	~cresc = Synth(\windy, [\freq, 100, \out, ~revBus, \amp, 0.7, \atk, cresc_time, \curve_atk, 7, \rel, 0]);

	cresc_time.wait;
	~cresc.release;
	Pdef(\t2_1).stop;
	Pdef(\t2_2).stop;
	Pdef(\t2_3).stop;
	Pdef(\dn1).stop;
	Pdef(\dn2).stop;
	Pdef(\dn3).stop;
	Pdef(\dn4).stop;
	~highActivityChannel.free;

	Synth(\tick3, [\freq, 8000, \out, ~revBus, \amp, 0.25]);
	Synth(\tick3, [\freq, 12000, \out, ~revBus, \amp, 0.25]);
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
	// Långsammare aktivitet
	Pdef(\r2d2, Pbind(\instrument, \sine,
	\dur, Pseq([0.15], inf),
	\atk, 0.0001,
	\sus, 0.07,
	\rel, 0.001,
	\amp, Prand([Pgeom(0.02, 1.08, 20), Pgeom(0.04, 1.1, 10),Pgeom(0.1, 0.95, 20), Pgeom(0.08, 0.92, 10)], inf),
	\freq, Prand([Pseq([200], 5), Prand(((60..84).midicps * 0.25), 5)], inf),
	\out, ~revBus,
)).play;
}.fork;
)

(
Pdef(\dn1, Pbind(\instrument, \dist_noise,
	\freq, Pwhite(300, 310),
	\dur, Prand([01.25, 1.0, 1.5, 3], inf),
	\rel, Pwhite(0.25, 1.0),
	\amp, 0.05,
	\out, ~revBus
)).play;
)

(
~rootFreq = 60.midicps;
~s53 = Scale.chromatic('et53');
~playChord = { |chord, length = 3|
	{
		var numPitches = chord.size;
		chord.do { |degree|
			var freq = ~s53.degreeToFreq(degree, ~rootFreq, 0);
			Synth(\softy, [\freq, freq, \amp, 1.0/numPitches,\atk, length*0.3, \rel, length*0.7, \out, ~revBus, \pan, rrand(-0.5, 0.5)]);
			// Synth(\sine, [\freq, freq, \amp, 1.0/numPitches, \out, ~outBus]);
			exprand(0.01, 0.025).wait;
		};
	}.fork;
};
~chordRoutine = Routine({
	loop {
		var chord = [
			[-5, 0, 17, 31, 62],
			[-5, 0, 17, 31, 62] + 22,
			[-5, 0, 17, 31, 62] + 9,
			[-5, 0, 17, 31, 62] - 22,
			[-5, 4, 20, 31, 48],
			[-14, 0, 17, 31, 39],
			[-53, 0, 17, 31, 48, 62, 62+17,106, 17+106],
			[-22, 0, 17, 31, 48, 62, 62+17, 62+31,106+9, 31+106],
		].choose,
		length = rrand(3, 12);
		~playChord.(chord, length*0.7);
		length.wait;
	}
}).play();
)
Pdef(\dn1).stop;