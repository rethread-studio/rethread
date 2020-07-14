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