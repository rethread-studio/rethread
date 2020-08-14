/*

* Load soundfiles (interviews? the human side of programming)
* Glitch the playback of them
** position
** rate
** range of rates possible
** envelope parameters

* move them around wide-narrow far-near

* stutter

* LPF and HPF filter settings

*/

(
~buffers = "/home/erik/Documents/REAPER Media/Programmer_quotes/render/*.wav".pathMatch.collect( { |file|
	Buffer.readChannel(s, file, channels: [0]);});
~buffers.do{ |buf| buf.normalize; };
)

(
SynthDef(\lastLayer, {
	var sig, mix = \mix.kr(0.2, 0.02), tones;
	sig = In.ar(\in.kr(12), 2);

	tones = {Pan2.ar(SinOsc.ar([8000 + LFNoise1.kr(1.2, 30), 325 + LFNoise1.kr(2.2, 10)])*0.1, LFNoise1.kr(0.5))}!3;

	sig = (sig*(1-mix).pow(5)) + (tones*mix);

	Out.ar(\out.kr(0), sig);
}).play;
)


(
SynthDef(\buf_grain_filter, {arg gate = 1, amp = 0.2, preamp = 1, sndbuf, envbuf = -1, posrate = 1,
	modtime = 60, rate = 1, out = 0, grainsize = 0.5, hold = 1, noiseAmp = 0.0, speed = 1.0;
	var pan, env, freqdev, posmod, grainmod, grainsizemod, trigmod, trigger, sig, bufspeed;
	// pan = LFNoise1.kr(1/2);
	pan = Rand(-1, 1);
	env = EnvGen.kr(
		Env([0, 1, 0], [0.1, 1], \sin, 1),
		gate,
		doneAction: 2);

	trigger = Dust.kr(\trig_rate.kr(1));
	// rate = TRand.kr(0.8, 1.2, trigger);
	bufspeed = 1.0 / (BufDur.ir(sndbuf) * SampleRate.ir);

	//posmod = LFNoise2.kr(posrate).range(0.05, 0.95);
	//posmod = Line.kr(0.05, 0.95, posrate);
	posmod = Phasor.ar(trig: trigger,
		//rate: 0.00001*(posrate/5),
		rate: bufspeed * speed,
		start: 0.001,
		end: 0.999,
		resetPos: TRand.kr(0.001, 0.999, trigger)
	);
	posmod = Ramp.ar(posmod, 0.01);
	posmod.poll;

	grainmod = Dust.kr(LFNoise1.kr(1/2).range(10, 1000));
	//grainmod = Dust.kr(15);

	//grainsizemod = LFNoise1.kr(1/5).range(0.05, 0.5);
	//grainsizemod = max(Line.kr(0.05, 0.8, modtime), TExpRand.kr(0.01, 2, trigger));

	sig = GrainBuf.ar(2, grainmod, grainsize, sndbuf, rate,
			posmod, 4, pan, envbuf)*0.25;

	Out.ar(out, sig * env * amp)
}).add;
)
Synth(\buf_grain_filter, [\sndbuf, ~buffers[0], \grainsize, 0.2, \rate, 1.0]);
(
~synths = ~buffers.collect { | buf |
	Synth(\buf_grain_filter, [\sndbuf, buf, \grainsize, 0.2, \rate, 1.0, \speed, 0.2]);
};
)
c = Synth(\buf_grain_filter, [\sndbuf, ~buffers[0], \grainsize, 0.2, \rate, 1.0, \speed, 0.2]);
c.set(\speed, 0.5, \trig_rate, 1, \grainsize, 0.4)
~synths.do{ |syn| syn.set(\trig_rate, 4) };
~synths.do{ |syn| syn.set(\grainsize, 0.5) };
(
~synths.do{ |syn| syn.set(\speed, 0.9) };
)
~buffers[0].duration
2.83e-06 * 48000 * ~buffers[0].duration