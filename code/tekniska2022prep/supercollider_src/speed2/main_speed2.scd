(
SynthDef(\sine, {
	var sig, env;
	env = Env.linen(\atk.kr(0.01), \sus.kr(0.5), \rel.kr(0.2)).ar(2);
	sig = SinOsc.ar(\freq.kr(220), mul: \amp.kr(0.5)) * env;
	sig = Pan2.ar(sig, \pan.kr(0));
	Out.ar(\out.kr(0), sig);
}).add;
SynthDef(\medium_reverb, { | out = 0, amp = 1, mix = 0.3  |
	var sig, wet, in;

	in = In.ar(\in.kr(10), 2);
	mix = Lag2.kr(mix, \mixLag.kr(10));

	sig = HPF.ar(in, 120);
	sig = LPF.ar(sig, 7000);

	wet = JPverb.ar(sig, 3.0, 0.9, 4.0, 0.8);
	// wet = GVerb.ar(sig, 300, 103, 0.43, 0.51, 15, -5.dbamp, -26.dbamp, -20.dbamp);
	// wet = Greyhole.ar(sig, \delayTime.kr(0.1), \damp.kr(0.7), \size.kr(1.0), \diff.kr(0.8), \feedback.kr(0.9));

	wet = HPF.ar(wet, 60);

	sig = (in * (1-mix)) + (wet*mix);
	sig = Limiter.ar(sig, 0.95);
	Out.ar(out, sig);
}).add;
SynthDef(\main_out_glitch, {
	var sig = In.ar(\in.kr(10), 2), lag_time = \lag_time.kr(3);

	sig = SelectX.ar(\enable_pitch_shift.kr(0, lag_time), [sig, PitchShift.ar(sig, 0.2, Ramp.kr(\pitch_shift_ratio.kr(1.0), lag_time), VarLag.kr(\pitch_dispersion.kr(0.00), lag_time, 20), \time_dispersion.kr(0.01, lag_time))]);
	sig = SelectX.ar(\enable_bit_crush.kr(0, lag_time), [sig, Decimator.ar(sig, \sample_rate.kr(44100, lag_time), \bits.kr(24, lag_time))]);

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
~restful_chord = [-53, 0, 31, 39, 48, 53, 62, 70, 84, 77+53, 106, 115].collect{ | degree | ~s53.degreeToFreq(degree, ~rootFreq, 0)};
~beep_scale = (48..72).midicps * 2.5;
~mainBus = Bus.audio(s, 2);
~main_glitch = Synth(\main_out_glitch, [\in, ~mainBus, \out, 0]);
~revBus = Bus.audio(s, 2);
~rev = Synth(\medium_reverb, [\in, ~revBus, \mix, 0.00, \out, ~mainBus]);
~atk = 0.01;
~rel = 0.001;

// two beeps per pixel, one original and one altered

~beep_loop = { | tick_time, fade_in_time = 3.0, pan = 0, num_iterations = 1000 |
	var start_time = Date.localtime.rawSeconds;
	{
		num_iterations.do {
			var time = Date.localtime.rawSeconds - start_time,
			amp = time.linexp(0, fade_in_time, 0.0001, 1.0),
			freq;
			if(rrand(0, 1.0) > 0.7, {
				freq = ~beep_scale[5];
			},  {
				freq = ~beep_scale.choose;
			});
			Synth(\sine, [
				\atk, ~atk,
				\sus, 0.07,
				\rel, ~rel,
				\amp,  amp * 0.1,
				\freq, freq,
				\pan, pan,
				\out, ~revBus]);
			tick_time.wait;
			tick_time = tick_time * 0.999;
		};
	}.fork;
};

~move_to_restful_chord = {
	~beep_scale[(0..~beep_scale.size-1).choose] = ~restful_chord.choose;
};

10.do { |k|
	var pan = k * 0.1;
	if( k%2 == 0, { pan = pan * -1; });
	~beep_loop.(0.08 + (k*0.0018), k * 2, pan, 400);
};
{
	50.do {
		~move_to_restful_chord.();
		rrand(0.7, 1.2).wait;
	};
}.fork;
{
	~rev.set(\mixLag, 40.0);
	0.1.wait;
	~rev.set(\mix, 0.5);
	20.wait;
	~main_glitch.set(\lag_time, 10.0);
	~main_glitch.set(\enable_pitch_shift, 1);
	~main_glitch.set(\pitch_shift_ratio, 3);
	~main_glitch.set(\pitch_dispersion, 1);
	~rev.set(\mixLag, 5.0);
	~rev.set(\mix, 0.1);
	5.wait;
	~main_glitch.set(\lag_time, 1.2);
	~main_glitch.set(\enable_pitch_shift, 0);
	~main_glitch.set(\pitch_shift_ratio, 1.0);
	~main_glitch.set(\pitch_dispersion, 0);
	~atk = 0.02;
	~rel = 0.01;

	~beep_scale = ~restful_chord;
}.fork;

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