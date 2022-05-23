
~last_total_number_of_step = 0;
~last_speed_update = 0;
~last_zoom_update = 0;

~sonifySuccess = {
	var chord = [-53, -22, 53, 9+53, 22+53, 31+53] + ~transposition;
	{
		var sig, env, freq = ~s53.degreeToFreq(chord.choose%53, 36.midicps, 2);

		freq = freq * (Line.kr(0, 30, 2).floor + 1);
		sig = Pulse.ar(freq) * 0.07;
		sig = sig * Env.perc(1.0, 1.0).kr(2);
		sig = Pan2.ar(sig, 0.0);
		Out.ar(~revBus, sig);
	}.play;
};

OSCdef(\foreach_state, {|msg, time, addr, recvPort|
	var type = msg[1];

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
				// ("crank_speed: " + ~crank_speed).postln;
				~last_crank_update = Date.localtime.rawSeconds;
			});

		},
		\capture, {
			// when someone presses the capture button
		},
		\filter, {
			msg.postln;
			~change_background_drone_root.();
		},
		\filter_start, {

		},
		\filter_end, {
			msg.postln;
			// done with applying the filter
			~sonifySuccess.();
		},
		\speed, {
			~speed_setting = msg[2].asFloat/10000.0;
			~last_speed_update = Date.localtime.rawSeconds;
			~set_background_drone_amplitudes.(~speed_setting);
		},
		\zoom, {
			~zoom_setting = msg[2].asFloat/1000.0;
			~freq_ratio = (1.0 - ~zoom_setting) .pow(2)* 0.8 + 0.2;
			("freq_ratio:" + ~freq_ratio).postln;
						~last_zoom_update = Date.localtime.rawSeconds;

		},
		{("unhandeled: " + msg).postln;}
	);

}, '/foreach'); // def style
