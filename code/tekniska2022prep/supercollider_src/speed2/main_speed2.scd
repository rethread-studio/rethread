
(
~beep_scale = (48..72).midicps;

// two beeps per pixel, one original and one altered

~beep_pixel = { | tick_time, i |
	var org = rrand(0.0, 1.0), result = rrand(0.0, 1.0),
	org_freq = ~beep_scale[(org*~beep_scale.size).floor.min(~beep_scale.size-1)],
	res_freq = ~beep_scale[(org*~beep_scale.size).floor.min(~beep_scale.size-1)],
	amp = 0.05;
{
	Synth(\sine, [
					\atk, 0.0001,
					\sus, 0.07,
					\rel, 0.001,
					\amp,  amp,
					\freq, org_freq + i,
					\out, 0]);
	tick_time.wait;
	Synth(\sine, [
					\atk, 0.0001,
					\sus, 0.07,
			\rel, 0.001,
			\amp,  amp,
			\freq, res_freq + i,
			\out, 0]);
	}.fork;
};


	10.do { |k|
		{
		600.do { |i|
			~beep_pixel.(0.08, i);
			(0.2 + (k * 0.001)).wait;
		};
		}.fork;
	};


)