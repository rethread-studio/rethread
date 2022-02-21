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
	SynthDef(\sine, {
		var sig, env, freq = \freq.kr(220);

		env = Env.perc(\atk.kr(0.01), \rel.kr(1.0)).kr(2);
		sig = SinOsc.ar(freq) * \amp.kr(0.2) * env * 0.1;
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

)


// evaluate one by one when it is time

(
// with reverb
~outBus = Bus.audio(s, 2);
~rev = Synth(\medium_reverb, [\in, ~outBus, \mix, 0.1]);

)

(

Pdef(\t2_1, Pbind(\instrument, \tick2,
	\freq, Pwhite(10000, 12000),
	\rq, 0.1,
	\dur, Prand([0.125, 0.25, Pseq([0.33, 0.33, 0.33]*0.125)], inf),
	\amp, 0.5,
	\atk, 0.002,
	\out, ~outBus
)).play;

Pdef(\t3_1, Pbind(\instrument, \tick3,
	\freq, Pwrand([Pwhite(14000, 15000, 1), Pwhite(7000, 8000, 1)], [10, 1], inf),
	\rq, 0.02,
	\dur, Pseq([0.02, Prand([0.125, 0.25, 0.5, Pseq([0.33, 0.33, 0.33]*0.125)], inf)]),
	\pan, Prand([-0.3, 0.3], inf),
	\atk, 0.002,
	\amp, 0.05,
	\out, ~outBus
)).play;


)
(
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

( // No tick, longer noise bursts
Pdef(\t2_1).stop;
Pdef(\t3_1).stop;
Pdef(\t3_2).stop;

Pdef(\dn4).stop;
Pdef(\dn1).stop;
Pdef(\dn3).stop;


Pdef(\dn4, Pbind(\instrument, \dist_noise,
	\freq, Pwhite(14000, 15000),
	\dur, Prand([1, 3, 3, 8], inf),
	\rel, Pwhite(1.0, 3.0),
	\amp, 0.1,
	\out, ~outBus
)).play;
Pdef(\dn1, Pbind(\instrument, \dist_noise,
	\freq, Pwhite(12000, 12500),
	\dur, Prand([0.5, 1.25, 1.0, 1.5], inf),
	\rel, Pwhite(0.5, 1.0),
	\out, ~outBus
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

Pdef(\dn1, Pbind(\instrument, \dist_noise,
	\freq, Pwhite(12000, 12500),
	\dur, Prand([0.5, 1.25, 1.0, Pseq([0.33, 0.33, 0.33]), Pseq([0.33, 0.33, 0.33]*0.5), Pseq([0.125], 4)], inf),
	\rel, Pwhite(0.02, 0.15),
	\out, ~outBus
)).play;

)


~chordRoutine.stop;
