// make an additive synth for cresc.

(
SynthDef(\reverse_sine, {
	var sig, env, freq = \freq.kr(220);

	env = Env.perc(\atk.kr(2), \rel.kr(0.1), curve: [\c0.kr(\cub), \c1.kr(\sine)]).kr(2);
	sig = SinOsc.ar(freq) * env;
	2.do { |i| var mult = i+2;
		sig = sig + SinOsc.ar(freq * mult * 1.01, // * LFNoise1.kr(7).range(0.98, 1.02),
			mul: env.pow(mult*mult));
	};
	sig = DelayN.ar(sig, 0.2, Rand(0.02, 0.06));
	// sig = sig + Resonz.ar(PinkNoise.ar(mul: env.pow(100) * 20), freq, 0.007, mul: 50);

	sig = sig * 0.3 * \amp.kr(0.5);
	sig = Pan2.ar(sig, \pan.kr(0));

	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\thump, {
	var sig, env, freq = \freq.kr(220);
	env = Env.perc(\atk.kr(0.1), \rel.kr(2), curve: [\c0.kr(\cub), \c1.kr(\sine)]).kr(2);
	sig = Resonz.ar(PinkNoise.ar(mul: env.pow(100) * 20), freq, 0.007, mul: 20);
	sig = sig * \amp.kr(0.5);
	sig = Pan2.ar(sig, \pan.kr(0));
	Out.ar(\out.kr(0), sig);
}).add;
)

~rev_channel = ~makeMixerChannel.("Reverb", 0);
~rev_channel.play_on(\medium_reverb, [\out, ~rev_channel.bus, \in, ~rev_channel.bus, \mix, 0.2]);

Synth(\reverse_sine, [\freq, 444, \out, ~rev_channel.bus]);

(
~rev_channel = ~makeMixerChannel.("Reverb", 0);
~rev_channel.play_on(\medium_reverb, [\out, ~rev_channel.bus, \in, ~rev_channel.bus, \mix, 0.2]);
{
	loop {
		var freq = ([0, 4, 7, 9, 12, 14, 16, 17] + 48).choose.midicps;
		if(rrand(0.0, 1.0) > 0.7) { freq = freq * 2 };

		Synth(\reverse_sine, [
			\freq, freq,
			\atk, rrand(1, 4),
			\rel, rrand(0.1, 2),
			\c0, rrand(1, 4),
			\c1, \sine,
			\pan, rrand(-0.7, 0.7),
			\out, ~rev_channel.bus]);
		rrand(0.5, 2).wait;
	};
}.fork
)
(
var freq = ([0, 4, 7, 9, 12, 14, 16, 17] + 48).choose.midicps;
		if(rrand(0.0, 1.0) > 0.7) { freq = freq * 2 };
Synth(\thump, [
			\freq, freq,
			\atk, 0.2,
			\rel, 2,
			\c0, -3,
			\c1, \sine,
			\pan, rrand(-0.7, 0.7),
			\out, ~rev_channel.bus]);
)
Env.perc(4, 1, curve: [\cub, \sine]).plot



(
SynthDef(\sub_tam, {
	// FM synth for a sub bass type sound rev_channel.buswith some noise on top
	var freq = \freq.kr(32), sig, env, sig1, sig2, sig3, mod1_1, mRatio = \mRatio.kr(2), mod1_2,
	mod2_1, mod2_2, mod2_1_ratio = 16*6, mod2_2_ratio = SinOsc.ar(freq*Rand(10, 14)).range(1, 16*8) *4, feedback,
	atk = \atk.kr(05), rel = \rel.kr(5), brightnessRamp, lowcut;

	env = Env.perc(atk, rel, 1.0, [\c0.kr(2), \c1.kr(-4)]).ar(2);

	brightnessRamp = XLine.kr(0.1, 1, atk);

	feedback = LocalIn.ar(1);
	mod1_2 = SinOsc.ar(freq * 8 + feedback, mul: freq * mRatio);
	LocalOut.ar(mod1_2 * 0.1);
	mod1_1 = SinOsc.ar(freq * mRatio + mod1_2, mul: freq * mRatio * Line.kr(0.0, 1.0, atk/2));
	sig1 = SinOsc.ar(freq + mod1_1) * env;

	mod2_2 = SinOsc.ar(freq * mod2_2_ratio, mul: freq * mod2_2_ratio * brightnessRamp * freq);
	mod2_1 = SinOsc.ar(freq * mod2_1_ratio + mod2_2, mul: freq * mod2_1_ratio * brightnessRamp);
	sig2 = SinOsc.ar(freq * 16 + mod2_1) * env.pow(1.5) * XLine.kr(0.05, 0.4, atk+rel);

	sig = sig1 + sig2;
	sig = sig * \amp.kr(0.5);
	// sig = sig + (DPW3Tri.ar(freq*2) * 0.5 * env.pow(3));
	lowcut = brightnessRamp.pow(3);
	sig = (HPF.ar(sig, 100) * lowcut) + (sig * (1-lowcut));

	sig = Pan2.ar(sig, \pan.kr(0));
	Out.ar(\out.kr(0), sig);
}).play;
)
