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