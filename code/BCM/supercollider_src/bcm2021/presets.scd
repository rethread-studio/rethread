~presets = Environment(know: true);

// Preset sine length of packets, wide harmonic range
~presets.sine_len = {
	~h2chordOctaves = 5;
	~octave = 1;
	~lengthVersion = 2; // pitches
	~changeHarmonicFramework.(2);
	~setAllDevicesToggle.(\sonifyActivityTickToggle, false);
	~setAllDevicesToggle.(\sonifyInstantlyToggle, false);
	~setAllDevicesToggle.(\sonifyServicesToneToggle, false);
	~setAllDevicesToggle.(\sonifyServicesWhisperToggle, false);
	~setAllDevicesToggle.(\sonifyLengthToggle, true);
	~setAllDevicesToggle.(\reverbActivityToggle, true);
	~setAllDevicesToggle.(\spatHoverToggle, false);
	~setAllDevicesToggle.(\spatElevationActivityToggle, false);
};

// Preset ticks and whispers
~presets.ticks_whispers = {
	~h2chordOctaves = 5;
	~octave = 1;
	~lengthVersion = 1; // ticks
	~changeHarmonicFramework.(2);
	~whisper_amp = 1.0;
	~tickAmp = 0.7;
	~activity_tick_amp = 0.3;
	~setAllDevicesToggle.(\sonifyActivityTickToggle, true);
	~setAllDevicesToggle.(\sonifyInstantlyToggle, false);
	~setAllDevicesToggle.(\sonifyServicesToneToggle, false);
	~setAllDevicesToggle.(\sonifyServicesWhisperToggle, true);
	~setAllDevicesToggle.(\sonifyLengthToggle, true);
	~setAllDevicesToggle.(\reverbActivityToggle, true);
	~setAllDevicesToggle.(\spatHoverToggle, false);
	~setAllDevicesToggle.(\spatElevationActivityToggle, false);
};

// Preset service sonification
~presets.services = {
	~octave = 2;
	~changeHarmonicFramework.(1);
	~whisper_amp = 1.0;
	~lengthVersion = 1; // ticks
	~setAllDevicesToggle.(\sonifyActivityTickToggle, false);
	~setAllDevicesToggle.(\sonifyInstantlyToggle, false);
	~setAllDevicesToggle.(\sonifyServicesToneToggle, true);
	~setAllDevicesToggle.(\sonifyServicesWhisperToggle, true);
	~setAllDevicesToggle.(\sonifyLengthToggle, true);
	~setAllDevicesToggle.(\reverbActivityToggle, true);
	~setAllDevicesToggle.(\spatHoverToggle, true);
	~setAllDevicesToggle.(\spatElevationActivityToggle, false);
	~stats.values.do{ | device |
		device.channel.auto_reverb_min = 0.15;
		device.channel.auto_reverb_max = 0.5;
	};
};


// Preset instant
~presets.instant = {
	~h2chordOctaves = 5;
	~octave = 3;
	~changeHarmonicFramework.(2);
	~whisper_amp = 0.5;
	~setAllDevicesToggle.(\sonifyActivityTickToggle, false);
	~setAllDevicesToggle.(\sonifyInstantlyToggle, true);
	~setAllDevicesToggle.(\sonifyServicesToneToggle, true);
	~setAllDevicesToggle.(\sonifyServicesWhisperToggle, false);
	~setAllDevicesToggle.(\sonifyLengthToggle, false);
	~setAllDevicesToggle.(\reverbActivityToggle, true);
	~setAllDevicesToggle.(\spatHoverToggle, true);
	~setAllDevicesToggle.(\spatElevationActivityToggle, false);
	~stats.values.do{ | device |
		device.channel.auto_reverb_min = 0.2;
		device.channel.auto_reverb_max = 0.8;
	};
};

~playPresetLoop = { | presets |
	~presetLoopRoutine = Routine({
		loop{
			presets.do { |preset_setting|
				var preset = preset_setting[0], duration = preset_setting[1];
				~presets.at(preset).();
				duration.wait;
			};
		};
	}).play;
};

~stopPresetLoop = {
	~presetLoopRoutine.stop;
};
