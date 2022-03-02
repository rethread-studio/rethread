

~make_stats = {
	var env = Environment(know: true);
	env.rolling_average = 0;
	env
};
~ftrace_stats = Environment(know: true);
~ftrace_stats.syscall = ~make_stats.();
~ftrace_stats.random = ~make_stats.();


~start_beep_process = {
	~beep_routine = Routine({
		var amp_stream_1 = Prand([Pgeom(0.02, 1.08, 20), Pgeom(0.04, 1.1, 10),Pgeom(0.1, 0.95, 20), Pgeom(0.08, 0.92, 10)], inf).asStream,
		amp_stream_2 =  Prand([Pgeom(0.5, 1.01, 50), Pgeom(1.0, 0.98, 40),Pgeom(0.7, 0.95, 20), Pgeom(0.7, 1.02, 15)], inf).asStream,
		freq_stream = Prand([Pseq([1400], 7), Prand(([60, 61, 62, 63 ,64 ,65, 66, 67, 68, 69, 70, 71, 72].midicps * 4.5), 3)], inf).asStream;
		loop {
			var channel = ~channels.beep,
			dur = 0.08,
			amp = amp_stream_1.next * amp_stream_2.next
			;

			channel.play_on(\sine, [
				\atk, 0.0001,
				\sus, 0.07,
				\rel, 0.001,
				\amp,  amp,
				\freq, freq_stream.next,
				\out, channel.bus]);
			dur.wait;
		};

	}).play;
};

~stop_beep_process = {
	~beep_routine.stop;
};

~start_tick_process = {
	~tick_routine1 = Routine({
		var freq_stream = Pwhite(10000, 10650).asStream; // (5000, 10500) (10000, 10650)
		loop {
			var channel = ~channels.tick,
			dur = 0.125,
			amp = 0.25;
			if(~ftrace_stats.syscall.rolling_average > 20000, {
				dur = 0.33*0.125;
			});

			channel.play_on(\tick2, [
				\freq, freq_stream.next,
				\rq, 0.03,
				\amp, amp,
				\atk, 0.001,
				\out, channel.bus]);
			dur.wait;
		};

	}).play;

	~tick_routine2 = Routine({
		var freq_stream = Pwhite(100, 150).asStream;
		loop {
			var channel = ~channels.tick,
			dur = 0.125,
			amp = 0.25;
			if(~ftrace_stats.random.rolling_average > 100, {
				dur = 0.33*0.125;
			});

			channel.play_on(\tick2, [
				\freq, freq_stream.next,
				\rq, 0.03,
				\amp, amp,
				\atk, 0.001,
				\out, channel.bus]);
			dur.wait;
		};

	}).play;

};


~stop_tick_process = {
	~tick_routine1.stop;
	~tick_routine2.stop;
};

~ftrace_trigger = { | type |
	var freq = rrand(14000, 15000),
	rel = rrand(1.0, 3.0),
	amp = rrand(0.05, 0.1) * 0.75,
	channel = ~channels.noise;
	switch(type,
		\Syscall, {
			freq = rrand(14000, 15000);
			rel = rrand(0.1, 0.35);
		},
		\Random,{
			freq = rrand(5000, 5100);
			rel = rrand(0.5, 2.35);
		},
		\Tcp,{
			freq = rrand(12000, 12500);
			rel = rrand(0.2, 0.55);
		},
		\IrqMatrix,{
			freq = rrand(7000, 7100);
			rel = rrand(0.3, 0.8);
		},
	);
	channel.play_on(\dist_noise, [
		\freq, freq,
		\rel, rel,
		\amp, amp,
	]);

};

/*
~start_beep_process.()
~stop_beep_process.()
~start_tick_process.()
*/