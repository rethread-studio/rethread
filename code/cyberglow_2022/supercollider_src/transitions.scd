~transitionSlowdown = { | lead_up_time, cresc_time, noise_freq_ratio, freq_ratio |
	// high pitch
	{
		var sig = SinOsc.ar([3500, 3520]*2, mul: 0.006);
		sig = sig * Env([0, 1.0, 0], [lead_up_time, 0.001]).ar(2);
		Out.ar(~mainBus.index, sig);
	}.play;

	// mid freq noisy tone
	(lead_up_time - cresc_time).wait;
	~cresc = Synth(\windy, [\freq, 100, \out, ~revBus, \amp, 0.7, \atk, cresc_time, \curve_atk, 7, \rel, 0]);

	cresc_time.wait;
	~cresc.release;
	Synth(\tick3, [\freq, 8000, \out, ~revBus, \amp, 0.045]);
	Synth(\tick3, [\freq, 12000, \out, ~revBus, \amp, 0.045]);
	Synth(\tick3, [\freq, 14000, \out, ~revBus, \amp, 0.045]);
	// new settings:
	~ftrace_noise_freq_ratio = noise_freq_ratio;
	~freq_ratio = freq_ratio;
	// low pitch rumble
	~lowRumble = Synth(\windy, [\freq, 15, \out, ~lowBus, \amp, 0.2, \atk, 0.0, \rel, 5]);
	// lower pitch
	{
		var sig = SinOsc.ar([3500, 3520]*0.25, mul: 0.125);
		sig = sig * Env([0.5, 0], [2]).ar(2);
		Out.ar(~revBus.index, sig);
	}.play;
	(0.5).wait;
	~lowRumble.release;
};

~transitionInstant = { |noise_freq_ratio, freq_ratio, tone_amp = 0 |

	Synth(\tick3, [\freq, 8000, \out, ~revBus, \amp, 0.045]);
	Synth(\tick3, [\freq, 12000, \out, ~revBus, \amp, 0.045]);
	// new settings:
	~ftrace_noise_freq_ratio = noise_freq_ratio;
	~freq_ratio = freq_ratio;
	// low pitch rumble
	~lowRumble = Synth(\windy, [\freq, rrand(14.0, 18.0), \out, ~lowBus, \amp, 0.2, \atk, 0.0, \rel, 3]);
	// lower pitch
	{
		var sig = SinOsc.ar({LFNoise2.kr(8).range(3500, 3540)}!2*0.25, mul: 0.125*0.5 * tone_amp);
		sig = sig * Env([0.5, 0], [1]).ar(2);
		Out.ar(~revBus.index, sig);
	}.play;
	(0.1).wait;
	~lowRumble.release;
};

~transitionSwoosh = { |swoosh_dur = 2 |
	{
		var sig;
		sig = Resonz.ar(BrownNoise.ar(), XLine.kr([200, 201], [2000, 1980], swoosh_dur) * LFNoise2.kr(3).range(0.995, 1.001), 0.3, mul: 0.2);
		sig = sig * EnvGen.kr(Env([0, 1, 0.5, 0], [swoosh_dur, 0.5, 0.5]), doneAction: 2);
		Out.ar(~revBus.index, sig);
	}.play;
	(swoosh_dur + 0.5).wait;
	{
		var sig = SinOsc.ar({LFNoise2.kr(8).range(3500, 3540)}!2*0.125, mul: 0.125*0.5);
		sig = sig * Env([0.5, 0], [3]).ar(2);
		Out.ar(~revBus.index, sig);
	}.play;
	Synth(\tick3, [\freq, 8000, \out, ~revBus, \amp, 0.025]);
};

