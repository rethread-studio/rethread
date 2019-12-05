(
{ var lag = 5, amp = 0.1, src, localin, env, generalSpeed = Rand(0.8, 1.5);
		env = EnvGen.kr(Env(
			levels: [0, 1, 1, 0],
			times: [0.001, 2, 0.1],
			curve: [-2, 0, -2]
		),
		doneAction: 2);

		localin = LocalIn.ar(1);
		src = {Pulse.ar(
			[ 250, 62.5, 31.25]+LFPulse.kr(ExpRand(1, 2), 0, LinRand(0, 0.6), 0),
			Rand(0.2, 0.6),
			LFPulse.kr(Rand(0.5, 0.8) + generalSpeed, 0, 0.5, 0.5)
		)}!3;
		src = (src*10).tanh * 0.1;
		src = Mix(src);
		// src = src + (localin*0.3);
		LocalOut.ar(DelayN.ar(src, 0.5, 0.5));
		src = src + CombL.ar(src, 0.2, ExpRand(30, 50).reciprocal, 0.1);

		// src = src + PitchShift.ar(src, 0.2, 0.5, 0.001);
		src = src*env * 0.3 * 0.5;

		Out.ar(0, [src, DelayN.ar(src, 0.01, 0.01)]);
	}.play;
)

(
{ var lag = 5, amp = 0.1, src, localin, env;
	env = EnvGen.kr(Env(
		levels: [0, 1, 1, 0],
		times: [0.001, 2, 0.1]),
	doneAction: 2);

	localin = LocalIn.ar(1);
	src = {Pulse.ar(
		ExpRand(200, 500)+LFPulse.kr(ExpRand(1, 2), 0, LinRand(0, 0.6), Rand(-100, 100)),
			Rand(0.4, 0.6),
		LFPulse.kr(Rand(1.5, 1.8), 0, LinRand(0.1, 0.5), 0.5)
	)}!3;
	src = (src*10).tanh * 0.1;
	src = Mix(src);
	// src = src + (localin*0.3);
	LocalOut.ar(DelayN.ar(src, 0.5, 0.5));
	src = src + CombL.ar(src, 0.2, ExpRand(50, 100).reciprocal, 1.0);
	src = src*env;

	Out.ar(0, [src, DelayN.ar(src, 0.01, 0.01)]);
}.play;
)

