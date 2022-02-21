(
SynthDef(\softy, {
	var sig, env, freq = \freq.kr(220), rel = \rel.kr(2);
	env = Env.perc(\atk.kr(0.1), rel, curve: [\c0.kr(\cub), \c1.kr(\cub)]).kr(2);
	sig = Resonz.ar(PinkNoise.ar(mul: env), freq, 0.007, mul: 20);
	sig = LPF.ar(sig, Line.ar(100, 4000, rel/2));
	sig = sig * \amp.kr(0.5);
	sig = Pan2.ar(sig, \pan.kr(0));
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
SynthDef(\tick2, {
	var sig, env, rq = \rq.kr(0.1);
	env = Env.perc(\atk.kr(0), \rel.kr(0.05), curve: [\c0.kr(-4), \c1.kr(-4)]).ar(2);
	sig = Impulse.ar(0);
	sig = sig * 0.5;
	// high freq and rq values causes the filter to blow up violently
	sig = RHPF.ar(sig, \freq.kr(1000).min(18000).max(20), rq.min(5)) * env;
	sig = Pan2.ar(sig, \pan.kr(0)) * \amp.kr(1.0) * 10;
	sig = sig.tanh; // Should never happen, but better to soft clip
	sig = AnalogTape.ar(sig, 0.0, 0.4, 0.1, oversample: 3);
	Out.ar(\out.kr(0), sig);
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


)

Synth(\sine, [\atk, 0.001, \rel, 0.5])
Synth(\sine_sweep, [\length, 7, \start_freq, 400, \atk, 2, \curve, -7]);

(
// Synth(\sine_sweep, [\length, 7, \start_freq, 400, \atk, 2, \curve, -7]);
// Synth(\sine_sweep, [\length, 7, \start_freq, 10000, \atk, 5, \curve, -20]);
Synth(\sine_sweep, [\length, 5, \start_freq, 12000, \end_freq, 21, \atk, 3, \rel, 2, \curve, -17, \pan, 0.5]);
Synth(\sine_sweep, [\length, 4, \start_freq, 10000, \end_freq, 32, \atk, 2, \rel, 1.5, \curve, -12, \pan, -0.5]);
Synth(\sine_sweep, [\length, 3, \start_freq, 10000, \end_freq, 35, \atk, 1.8, \rel, 1, \curve, -17]);
)


// START !!! evaluate one by one when it is time

(
// with reverb
~outBus = Bus.audio(s, 2);
~rev = Synth(\medium_reverb, [\in, ~outBus, \mix, 0.15]);

)

(

Pdef(\t2_1, Pbind(\instrument, \tick2,
	\freq, Pwhite(6000, 6500),
	\rq, 0.1,
	\dur, Prand([Pseq([0.125], 2), 0.25, Pseq([0.33, 0.33, 0.33, 1.0]*0.125)], inf),
	\amp, 0.5,
	\atk, 0.002,
	\out, ~outBus
)).play;
)

// Start descending sine tone into the sub bass?
(

Pdef(\r2d2, Pbind(\instrument, \sine,
	\dur, Pseq([0.07], 10),
	\atk, 0.001,
	\sus, 0.1,
	\rel, 0.01,
	\amp, 0.1,
	\freq, Pxrand(([60, 61, 62, 63 ,64 ,65, 66, 67, 68, 69, 70, 71, 72].midicps * 4), inf),
	\out, 0,
)).play;
{
	1.0.wait;
Pdef(\t3_1, Pbind(\instrument, \tick3,
	\freq, Pwrand([Pwhite(14000, 15000, 1), Pwhite(7000, 7100, 1)], [10, 1], inf),
	\rq, 0.02,
	\dur, Pseq([0.02, Prand([Pseq([0.125], 2), 0.25, 0.5, Pseq([0.33, 0.33, 0.33]*0.125)], inf)]),
	\pan, Prand([-0.3, 0.3], inf),
	\atk, 0.001,
	\amp, 0.05,
	\out, ~outBus
)).play;
Pdef(\t2_1, Pbind(\instrument, \tick2,
	\freq, Pwhite(6000, 6500),
	\rq, 0.1,
	\dur, Prand([Pseq([0.125], 2), Pseq([0.33, 0.33, 0.33]*0.125)], inf),
	\amp, 0.5,
	\atk, 0.002,
	\out, ~outBus
)).play;
}.fork;


)
(
Synth(\sine_sweep, [\length, 15, \start_freq, 500, \atk, 14, \curve, 0, \amp, 0.2]);
Pdef(\dn4, Pbind(\instrument, \dist_noise,
	\freq, Pwhite(14000, 15000),
	\dur, Prand([1, 5, 3, 8], inf),
	\rel, Pwhite(0.3, 1.0),
	\amp, 0.1,
	\out, ~outBus
)).play;
)
(

Pdef(\dn1, Pbind(\instrument, \dist_noise,
	\freq, Pwhite(12000, 12500),
	\dur, Prand([0.5, 1.25, 3, 4], inf),
	\rel, Pwhite(0.05, 0.25),
	\out, ~outBus
)).play;


Pdef(\dn3, Pbind(\instrument, \dist_noise,
	\freq, Pwhite(5000, 5100),
	\dur, Prand([0.5, 1, 1.25, 3, 6], inf),
	\rel, Pwhite(0.02, 0.05),
	\amp, 0.1,
	\out, ~outBus
)).play;

)

// Fade in this part!!
( // No tick, longer noise bursts
Pdef(\t2_1).stop;
Pdef(\t3_1).stop;
Pdef(\t3_2).stop;

Pdef(\dn4).stop;
Pdef(\dn1).stop;
Pdef(\dn3).stop;

/*Pdef(\r2d2, Pbind(\instrument, \sine,
	\dur, Pseq([0.07], 30),
	\atk, 0.001,
	\sus, 0.1,
	\rel, 0.01,
	\amp, Pgeom(0.01, 1.08) * 1.5,
	\freq, Pxrand(([60, 61, 62, 63 ,64 ,65].midicps * 4), inf) * Pgeom(1.0, 1.005),
	\out, 0,
)).play;*/

{
2.wait;

Pdef(\dn4, Pbind(\instrument, \dist_noise,
	\freq, Pwhite(14000, 15000),
	\dur, Prand([1, 3, 3, 8], inf),
	\rel, Pwhite(1.0, 3.0),
	\amp, 0.1,
	\out, ~outBus
)).play;
Pdef(\dn3, Pbind(\instrument, \dist_noise,
	\freq, Pwhite(5000, 5100),
	\dur, Prand([0.5, 1, 1.25], inf),
	\rel, Pwhite(0.5, 1.0),
	\amp, 0.1,
	\out, ~outBus
)).play;
Pdef(\dn1, Pbind(\instrument, \dist_noise,
	\freq, Pwhite(12000, 12500),
	\dur, Prand([0.5, 1.25, 1.0, 1.5], inf),
	\rel, Pwhite(0.5, 1.0),
	\out, ~outBus
)).play;
Pdef(\dn2, Pbind(\instrument, \dist_noise,
	\freq, Pwhite(7000, 7100),
	\dur, Prand([0.33], inf),
	\rel, 0.45,
	\amp, 0.08,
	\out, ~outBus
)).play;
}.fork;
)

(

Pdef(\r2d2, Pbind(\instrument, \sine,
	\dur, Pseq([0.08], 40),
	\atk, 0.001,
	\sus, 0.1,
	\rel, 0.01,
	\amp, Pseq([Pgeom(0.01, 1.12, 20),Pgeom(0.1, 0.95, 20)]),
	\freq, Prand(([60, 61, 62, 63 ,64 ,65, 66, 67, 68, 69, 70, 71, 72].midicps * 4.5), inf),
	\out, 0,
)).play;

~rootFreq = 60.midicps;
~s53 = Scale.chromatic('et53');
~playChord = { |chord, length = 3|
	{
		var numPitches = chord.size;
		chord.do { |degree|
			var freq = ~s53.degreeToFreq(degree, ~rootFreq, 0);
			Synth(\softy, [\freq, freq, \amp, 1.0/numPitches,\atk, length*0.3, \rel, length*0.7, \out, ~outBus, \pan, rrand(-0.5, 0.5)]);
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

Pdef(\dn4, Pbind(\instrument, \dist_noise,
	\freq, Pwhite(14000, 15000),
	\dur, Prand([2, 3, 4, 6], inf),
	\rel, Pwhite(0.1, 0.3),
	\amp, 0.1,
	\out, ~outBus
)).play;
Pdef(\dn2).stop;
Pdef(\dn1, Pbind(\instrument, \dist_noise,
	\freq, Pwhite(12000, 12500),
	\dur, Prand([0.5, 1.25, 1.0, Pseq([0.33, 0.33, 0.33]), Pseq([0.33, 0.33, 0.33]*0.5), Pseq([0.125], 4)], inf),
	\rel, Pwhite(0.02, 0.15),
	\out, ~outBus
)).play;
Pdef(\dn3, Pbind(\instrument, \dist_noise,
	\freq, Pwhite(5000, 5100),
	\dur, Prand([1, 2, 5, 6, 7], inf),
	\rel, Pwhite(0.8, 1.0),
	\amp, 0.1,
	\out, ~outBus
)).play;

)
(

~chordRoutine2 = Routine({
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

Pdef(\r2d2, Pbind(\instrument, \sine,
	\dur, Pseq([0.08], inf),
	\atk, 0.0001,
	\sus, 0.07,
	\rel, 0.001,
	\amp, Prand([Pgeom(0.02, 1.08, 20), Pgeom(0.04, 1.1, 10),Pgeom(0.1, 0.95, 20), Pgeom(0.08, 0.92, 10)], inf) *  Prand([Pgeom(0.5, 1.01, 50), Pgeom(1.0, 0.98, 40),Pgeom(0.7, 0.95, 20), Pgeom(0.7, 1.02, 15)], inf),
	\freq, Prand([Pseq([1500], 10), Prand(([60, 61, 62, 63 ,64 ,65, 66, 67, 68, 69, 70, 71, 72].midicps * 4.5), 5)], inf),
	\out, 0,
)).play;

Pdef(\dn3, Pbind(\instrument, \dist_noise,
	\freq, Pwhite(5000, 5100),
	\dur, Prand([1, 2, 5, 6, 7], inf),
	\rel, Pwhite(0.8, 1.0),
	\amp, 0.1,
	\out, ~outBus
)).play;
Pdef(\dn2).stop;
)

(
~chordRoutine.stop;


Pdef(\dn1, Pbind(\instrument, \dist_noise,
	\freq, Pwhite(12000, 12500),
	\dur, Prand([0.5, 1.25, 3, 4], inf),
	\rel, Pwhite(0.05, 0.25),
	\out, ~outBus
)).play;


Pdef(\dn3, Pbind(\instrument, \dist_noise,
	\freq, Pwhite(5000, 5100),
	\dur, Prand([0.5, 1, 1.25, 3, 6], inf),
	\rel, Pwhite(0.02, 0.05),
	\amp, 0.1,
	\out, ~outBus
)).play;
Pdef(\t2_1, Pbind(\instrument, \tick2,
	\freq, Pwhite(6000, 6500),
	\rq, 0.1,
	\dur, Prand([Pseq([0.125], 2), Pseq([0.33, 0.33, 0.33]*0.125)], inf),
	\amp, 0.5,
	\atk, 0.002,
	\out, ~outBus
)).play;
)

(
Synth(\sine_sweep, [\length, 5, \start_freq, 12000, \end_freq, 10000, \atk, 3, \rel, 2, \curve, -17, \pan, 0]);

Pdef(\r2d2, Pbind(\instrument, \sine,
	\dur, Pseq([0.08], inf),
	\atk, 0.0001,
	\sus, 0.07,
	\rel, 0.001,
	\amp, Prand([Pgeom(0.02, 1.08, 20), Pgeom(0.04, 1.1, 10),Pgeom(0.1, 0.95, 20), Pgeom(0.08, 0.92, 10)], inf),
	\freq, Prand([Pseq([2000], 5), Prand(((60..84).midicps * 5), 5)], inf),
	\out, ~outBus,
)).play;
)

(
Pdef(\r2d2).stop;
Synth(\sine_sweep, [\length, 5, \start_freq, 12000, \end_freq, 21, \atk, 3, \rel, 2, \curve, -20, \pan, 0.5]);
Synth(\sine_sweep, [\length, 4, \start_freq, 10000, \end_freq, 32, \atk, 2, \rel, 1.5, \curve, -17, \pan, -0.5]);
{
	2.wait;
Pdef(\r2d2, Pbind(\instrument, \sine,
	\dur, Pseq([0.15], inf),
	\atk, 0.0001,
	\sus, 0.07,
	\rel, 0.001,
	\amp, Prand([Pgeom(0.02, 1.08, 20), Pgeom(0.04, 1.1, 10),Pgeom(0.1, 0.95, 20), Pgeom(0.08, 0.92, 10)], inf),
	\freq, Prand([Pseq([200], 5), Prand(((60..84).midicps * 0.25), 5)], inf),
	\out, ~outBus,
)).play;
}.fork;
)
