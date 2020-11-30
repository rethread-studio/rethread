SynthDef(\long_sine, {
	var sig, env, freq = \freq.kr(220);

	env = Env.sine(\length.kr(5)).kr(2);
	sig = SinOsc.ar(freq) * \amp.kr(0.2) * env * 0.1;
	sig = Pan2.ar(sig, \pan.kr(0));

	Out.ar(\out.kr(0), sig);
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
	Out.ar(\out.kr(0), sig);
}).add;
SynthDef(\gust, {
	var sig, env, rq = \rq.kr(0.1), atk = \atk.kr(0.5), rel = \rel.kr(1.5), freq = \freq.kr(1400).min(18000).max(100);
	env = Env.perc(atk, rel, curve: [\c0.kr(4), \c1.kr(-4)]).ar(2);
	sig = WhiteNoise.ar(0.005);
	// high freq and rq values causes the filter to blow up violently
	sig = RHPF.ar(sig, freq, rq.min(5)) * env * 10 * \amp.kr(1.0);
	sig = LPF.ar(sig, Rand(freq * 0.5, 20000));
	sig = Pan2.ar(sig, Line.kr(\pan1.kr(0), \pan2.kr(0), atk + rel));
	sig = sig.tanh; // Should never happen, but better to soft clip

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

SynthDef(\softy, {
	var sig, env, freq = \freq.kr(220);
	env = Env.perc(\atk.kr(0.1), \rel.kr(2), curve: [\c0.kr(\cub), \c1.kr(\sine)]).kr(2);
	sig = Resonz.ar(PinkNoise.ar(mul: env), freq, 0.007, mul: 20);
	sig = sig * \amp.kr(0.5);
	sig = Pan2.ar(sig, \pan.kr(0));
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\medium_reverb, { | out = 0, amp = 1, mix = 0.3, rt = 3.0  |
	var sig, wet;

	sig = In.ar(\in.kr(10), 2);
	mix = mix.lag(\mixLag.kr(10));

	/*wet = JPverb.ar(sig, rt, 0.9, 4.0, 0.8);
	wet = GVerb.ar(sig, 300, 3, 0.43, 0.51, 15, -5.dbamp, -26.dbamp, -20.dbamp);*/
	wet = Greyhole.ar(sig, \delayTime.kr(0.1), \damp.kr(0.7), \size.kr(1.0), \diff.kr(0.8), \feedback.kr(0.7));

	sig = (sig * (1-mix)) + (wet*mix);
	sig = Limiter.ar(sig, 0.95);
	sig = LeakDC.ar(sig);
	Out.ar(out, sig);
}).add;

SynthDef(\ping, {
	var sig, env, freq = \freq.kr(440), atk = \atk.kr(0.1), rel = \rel.kr(2), panPos, delayL, delayR;
	// env = Env.perc(atk, rel, curve: [\c0.kr(4), \c1.kr(-4)]).ar(2);
	env = Env( levels: [0, 1, 0.001, 1, 0], times: [atk, rel/2, rel/2, 0.02],
		curve: [2, 2, 1, 0]).ar(2);
	freq = freq * SinOsc.kr(LFNoise1.kr(2).range(2.0, 8.5)).range(0.999, 1.001);
	// Något noisigare än sinusvåg?
	sig = Resonz.ar(PinkNoise.ar(), freq, 0.001) * 100;
	sig = sig + SinOsc.ar(freq, mul: 0.5);
	sig = sig + Pulse.ar(freq, mul: 0.02);
	sig = LPF.ar(sig, 3000);
	panPos = Line.kr(\startPan.kr(-1), \endPan.kr(1), atk+rel);
	sig = Pan2.ar(sig, panPos);
	// Because of dynamic delay timings we need a dynamically crossfading delay.
	delayL = (panPos * (-1)).max(0.0) * 0.05;
	delayR = (panPos * (-1)).max(0.0) * 0.05;
	sig = [DelayL.ar(sig[0], 0.2, delayL), DelayL.ar(sig[1], 0.2, delayR)];
	sig = sig * env * \amp.kr(0.5);
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\morse, {
	var sig, env, freq = \freq.kr(440), atk = \atk.kr(0.01), rel = \rel.kr(0.3);
	// env = Env.perc(atk, rel, curve: [\c0.kr(4), \c1.kr(-4)]).ar(2);
	env = Env.perc(atk, rel, curve: [2, -2]).kr(2);
	freq = freq * SinOsc.kr(LFNoise1.kr(2).range(1.5, 2.5)).range(0.995, 1.005);
	// Något noisigare än sinusvåg?
	// sig = Resonz.ar(PinkNoise.ar(), freq, 0.001) * 100;
	sig = SinOsc.ar(freq, mul: 1.0);
	sig = sig * env * \amp.kr(0.5);
	sig = Pan2.ar(sig, \pan.kr(0));
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\write_noise, {
	var sig, len = \len.kr(1), time = \time.kr(0), buf = \bufnum.kr(0),
	freq = (1.0 - (len/1000000).min(1.0)).pow(40.0) * 10000 + 2, pos = (time*SampleRate.ir) % BufFrames.kr(buf),
	duration = (len/400000).min(1.0).max(0.0001),
	oldData;
	sig = Saw.ar(freq, 0.05);
	pos = Line.ar(pos, pos + (duration * SampleRate.ir), duration, doneAction: 2);
	oldData = BufRd.ar(1, buf, pos) * 0.8;
	BufWr.ar(sig + oldData, buf, pos);
}).add;

SynthDef(\write_noise2, {
	var sig, len = \len.kr(1), time = \time.kr(0), buf = \bufnum.kr(0),
	freq = (1.0 - (len/10000000).min(1.0)).pow(\rangeCurve.kr(80)) * \maxFreq.kr(10000) + \minFreq.kr(2), pos = (time*SampleRate.ir) % BufFrames.kr(buf),
	duration = (len/400000).min(1.0).max(0.0001), oldData;
	sig = SinOsc.ar(freq, mul: freq);
	sig = Blip.ar(freq + sig, Rand(1, 300));
	sig = SinOsc.ar(freq + (sig * freq * 2.0), mul: 0.25);
	pos = Line.ar(pos, pos + (duration * SampleRate.ir), duration, doneAction: 2);
	oldData = BufRd.ar(1, buf, pos) * 0.1;
	BufWr.ar(sig + oldData, buf, pos);
}).add;

SynthDef(\loop_buffer, {
	var sig, buf = \bufnum.kr(0), pos;
	pos = Phasor.ar(0, 1.0, 0, BufFrames.kr(buf));
	sig = BufRd.ar(1, buf, pos);
	sig = LeakDC.ar(sig);
	sig = (sig * 5).tanh * 0.25;
	sig = Limiter.ar(sig) * \amp.kr(0.5);
	sig = Pan2.ar(sig);
	Out.ar(\out.kr(0), sig);
}).add;