// Fade channels in and out to fokus on a particular part of the soundscape, while keeping the others far in the background.
// The channel lpf should be used for fading into the background

// ~all_channels

~fade_lag_time = 5;
~start_auto_fade = {
	var last_focus_channel = nil,
	min_amp = 0.05,
	focus_amp = 1.0,
	min_lpf_freq = 300,
	focus_lpf_freq = 19000,
	fade_time = ~fade_lag_time;
	// Enable LPF on all channels
	~all_channels.do{ | chan | chan.enable_lpf(true); chan.set_lag_time(fade_time); };
	~auto_fade_routine = {
		loop {
			var focus_channel = ~all_channels.choose;
			// Make sure we don't have the same channel twice in a row
			while({focus_channel == last_focus_channel}, { focus_channel = ~all_channels.choose });
			// Fade down the last focused channel, or all of them if this is the first iteration of the loop
			if(last_focus_channel == nil, {
				~all_channels.do{ | chan |
					if( chan != focus_channel, {
					chan.set_amp(min_amp);
					chan.set_lpf_freq(min_lpf_freq);
					});
				};
			}, {
				last_focus_channel.set_amp(min_amp);
				last_focus_channel.set_lpf_freq(min_lpf_freq);
			});

			focus_channel.set_amp(focus_amp);
			focus_channel.set_lpf_freq(focus_lpf_freq);
		}
	}.fork;
};


~stop_auto_fade = {
	~auto_fade_routine.stop;
	// Fade up all the channels again
	~all_channels.do{ | chan |
		chan.set_lag_time(fade_time);
		chan.set_amp(min_amp);
		chan.set_lpf_freq(min_lpf_freq);
	};
	~fade_lag_time.wait;
	// Disable LPF
	~all_channels.do{ | chan | chan.enable_lpf(false) };
};