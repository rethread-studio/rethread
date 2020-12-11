
~setBassNote = { | degree |
	var rootFreq = ~s53.degreeToFreq(degree, 0.midicps, 2);
	while({rootFreq > 60 }, { rootFreq = rootFreq * 0.5});
	while({rootFreq < 30 }, { rootFreq = rootFreq * 2.0});
	Ndef(\bassFreq, { rootFreq });
};

~setBassFilterMax = { | filterMax = 0.0 |
	Ndef(\bassFilterMax, { filterMax });
};

~startBassNote = { | amp = 1.0, fadeTime = 1.0 |
	~switchBassSource.(\saw);
	Ndef(\bassNote).fadeTime = fadeTime;
	Ndef(\bassNote, {
		var sig, env, freq = Ndef.kr(\bassFreq), maxFreqRatio = LFNoise1.kr(0.5).range(2.0, 4.0) + Ndef(\bassFilterMax).kr;
		sig = Ndef.ar(\bassSource);
		sig = Mix(sig);
		sig = LPF.ar(sig, SinOsc.ar(LFNoise1.kr(5).range(3, 5)).range(freq*0.8, freq*maxFreqRatio)) * amp;
		sig = [CombC.ar(sig, 0.2, (freq*0.999).reciprocal, 0.25), CombC.ar(sig, 0.2, (freq*1.001).reciprocal, 0.25)];
		sig;
	}).play;
};

~startBassReverb = { | fadeInTime = 3.0 |
	Ndef(\bassRev).fadeTime = fadeInTime;
	Ndef(\bassRev, {
		var sig = Ndef.ar(\bassNote) * Env([0, 1], [2.0]).kr();
		sig = Greyhole.ar(sig, 1.0, feedback: 0.7);
		sig
	}).play;
};

~stopBassRev = { | fadeOutTime = 10.0 |
	Ndef(\bassRev).fadeTime = fadeOutTime;
	Ndef(\bassRev).release;
};

~switchBassSource = { | type = \saw |
	switch(type,
		\saw, {
			Ndef(\bassSource, {
				var sig, env, freq = Ndef.kr(\bassFreq);
				sig = Saw.ar(freq * {LFNoise1.kr(0.3).range(0.99, 1.01)}!2) * 0.125;
				sig = Mix(sig);
				sig
			});
		},
		\sine, {
			Ndef(\bassSource, {
				var sig, env, freq = Ndef.kr(\bassFreq);
				sig = SinOsc.ar(freq * {LFNoise1.kr(0.3).range(0.99, 1.01)}!2) * 0.125;
				sig = Mix(sig);
				sig
			});
	});
};
~startShortBassSineBursts = {
	~bassSineBurstRoutine = Routine({
		loop {
			~switchBassSource.(\sine);
			exprand(0.1, 1.0).wait;
			~switchBassSource.(\saw);
			rrand(2.0, 6.0).wait;
		};
	}).play;
};
~stopShortBassSineBursts = {
	~bassSineBurstRoutine.stop();
	~switchBassSource.(\saw);
};