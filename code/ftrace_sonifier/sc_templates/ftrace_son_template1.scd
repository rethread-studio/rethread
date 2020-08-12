// Clicky deep bass, similar to alva noto in Vrioon
(
SynthDef(\kick, {
	var sig, env, click, freq = 50, freqs, clickTime = 0.0005, decay = 0.5;
	env = Env.perc(0, decay).ar(2);
	click = (SinOsc.ar(Line.ar(17000, 500, clickTime)) + Hasher.ar(Sweep.ar)) * 0.1 * Env.perc(0, clickTime, curve: 20).ar(0);
	freqs = freq * [1, 0.99, 1.01];
	sig = DC.ar(0.0);
	// sig = Saw.ar(XLine.kr(freqs*1.1, freqs, decay)) * 0.1;
	sig = Mix(sig);
	sig = sig + SinOsc.ar(XLine.kr(freq*16, freq, 0.000001)) * 0.2;
	// sig = LPF.ar(sig, XLine.kr(15000, freq * 2, 0.05));
	// sig = sig + SinOsc.ar(XLine.ar(freq*4, freq, 0.05)) * 0.25;
	// sig = sig + SinOsc.ar(XLine.ar(freq*4, freq * 2, 0.02)) * 0.125;
	sig = GVerb.ar(sig, 39, 0.4);
	sig = Mix(sig);
	// sig = sig + SinOsc.ar(Line.ar(10000, freq, 0.001)) * 0.125;
	sig = sig + click;
	sig = sig * env * \amp.kr(1);
	// sig = [sig, DelayN.ar(sig, 0.012, 0.0009)];
	sig = Pan2.ar(sig, \pan.kr(0.0));
	Out.ar(\out.kr(0), sig);
	// sig!2
}).play;
)

Synth(\kick, [\freq, 60, \pan, -1]); Synth(\kick, [\freq, 33, \pan, 1]);

(
{
	var sig = SinOsc.ar(Line.ar(10000, 1000, 0.001, doneAction: 2)) * 4;
	sig!2
}.play;
)


( // Crackle generator
{
	var sig, freq = LFNoise1.kr(0.5).range(3000, 8000), trig = Dust.ar(MouseX.kr(10, 1000, 'exponential'));
	freq = TRand.ar(3000, 8000, trig);
	sig = SinOsc.ar(freq) * Decay.ar(trig, MouseY.kr(0.00001, 0.1, 'exponential'));
	sig = Pan2.ar(sig);
	Out.ar(\out.kr(0), sig);
}.play;
)


( // Inspired by Ryoji Ikeda - One Minute
{
	var sig, mod, mod2, trig = Dust.ar(MouseX.kr(50, 1000, 'exponential')), trig2 = Dust.ar(5.0), trig3 = Dust.ar(2.0),
	pan = TRand.ar(-0.9, 0.9, trig2), minFreq = TRand.ar(40, 300, trig2), freqMul = TRand.ar(1.0, 2.0, trig3).pow(2),
	freq = TRand.ar(minFreq, 400, trig) * freqMul, c_ratio = TRand.ar(1.0, 8.0, trig).floor, m_ratio = TRand.ar(1.0, 12.0, trig), m_ratio2 = TRand.ar(1.0, 9.0, trig).floor;
	mod2 = SinOsc.ar(freq * m_ratio2) * freq * m_ratio2;
	mod = SinOsc.ar(freq * m_ratio + mod2) * freq * m_ratio;
	sig = SinOsc.ar(freq * c_ratio + mod) * 0.1;
	sig = Pan2.ar(sig, pan);
	Out.ar(\out.kr(0), sig);
}.play;
)

~buf = Buffer.read(s, "/home/erik/Musik/random_samples/218715__ice91prinzeugen__sound-atmo-zurich-main-station.wav");
( // Inspired by Ryoji Ikeda - One Minute - 2
{
	var sig, playhead, rate, newPos, trig = Dust.ar(MouseX.kr(50, 1000, 'exponential')), trig2 = Dust.ar(5.0), trig3 = Dust.ar(2.0),
	pan = TRand.ar(-0.9, 0.9, trig2);
	rate = TRand.ar(0.5, 2.0, trig2) * BufRateScale.kr(~buf);
	newPos = TRand.ar(0.0, 1.0, trig2);
	playhead = Phasor.ar(trig2, rate, 0.0, BufFrames.kr(~buf), newPos);
	sig = BufRd.ar(2, ~buf, playhead);
	sig = Pan2.ar(sig, pan);
	Out.ar(\out.kr(0), sig);
}.play;
)


/// PLUCK EXAMPLES
// excitation signal is WhiteNoise, triggered twice a second with varying OnePole coef
(
{Pluck.ar(WhiteNoise.ar(0.1), Impulse.kr(MouseY.kr(50, 1000, 'exponential')), 440.reciprocal, 440.reciprocal, 10,
	coef:MouseX.kr(-0.999, 0.999))
}.play;
)
// a group of angry fretless mandolin players
(
{
	var freq, numparts;
	numparts = 50;
	freq = SinOsc.kr(Array.fill(numparts, {Rand(0.05, 0.2)}),
		Array.fill(numparts, {Rand(0, 1.0)})).range(1000, 3000);
	LeakDC.ar(
		Pan2.ar(
			Pluck.ar(
				WhiteNoise.ar(0.1).dup(numparts),
				Impulse.kr(Array.fill(numparts, {Rand(10, 12)})),
				100.reciprocal, freq.reciprocal, 2, Rand(0.01, 0.2), mul: 1),
			Array.fill(numparts, {Rand.new(-1.0, 1.0)}))
		.sum
	);
}.play(s);
)

// Comb filters
(
{
}.fork;
)