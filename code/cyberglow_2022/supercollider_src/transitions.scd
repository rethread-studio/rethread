~transitionSlowdown = { | lead_up_time, cresc_time, noise_freq_ratio, freq_ratio |
	// high pitch
	{
		var sig = SinOsc.ar([3500, 3520], mul: 0.04);
		sig = sig * Env([0, 1.0, 0], [lead_up_time, 0.001]).ar(2);
		sig
	}.play;

	// mid freq noisy tone
	(lead_up_time - cresc_time).wait;
	~cresc = Synth(\windy, [\freq, 100, \out, ~revBus, \amp, 0.7, \atk, cresc_time, \curve_atk, 7, \rel, 0]);

	cresc_time.wait;
	~cresc.release;
	Synth(\tick3, [\freq, 8000, \out, ~revBus, \amp, 0.25]);
	Synth(\tick3, [\freq, 12000, \out, ~revBus, \amp, 0.25]);
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
	0.5.wait;
	~lowRumble.release;
};