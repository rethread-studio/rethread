(
~makeDeviceGui = { | device, channel |
	var palette = QPalette.dark, toggle_layout1 = HLayout(), toggle_layout2 = HLayout(), title_layout = HLayout(),
	title_view = View(bounds: Rect(0, 0, 455, 30)),
	spat_layout = HLayout(), spat_text_azimuth, spat_text_elevation, spat_view = View(bounds: Rect(0, 0, 455, 30)),
	window_width = 455
	;

	w = Window.new(device.asString, Rect(window_width * (~stats.size-1),200,window_width,200));
	w.view.background = palette.color('window', 'active');
	StaticText(title_view, Rect(0, 0, 200, 20)).string_(device.asString);
	/* Create toggles for
	sonifyInstantlyToggle: true, // sonify right away
	sonifyServicesToneToggle: true,
	sonifyServicesWhisperToggle: true,
	sonifyLengthToggle: true,

	spatHoverToggle: true,
	spatElevationActivityToggle: false,
	*/
	toggle_layout1.add(~guiMakeToggleButton.(\sonifyInstantlyToggle, "Sonify instantly", channel));
	toggle_layout1.add(~guiMakeToggleButton.(\sonifyServicesToneToggle, "Services tone", channel));
	toggle_layout1.add(~guiMakeToggleButton.(\sonifyServicesWhisperToggle, "Services whisper", channel));
	toggle_layout2.add(~guiMakeToggleButton.(\sonifyLengthToggle, "Sonify length", channel));
	toggle_layout2.add(~guiMakeToggleButton.(\spatHoverToggle, "Spat hover", channel));
	toggle_layout2.add(~guiMakeToggleButton.(\spatElevationActivityToggle, "Spat elevation activity", channel));

	spat_text_azimuth = StaticText(spat_view, Rect(0, 0, 200, 30));
	spat_text_elevation = StaticText(spat_view, Rect(200, 0, 200, 30));
	spat_layout.add(spat_text_azimuth); spat_layout.add(spat_text_elevation);

	w.layout_(VLayout(title_view, toggle_layout1, toggle_layout2, spat_layout));
	w.front;
	CmdPeriod.add({ w.close; });
	(
		spat_text_azimuth: spat_text_azimuth,
		spat_text_elevation: spat_text_elevation,
	)
};

~guiMakeToggleButton = { | property, property_text, channel |
	var view = View(bounds:Rect(0,0,100,30)), toggle;
	toggle = ToggleButton(view, property_text,{ arg button,bool;
		channel.put(property, bool);
	}, init: channel.at(property), minHeight: 20, onColor: Color.red, offColor: Color.grey);
	view
	/*var box = CheckBox(parent, Rect(0, 0, 20, 20), property_text).valueAction_({
		|val|
		property = val;
	});
	box*/
};
)

(
c = ~makeMixerChannel.("Test device", ~decoderBus);
~makeDeviceGui.("Test device", c);
)

