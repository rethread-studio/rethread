
~guiMakeSlider = { | text, default_value, action, text_action, palette |
	var slider, slider_layout, slider_view, value_text;
	slider_view = View(bounds:Rect(0,0,30,100));
	slider_view.minSize = Size(60, 300);
	slider_layout = VLayout();
	slider_view.layout = slider_layout;
	slider = Slider.new(slider_view,Rect(0,30,30,170)).resize_(2);
	slider.value = default_value;
	value_text = StaticText(slider_view, Rect(0, 0, 0, 0)).string_(default_value).stringColor_(palette.color('windowText', 'active'));
	text_action.(value_text);
	slider.action = { |slider|
		action.(slider);
		text_action.(value_text);
	};
	slider_layout.add(slider);
	slider.layout.add(value_text);
	slider_layout.add(StaticText(slider_view, Rect(0, 0, 0, 0)).string_(text).stringColor_(palette.color('windowText', 'active')));
	slider_view
};

~makeSoundForestGui = { | mixer_channels, clouds |
	var mixer_layout, clouds_layout, palette = QPalette.dark;
	w = Window.new("Sound Forest", Rect(200,200,255,100));
	w.view.background = palette.color('window', 'active');
	// CLOUD CONTROLS
	clouds_layout = VLayout();
	clouds.do{ |cloud|
		var cloud_view, cloud_layout, rq_max_slider, del_max_slider, del_min_slider;
		cloud_view = View(bounds:Rect(0,0,30,100));
		cloud_view.minSize = Size(20, 300);
		cloud_layout = HLayout();
		cloud_view.layout = cloud_layout;
		cloud_view.background = Color.hsv(rrand(0, 0.99), 0.3, 0.5);
		// TODO: add labels and value reading for each slider
		cloud_layout.add(~guiMakeSlider.("rq_max",
			cloud.rq_max.explin(0.001, 3, 0, 1),
			{|slider| cloud.rq_max = slider.value.linexp(0, 1, 0.001, 3); },
			{|value_text| value_text.string = cloud.rq_max.round(0.0001); },
			palette
		));
		cloud_layout.add(~guiMakeSlider.("del_min",
			cloud.del_min.explin(0.1, 3, 0, 1),
			{|slider| cloud.del_min = slider.value.linexp(0, 1, 0.1, 3); },
			{|value_text| value_text.string = cloud.del_min.round(0.01); },
			palette
		));
		cloud_layout.add(~guiMakeSlider.("del_max",
			cloud.del_max.explin(0.1, 3, 0, 1),
			{|slider| cloud.del_max = slider.value.linexp(0, 1, 0.1, 3); },
			{|value_text| value_text.string = cloud.del_max.round(0.01); },
			palette
		));
		cloud_layout.add(~guiMakeSlider.("octave",
			cloud.octave.linlin(1, 8, 0, 1),
			{|slider| cloud.octave = slider.value.linlin(0, 1, 1, 8); },
			{|value_text| value_text.string = cloud.octave.round(1); },
			palette
		));

		clouds_layout.add(cloud_view);
	};
	mixer_layout = HLayout();
	mixer_channels.do{ | channel |
		// Make an amplitude slider per channel
		var strip_view, send_slider;
		strip_view = ~guiMakeSlider.(channel.name,
			channel.my_amp.sqrt,
			{ |slider| channel.set_amp(slider.value.pow(2))},
			{ |value_text| value_text.string = channel.my_amp.ampdb.round(0.1); },
			palette
		);
		send_slider = Slider(strip_view, Rect(0, 0, 100, 10));
		send_slider.value = channel.my_send_amp;
		send_slider.action = {|slider| channel.set_send_amp(slider.value.pow(2)) };
		mixer_layout.add(strip_view);
	};
	w.layout_(VLayout(clouds_layout, mixer_layout));
	w.front;
	CmdPeriod.doOnce({ w.close; });
};

/*
octave: octave,
		rq_max: 0.03,
		dynamic_amp: 0.5,
		amp: 0.5,
		amp_min: 0.1,
		amp_max: 0.5,
		del_min: 0.05,
		del_max: 0.1,
		atk: (1/10.pow(octave-3)).max(0.001),
		rel: 0.1,
		pan: pan,
~makeSoundForestGui.(4.collect{|i| ~makeMixerChannel.("i_" ++ i, 0)}, []);

a = ~makeMixerChannel.("bfa", 0)
a.set_amp(0.2)
a.name

*/