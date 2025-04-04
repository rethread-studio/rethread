

~make_stats = {
	var env = Environment(know: true);
	env.rolling_average = 0;
	env.min_rolling_average = 0;
	env.max_rolling_average = 0;
	env
};
~ftrace_stats = Environment(know: true);
~ftrace_stats.syscall = ~make_stats.();
~ftrace_stats.random = ~make_stats.();

~beep_scale = [0, 5, 9, 14, 17, 22, 26, 31, 36, 39, 43, 48, 53].collect{ | degree | ~s53.degreeToFreq(degree, ~rootFreq, 0)};

~start_beep_process = {
	~beep_routine = Routine({
		var amp_stream_1 = Prand([
			Pgeom(0.02, 1.08, 20),
			Pgeom(0.04, 1.1, 10),
			Pgeom(0.1, 0.95, 20),
			Pgeom(0.08, 0.92, 10)
		], inf).asStream,
		amp_stream_2 =  Prand([Pgeom(0.5, 1.01, 50), Pgeom(1.0, 0.98, 40),Pgeom(0.7, 0.95, 20), Pgeom(0.7, 1.02, 15)], inf).asStream,
		freq_stream = Prand([Pseq([1400], 7), Prand(([60, 61, 62, 63 ,64 ,65, 66, 67, 68, 69, 70, 71, 72].midicps * 4.5), 3)], inf).asStream,
		// A Routine can have several yield points, unlike FuncStreams
		freq_routine = Routine({
			loop{
				var num_passive = ~ftrace_stats.random.rolling_average.linlin(~ftrace_stats.random.min_rolling_average, ~ftrace_stats.random.max_rolling_average, 3, 10),
				num_active = ~ftrace_stats.syscall.rolling_average.linlin(~ftrace_stats.syscall.min_rolling_average, ~ftrace_stats.syscall.max_rolling_average, 3, 10);
				num_passive.do{
					1400.yield;
				};
				num_active.do{
					var freq = ~beep_scale[~ftrace_stats.syscall.rolling_average.linlin(~ftrace_stats.syscall.min_rolling_average, ~ftrace_stats.syscall.max_rolling_average, 0, ~beep_scale.size-1).round] * 4.5;
					freq.yield;
				};
			}
		});
		loop {
			var channel = ~channels.beep,
			dur = ~ftrace_beep_dur,
			amp = amp_stream_1.next * amp_stream_2.next
			;

			if(~enable_ftrace, {
				channel.play_on(\sine, [
					\atk, 0.0001,
					\sus, 0.07,
					\rel, 0.001,
					\amp,  amp * 0.7,
					\freq, freq_routine.next * ~ftrace_noise_freq_ratio,
					\out, channel.bus]);
			});
			dur.wait;
		};

	}).play;
};

~stop_beep_process = {
	~beep_routine.stop;
};

~start_tick_process = {
	if(~tick_routine1 != nil, {
		~tick_routine1.stop;
	});
	if(~tick_routine2 != nil, {
		~tick_routine2.stop;
	});
	~tick_routine1 = Routine({
		var freq_stream = Pwhite(10000, 10650).asStream; // (5000, 10500) (10000, 10650)
		loop {
			var amp_stream_1 = Prand([
				Pgeom(0.02, 1.08, 20),
				Pgeom(0.04, 1.1, 10),
				Pgeom(0.1, 0.95, 20),
				Pgeom(0.08, 0.92, 10)
			], inf).asStream,
			amp_stream_2 =  Prand([Pgeom(0.5, 1.01, 50), Pgeom(1.0, 0.98, 40),Pgeom(0.7, 0.95, 20), Pgeom(0.7, 1.02, 15)], inf).asStream,
			channel = ~channels.tick,
			dur = 0.5.pow(~ftrace_stats.syscall.rolling_average.linlin(~ftrace_stats.syscall.min_rolling_average, ~ftrace_stats.syscall.max_rolling_average, 2, 6).round),
			amp = amp_stream_1.next * amp_stream_2.next * 0.7;

			if(~enable_ftrace, {
				channel.play_on(\tick2, [
					\freq, freq_stream.next,
					\rq, 0.03,
					\amp, amp,
					\atk, 0.001,
					\out, channel.bus]);
			});
			dur.wait;
		};

	}).play;

	~tick_routine2 = Routine({
		var freq_stream = Pwhite(8000, 9500).asStream;
		loop {
			var amp_stream_1 = Prand([
				Pgeom(0.02, 1.08, 20),
				Pgeom(0.04, 1.1, 10),
				Pgeom(0.1, 0.95, 20),
				Pgeom(0.08, 0.92, 10)
			], inf).asStream,
			amp_stream_2 =  Prand([Pgeom(0.5, 1.01, 50), Pgeom(1.0, 0.98, 40),Pgeom(0.7, 0.95, 20), Pgeom(0.7, 1.02, 15)], inf).asStream,
			channel = ~channels.tick,
			dur = 0.5.pow(~ftrace_stats.random.rolling_average.linlin(~ftrace_stats.random.min_rolling_average, ~ftrace_stats.random.max_rolling_average, 2, 6).round),
			amp = amp_stream_1.next * amp_stream_2.next * 0.7;

			if(~enable_ftrace, {
				channel.play_on(\tick2, [
					\freq, freq_stream.next,
					\rq, 0.003,
					\amp, amp,
					\atk, 0.001,
					\out, channel.bus]);
			});
			dur.wait;
		};

	}).play;

	// Vary pitch dispersion over time
	{
		loop{
			var p_disp= exprand(0.002, 0.1), t_disp = exprand(0.0002, 0.01);
			~tickSoftenerSynths.do{|syn| syn.set(\pitch_dispersion, p_disp);};
			~tickSoftenerSynths.do{|syn| syn.set(\time_dispersion, t_disp);};
			rrand(1, 2).wait;
		};
	}.fork;

};




~stop_tick_process = {
	~tick_routine1.stop;
	~tick_routine2.stop;
};
~ftrace_noise_freq_ratio = 1.0;
~ftrace_trigger = { | type |
	var freq = rrand(14000, 15000),
	rel = rrand(1.0, 3.0),
	amp = rrand(0.05, 0.1) * 0.15,
	channel = ~channels.noise;
	switch(type,
		\Syscall, {
			freq = rrand(14000, 14200);
			rel = exprand(0.02, 0.06);
			amp = amp * rrand(0.5, 1.0);
		},
		\Random,{
			freq = rrand(5000, 5100);
			rel = exprand(0.1, 0.45);
			amp = amp * rrand(0.5, 1.0);
		},
		\Tcp,{
			freq = rrand(12000, 12500);
			rel = exprand(0.2, 0.55);
		},
		\IrqMatrix,{
			freq = rrand(7000, 7100);
			rel = exprand(0.3, 0.8);
		},
	);
	rel = rel * 0.5;
	freq = freq * ~ftrace_noise_freq_ratio;
	channel.play_on(\dist_noise, [
		\freq, freq,
		\rel, rel,
		\amp, amp,
		\out, channel.bus
	]);
};

/*
~start_beep_process.()
~stop_beep_process.()
~start_tick_process.()
*/