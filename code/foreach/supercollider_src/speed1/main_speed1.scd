( // https://sccode.org/1-5ay (by nicolaariutti)
SynthDef(\bell, {
	|fs=1, t60=1, pitchy=1, amp=0.25, gate=1|
	var sig, exciter;
	//exciter = Impulse.ar(0);
	exciter = WhiteNoise.ar() * EnvGen.ar(Env.perc(0.001, 0.05), gate) * 0.25;
	sig = Klank.ar(
		`[
			[1, 2, 2.803, 3.871, 5.074, 7.81, 10.948, 14.421],   // freqs
			[1, 0.044, 0.891, 0.0891, 0.794, 0.1, 0.281, 0.079], // amplitudes
			[1, 0.205, 1, 0.196, 0.339, 0.047, 0.058, 0.047]*t60     // ring times
		],
		exciter,
		freqscale:fs*pitchy);
	sig = FreeVerb.ar(sig) * amp;
	DetectSilence.ar(sig, 0.001, 0.5, doneAction:2);
	Out.ar(0, sig!2);
}).add
)

( // magic swoosh
var swoosh_dur = 0.5;
{
	var sig;
	sig = Resonz.ar(PinkNoise.ar(), XLine.kr([200, 202], [2200, 2150], swoosh_dur) * LFNoise2.kr(3).range(0.995, 1.001), 0.3, mul: 0.9);
	sig = sig * EnvGen.kr(Env([0, 1, 0.5, 0], [swoosh_dur, 0.5, 3], [3, 0, -6]), doneAction: 2);
	Out.ar(0, sig);
}.play;
~rootFreq = 60.midicps;
~s53 = Scale.chromatic('et53');
{
	var scale = [0, 9, 17, 22, 31, 36, 39, 43, 48, 53, 62, 70].collect{ | degree | ~s53.degreeToFreq(degree, ~rootFreq, 0)};

	0.3.wait;
	Pbind(
		\instrument, \bell,
		\fs, Pseq( scale.scramble[0..rrand(4, scale.size-3)], 1),
		\t60, 6,
		\pitchy, 4,
		\dur, 0.06,
	\amp, 0.01
).play;
}.fork;

);