(
{ var lag = 5, amp = 0.1, src, localin, env, generalSpeed = Rand(0.8, 1.5);
	env = EnvGen.kr(Env(
		levels: [0, 1, 1, 0],
		times: [0.001, 2, 0.1],
		curve: [-2, 0, -2]
	),
	doneAction: 2);

	localin = LocalIn.ar(1);
	src = {Pulse.ar(
		500+LFPulse.kr(ExpRand(1, 2), 0, LinRand(0, 0.6), 0),
		Rand(0.2, 0.6),
		LFPulse.kr(Rand(0.5, 0.8) + generalSpeed, 0, 0.5, 0.5)
	)}!3;
	src = (src*10).tanh * 0.1;
	src = Mix(src);
	// src = src + (localin*0.3);
	LocalOut.ar(DelayN.ar(src, 0.5, 0.5));
	src = src + CombL.ar(src, 0.2, ExpRand(30, 50).reciprocal, 0.1);

	src = src*env * 0.3;

	Out.ar(0, [src, DelayN.ar(src, 0.01, 0.01)]);
}.play;
)
(

{ var lag = 5, amp = 0.1, src, localin, env, generalSpeed = Rand(0.8, 1.5);
	env = EnvGen.kr(Env(
		levels: [0, 1, 1, 0],
		times: [0.001, 2, 0.1],
		curve: [-2, 0, -2]
	),
	doneAction: 2);

	localin = LocalIn.ar(1);
	src = {Pulse.ar(
		[ 250, 62.5, 31.25]+LFPulse.kr(ExpRand(1, 2), 0, LinRand(0, 0.6), 0),
		Rand(0.2, 0.6),
		LFPulse.kr(Rand(0.5, 0.8) + generalSpeed, 0, 0.5, 0.5)
	)}!3;
	src = (src*10).tanh * 0.1;
	src = Mix(src);
	// src = src + (localin*0.3);
	LocalOut.ar(DelayN.ar(src, 0.5, 0.5));
	src = src + CombL.ar(src, 0.2, ExpRand(30, 50).reciprocal, 0.1);

	// src = src + PitchShift.ar(src, 0.2, 0.5, 0.001);
	src = src*env * 0.3 * 0.5;

	Out.ar(0, [src, DelayN.ar(src, 0.01, 0.01)]);
}.play;

)
(

{ var lag = 5, amp = 0.1, src, localin, env, generalSpeed = Rand(0.8, 1.5);
	env = EnvGen.kr(Env(
		levels: [0, 1, 1, 0],
		times: [0.001, 2, 0.1],
		curve: [-2, 0, -2]
	),
	doneAction: 2);

	localin = LocalIn.ar(1);
	src = {Pulse.ar(
		[ 250, 62.5, 31.25]+LFPulse.kr(ExpRand(1, 2), 0, LinRand(0, 0.6), 0),
		Rand(0.2, 0.6),
		LFPulse.kr(Rand(0.5, 0.8) + generalSpeed, 0, 0.5, 0.5)
	)}!3;
	src = (src*10).tanh * 0.1;
	src = Mix(src);
	// src = src + (localin*0.3);
	LocalOut.ar(DelayN.ar(src, 0.5, 0.5));
	src = src + CombL.ar(src, 0.2, 31.2.reciprocal, 0.1);

	// src = src + PitchShift.ar(src, 0.2, 0.5, 0.001);
	src = src*env * 0.3 * 0.5;

	Out.ar(0, [src, DelayN.ar(src, 0.01, 0.01)]);
}.play;

)
(

{ var lag = 5, amp = 0.1, src, localin, env, generalSpeed = Rand(0.8, 1.5);
	env = EnvGen.kr(Env(
		levels: [0, 1, 1, 0],
		times: [0.001, 2, 0.1],
		curve: [-2, 0, -2]
	),
	doneAction: 2);

	localin = LocalIn.ar(1);
	src = {Pulse.ar(
		[1000, 500, 250, 62.5, 31.25]+LFPulse.kr(ExpRand(1, 2), 0, LinRand(0, 0.6), 0),
		Rand(0.2, 0.6),
		LFPulse.kr(Rand(0.5, 0.8) + generalSpeed, 0, 0.5, 0.5)
	)}!3;
	src = (src*10).tanh * 0.1;
	src = Mix(src);
	// src = src + (localin*0.3);
	LocalOut.ar(DelayN.ar(src, 0.5, 0.5));
	src = src + CombL.ar(src, 0.2, XLine.kr(ExpRand(500.reciprocal, 31.2.reciprocal), ExpRand(500.reciprocal, 31.2.reciprocal), 2.0), 0.5);

	// src = src + PitchShift.ar(src, 0.2, 0.5, 0.001);
	src = src*env * 0.3 * 0.5;
	src = LeakDC.ar(src);

	Out.ar(0, [src, DelayN.ar(src, 0.01, 0.01)]);
}.play;

)
(

{ var lag = 5, amp = 0.1, src, localin, env, generalSpeed = Rand(0.8, 1.5);
	env = EnvGen.kr(Env(
		levels: [0, 1, 1, 0],
		times: [0.001, 2, 1.7],
		curve: [-2, 0, -2]
	),
	doneAction: 2);

	localin = LocalIn.ar(1);
	src = {Pulse.ar(
		[1000, 500, 250, 62.5, 31.25]+LFPulse.kr(ExpRand(1, 2), 0, LinRand(0, 0.6), 0),
		Rand(0.2, 0.6),
		LFPulse.kr(Rand(0.5, 0.8) + generalSpeed, 0, 0.5, 0.5)
	)}!3;
	src = (src*10).tanh * 0.1;
	src = Mix(src);
	// src = src + (localin*0.3);
	LocalOut.ar(DelayN.ar(src, 0.5, 0.5));
	src = src + CombL.ar(src, 0.2, LFNoise1.kr(XLine.kr(2, 100, 2.0)).range(500.reciprocal, 31.2.reciprocal), 0.5);

	// src = src + PitchShift.ar(src, 0.2, 0.5, 0.001);
	src = src*env * 0.3 * 0.5;
	src = LeakDC.ar(src);

	Out.ar(0, [src, DelayN.ar(src, 0.01, 0.01)]);
}.play;

)
(
{ var lag = 5, amp = 0.1, src, localin, env, generalSpeed = Rand(0.8, 1.5);
	env = EnvGen.kr(Env(
		levels: [0, 1, 1, 0],
		times: [0.001, 2, 0.1],
		curve: [-2, 0, -2]
	),
	doneAction: 2);

	localin = LocalIn.ar(1);
	src = {Pulse.ar(
		[ 250, 62.5, 31.25]+LFPulse.kr(500, 0, LinRand(0, 0.6), 31.25),
		Rand(0.2, 0.6),
		LFPulse.kr(Rand(0.5, 0.8) + generalSpeed, 0, 0.5, 0.5)
	)}!3;
	src = (src*10).tanh * 0.1;
	src = Mix(src);
	// src = src + (localin*0.3);
	LocalOut.ar(DelayN.ar(src, 0.5, 0.5));
	src = src + CombL.ar(src, 0.2, 120.reciprocal, 0.3);

	// src = src + PitchShift.ar(src, 0.2, 0.5, 0.001);
	src = src*env * 0.3 * 0.5;
	src = LeakDC.ar(src);

	Out.ar(0, [src, DelayN.ar(src, 0.01, 0.01)]);
}.play;
)
(

{ var lag = 5, amp = 0.1, src, localin, env, generalSpeed = Rand(0.8, 1.5);
	env = EnvGen.kr(Env(
		levels: [0, 1, 1, 0],
		times: [0.001, 2, 1.7],
		curve: [-2, 0, -2]
	),
	doneAction: 2);

	localin = LocalIn.ar(1);
	src = {Pulse.ar(
		[1000, 500, 250, 62.5, 31.25]+LFPulse.kr(ExpRand(1, 2), 0, LinRand(0, 0.6), 0),
		Rand(0.2, 0.6),
		LFPulse.kr(Rand(0.5, 0.8) + generalSpeed + Line.kr(0, 0.5, 1.5), 0, 0.5, 0.5)
	)}!3;
	src = (src*10).tanh * 0.1;
	src = Mix(src);
	// src = src + (localin*0.3);
	LocalOut.ar(DelayN.ar(src, 0.5, 0.5));
	src = src + CombL.ar(src, 0.2, LFNoise1.kr(XLine.kr(2, 300, 2.0)).range(500.reciprocal, 31.2.reciprocal), 0.5);

	// src = src + PitchShift.ar(src, 0.2, 0.5, 0.001);
	src = src*env * 0.3 * 0.5;
	src = LeakDC.ar(src);

	Out.ar(0, [src, DelayN.ar(src, 0.01, 0.01)]);
}.play;

)
62.5 * 1.5