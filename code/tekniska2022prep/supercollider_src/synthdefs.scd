

// https://sccode.org/1-5ay (by nicolaariutti)
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
}).add;

SynthDef(\sine, {
	var sig, env;
	env = Env.linen(\atk.kr(0.01), \sus.kr(0.5), \rel.kr(0.2)).ar(2);
	sig = SinOsc.ar(\freq.kr(220), mul: \amp.kr(0.5)) * env;
	sig = Pan2.ar(sig, \pan.kr(0));
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\medium_reverb, { | out = 0, amp = 1, mix = 0.3  |
	var sig, wet, in;

	in = In.ar(\in.kr(10), 2);
	mix = Lag2.kr(mix, \mixLag.kr(10));

	sig = HPF.ar(in, 120);
	sig = LPF.ar(sig, 7000);

	wet = JPverb.ar(sig, 3.0, 0.9, 4.0, 0.8);
	// wet = GVerb.ar(sig, 300, 103, 0.43, 0.51, 15, -5.dbamp, -26.dbamp, -20.dbamp);
	// wet = Greyhole.ar(sig, \delayTime.kr(0.1), \damp.kr(0.7), \size.kr(1.0), \diff.kr(0.8), \feedback.kr(0.9));

	wet = HPF.ar(wet, 60);

	sig = (in * (1-mix)) + (wet*mix);
	sig = Limiter.ar(sig, 0.95);
	Out.ar(out, sig);
}).add;

SynthDef(\main_out_glitch, {
	var sig = In.ar(\in.kr(10), 2), lag_time = \lag_time.kr(3), compander_thresh = 0.07;
	// compander_thresh = MouseX.kr(0.01, 1);
	// compander_thresh.poll;

	sig = SelectX.ar(\enable_pitch_shift.kr(0, lag_time), [sig, PitchShift.ar(sig, 0.2, Ramp.kr(\pitch_shift_ratio.kr(1.0), lag_time), VarLag.kr(\pitch_dispersion.kr(0.00), lag_time, 20), \time_dispersion.kr(0.01, lag_time))]);
	sig = SelectX.ar(\enable_bit_crush.kr(0, lag_time), [sig, Decimator.ar(sig, \sample_rate.kr(44100, lag_time), \bits.kr(24, lag_time))]);

	sig = Compander.ar(sig, sig,
		thresh: compander_thresh,
		slopeBelow: 1,
		slopeAbove: 0.5,
		clampTime: 0.01,
		relaxTime: 0.02);
	sig = Limiter.ar(sig, 0.99);


	Out.ar(\out.kr(0), sig);
}).add;
SynthDef(\windy, { |gate = 1, amp = 1, ampLagTime = 0.1 freq = 200, freqLagTime = 0.1 |
	var osc = BrownNoise.ar(0.5), env, focus, outs, freqs;
	freq = Lag3.kr(freq, freqLagTime);
	amp = amp.lag(ampLagTime);
	env = EnvGen.kr(Env(
		levels: [0, 1, 0],
		times: [\atk.kr(1), \rel.kr(1)],
		curve: [\curve_atk.kr(0), \curve_rel.kr(0)],
		releaseNode: 1),
	gate: gate,
	doneAction: 2);

	freqs = [freq * [2, 2.2], freq * [1.0, 1.02], freq * 5, freq * 3 + 10];
	focus = [LFNoise1.kr(4).range(0.001, 0.001), LFNoise2.kr(1.1).range(0.0001, 0.01), LFNoise2.kr(0.2).range(0.001, 0.05)];
	outs = Resonz.ar(osc, freqs, focus);
	outs = Mix.ar(outs);

	outs = (outs*100).tanh * 0.1;

	Out.ar(\out.kr(0), Pan2.ar(outs*env*amp));
}).add;

SynthDef(\tick2, {
	var sig, env, rq = \rq.kr(0.1);
	env = Env.perc(\atk.kr(0), \rel.kr(0.02), curve: [\c0.kr(-4), \c1.kr(-4)]).ar(2);
	sig = Impulse.ar(0);
	sig = sig * 0.5;
	// high freq and rq values causes the filter to blow up violently
	sig = RHPF.ar(sig, \freq.kr(1000).min(18000).max(20), rq.min(5)) * env;
	sig = Pan2.ar(sig, \pan.kr(0)) * \amp.kr(1.0) * 10;
	sig = sig.tanh; // Should never happen, but better to soft clip
	// sig = AnalogTape.ar(sig, 0.0, 0.4, 0.1, oversample: 3);
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\sine, {
	var sig, env;
	env = Env.linen(\atk.kr(0.01), \sus.kr(0.5), \rel.kr(0.2)).ar(2);
	sig = SinOsc.ar(\freq.kr(220), mul: \amp.kr(0.5)) * env;
	sig = Pan2.ar(sig, \pan.kr(0));
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

SynthDef(\play_buffer, {
	var buf = \buf.kr(0), sig, trig, pos, env;
	sig = PlayBuf.ar(1, buf, BufRateScale.kr(buf), doneAction: 2);
	env = EnvGen.kr(Env(
		levels: [0, 1, 1, 0],
		times: [0.01, BufDur.kr(buf)-0.02, 0.01]
	));
	sig = sig * \amp.kr(0.5) * env;
	sig = Pan2.ar(sig, \pan.kr(0));
	Out.ar(\out.kr(0), sig);
}).add;