(
{
	var  sig, mod, freq = ~degree53_to_freq.(~chord.choose%53 + (53*8), ~rootFreq), env;
	env = Env.perc(0.5, Rand(0.7, 1.2), 0.4, [0, -2]).kr(2);
	mod = SinOsc.ar(freq*(8/floor(LFNoise0.kr(6).range(4, 8)))) * freq * LFNoise0.kr(12).range(0.5, 2);
	sig = SinOsc.ar(freq + mod);
	sig = Pan2.ar(sig, rrand(-1.0, 1.0)) * env * 0.1;
	Out.ar(0, sig);
}.play;
)
(
{
	var  sig, mod, freq = ~degree53_to_freq.(~chord.choose%53 + (53*8), ~rootFreq), env;
	env = Env.perc(0.5, Rand(0.7, 1.2), 0.4, [0, -2]).kr(2);
	freq = XLine.kr(100, Rand(500, 4000), 1.7);
	freq = Latch.kr(freq, Impulse.kr(10));
	mod = SinOsc.ar(freq*(8/floor(LFNoise0.kr(15).range(4, 8)))) * freq * LFNoise0.kr(20).range(0.5, 2);
	sig = SinOsc.ar(freq + mod);
	sig = RLPFD.ar(PinkNoise.ar()*3, freq*4, 0.5, 0.4) * Decay.ar(Impulse.ar(10), 0.2) * sig;
	sig = Pan2.ar(sig, rrand(-1.0, 1.0)) * env * 0.1;
	Out.ar(0, sig);
}.play;
)

(
{
	var  sig, mod, freq = ~degree53_to_freq.(~chord.choose%53 + (53*8), ~rootFreq), env;
	env = Env.perc(0.5, Rand(0.7, 1.2), 0.4, [0, -2]).kr(2);
	freq = XLine.kr(100, Rand(500, 4000), 1.7);
	freq = Latch.kr(freq, Impulse.kr(10));
	sig = RLPFD.ar(PinkNoise.ar()*3, freq*4, 0.5, 0.4) * Decay.ar(Impulse.ar(10), 0.2);
	sig = Pan2.ar(sig, rrand(-1.0, 1.0)) * env * 0.1;
	Out.ar(0, sig);
}.play;
)
(
{
	var sig, env, freq, clap, popEnv, centerFreq = Rand(1000, 1700), length = Rand(0.5, 1);
	env = EnvGen.ar(
		Env(
			levels: [0, 1, 0],
			times: [length, 1.5],
			curve: [4, -6]
		),
		doneAction:2
	);

	freq = [
		EnvGen.ar(Env([centerFreq*Rand(0.1, 0.3), centerFreq], [length], [Rand(4, 7)])),
		EnvGen.ar(Env([centerFreq*Rand(0.2, 0.4), centerFreq], [length], [Rand(2, 8)]))];
	sig = Resonz.ar(WhiteNoise.ar(), freq, Line.kr(0.3, 0.03, 1.0))*3;
	sig = Mix(sig);
	sig = Pan2.ar(sig, rrand(-1.0, 1.0));
	sig = sig * env * 0.1;
	Out.ar(\out.kr(0), sig);
}.play;
)
(
{
	var trig, sig, pan;
	trig = Impulse.ar(Line.ar(Rand(3, 6), Rand(15, 40), 2));
	sig = Saw.ar([270, 2000, Rand(2000, 3400), Rand(3500, 4000)]) * 0.3 * Decay.ar(trig, Line.kr(0.03, 0.005, 2));
	sig = Mix(sig);
	sig = sig * Env.perc(0.01, 2).kr(2);
	pan = Demand.ar(trig + Impulse.ar(0), 0, Dseq([-1, 1], inf));
	sig = Pan2.ar(sig, pan);
	Out.ar(0, sig);
}.play;
)
(
{
	var trig, sig, pan;
	trig = Impulse.ar(Line.ar(Rand(15, 40), Rand(3, 6), 2));
	sig = LFTri.ar([Rand(100, 270), 2000, Rand(2000, 3400), Rand(3500, 4000)]) * 0.3 * Decay.ar(trig, Line.kr(0.05, 0.005, 2)).lag(0.01);
	sig = Mix(sig);
	sig = sig * Env.perc(0.01, 2).kr(2);
	pan = Demand.ar(trig + Impulse.ar(0), 0, Dseq([-1, 1], inf));
	sig = Pan2.ar(sig, pan) * 0.5;
	Out.ar(0, sig);
}.play;
)
(
{
	var sig, env, freq, clap, popEnv, centerFreq = Rand(1000, 1700), length = Rand(0.5, 1);
	env = EnvGen.ar(
		Env(
			levels: [0, 1, 0],
			times: [length, 1.5],
			curve: [4, -6]
		),
		doneAction:2
	);

	freq = [
		EnvGen.ar(Env([centerFreq*Rand(0.1, 0.3), centerFreq], [length], [Rand(4, 7)])),
		EnvGen.ar(Env([centerFreq*Rand(0.2, 0.4), centerFreq], [length], [Rand(2, 8)]))];
	sig = Resonz.ar(WhiteNoise.ar(), freq, Line.kr(0.3, 0.03, 1.0))*3;
	sig = Mix(sig);
	sig = Pan2.ar(sig, rrand(-1.0, 1.0));
	sig = sig * env * 0.1;
	Out.ar(\out.kr(0), sig);
}.play;
)
(
{
	var sig, env, freq = ~degree53_to_freq.(~chord.choose%53 + (53*8), ~rootFreq);

	sig = SinOsc.ar([freq, freq*1.005, freq*1.01, freq*2.05, freq*3.1]) * Decay.ar(Impulse.ar(0) + DelayN.ar(Impulse.ar(0), 0.1, 0.1), Rand(0.4, 1)).lag(Rand(0.01, 0.1)) * 0.05;
	sig = Mix(sig);
	sig = Pan2.ar(sig, Rand(-1.0, 1.0));
	Line.kr(0, 1, 2, doneAction: 2);
	Out.ar(0, sig);
}.play;
)

