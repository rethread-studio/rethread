(
SynthDef(\fm_drone, {
	arg freq=500, mRatio=1, cRatio=1,
	index=1, iScale=5, cAtk=4, cRel=(-4),
	amp=0.2, atk=0.01, rel=3, pan=0, gate = 1,
	out=0, fx=0, fxsend=(-25);
	var car, mod, env, iEnv;

	index = SinOsc.ar(\index_lfo_freq.kr(3)).range(1, LFNoise1.ar(2).range(3, 9));
	// index = 1;

	//amplitude envelope
	env = EnvGen.kr(Env.asr(atk, 1.0, rel,curve:[cAtk,cRel]), gate: gate, doneAction:2);

	//modulator/carrier
	mod = SinOsc.ar(freq * mRatio, mul:freq * mRatio * index);
	car = SinOsc.ar(freq * cRatio + mod) * env * amp;

	car = Pan2.ar(car, pan);

	//direct out/reverb send
	Out.ar(out, car);
	Out.ar(fx, car * fxsend.dbamp);
}).add;

SynthDef(\bubbly_filter, {
	var sig, maxfreq = \maxfreq.kr(2000), minfreq = \minfreq.kr(100), speed = \speed.kr(3), freq, in;
	speed = LFNoise1.kr(2).range(5, 12);
	freq = SinOsc.ar(speed).range(minfreq, maxfreq);
	in = In.ar(\in.kr(10), 2);
	// sig = RLPF.ar(in, freq, 0.1);
	sig = BMoog.ar(in, freq, 0.1, 0.0, 0.95);
	sig = sig + (LocalIn.ar(2).mirror * 0.7);
	sig = [sig[0], DelayN.ar(sig[1], 0.001, 0.001)];
	LocalOut.ar(sig);
	Out.ar(\out.kr(0), sig);
}).add;
)

( // bubbly
var filter_bus = Bus.control(s, 2),
filter = Synth(\bubbly_filter, [\speed, 13, \in, filter_bus]),
drone = Synth(\fm_drone, [\freq, 32, \amp, 0.1, \cRatio, 1, \mRatio, 2, \index, 7, \index_lfo_freq, 7, \iScale, 4, \out, filter_bus]);
)

/// Random FM synth
(
var layers = 20, freq = 100;
{
	var freq = MouseX.kr(40, 1000, \exponential),
	sig = DC.ar(1.0); // 1.0 so that the first sine has a frequency
	layers.do {|i|
		var index = rrand(1, 4).round, ratio = rrand(1, 8).round/rrand(1, 4).round;
		sig = SinOsc.ar(freq * ratio + sig) * freq * index * ratio;
		// multiply by an lfo
		sig = sig * SinOsc.kr(rrand(0.1, 4.0)).range(1.0 - (((layers-i)/layers) * 0.5), 1.0);
	};
	sig = SinOsc.ar(freq + sig) * 0.5;
	sig!2;
}.play;
)



(
// SynthDefs written by Eli Fieldsteel, https://sccode.org/1-5bA
	//fm synth
	SynthDef(\fm, {
		arg freq=500, mRatio=1, cRatio=1,
		index=1, iScale=5, cAtk=4, cRel=(-4),
		amp=0.2, atk=0.01, rel=3, pan=0,
		out=0, fx=0, fxsend=(-25);
		var car, mod, env, iEnv;

		//index of modulation
		iEnv = EnvGen.kr(
			Env(
				[index, index*iScale, index],
				[atk, rel],
				[cAtk, cRel]
			)
		);

		//amplitude envelope
		env = EnvGen.kr(Env.perc(atk,rel,curve:[cAtk,cRel]),doneAction:2);

		//modulator/carrier
		mod = SinOsc.ar(freq * mRatio, mul:freq * mRatio * iEnv);
		car = SinOsc.ar(freq * cRatio + mod) * env * amp;

		car = Pan2.ar(car, pan);

		//direct out/reverb send
		Out.ar(out, car);
		Out.ar(fx, car * fxsend.dbamp);
	}).add;
)
(
var freq = ~s53.degreeToFreq(~chord.choose, 0.midicps, ~rainParams.octave);
Synth(\fm, [
	\freq, freq,
	\cRatio, 4,
	\mRatio, 1,
	\index, 2,
	\iScale, 2,
	\atk, 3,
	\rel, 2,
	\cRel, -12,
	\fx, 10,
	\out, 0,
	\amp, 0.05
]);
)

