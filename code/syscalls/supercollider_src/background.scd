(
{
	var sig, env;
	sig = Resonz.ar(PinkNoise.ar*5, 1000, LFNoise1.kr(0.25).range(0.0001, 0.01));
	env = EnvGen.kr(Env([0, 1, 0.5, 0], [0.2, 1, 2], [\lin, \lin, -6]), doneAction: 2);
	sig = Pan2.ar(sig)*env;
	Out.ar(0, sig);
}.play;
)

( // Rising
{
	var sig;
	sig = Resonz.ar(PinkNoise.ar*3, Line.kr(100, 1000, 20), LFNoise1.kr(0.25).range(0.0001, 0.01));
	sig = Pan2.ar(sig);
	Out.ar(0, sig);
}.play;
)
(
{
	var sig;
	sig = Resonz.ar(PinkNoise.ar*3, 50, LFNoise1.kr(0.5).range(0.001, 0.01));
	sig = Pan2.ar(sig);
	Out.ar(0, sig);
}.play;

)

(
// Triggered background noise
OSCdef(\background_noise, { arg msg, time, addr, recvPort;
	var length = msg[1].asFloat,
	root = msg[2].asFloat, comparisonPitch = root.log2.frac, chosenComparison = 1, chosenFreq;
	// file = ~binaries["thunderbird_8bit.wav".asSymbol];
	msg.postln;

	[1, 3/2, 5/4].do{|interval|
		var comp = abs((root*interval).log2.frac-1000.log2.frac);
		if(comp < chosenComparison) {
			chosenComparison = comp;
			chosenFreq = root*interval;
		};
	};
	while({chosenFreq * 2.0 < 1500}, {chosenFreq = chosenFreq * 2.0});
	("Chosen freq: " ++ chosenFreq).postln;

	{
		var sig, env, front_back_mix = Rand(0, 1.0);
		sig = Resonz.ar(PinkNoise.ar*5, chosenFreq, LFNoise1.kr(0.25).range(0.0001, 0.01));
		sig = LPF.ar(sig, LFNoise1.kr(0.5).range(900, 10000));
		env = EnvGen.kr(Env([0, 1, 0.5, 0], [Rand(0.2, 0.9), length*0.34, length *0.66], [\lin, \lin, -6]), doneAction: 2) * Rand(0.1, 1.0);
		sig = Pan2.ar(sig)*env;
		Out.ar(0, sig * front_back_mix);
		Out.ar(2, sig * (1.0-front_back_mix));
	}.play;

}, '/background_noise', nil);
)

// Noisy foundation for the whole piece

// Long low frequency rumbling with a slow LPF in a sine-ish curve and distortion/energy in a very slow curve (over minutes)
(
var root = 25;
Ndef(\root, {root});
Ndef(\root).fadeTime = 0.05;
Ndef(\rumbling_bass, {
	var sig, pitch_mix = LFNoise1.kr(0.1).range(0, 1);
	sig = BrownNoise.ar()!4;
	// sig = LPF.ar(sig, LFNoise2.kr(0.5).range(100, 2000) * LFNoise1.kr(2).range(0.8, 1.0));
	sig = Resonz.ar(sig, Ndef(\root).kr*[4, 8, 12, 16], {LFNoise2.kr(0.05).range(0.001, 1.0).clip(0.001, 1.0).pow(3)}!4);
	sig = Mix(sig);
	sig = sig * 0.5 + (AnalogVintageDistortion.ar(sig*LFNoise2.kr(0.1).range(0.01, 0.1), LFNoise1.kr(0.03).range(0.0, 2.5), LFNoise1.kr(0.2).range(0.0, 0.5)) * LFNoise1.kr(0.1).range(0.0, 0.5).pow(1.5));
	sig = LPF.ar(sig, LFNoise2.kr(0.05).range(50, 10000) * LFNoise1.kr(2).range(0.7, 1.0) * LFNoise1.kr(5).range(0.9, 1.0));
	sig = HPF.ar(sig, (LFNoise2.kr(0.05).range(0, 1).pow(2) *200 + 10) * LFNoise1.kr(2).range(0.8, 1.0));
	sig = Limiter.ar(sig, 0.9);
	sig = sig!2 + (JPverb.ar(sig, 2.0) * LFNoise1.ar(0.1).range(0.0, 0.5).pow(2));
	sig = (sig * (1.0-pitch_mix)) + (Splay.ar(Resonz.ar(sig, Ndef(\root).kr*[4, 6, 8, 12, 16], {LFNoise2.kr(0.05).range(0.001, 1.0).clip(0.001, 1.0).pow(3)}!5)) * pitch_mix * 0.2);

	// sig = Pan2.ar(sig*0.5);
	sig
}).play;
)
Ndef(\root, {25*1});

// Soft low mid tones matching the harmony from the sonifier