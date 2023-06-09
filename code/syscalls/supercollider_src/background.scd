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

