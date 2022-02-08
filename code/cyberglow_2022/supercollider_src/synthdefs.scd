// ftrace sonification SynthDefs

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

SynthDef(\tick3, {
	var sig, env, rq = \rq.kr(0.3);
	env = Env.perc(\atk.kr(0), \rel.kr(0.5), curve: [\c0.kr(-4), \c1.kr(-4)]).ar(2);
	sig = Impulse.ar(0);
	sig = sig * 0.5;
	// high freq and rq values causes the filter to blow up violently
	sig = RHPF.ar(sig, \freq.kr(1000).min(18000).max(20), rq.min(5)) * env;
	sig = Pan2.ar(sig, \pan.kr(0)) * \amp.kr(1.0) * 10;
	sig = (sig*7).tanh;
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
	sig = sig * Env.linen(0.01, 0.03, \rel.kr(0.05)).kr(2) * \amp.kr(0.5);
	sig = LPF.ar(sig, \lpf.kr(7000));
	sig = Pan2.ar(sig);
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\kick, {arg out = 0, amp = 0.3, sinfreq = 60, glissf = 0.8, glisstime = 0.035, att = 0.01, rel = 0.45, pan = 0;
	var env, snd, ramp, click, clickAmp, clickAdd = \clickAdd.kr(100), sub, subAmp, wobble = \wobble.kr(0.1);
	env = Env.perc(att, rel, amp).ar(doneAction: 2);
	ramp = XLine.ar(
		start: sinfreq,
		end: sinfreq * glissf,
		dur: glisstime
	);
	snd = SinOsc.ar(freq: ramp, mul: env);
	clickAmp = EnvGen.ar(Env.perc(0.001, 0.01)) * 0.1 * amp;
	click = LPF.ar(Formant.ar(910 + clickAdd, 4760 + clickAdd, 2110 + clickAdd), Rand(3000, 4500)) * clickAmp;

	snd = snd + click;
	snd = Pan2.ar(snd, pan);
	subAmp = EnvGen.ar(Env.perc(att, rel)) * 0.25 * amp;
	sub = SinOsc.ar(sinfreq * glissf * {SinOsc.kr(8, phase: Rand(0, pi)).range(1.0-wobble, 1.0+wobble)}!2) * subAmp;
	snd = snd + sub;
	Out.ar(out, snd);
}).add;