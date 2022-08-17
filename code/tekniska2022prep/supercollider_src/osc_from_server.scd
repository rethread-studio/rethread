
~last_total_number_of_step = 0;
~last_speed_update = 0;
~last_zoom_update = 0;

~sonifySuccess = {
	var chord = [-53, -22, 53, 9+53, 22+53, 31+53] + ~transposition;
	fork{
		chord.do{ | degree|
			{
				var sig, env, freq = ~s53.degreeToFreq(degree, 36.midicps, 0);

				freq = freq * (Line.kr(0, 30, 2).floor + 1);
				sig = Pulse.ar(freq) * 0.07;
				sig = sig * Env.perc(1.0, 1.0).kr(2);
				sig = Pan2.ar(sig, 0.0);
				Out.ar(~revBus, sig);
			}.play;
			0.3.wait;
		};
	};
};

~sonifyButton = {
	{
		var sig, env,
		chord = [-53, -22] + ~transposition,
		freq = ~s53.degreeToFreq(chord.choose + (53*2), 36.midicps, 0),
		fundamental = ~s53.degreeToFreq(chord[0], 36.midicps, 1),
		mod;

		freq = freq * (Line.kr(0, 10, 0.5).floor + 1);
		mod = SinOsc.ar(freq * Rand(0.5, 8.0)) * freq * Rand(0.5, 3.0);
		sig = Pulse.ar(min(max(freq + mod, 20), 20000)) * 0.02;
		sig = sig + Mix(DPW3Tri.ar([fundamental, fundamental*2], mul: 0.4));
		sig = sig * Env.perc(0.05, 0.5).kr(2);
		sig = sig + (BrownNoise.ar(0.1) * Env.perc(0.002, 0.1).ar(0));
		sig = Pan2.ar(sig, 0);
		Out.ar(0, sig);
	}.play;
};

OSCdef(\foreach_countdown, {|msg, time, addr, recvPort|
				Synth(\sine, [\freq, 1000, \amp, 0.2 , \atk, 0.005, \sus, 0.12, \rel, 0.01, \out, 0 ]);
}, \countdown);

OSCdef(\foreach_transition, {|msg, time, addr, recvPort|
	var state = msg[1];

	if(state == \apply_filter, {
		~next_filter.();
		~crank_activated = true;
	});
	if(state == \end_screen, {
		~filter_finished.();
	});
	if(state == \countdown, {
		~sonifyButton.();
	});
	if(state == \transition_to_filter, {
		// when the picture is taken
		Synth(\sine, [\freq, 2000, \amp, 0.2 , \atk, 0.005, \sus, 0.12, \rel, 0.01, \out, 0 ]);
		Synth(\play_buffer, [\buf, ~bufs.camera_shutter, \amp, 1.0]);
		{
			var tick_time = 0.01, num_ticks = 7.0/tick_time;
			num_ticks.do{ |i|
				var speed = 1.0 - (i / num_ticks);

				~zoom_setting = speed;
				~freq_ratio = (1.0 - ~zoom_setting) .pow(2)* 0.8 + 0.2;
				~last_zoom_update = Date.localtime.rawSeconds;
				tick_time.wait;
			};
		}.fork;
	});
}, \transition_to_state);

OSCdef(\foreach_step, {|msg, time, addr, recvPort|
	msg.postln;
				// [current_index, total_number_of_step]
			if(msg[1] != nil, {
				var total_number_of_steps = msg[1].asFloat,
				steps_since_last = total_number_of_steps - ~last_total_number_of_step,
				now = Date.localtime.rawSeconds,
				time_since_last = now - ~last_crank_update;
				~crank_speed = steps_since_last / time_since_last;
				// ("crank_speed: " + ~crank_speed).postln;
				~last_crank_update = Date.localtime.rawSeconds;
				if(~crank_activated == false, {
					Synth(\sine, [\freq, rrand(3000, 3100), \amp, 0.1, \sus, 0.0, \atk, 0.001]);
				});
			});
}, \step);

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
		\countdown, {
			// a countdown beep
			Synth(\sine, [\freq, 1000, \amp, 0.2 , \atk, 0.005, \sus, 0.12, \rel, 0.01, \out, 0 ]);
		},
		\picture, {
			// when the picture is taken
			Synth(\sine, [\freq, 2000, \amp, 0.2 , \atk, 0.005, \sus, 0.12, \rel, 0.01, \out, 0 ]);
			Synth(\play_buffer, [\buf, ~bufs.camera_shutter, \amp, 1.0]);
		},
		\transition_to_state, {
			var state = msg[2];
			if(state == \apply_filter, {
				~next_filter.();
			});
			if(state == \end_screen, {
				~filter_finished.();
			});
			if(state == \transition_to_filter, {
				{
					var tick_time = 0.01, num_ticks = 7.0/tick_time;
					num_ticks.do{ |i|
						var speed = 1.0 - (i / num_ticks);

						~zoom_setting = speed;
						~freq_ratio = (1.0 - ~zoom_setting) .pow(2)* 0.8 + 0.2;
						~last_zoom_update = Date.localtime.rawSeconds;
						tick_time.wait;
					};
				}.fork;
			});

		},
		\IDLE, {},
		\NEW_FILTER, { ~next_filter.(); },
		\DONE, { ~filter_finished.()}, // One filter application has completed
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
				if(~crank_activated == false, {
					Synth(\sine, [\freq, rrand(3000, 3100), \amp, 0.1, \sus, 0.0, \atk, 0.001]);
				});
			});

		},
		\capture, {
			// when someone presses the capture button
			~sonifyButton.();
			~crank_activated = false;
		},
		\filter, {
			msg.postln;
			~change_background_drone_root.();
		},
		\filter_start, {
			~crank_activated = true;
		},
		\filter_end, {
			msg.postln;
			// done with applying the filter
			~sonifySuccess.();
			~crank_activated = false;
		},
		\transition, {
			msg.postln;
			if(msg[2] == \start, {
				{
					var tick_time = 0.01, num_ticks = 7.0/tick_time;
					num_ticks.do{ |i|
						var speed = 1.0 - (i / num_ticks);

						~zoom_setting = speed;
						~freq_ratio = (1.0 - ~zoom_setting) .pow(2)* 0.8 + 0.2;
						~last_zoom_update = Date.localtime.rawSeconds;
						tick_time.wait;
					};
				}.fork;
			});
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

}, nil); // def style
