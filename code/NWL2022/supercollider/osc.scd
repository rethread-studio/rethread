OSCdef(\call, {|msg, time, addr, recvPort|
	var depth = msg[1]-~section.min_depth, sine_mix, freq, buf, amp, atk;
	// freq = msg[1] * 10 + 20,
	// freq = (msg[1] + 12).midicps,
	freq = ~chord[(depth %~chord.size)] * 2.pow((depth/~chord.size).floor());
	if(~section.depth_width < (~chord.size) || ((~section.average  - ~section.min_depth) < ~chord.size)) {
		freq = freq * 2;
	};
	if(~section.depth_width < (~chord.size*2)) {
		freq = freq * 2;
	};
	amp = 1.0; atk = 0.005;
	if(msg[2] == 0, {
		buf = ~wt_buf[0..4].choose;
		amp = 0.5;
	});
	if(msg[2] == 1 || msg[2] == -1, {
		buf = ~wt_buf[7..9].choose;
		atk = 0.25;
		// freq = msg[1] * 10 + 20;
	});
	if(msg[2] == -1, {
		freq = freq * 0.5;
	});

	// amp = ~section.depth_width.linlin(0, 100, 0.05, 0.2);
	// buf = ~wt_buf[((1.0-~section.supplier_dist_evenness) * 9).floor];
	// Synth(\tick3, [\freq, msg[1]* 20 + 100, \out, ~rev2Bus]);
	// TODO: Vary mix between wavetable and sine based on the section
	sine_mix = ((~section.diversity-0.5)*0.25).min(1).max(0);
	// sine_mix.postln;
	Synth(\osc, [\freq, freq, \atk, atk, \sus, ~call_sus,\rel, ~call_sus*2.0, \amp, amp * 0.25 * sine_mix, \buf, buf, \out, ~revBus, \pan, rrand(-0.5, 0.5), \detune, rrand(0.0, 0.1), \phrasing_in, ~phrasingBus]);
	Synth(\sine, [\freq, freq, \amp, 0.075 * amp * (1.0-sine_mix), \release_time, ~call_sus*5.0, \out, ~mainBus, \phrasing_in, ~phrasingBus]);

	if(depth == ~section.min_depth && (~now.() - ~last_min > 1.0), {
		var freq = ~chord[0] * 2;
		Synth(\sine, [\freq, freq, \atk, 0.1, \sus, 0, \amp, 0.03, \release_time, 0.5, \out, ~rev3Bus, \phrasing_in, ~phrasingBus]);
		~last_min = ~now.();
	});
	if(depth == ~section.max_depth && (~now.() - ~last_max > 1.0), {
		var freq = ~chord[0] * 32.0;
		Synth(\sine, [\freq, freq, \atk, 0.1, \sus, 0, \amp, 0.03, \release_time, 0.5, \out, ~rev3Bus, \phrasing_in, ~phrasingBus]);
		~last_max = ~now.();
	});

	// msg.postln

}, '/call', nil);

OSCdef(\speed, {|msg, time, addr, recvPort|
	~rbps = msg[1].asFloat;
	// Synth(\tick3, [\freq, msg[1]* 20 + 100, \out, ~rev2Bus]);
	// msg.postln

}, '/speed', nil); // def style

OSCdef(\section, {|msg, time, addr, recvPort|
	var
	min_depth = msg[1].asInteger,
	max_depth = msg[2].asInteger,
	num_suppliers = msg[3].asInteger,
	num_dependencies = msg[4].asInteger,
	supplier_dist_evenness = msg[5].asFloat,
	dependency_dist_evenness = msg[6].asFloat,
	average = msg[7].asFloat,
	diversity = msg[8].asFloat;
	~section.min_depth = min_depth;
	~section.max_depth = max_depth;
	~section.depth_width = ~section.max_depth - ~section.min_depth;
	~section.num_suppliers = num_suppliers;
	~section.num_dependencies = num_dependencies;
	~section.supplier_dist_evenness = supplier_dist_evenness;
	~section.average = average;
	~section.dependency_dist_evenness = dependency_dist_evenness;
	~section.diversity = diversity;

	if((~section.average - ~section.min_depth) < ~chord.size, {
		~section.pitch_index_offset =  (~chord.size*2) - (~section.average - ~section.min_depth);
	}, {
		~section.pitch_index_offset = 0;
	});

	if(~section.diversity < 0.8, {
		~glitches.rain.();
	}, {
		if(~section.diversity < 1.5, {
			~glitches.bleepbloop.();
		}, {
			~glitches.mechabirds.();
		});
	});

	~updateChord.();

	Synth(\osc, [\freq, 1000 + rrand(-10, 10), \atk, 0.01, \sus, 0.00,\rel, 0.05, \amp, 0.15, \buf, ~wt_buf[0], \out, ~rev3Bus, \pan, 0, \detune, 0.3, \phrasing_in, ~phrasingBus]);
	Synth(\sine, [\freq, 2000 + rrand(-10, 10), \amp, 0.025, \atk, 0.07, \sus, 0.02,\rel, 1.0, \out, ~rev3Bus, \pan, -1, \phrasing_in, ~phrasingBus]);
	Synth(\sine, [\freq, 2000 + rrand(-10, 10), \amp, 0.025, \atk, 0.07, \sus, 0.02,\rel, 1.0, \out, ~rev3Bus, \pan, 1, \phrasing_in, ~phrasingBus]);

	~rev.set(\wetness, ~section.depth_width.linexp(10, 70, 0.1, 0.9));
	// msg.postln

}, '/section', nil);

OSCdef(\fade_out, {|msg, time, addr, recvPort|
	var fade_out_time = msg[1].asFloat;
	~main.set(\amp_lag_time, fade_out_time, \amp, 0.0);

	msg.postln

}, '/fade_out', nil); // def style

OSCdef(\start, {|msg, time, addr, recvPort|
	~main.set(\amp_lag_time, 0.0, \amp, 1.0);

	msg.postln

}, '/start', nil); // def style

OSCdef(\stop, {|msg, time, addr, recvPort|
	~main.set(\amp_lag_time, 0.1, \amp, 0.0);

	msg.postln

}, '/stop', nil); // def style
