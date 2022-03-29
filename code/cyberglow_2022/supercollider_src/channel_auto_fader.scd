// Fade channels in and out to fokus on a particular part of the soundscape, while keeping the others far in the background.
// The channel lpf should be used for fading into the background

// ~all_channels

/*~contains.([1, 2], [2, 3])
~contains_duplicate.([1, 1, 2]);*/

~contains = { | a, b |
	var contains  = false;
	a.do { | a_element |
		b.do { | b_element |
			if(a_element == b_element, { contains = true });
		}
	};
	contains
};

~contains_duplicate = { | a |
	var contains  = false;
	a.do { | el1, i |
		a.do { | el2, k |
			if(i!=k && (el1 == el2), { contains = true });
		}
	};
	contains
};

~fade_lag_time = 10;
~num_focused = 2;
~fade_use_transitions = true;
~last_focus_channels_auto_fade = nil!~num_focused;

~enable_auto_fade = {
	~use_auto_fade = true;
	// Enable LPF on all channels
	~fade_channels.do{ | chan | chan.enable_lpf(true); };
	~fade_to_new_channels.(5.0);
};

~fade_to_new_channels = { | time_to_next_transition |
	var min_amp = 0.02,
	focus_amp = 1.0,
	min_lpf_freq = 300,
	focus_lpf_freq = 19500,
	focus_channels;

	~fade_lag_time = time_to_next_transition * 0.5;
	~fade_channels.do{ | chan | chan.enable_lpf(true); chan.set_lag_time(~fade_lag_time); };

	focus_channels = {~fade_channels.choose}!~num_focused;
	// Make sure we don't have the same channel twice in a row
	while({ ~contains.(~last_focus_channels_auto_fade, focus_channels) || ~contains_duplicate.(focus_channels) },
		{ focus_channels =  {~fade_channels.choose}!~num_focused; });
	"chosen_channels: ".postln;
	focus_channels.do{ | chan | chan.name.postln; };
	// Fade down the last focused channel, or all of them if this is the first iteration of the loop
	if(~last_focus_channels_auto_fade[0] == nil, {
		~fade_channels.do{ | chan |
			if(~contains.([chan], focus_channels) == false, {
				chan.set_amp(min_amp);
				chan.set_lpf_freq(min_lpf_freq);
			});
		};
	}, {
		~last_focus_channels_auto_fade.do{|chan| chan.set_amp(min_amp)};
		~last_focus_channels_auto_fade.do{|chan| chan.set_lpf_freq(min_lpf_freq)};
	});

	focus_channels.do{|chan| chan.set_amp(focus_amp)};
	focus_channels.do{|chan| chan.set_lpf_freq(focus_lpf_freq)};

	~last_focus_channels_auto_fade = focus_channels;
};
~trigger_auto_fade = { | time_to_next_transition |
	var transition_time = min(rrand(min(~fade_lag_time * 0.5, 3.0), min(~fade_lag_time * 0.5, 10.0)), ~fade_lag_time * 0.75),
	wait_time = time_to_next_transition - transition_time;

	~fade_to_new_channels.(time_to_next_transition);

	{
	(wait_time * 0.5).wait;
	if([true, false].wchoose([0.3, 0.7]), {
		{
			~random_non_transition.();
		}.fork;
	});
	(wait_time * 0.5).wait;
	if(~fade_use_transitions, {
		~random_transition.(transition_time);
	});
	}.fork;
};


~stop_auto_fade = {
	~use_auto_fade = false;
	{
	// Fade up all the channels again
	~fade_channels.do{ | chan |
		chan.set_lag_time(~fade_lag_time);
		chan.set_amp(1.0);
		chan.set_lpf_freq(19500);
	};
	~fade_lag_time.wait;
	// Disable LPF
	~fade_channels.do{ | chan | chan.enable_lpf(false) };
	}.fork;
};