(
SynthDef(\reverse_thump, {
	var sig, env, freq = \freq.kr(220);
	env = Env.perc(\atk.kr(0.1), \rel.kr(2), curve: [\c0.kr(\cub), \c1.kr(\sine)]).kr(2);
	sig = Resonz.ar(PinkNoise.ar(mul: env), freq, 0.007, mul: 20);
	sig = sig * \amp.kr(0.5);
	sig = Pan2.ar(sig, \pan.kr(0));
	Out.ar(\out.kr(0), sig);
}).add;
)
(
var freq = ~s53.degreeToFreq(~chord.choose, 0.midicps, ~rainParams.octave);
Synth(\reverse_thump, [
	\freq, freq,
	\atk, 3,
	\rel, 2,
	\c0, 2,
	\c1, \sine,
	\pan, rrand(-0.7, 0.7),
	\amp, 0.05,
	\out, 0]);
)

(
var freq = ~s53.degreeToFreq(~chord.choose, 0.midicps, ~rainParams.octave);
SynthDef(\glitchy_rise, { | freq = 500, mRatio = 1, pan = 0, height = 2, atk = 0.1, rel = 1.1 |
	var sig, env, mod, modfreq;

	env = Env.perc(atk, rel, curve: [\c0.kr(2), \c1.kr(\sine)]).kr(2);

	modfreq = freq * Line.kr(1.0, height, atk + rel);
	mod = SinOsc.ar(modfreq * mRatio) * modfreq * mRatio;
	sig = Pulse.ar(min(max(modfreq + mod, 20), 20000)) * 0.07 * env;
	sig = sig + (Pulse.ar(freq) * 0.07 * env.pow(2));
	sig = Pan2.ar(sig, pan);
	Out.ar(0, sig);
}).play;
)


(
var freq = ~s53.degreeToFreq(~chord.choose, 0.midicps, ~rainParams.octave);
SynthDef(\bounce_away, { | freq = 300 |
	var trig, sig, pan = \pan.kr(0);
	trig = Impulse.ar(Line.ar(Rand(3, 10), Rand(5, 20), 2));
	sig = Saw.ar([freq, freq * 8, Rand(2000, 3400), Rand(3500, 4000)]) * 0.3 * Decay.ar(trig, Line.kr(0.03, 0.005, 2));
	sig = Mix(sig);
	sig = sig * Env.perc(\atk.kr(0.01), \rel.kr(2)).kr(2);
	sig = Pan2.ar(sig, pan);
	Out.ar(\out.kr(0), sig);
}).play;
)

(
SynthDef(\bounce_away, { | freq = 300 |
	var trig, sig, pan = \pan.kr(0);
	trig = Impulse.ar(Line.ar(Rand(3, 10), Rand(5, 20), 2));
	sig = Saw.ar([freq, freq * 8, Rand(freq * 8, freq*12).min(19000), Rand(freq*13, freq*14).min(19000)]) * 0.3 * Decay.ar(trig, Line.kr(0.03, 0.005, 2));
	sig = Mix(sig);
	sig = sig * Env.perc(\atk.kr(0.01), \rel.kr(2), curve: [\c0.kr(2), \c1.kr(\sine)]).kr(2);
	sig = Pan2.ar(sig, pan) * \amp.kr(0.5);
	Out.ar(\out.kr(0), sig);
}).add;
)

(
var freq = ~s53.degreeToFreq(~chord.choose, 0.midicps, ~rainParams.octave);
Synth(\bounce_away, [
	\freq, freq,
	\rel, 0.1,
	\atk, 4,
	\c1, 2,
	\c0, \sine,
	\pan, rrand(-0.7, 0.7),
	\amp, 0.05,
	\out, 0]);
)