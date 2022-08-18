(
s.waitForBoot({

	"synthdefs.scd".loadRelative;
	"load_sound_buffers.scd".loadRelative;
	s.sync;
	~rootFreq = 60.midicps;
	~s53 = Scale.chromatic('et53');
	~mainBus = Bus.audio(s, 2);
	~main_glitch = Synth(\main_out_glitch, [\in, ~mainBus, \out, 0]);
	~revBus = Bus.audio(s, 2);
	~rev = Synth(\medium_reverb, [\in, ~revBus, \mix, 0.00, \out, ~mainBus]);
	~backgroundBus = Bus.audio(s, 2);
	~background = Synth(\background_channel, [\in, ~backgroundBus, \out, ~revBus]);
	~running = Environment.new(know: true);
	~running.speed1 = false;
	~running.speed2 = false;
	~running.speed3 = false;
	~running.infinite = false;
	~crank_activated = false;
	~speed_setting = 0.8; // 0-1
	~zoom_setting = 0.0; // 0-1
	~crank_speed = 0;
	~last_crank_update = 0;
	~stop_functions = Environment.new(know: true);
	~freq_ratio = 1.0;
	s.sync;

	~stop_functions.infinite = {
		if(~running.infinite, {
			~infinite_routine.stop();
			~main_glitch.set(\lag_time, 0.0);
			~main_glitch.set(\enable_pitch_shift, 0);
			~main_glitch.set(\pitch_shift_ratio, 1);
			~main_glitch.set(\pitch_dispersion, 0.0);
			~main_glitch.set(\time_dispersion, 0.0);
			~running.infinite = false;
			~freq_ratio = 1.0;
			0.1.wait;
		});
	};
	~crank_speed_to_wait_time = {
		var speed =
		(0.2/~crank_speed.pow(1.5)).min(0.5);
		speed = speed + ((1.0-~speed_setting.pow(0.33)) * 0.7);
		if((~crank_activated == true) && (Date.localtime.rawSeconds - ~last_crank_update < 0.4), {
			speed.max(0.005).min(1.0)
		}, {
			inf
		});

	};
	~infinite_mode = {
		{
			~stop_functions.speed2.();
			~stop_functions.speed3.();
			~stop_functions.infinite.();


			~running.infinite = true;
			~rev.set(\mixLag, 0, \mix, 0.1);
			~main_glitch.set(\lag_time, 10.0);
			~main_glitch.set(\enable_pitch_shift, 1);
			~main_glitch.set(\pitch_shift_ratio, 1);
			~main_glitch.set(\pitch_dispersion, 0.001);
			~main_glitch.set(\time_dispersion, 0.002);
			~freq_ratio = 1.0;
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
										if(tick_time == inf, {
											(0.1 * self.duration_time).wait;
										}, {
											switch(self.synth_type,
												\tick2, {Synth(\tick2, [\freq, self.freq_pitch * ~freq_ratio, \amp, 0.15 * self.my_amp, \out, ~revBus]); },
												\sine, {Synth(\sine, [\freq, self.freq_pitch*0.05 * ~freq_ratio,
													\amp, 0.2 * self.my_amp, \atk, 0.005, \sus, self.sus_time, \rel, self.duration_time*tick_time,
													\out, ~revBus ]); },
												\dist_noise, {Synth(\dist_noise, [\freq, self.freq_pitch * ~freq_ratio.pow(1.5),
													\amp, 0.25 * self.my_amp, \rel, 0.02, \out, ~revBus]); },
											);
											(self.duration_time*tick_time).wait;
										});
									},
								)
							);
						};

						rrand(3, 8).do{
							sounds.do{|sound|
								sound.play_func(~crank_speed_to_wait_time.());
							};
							if(rrand(0.0, 1.0) > 0.7, {
								~rev.set(\mixLag, rrand(0.4, 2.0), \mix, exprand(0.01, 0.1) + 0.05);
							});
						};
					};
					/*~main_glitch.set(\lag_time, 0.0);
					~main_glitch.set(\enable_pitch_shift, 0);
					~main_glitch.set(\pitch_shift_ratio, 1);
					~main_glitch.set(\pitch_dispersion, 0.0);
					~main_glitch.set(\time_dispersion, 0.0);*/
				}.fork;
			}.();
		}.fork;
	};

	~next_filter = {
		if(~running.infinite, {
			~main_glitch.set(\pitch_dispersion, rrand(0, 0.001));
			~main_glitch.set(\time_dispersion, rrand(0, 0.003));
			if(rrand(0, 1.0) > 0.5, {
				~main_glitch.set(\enable_bit_crush, 1);
				~main_glitch.set(\sample_rate, rrand(10000, 1000));
			}, {
				~main_glitch.set(\enable_bit_crush, 0);
			});
			~freq_ratio = rrand(0.5, 1.5);
		});
	};

	// sound effects update
	~speed_effect = nil;
	~zoom_effect = nil;
	{
		loop {
			var now = Date.localtime.rawSeconds;
			if((now - ~last_speed_update) < 0.3, {
				var freq = ~speed_setting.pow(2) * 1200 + 50, wobble = ~speed_setting.pow(3);
				// play sound effect
				if(~speed_effect == nil, {
					~speed_effect = Synth(\speed_effect, [\freq, freq, \wobble, wobble]);
				});
				~speed_effect.set(\freq, freq);
			}, {
				// stop sound effect if it's playing
				if(~speed_effect != nil, {
					~speed_effect.release;
					~speed_effect = nil;
				});
			});
			if((now - ~last_zoom_update) < 0.3, {
				var freq = (1.0-~zoom_setting).pow(4) * 100 + 50,
				effect = 1.0 - ~zoom_setting;
				// play sound effect
				if(~zoom_effect == nil, {
					~zoom_effect = Synth(\zoom_effect, [\effect, effect, \freq, freq, \out, ~revBus]);
				});
				~zoom_effect.set(\effect, effect, \freq, freq, \out, ~revBus);
			}, {
				// stop sound effect if it's playing
				if(~zoom_effect != nil, {
					~zoom_effect.release;
					~zoom_effect = nil;
				});
			});
			0.05.wait;
		}
	}.fork;

	{
		loop {
			~main_glitch.set(\lag_time, 0.2);
			~main_glitch.set(\enable_pitch_shift, 1);
			~main_glitch.set(\pitch_shift_ratio, [1, 2, 3].choose);
			~main_glitch.set(\pitch_dispersion, exprand(0.00001, 0.01));
			~main_glitch.set(\time_dispersion, rrand(0.0, 0.3).pow(2));
			(21 - exprand(0.5, 20.0)).wait;
		}
	}.fork;

	"osc_from_server.scd".loadRelative;
	~infinite_mode.();
	"background_drone.scd".loadRelative;
});
)


~infinite_mode.()
~next_filter.()
~filter_finished.()

~main_glitch.set(\lag_time, 0.2);
~main_glitch.set(\pitch_shift_ratio, 3.0);
			~main_glitch.set(\time_dispersion, rrand(0, 0.3));
			~main_glitch.set(\pitch_dispersion, rrand(0, 0.1));


