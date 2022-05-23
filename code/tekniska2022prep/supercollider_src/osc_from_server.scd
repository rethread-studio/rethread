
~last_total_number_of_step = 0;
~last_speed_update = 0;
~last_zoom_update = 0;
OSCdef(\foreach_state, {|msg, time, addr, recvPort|
	var type = msg[1];
	msg.postln;

	switch(type,
		\SPEED1_BUTTON_ON, {~speed1.();},
		\SPEED1_BUTTON_OFF, {},
		\SPEED2_BUTTON_ON, {~speed2.()},
		\SPEED2_BUTTON_OFF, {},
		\SPEED3_BUTTON_ON, {~speed3.()},
		\SPEED3_BUTTON_OFF, {},
		\RESET_BUTTON_ON, {},
		\RESET_BUTTON_OFF, {},
		\timer, {
			// a countdown beep
			Synth(\sine, [\freq, 1000, \amp, 0.2 , \atk, 0.005, \sus, 0.12, \rel, 0.01, \out, 0 ]);
		},
		\picture, {
			// when the picture is taken
			Synth(\sine, [\freq, 2000, \amp, 0.2 , \atk, 0.005, \sus, 0.12, \rel, 0.01, \out, 0 ]);
			Synth(\play_buffer, [\buf, ~bufs.camera_shutter, \amp, 1.0]);
		},
		\IDLE, {},
		\NEW_FILTER, { ~next_filter.(); },
		\DONE, { ~filter_finished.()}, // One filter application has completed
		\previous, { ~crank_speed = msg[2].asFloat; ~last_crank_update = Date.localtime.rawSeconds },
		\next, { ~crank_speed = msg[2].asFloat; ~last_crank_update = Date.localtime.rawSeconds },
		\step, {
			// [current_index, total_number_of_step]
			if(msg[3] != nil, {
				var total_number_of_steps = msg[3].asFloat,
				steps_since_last = total_number_of_steps - ~last_total_number_of_step,
				now = Date.localtime.rawSeconds,
				time_since_last = now - ~last_crank_update;
				~crank_speed = steps_since_last / time_since_last;
				("crank_speed: " + ~crank_speed).postln;
				~last_crank_update = Date.localtime.rawSeconds;
			});

		},
		\capture, {
			// when someone presses the capture button
		},
		\filter, {},
		\filter_start, {

		},
		\filter_end, {
			// done with applying the filter
		},
		\speed, {
			~speed_setting = msg[2].asFloat/10000.0;
			~last_speed_update = Date.localtime.rawSeconds;
		},
		\zoom, {
			~zoom_setting = msg[2].asFloat/1000.0;
			~freq_ratio = (1.0 - ~zoom_setting) .pow(2)* 0.8 + 0.2;
			("freq_ratio:" + ~freq_ratio).postln;
						~last_zoom_update = Date.localtime.rawSeconds;

		},
	);

}, '/foreach'); // def style