~transitionMainGlitch1 = { | time = 5, main_pitch_ratio = 0.5, noise_freq_ratio = 1.0, freq_ratio = 1.0 |
	var cresc_time = time * 0.3;
	~main_glitch.set(\lag_time, time);
	~main_glitch.set(\enable_pitch_shift, 1);
	~main_glitch.set(\pitch_shift_ratio, main_pitch_ratio);
	~main_glitch.set(\enable_bit_crush, 1);
	~main_glitch.set(\sample_rate, 1000);
	(time - cresc_time).wait;
	~cresc = Synth(\windy, [\freq, 100, \out, ~revBus, \amp, 0.4, \atk, cresc_time, \curve_atk, 7, \rel, 0]);
	cresc_time.wait;
	~cresc.release;
	~main_glitch.set(\lag_time, 0.2);
	~main_glitch.set(\enable_pitch_shift, 0);
	~main_glitch.set(\pitch_shift_ratio, 1.0);
	~main_glitch.set(\enable_bit_crush, 0);
	~main_glitch.set(\sample_rate, 441000);
	{
		var sig = SinOsc.ar({LFNoise2.kr(8).range(3500, 3540)}!2/20, mul: 0.125*0.5);
		sig = sig * Env([0.5, 0], [5]).ar(2);
		Out.ar(~revBus.index, sig);
	}.play;
	// new settings:
	~ftrace_noise_freq_ratio = noise_freq_ratio;
	~freq_ratio = freq_ratio;
};

~transitionMainGlitch2 = { | time = 5, noise_freq_ratio = 1.0, freq_ratio = 1.0 |
	var cresc_time = time * 0.5;
	~main_glitch.set(\lag_time, time);
	~main_glitch.set(\enable_pitch_shift, 1);
	~main_glitch.set(\pitch_shift_ratio, 3);
	~main_glitch.set(\pitch_dispersion, 1);
	(time - cresc_time).wait;
	~cresc = Synth(\windy, [\freq, 200, \out, ~revBus, \amp, 0.4, \atk, cresc_time, \curve_atk, 7, \rel, 0]);
	cresc_time.wait;
	~cresc.release;
	~main_glitch.set(\lag_time, 0.2);
	~main_glitch.set(\enable_pitch_shift, 0);
	~main_glitch.set(\pitch_shift_ratio, 1.0);
	~main_glitch.set(\pitch_dispersion, 0);
	{
		var sig = SinOsc.ar({LFNoise2.kr(8).range(3500, 3540)}!2/20, mul: 0.125*0.5);
		sig = sig * Env([0.5, 0], [5]).ar(2);
		Out.ar(~revBus.index, sig);
	}.play;
	// new settings:
	~ftrace_noise_freq_ratio = noise_freq_ratio;
	~freq_ratio = freq_ratio;
};

~last_transition_used = nil;
~random_transition = {
	var transitions = [
		{~transitionSlowdown.(rrand(3, 8), rrand(1.5, 3), rrand(0.1, 0.5), [0.5, 0.25, 1.0].choose); },
		{~transitionInstant.(rrand(0.7, 1.3), [0.5, 1.0, 1.5].choose, [0, 1].choose);},
		{~transitionSwoosh.(rrand(1.5, 4));},
		{~transitionMainGlitch1.(rrand(4, 6), [0.5, 0.25, 0.1].choose, rrand(0.1, 0.5), [0.5, 0.25, 0.75].choose); },
		{~transitionMainGlitch2.(rrand(4, 6), rrand(1.0, 1.2), [1.0, 1.5].choose); }
	],
	new_transition = (0..(transitions.size-1)).choose;
	("new_transition: " + new_transition).postln;
	while({~last_transition_used == new_transition}, { new_transition = (0..(transitions.size-1)).choose; });
	("new_transition after a while: " + new_transition).postln;
	transitions[new_transition].();
	~last_transition_used = new_transition;
};

/*
fork{~transitionSlowdown.(0.2, 0.2, rrand(0.1, 0.5), [0.5, 0.25, 1.0].choose);}
fork{~transitionInstant.(rrand(0.7, 1.3), [0.5, 1.0, 1.5].choose, [0, 1].choose);}
fork{~transitionSwoosh.(rrand(1.5, 4));}
fork{~transitionMainGlitch2.(10)};
fork{"start_random".postln;~random_transition.()}
~random_transition.()
*/