(
{
	var sig, env, freq = ~degree53_to_freq.(~chord.choose%53 + (53*3), ~rootFreq);

	freq = freq * (Line.kr(0, 30, 2).floor + 1);
	sig = Pulse.ar(freq) * 0.05;
	sig = sig * Env.perc(1.0, 1.0).kr(2);
	sig = Pan2.ar(sig, Rand(-1.0, 1.0));
	Out.ar(0, sig);
}.play;
)

(
{
	var sig, env, freq = ~degree53_to_freq.(~chord.choose%53 + (53*5), ~rootFreq), mod;

	freq = freq * (Line.kr(0, 30, 2).floor + 1);
	mod = SinOsc.ar(freq * Rand(0.5, 8.0)) * freq * Rand(0.5, 3.0);
	sig = Pulse.ar(min(max(freq + mod, 20), 20000)) * 0.07;
	sig = sig * Env.perc(0.1, 1.0).kr(2);
	sig = Pan2.ar(sig, Rand(-1.0, 1.0));
	Out.ar(0, sig);
}.play;
)


(
{
	var sig, env, freq = ~degree53_to_freq.(~chord.choose%53 + (53*6), ~rootFreq), mod;

	freq = freq * Demand.kr(Impulse.kr(8), 0, Dseq([1, 2], inf)).lag(0.03);
	mod = SinOsc.ar(freq * Rand(0.5, 8.0)) * freq * Rand(0.5, 3.0);
	sig = LFTri.ar(min(max(freq + mod, 20), 20000)) * 0.07;
	sig = sig * Env.perc(0.1, 1.0).kr(2);
	sig = Pan2.ar(sig, Rand(-1.0, 1.0));
	Out.ar(0, sig);
}.play;
)

(
{
	var sig, env, freq = [50, 2000, 500, 4000, 5030] , mod;

	freq = freq * Demand.ar(Impulse.ar(LFNoise0.kr(20).range(3, 22)), 0, Dseq([1, 1.7], inf)).lag(0.001);

	sig = Resonz.ar(WhiteNoise.ar(), freq, 0.05);
	sig = Mix(sig);
	sig = sig * EnvGen.kr(Env(
		levels: [0, Rand(0.1, 1.0), Rand(0.1, 1.0), Rand(0.1, 1.0), 0],
		times: [Rand(0.05, 0.6), Rand(0.05, 0.3), Rand(0.05, 0.3), Rand(0.1, 0.7)]),
	doneAction: 2);
	sig = (sig*0.1) + (sig * (Demand.kr(Dust.kr(LFNoise1.kr(1/2).range(10, 40)) + Impulse.kr(0), 0, Dseq([1, 0], inf))) * 0.9);
	sig = Pan2.ar(sig, Rand(-1.0, 1.0));
	Out.ar(0, sig);
}.play;
)