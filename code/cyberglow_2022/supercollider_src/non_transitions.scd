// These processes use similar sounds as the transitions do, but "recover" from them witout transitions. The idea behind this is that the transitions become quite predictable after a while.

~nonTransitionSwoosh = { |swoosh_dur = 2 |
	{
		var sig;
		sig = Resonz.ar(BrownNoise.ar(), XLine.kr([200, 201], [2200, 2180], swoosh_dur) * LFNoise2.kr(3).range(0.995, 1.001), 0.3, mul: 0.2);
		sig = sig * EnvGen.kr(Env([0, 1, 0.5, 0], [swoosh_dur, 0.5, 3], [2, 0, -6]), doneAction: 2);
		Out.ar(~revBus.index, sig);
	}.play;
	(swoosh_dur).wait;
};
~nonTransitionInvertedSwoosh = { |swoosh_dur = 2 |
	{
		var sig;
		sig = Resonz.ar(BrownNoise.ar(), XLine.kr([2200, 2180], [200, 201], swoosh_dur) * LFNoise2.kr(3).range(0.995, 1.001), 0.3, mul: 0.2);
		sig = sig * EnvGen.kr(Env([0, 1, 0.5, 0], [swoosh_dur, 0.5, 3], [2, 0, -6]), doneAction: 2);
		Out.ar(~revBus.index, sig);
	}.play;
	(swoosh_dur).wait;
};

~nonTransitionMainGlitch1 = { | time = 5, main_pitch_ratio = 0.5 |
	var cresc_time = time * 0.3;
	~mainGlitchSynths.do{|syn| syn.set(\lag_time, time);};
	~mainGlitchSynths.do{|syn| syn.set(\enable_pitch_shift, 1);};
	~mainGlitchSynths.do{|syn| syn.set(\pitch_shift_ratio, main_pitch_ratio);};
	~mainGlitchSynths.do{|syn| syn.set(\enable_bit_crush, 1);};
	~mainGlitchSynths.do{|syn| syn.set(\sample_rate, 1000);};
	(time*0.5).wait;
	~mainGlitchSynths.do{|syn| syn.set(\lag_time, 0.2);};
	~mainGlitchSynths.do{|syn| syn.set(\enable_pitch_shift, 0);};
	~mainGlitchSynths.do{|syn| syn.set(\pitch_shift_ratio, 1.0);};
	~mainGlitchSynths.do{|syn| syn.set(\enable_bit_crush, 0);};
	~mainGlitchSynths.do{|syn| syn.set(\sample_rate, 44100);};
};

~nonTransitionMainGlitch2 = { | time = 5 |
	var cresc_time = time * 0.5;
	~mainGlitchSynths.do{|syn| syn.set(\lag_time, time);};
	~mainGlitchSynths.do{|syn| syn.set(\enable_pitch_shift, 1);};
	~mainGlitchSynths.do{|syn| syn.set(\pitch_shift_ratio, 3);};
	~mainGlitchSynths.do{|syn| syn.set(\pitch_dispersion, 1);};
	(time*0.5).wait;
	~cresc = Synth(\windy, [\freq, 200, \out, ~revBus, \amp, 0.4, \atk, cresc_time, \curve_atk, 7, \rel, 0]);
	cresc_time.wait;
	~cresc.release;
	~mainGlitchSynths.do{|syn| syn.set(\lag_time, 0.2);};
	~mainGlitchSynths.do{|syn| syn.set(\enable_pitch_shift, 0);};
	~mainGlitchSynths.do{|syn| syn.set(\pitch_shift_ratio, 1.0);};
	~mainGlitchSynths.do{|syn| syn.set(\pitch_dispersion, 0);};
	(time*0.5).wait;
};

~last_non_transition_used = nil;
~random_non_transition = {
	var transitions = [
		{~nonTransitionInvertedSwoosh.(rrand(1.5, 4));},
		{~nonTransitionSwoosh.(rrand(1.5, 4));},
		{~nonTransitionMainGlitch1.(rrand(1, 2.5), [0.5, 0.25, 0.1].choose); },
		{~nonTransitionMainGlitch2.(rrand(1, 2.5)); }
	],
	new_transition = (0..(transitions.size-1)).choose;
	while({~last_non_transition_used == new_transition}, { new_transition = (0..(transitions.size-1)).choose; });
	transitions[new_transition].();
	~last_non_transition_used = new_transition;
};