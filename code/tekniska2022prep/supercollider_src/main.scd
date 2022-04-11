(
s.waitForBoot({

	"synthdefs.scd".loadRelative;
	s.sync;
	~rootFreq = 60.midicps;
	~s53 = Scale.chromatic('et53');
	~mainBus = Bus.audio(s, 2);
	~main_glitch = Synth(\main_out_glitch, [\in, ~mainBus, \out, 0]);
	~revBus = Bus.audio(s, 2);
	~rev = Synth(\medium_reverb, [\in, ~revBus, \mix, 0.00, \out, ~mainBus]);
	~running = Environment.new(know: true);
	~running.speed1 = false;
	~running.speed2 = false;
	~running.speed3 = false;
	~running.infinite = false;
	~crank_speed = 0;
	~stop_functions = Environment.new(know: true);
	s.sync;

	~speed1 = {
		{
			var swoosh_dur = rrand(0.35, 0.6);
			~stop_functions.speed2.();
			~stop_functions.speed3.();
			~stop_functions.infinite.();
			// magic swoosh

			{
				var sig, start_freq = Rand(150, 300), end_freq = Rand(2000, 2300);
				sig = Resonz.ar(PinkNoise.ar(), XLine.kr([start_freq, start_freq * Rand(0.99, 1.02)], [end_freq, end_freq * Rand(0.99, 1.02)], swoosh_dur) * LFNoise2.kr(3).range(0.995, 1.001), 0.3, mul: 2);
				sig = sig * EnvGen.kr(Env([0, 1, 0.5, 0], [swoosh_dur, 0.5, 3], [3, 0, -6]), doneAction: 2);
				Out.ar(0, sig);
			}.play;

			{
				var scale = [0, 9, 17, 22, 31, 36, 39, 43, 48, 53, 62, 70].collect{ | degree | ~s53.degreeToFreq(degree, ~rootFreq, 0)};

				0.3.wait;
				Pbind(
					\instrument, \bell,
					\fs, Pseq( scale.scramble[0..rrand(4, scale.size-3)], 1),
					\t60, 6,
					\pitchy, 4,
					\dur, 0.06,
					\amp, 0.02
				).play;
			}.fork;
		}.fork;
	};

	~stop_functions.speed2 = {
		if(~running.speed2, {
			// stop all of the stuff from the previous run
			~speed2_harmony_routine.stop();
			~speed2_score_routine.stop();
			~beep_loop_routines.do{ |rout| rout.stop(); };
			~main_glitch.set(\lag_time, 0.2, \enable_pitch_shift, 0, \pitch_dispersion, 0, \pitch_shift_ratio, 1.0);
			~rev.set(\mixLag, 0, \mix, 0);
			~running.speed2 = false;
			0.1.wait;
		});
	};

	~speed2 = {
		fork{
			~stop_functions.speed2.();
			~stop_functions.speed3.();
			~stop_functions.infinite.();

			~running.speed2 = true;
			~restful_chord = [-53, 0, 31, 39, 48, 53, 62, 70, 84, 77+53, 106, 115].collect{ | degree | ~s53.degreeToFreq(degree, ~rootFreq, 0)};
			~beep_scale = (48..72).midicps * 2.5;

			~atk = 0.01;
			~rel = 0.001;
			~rev.set(\mixLag, 0, \mix, 0);
			"turn down reverb".postln;

			~beep_loop_routines = List[];

			// two beeps per pixel, one original and one altered

			~beep_loop = { | tick_time, fade_in_time = 3.0, pan = 0, num_iterations = 1000 |
				var start_time = Date.localtime.rawSeconds;
				~beep_loop_routines.add({
					num_iterations.do {
						var time = Date.localtime.rawSeconds - start_time,
						amp = time.linexp(0, fade_in_time, 0.0005, 1.0),
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
				}.fork);
			};

			~move_to_restful_chord = {
				~beep_scale[(0..~beep_scale.size-1).choose] = ~restful_chord.choose;
			};

			10.do { |k|
				var pan = k * 0.1;
				if( k%2 == 0, { pan = pan * -1; });
				~beep_loop.(0.08 + (k*0.0018), k * 0.8, pan, 200);
			};
			~speed2_harmony_routine = {
				50.do {
					~move_to_restful_chord.();
					rrand(0.7, 1.2).wait;
				};
			}.fork;
			~speed2_score_routine = {
				~rev.set(\mixLag, 20.0); "reverb 40s".postln;
				0.1.wait;
				~rev.set(\mix, 0.5);
				5.wait;
				~main_glitch.set(\lag_time, 6.0);
				~main_glitch.set(\enable_pitch_shift, 1);
				~main_glitch.set(\pitch_shift_ratio, 2);
				~main_glitch.set(\pitch_dispersion, 1);
				~rev.set(\mixLag, 3.0);
				~rev.set(\mix, 0.2);
				3.wait;
				~cresc = Synth(\windy, [\freq, 200, \out, ~revBus, \amp, 1, \atk, 3, \curve_atk, 7, \rel, 0]);
				3.wait;
				~rev.set(\mixLag, 12.0);
				~rev.set(\mix, 0.7);
				~cresc.release;
				~main_glitch.set(\lag_time, 1.2);
				~main_glitch.set(\enable_pitch_shift, 0);
				~main_glitch.set(\pitch_shift_ratio, 1.0);
				~main_glitch.set(\pitch_dispersion, 0);
				~atk = 0.02;
				~rel = 0.01;

				~beep_scale = ~restful_chord;
				1.wait;
				~running.speed2 = false;
			}.fork;
		};
	};

	~stop_functions.speed3 = {
		if(~running.speed3, {
			~speed3_routine.stop();
			~main_glitch.set(\lag_time, 0.0);
			~main_glitch.set(\enable_pitch_shift, 0);
			~main_glitch.set(\pitch_shift_ratio, 1);
			~main_glitch.set(\pitch_dispersion, 0.0);
			~main_glitch.set(\time_dispersion, 0.0);
			~running.speed3 = false;
			0.1.wait;
		});
	};
	~speed3 = {
		{
			~stop_functions.speed2.();
			~stop_functions.speed3.();
			~stop_functions.infinite.();


			~running.speed3 = true;
			~rev.set(\mixLag, 0, \mix, 0.2);
			~main_glitch.set(\lag_time, 10.0);
			~main_glitch.set(\enable_pitch_shift, 1);
			~main_glitch.set(\pitch_shift_ratio, 1);
			~main_glitch.set(\pitch_dispersion, 0.001);
			~main_glitch.set(\time_dispersion, 0.002);{
				var sounds = List[], num_process_iterations = 10;
				~speed3_routine = {
					num_process_iterations.do{
						var num_process_elements = rrand(5, 9);
						num_process_elements.do{
							sounds.add(
								(
									duration_time: [1/4, 1/3, 1/5].choose,
									freq_pitch: rrand(7000, 12000),
									synth_type: [\tick2, \sine, \dist_noise].wchoose([0.5, 0.1, 0.4]),
									sus_time: rrand(0.0, 0.1),
									my_amp: rrand(0.7, 1.5),
									play_func: {|self, tick_time = 0.2|
										switch(self.synth_type,
											\tick2, {Synth(\tick2, [\freq, self.freq_pitch, \amp, 0.15 * self.my_amp, \out, ~revBus]);},
											\sine, {Synth(\sine, [\freq, self.freq_pitch*0.05, \amp, 0.2 * self.my_amp, \atk, 0.005, \sus, self.sus_time, \rel, self.duration_time*tick_time, \out, ~revBus ]);},
											\dist_noise, {Synth(\dist_noise, [\freq, self.freq_pitch, \amp, 0.25 * self.my_amp, \rel, 0.02, \out, ~revBus]);},
										);
										(self.duration_time*tick_time).wait;
									},
								)
							);
						};

						rrand(3, 8).do{
							sounds.do{|sound|
								sound.play_func(0.1);
							};
							if(rrand(0.0, 1.0) > 0.7, {
								~rev.set(\mixLag, rrand(0.4, 2.0), \mix, exprand(0.15, 0.8));
							});
						};
					};
					~main_glitch.set(\lag_time, 0.0);
					~main_glitch.set(\enable_pitch_shift, 0);
					~main_glitch.set(\pitch_shift_ratio, 1);
					~main_glitch.set(\pitch_dispersion, 0.0);
					~main_glitch.set(\time_dispersion, 0.0);
					~running.speed3 = false;
				}.fork;
			}.();
		}.fork;
	};

	~stop_functions.infinite = {
		if(~running.infinite, {
			~infinite_routine.stop();
			~main_glitch.set(\lag_time, 0.0);
			~main_glitch.set(\enable_pitch_shift, 0);
			~main_glitch.set(\pitch_shift_ratio, 1);
			~main_glitch.set(\pitch_dispersion, 0.0);
			~main_glitch.set(\time_dispersion, 0.0);
			~running.infinite = false;
			0.1.wait;
		});
	};
	~crank_speed_to_wait_time = {
		(0.2/~crank_speed.pow(1.5)).min(0.5)
	};
	~infinite_mode = {
		{
			~stop_functions.speed2.();
			~stop_functions.speed3.();
			~stop_functions.infinite.();


			~running.infinite = true;
			~rev.set(\mixLag, 0, \mix, 0.2);
			~main_glitch.set(\lag_time, 10.0);
			~main_glitch.set(\enable_pitch_shift, 1);
			~main_glitch.set(\pitch_shift_ratio, 1);
			~main_glitch.set(\pitch_dispersion, 0.001);
			~main_glitch.set(\time_dispersion, 0.002);
			{

				~infinite_routine = {
					loop{
						var sounds = List[],
						num_process_elements = rrand(5, 9);
						num_process_elements.do{
							sounds.add(
								(
									duration_time: [1/4, 1/3, 1/5].choose,
									freq_pitch: rrand(7000, 12000),
									synth_type: [\tick2, \sine, \dist_noise].wchoose([0.5, 0.1, 0.4]),
									sus_time: rrand(0.0, 0.1),
									my_amp: rrand(0.7, 1.5),
									play_func: {|self, tick_time = 0.2|
										("tick_tim: " + tick_time).postln;
										switch(self.synth_type,
											\tick2, {Synth(\tick2, [\freq, self.freq_pitch, \amp, 0.15 * self.my_amp, \out, ~revBus]);},
											\sine, {Synth(\sine, [\freq, self.freq_pitch*0.05, \amp, 0.2 * self.my_amp, \atk, 0.005, \sus, self.sus_time, \rel, self.duration_time*tick_time, \out, ~revBus ]);},
											\dist_noise, {Synth(\dist_noise, [\freq, self.freq_pitch, \amp, 0.25 * self.my_amp, \rel, 0.02, \out, ~revBus]);},
										);
										(self.duration_time*tick_time).wait;
									},
								)
							);
						};

						rrand(3, 8).do{
							sounds.do{|sound|
								sound.play_func(~crank_speed_to_wait_time.());
							};
							if(rrand(0.0, 1.0) > 0.7, {
								~rev.set(\mixLag, rrand(0.4, 2.0), \mix, exprand(0.15, 0.8));
							});
						};
					};
					~main_glitch.set(\lag_time, 0.0);
					~main_glitch.set(\enable_pitch_shift, 0);
					~main_glitch.set(\pitch_shift_ratio, 1);
					~main_glitch.set(\pitch_dispersion, 0.0);
					~main_glitch.set(\time_dispersion, 0.0);
				}.fork;
			}.();
		}.fork;
	};

	"osc_from_server.scd".loadRelative;
});
)