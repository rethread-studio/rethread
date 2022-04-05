(
SynthDef(\sine, {
	var sig, env;
	env = Env.linen(\atk.kr(0.01), \sus.kr(0.5), \rel.kr(0.2)).ar(2);
	sig = SinOsc.ar(\freq.kr(220), mul: \amp.kr(0.5)) * env;
	sig = Pan2.ar(sig, \pan.kr(0));
	Out.ar(\out.kr(0), sig);
}).add;
)
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

// quick beeps, start with one beep and gradually fade in more beeps distributed over the width (Splay like)
(
~beep_scale = (48..72).midicps * 2.5;

// two beeps per pixel, one original and one altered

~beep_loop = { | tick_time, fade_in_time = 3.0, pan = 0, num_iterations = 1000 |
	var start_time = Date.localtime.rawSeconds;
	{
		num_iterations.do {
			var time = Date.localtime.rawSeconds - start_time,
			amp = time.linexp(0, fade_in_time, 0.0001, 1.0),
			freq;
			if(rrand(0, 1.0) > 0.7, {
				freq = ~beep_scale[10];
			},  {
				freq = ~beep_scale.choose;
			});
			Synth(\sine, [
				\atk, 0.01,
				\sus, 0.07,
				\rel, 0.001,
				\amp,  amp * 0.1,
				\freq, freq,
				\pan, pan,
				\out, 0]);
			tick_time.wait;
			tick_time = tick_time * 0.999;
		};
	}.fork;
};

10.do { |k|
	var pan = k * 0.1;
	if( k%2 == 0, { pan = pan * -1; });
	~beep_loop.(0.08 + (k*0.001), k * 2, pan, 1000);
};

)


// repeated beep sequence, where each note represents a part of the structure

(
var brightness, saturation, contrast, beep_loop;
~beep_scale = (48..72).midicps * 2.5;

brightness = [3];
saturation = [7, 3, 7, 3];
contrast = [0, 7, 3];

// two beeps per pixel, one original and one altered

beep_loop = { | tick_time, fade_in_time = 3.0, pan = 0, num_iterations = 1000 |
	var start_time = Date.localtime.rawSeconds;
	{
		num_iterations.do { |i|
			var time = Date.localtime.rawSeconds - start_time,
			amp = time.linexp(0, fade_in_time, 0.0001, 1.0),
			freq;
			if((i%2) == 0, {
				var index = (i/2)% saturation.size;
				freq = saturation[index] * 2;
			}, {

					freq = ~beep_scale.choose * 0.25;
			});
			Synth(\sine, [
				\atk, 0.01,
				\sus, 0.07,
				\rel, 0.001,
				\amp,  amp * 0.1,
				\freq, freq,
				\pan, pan,
				\out, 0]);
			tick_time.wait;
			tick_time = tick_time * 0.999;
		};
	}.fork;
};

10.do { |k|
	var pan = k * 0.1;
	if( k%2 == 0, { pan = pan * -1; });
	beep_loop.(0.08 + (k*0.001), k * 2, pan, 1000);
};

)