


(
var rootFreq = ~s53.degreeToFreq(~root, 0.midicps, 2);
while({rootFreq > 50 }, { rootFreq = rootFreq * 0.5});
while({rootFreq < 25 }, { rootFreq = rootFreq * 2.0});
Ndef(\bassFreq, { rootFreq });
)
(
Ndef(\bassSource, {
	var sig, env, freq = Ndef.kr(\bassFreq);
	sig = SinOsc.ar(freq * {LFNoise1.kr(0.3).range(0.99, 1.01)}!2) * 0.125;
	sig = Mix(sig);
	sig
});
)
(
Ndef(\bassSource, {
	var sig, env, freq = Ndef.kr(\bassFreq);
	sig = Saw.ar(freq * {LFNoise1.kr(0.3).range(0.99, 1.01)}!2) * 0.125;
	sig = Mix(sig);
	sig
});
)
(
Ndef(\bassSource, {
	var sig, env, freq = Ndef.kr(\bassFreq);
	sig = Pulse.ar(freq * {LFNoise1.kr(0.3).range(0.99, 1.01)}!2) * 0.125;
	sig = Mix(sig);
	sig
});
)

(
Ndef(\bassNote, {
	var sig, env, freq = Ndef.kr(\bassFreq), maxFreqRatio = LFNoise1.kr(0.5).range(2.0, 4.0);
	sig = Ndef.ar(\bassSource);
	sig = LPF.ar(sig, SinOsc.ar(LFNoise1.kr(5).range(3, 5)).range(freq*0.8, freq*maxFreqRatio));
	sig = [CombC.ar(sig, 0.2, (freq*0.999).reciprocal, 0.25), CombC.ar(sig, 0.2, (freq*1.001).reciprocal, 0.25)];
	sig;
}).play;
)

Ndef(\bassNote).stop;

Ndef(\bassNote).amp_(0.5)
(
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
)