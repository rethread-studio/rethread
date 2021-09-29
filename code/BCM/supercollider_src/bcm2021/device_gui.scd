
~makeDeviceGui = { | device, channel |
	var palette = QPalette.light, toggle_layout1 = HLayout(), toggle_layout2 = HLayout(), title_layout = HLayout(),
	title_view = View(bounds: Rect(0, 0, 455, 30)),
	spat_layout = HLayout(), spat_text_azimuth, spat_text_elevation, spat_view = View(bounds: Rect(0, 0, 455, 30)),
	window_width = 455,
	slider_layout = HLayout(),
	toggle_buttons = Dictionary[],
	rev_mix, rev_mix_view, rev_mix_slider
	;

	w = Window.new(device.asString, Rect(window_width * (~stats.size-1),200, window_width, 770));
	w.view.background = palette.color('window', 'active');
	StaticText(title_view, Rect(0, 0, 200, 20)).string_(device.asString);
	title_layout.add(title_view);



	/* Create toggles for
	sonifyInstantlyToggle: true, // sonify right away
	sonifyServicesToneToggle: true,
	sonifyServicesWhisperToggle: true,
	sonifyLengthToggle: true,

	spatHoverToggle: true,
	spatElevationActivityToggle: false,
	*/
	b = ~guiMakeToggleButton.(\sonifyActivityTickToggle, "Activity tick", channel);
	toggle_layout1.add(b[0]); toggle_buttons.put(\sonifyActivityTickToggle, b[1]);
	b = ~guiMakeToggleButton.(\sonifyInstantlyToggle, "Sonify instantly", channel);
	toggle_layout1.add(b[0]); toggle_buttons.put(\sonifyInstantlyToggle, b[1]);
	b = ~guiMakeToggleButton.(\sonifyServicesToneToggle, "Services tone", channel);
	toggle_layout1.add(b[0]); toggle_buttons.put(\sonifyServicesToneToggle, b[1]);
	b = ~guiMakeToggleButton.(\sonifyServicesWhisperToggle, "Services whisper", channel);
	toggle_layout1.add(b[0]); toggle_buttons.put(\sonifyServicesWhisperToggle, b[1]);
	b = ~guiMakeToggleButton.(\sonifyLengthToggle, "Sonify length", channel);
	toggle_layout2.add(b[0]); toggle_buttons.put(\sonifyLengthToggle, b[1]);
	b = ~guiMakeToggleButton.(\spatHoverToggle, "Spat hover", channel);
	toggle_layout2.add(b[0]); toggle_buttons.put(\spatHoverToggle, b[1]);
	b = ~guiMakeToggleButton.(\spatElevationActivityToggle, "Spat elevation activity", channel);
	toggle_layout2.add(b[0]); toggle_buttons.put(\spatElevationActivityToggle, b[1]);
	b = ~guiMakeToggleButton.(\reverbActivityToggle, "Reverb from activity", channel);
	toggle_layout2.add(b[0]); toggle_buttons.put(\reverbActivityToggle, b[1]);

	b = Button(w, Rect(0, 0, 100, 200))
        .states_([
            ["Enable all", Color.white, Color.red],
        ])
        .action_({ arg butt;
		toggle_buttons.values.do { |button| button.toggle(true, true); };
        });
	title_layout.add(b);
	b = Button(w, Rect(0, 0, 100, 200))
        .states_([
            ["Disable all", Color.white, Color.grey],
        ])
        .action_({ arg butt;
            toggle_buttons.values.do { |button| button.toggle(false, true); };
        });
	title_layout.add(b);

	spat_text_azimuth = StaticText(spat_view, Rect(0, 0, 200, 30));
	spat_text_elevation = StaticText(spat_view, Rect(200, 0, 200, 30));
	spat_layout.add(spat_text_azimuth); spat_layout.add(spat_text_elevation);

	rev_mix = ~guiMakeSlider2.("verb mix",
			channel.reverb_mix,
			{ |slider| channel.set_reverb_mix(slider.value) },
			{ |value_text| value_text.string = channel.reverb_mix.round(0.01); },
			palette
	);
	rev_mix_view = rev_mix[0];
	rev_mix_slider = rev_mix[1];
	slider_layout.add(rev_mix_view);

	w.layout_(VLayout(VLayout(title_layout, toggle_layout1, toggle_layout2, spat_layout), VLayout(slider_layout)));
	w.front;
	~allWindows.add(w);

	(
		spat_text_azimuth: spat_text_azimuth,
		spat_text_elevation: spat_text_elevation,
		rev_mix_slider: rev_mix_slider,
		toggle_buttons: toggle_buttons,
	)
};

~guiMakeToggleButton = { | property, property_text, channel |
	var view = View(bounds:Rect(0,0,100,30)), toggle;
	toggle = ToggleButton(view, property_text,{ arg button,bool;
		channel.put(property, bool);
	}, init: channel.at(property), minHeight: 20, onColor: Color.red, offColor: Color.grey);
	[view, toggle]
	/*var box = CheckBox(parent, Rect(0, 0, 20, 20), property_text).valueAction_({
		|val|
		property = val;
	});
	box*/
};

~guiMakeSlider2 = { | text, default_value, action, text_action, palette |
	var slider, slider_layout, slider_view, value_text;
	slider_view = View(bounds:Rect(0,0,30,100));
	slider_view.minSize = Size(30, 60);
	slider_layout = HLayout();
	slider_view.layout = slider_layout;
	slider = Slider.new(slider_view,Rect(0,30,30,10));
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
	[slider_view, slider]
};

~setAllDevicesToggle = { | property, value |
	~device_guis.do{ |gui|
		{ gui.toggle_buttons[property].toggle(value, true); }.defer;
	};
};

/*
(
c = ~makeMixerChannel.("Test device", ~decoderBus);
~makeDeviceGui.("Test device", c);
)

*/