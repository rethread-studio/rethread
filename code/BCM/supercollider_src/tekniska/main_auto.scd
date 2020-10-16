
// Control the main bus while it is running
// ~decoder.set(\extraAmp, 1.0) // Set amplification
// ~decoder.set(\cRatio, 1/2.5, \cThresh, 0.06, \cAtk, 0.012, \cRel, 0.08, \preCompAmp, 4.0); // change compression settings on the master bus

s.options.memSize = 1024 * 128;
s.waitForBoot({
	//// RUN THIS BLOCK TO START EVERYTHING

	var filter_bus, filter, drone, voice_path;

	//////////////////////////////////////////////////////
	/////// CONSTANTS AND SETUP
	/////////////////////////////////////////////////////


	~sonifyLive = false;
	~sonifySequencer = false;
	~sonifyPercussion = true;
	~sonifyVoice = true;

	~overTimeStatsDecayTime = 40; // in seconds.

	// Routing and mixer channels
	~useAmbisonics = false; // Set to false to use a simple stereo output
	~controlPositionWithMouse = true; // If the mouse position will infulence ambisonics positioning
	// If ~positionThroughService is true, positioning is based on what service something comes from instead of what device
	~positionThroughService = false;
	~ambisonicsOrder = 3; // Currently 1, 3 or 5 are supported
	if(~useAmbisonics == true, {
		~mixerChannelOutputs = (~ambisonicsOrder+1).pow(2);
	}, {
		~mixerChannelOutputs = 2;
	});
	~firstOutputBus = 0;

	// Sonification activity thresholds
	~highActivityThreshold = 20;
	~mediumActivityThreshold = 10;
	~lowActivityThreshold = 1;

	// reset everything
	s.freeAll;
	s.newBusAllocators;
	Window.closeAll;
	Buffer.freeAll;

	s.sync;

	~decoderBus = Bus.audio(s, ~mixerChannelOutputs);

	// Ambisonics positioning parameters
	~azimuthPosition = 0.0; // The start position, and later on current position for the next device
	// The distance between different devices, a 7 pointed star that's a
	// little bit off so it doesn't quite return to the same spot
	~azimuthStep = (6.1 * pi)/7;
	~elevationPosition = 0.0;
	~elevationStep = 0.0;

	~idle = false;
	~home = false;


	// What latency in seconds to use for scheduling playback on the server
	// If you get "late ..." messages, increase this number'
	~latency = 0.2;


	"../sound_forest_mixer_gui.scd".loadRelative;

	"synthdefs.scd".loadRelative; // LOAD SYNTHDEFS

	"drone_and_overall_stats.scd".loadRelative;
	"idle.scd".loadRelative;


	//////////////////////////////////////////////////////
	/////// STARTING EVERYTHING
	/////////////////////////////////////////////////////


	//////////////////////////////////////////////////////
	/////// HARMONIC CONTENT
	/////////////////////////////////////////////////////

	// chords divided into 4 chords in increasing harmonic complexity
	~allChordFunctions = [
		{ // fifths
			~ch1 = [0, 31, 53, 84, 106];
			~ch2 = [9, 31, 62, 84, 115];
			~ch3 = [0, 31, 53, 62, 84, 106];
			~ch4 = [0, 31, 53, 84, 106, 137];
		},
		{ // major
			~ch1 = [0, 17, 31, 53, 84, 106];
			~ch2 = [9, 31, 48, 84, 115];
			~ch3 = [0, 31, 53, 62, 84, 106];
			~ch4 = [0, 31, 53, 70, 84, 106];
		},
		{ // minor
			~ch1 = [0, 14, 31, 53, 84, 106];
			~ch2 = [9, 31, 45, 84, 115];
			~ch3 = [0, 31, 53, 62, 84, 106];
			~ch4 = [0, 31, 53, 67, 84, 106];
		},
		{
			// suspended quality chord
			~ch1 = [22, 53, 0, 9, 71, 93];
			~ch2 = [40, 71, 9, 31, 62, 102];
			~ch3 = [62, 84, 22, 40, 124, 102];
			~ch4 = [31, 53, 93, 115, 124, 84];
		},
		{
			// suspended major quality chord
			~ch1 = [0, 9, 75, 88, 119, 132];
			~ch2 = [9, 31, 97, 110, 132, 141];
			~ch3 = [22, 53, 88, 110, 141, 154];
			~ch4 = [31, 44, 97, 119, 132, 163];
		},
		{
			// Rich chord with harmonic 7
			~ch1 = [43, 120, 0, 31, 57, 137];
			~ch2 = [88, 74, 17, 39, 53, 137];
			~ch3 = [31, 88, 163, 106, 120, 151];
			~ch4 = [43, 74, 106, 57, 163, 180];
		},
		{
			~ch1 = [0, 22, 36, 45, 81, 94];
			~ch2 = [9, 36, 58, 94, 103, 108];
			~ch3 = [36, 45, 67, 81, 117, 139];
			~ch4 = [31, 58, 94, 117, 130, 144];
		},
		{
			~ch1 = [0, 9, 31, 40, 71, 102];
			~ch2 = [0, 13, 18, 44, 75, 106];
			~ch3 = [9, 18, 31, 49, 80, 111];
			~ch4 = [18, 31, 44, 62, 93, 124];
		},
		{
			~ch1 = [0, 3, 14, 31, 45, 67, 96];
			~ch2 = [0, 5, 31, 65, 93, 98];
			~ch3 = [14, 31, 36, 76, 98, 107];
			~ch4 = [31, 34, 45, 62, 98, 124];
		},
		{
			~ch1 = [0, 5, 17, 31, 45, 67, 98];
			~ch2 = [17, 22, 36, 62, 93, 110];
			~ch3 = [31, 36, 48, 93, 110, 115];
			~ch4 = [22, 53, 62, 79, 98, 124];
		},
	];

	~s53 = Scale.chromatic('et53'); // For decoding 53edo
	~currentChord = 0;
	~numChords = ~allChordFunctions.size;
	~numChords = 5;
	~changeChord = { | num = -1 |
		// if num is -1 then
		num = num.asInteger;
		if(num == -1, {
			~currentChord = (~currentChord + 1) % ~numChords;
		}, {
			~currentChord = num % ~numChords;
		});

		~allChordFunctions[~currentChord].();
	};

	~changeChord.(0);
	~chord = ~ch1 ++ ~ch2 ++ ~ch3 ++ ~ch4;
	~octave = 3;

	// Load buffers with voice recordings of services
	voice_path = "../sounds/BCM_voice/whispered/".resolveRelative;

	~voiceServices = Environment(know: true);
	~voiceServices.google = Buffer.readChannel(s, voice_path ++ "Google.wav", 0, -1, [0]);
	~voiceServices.amazon = Buffer.readChannel(s, voice_path ++ "Amazon.wav", 0, -1, [0]);
	~voiceServices.github = Buffer.readChannel(s, voice_path ++ "Github.wav", 0, -1, [0]);
	~voiceServices.facebook = Buffer.readChannel(s, voice_path ++ "Facebook.wav", 0, -1, [0]);
	~voiceServices.instagram = Buffer.readChannel(s, voice_path ++ "Instagram.wav", 0, -1, [0]);
	~voiceServices.microsoft = Buffer.readChannel(s, voice_path ++ "Microsoft.wav", 0, -1, [0]);
	~voiceServices.signal = Buffer.readChannel(s, voice_path ++ "Signal.wav", 0, -1, [0]);
	~voiceServices.slack = Buffer.readChannel(s, voice_path ++ "Slack.wav", 0, -1, [0]);
	~voiceServices.whatsapp = Buffer.readChannel(s, voice_path ++ "WhatsApp.wav", 0, -1, [0]);
	~voiceServices.youtube = Buffer.readChannel(s, voice_path ++ "YouTube.wav", 0, -1, [0]);

	// Mixer channel factory
	~makeMixerChannel = { | name, out, amp = 1 |
		var bus, synth, group, azimuth, elevation;
		bus = Bus.audio(s, ~mixerChannelOutputs);
		group = Group(s);
		azimuth = ~azimuthPosition;
		~azimuthPosition = ~azimuthPosition + ~azimuthStep;
		if(~azimuthPosition > pi) {
			~azimuthPosition = ~azimuthPosition - 2pi;
		};
		if(~azimuthPosition < -pi) {
			~azimuthPosition = ~azimuthPosition + 2pi;
		};
		elevation = ~elevationPosition;
		~elevationPosition = ~elevationPosition + ~elevationStep;
		if(~useAmbisonics, {
			synth = Synth(\mixer_channel, [\in, bus, \out, out, \azimuth, azimuth, \elevation, elevation], group, \addToTail);
		}, {
			synth = Synth(\mixer_channel, [\in, bus, \out, out, \amp, 1.5], group, \addToTail);
		});
		(
			my_synth: synth,
			my_group: group,
			my_amp: amp,
			my_send_amp: 0.0,
			azimuth: azimuth,
			elevation: elevation,
			bus: bus,
			name: name,
			my_clock: TempoClock(1, queueSize: 8192),
			set_amp: {|self, amp|
				self.my_amp = amp;
				self.my_synth.set(\amp, amp);
			},
			set_send: {|self, send, send_amp = 0|
				self.my_synth.set(\send, send);
				self.set_send_amp(send_amp);
			},
			set_send_amp: {|self, send_amp|
				self.my_send_amp = send_amp;
				self.my_synth.set(\send_amp, send_amp);
			},
			set_activity: {|self, activity|
				self.my_synth.set(\activity, activity);
			},
			// Use play on to make sure that the
			play_on: {|self, synth_name, args, latencyOffset = 0|
				self.my_clock.sched(~latency + latencyOffset, Synth(synth_name, args, self.my_group));
			},
		)
	};

	~decoder = Synth(\decoder, [\in, ~decoderBus, \out, ~firstOutputBus]);
	~decoder.set(\cRatio, 1/2.5, \cThresh, 0.5, \cAtk, 0.012, \cRel, 0.08, \preCompAmp, 2.0);

	~channels = Environment(know: true);
	// Set up all the channels
	~channels.rev_channel = ~makeMixerChannel.("Reverb", ~decoderBus);
	~channels.rev_channel.play_on(\medium_reverb, [\out, ~channels.rev_channel.bus, \in, ~channels.rev_channel.bus, \mix, 1.0, \amp, 2.0]);
	~channels.rev_channel.set_amp(0.3);
	~channels.long_rev = ~makeMixerChannel.("Long rev", ~decoderBus);
	~channels.long_rev.play_on(\infiniteReverb, [\out, ~channels.long_rev.bus, \in, ~channels.long_rev.bus, \feedback, 0.62, \amp, 1.5]);
	~channels.sub_channel = ~makeMixerChannel.("Sub", ~decoderBus);
	~channels.sub_channel.set_send(~channels.rev_channel.bus, 0.2);
	~channels.rain_channel = ~makeMixerChannel.("Rain", ~decoderBus);
	~channels.rain_channel.set_send(~channels.rev_channel.bus, 1.0);
	~channels.default_channel = ~makeMixerChannel.("Default", ~decoderBus);
	~channels.default_channel.set_send(~channels.rev_channel.bus, 1.0);
	~channels.google_channel = ~makeMixerChannel.("Google", ~decoderBus);
	~channels.google_channel.set_send(~channels.rev_channel.bus, 1.0);
	~channels.facebook_channel = ~makeMixerChannel.("Facebook", ~decoderBus);
	~channels.facebook_channel.set_send(~channels.rev_channel.bus, 1.0);
	~channels.amazon_channel = ~makeMixerChannel.("Amazon", ~decoderBus);
	~channels.amazon_channel.set_send(~channels.rev_channel.bus, 1.0);
	~channels.cloudflare_channel = ~makeMixerChannel.("Coudflare", ~decoderBus);
	~channels.cloudflare_channel.set_send(~channels.rev_channel.bus, 1.0);
	~channels.microsoft_channel = ~makeMixerChannel.("Microsoft", ~decoderBus);
	~channels.microsoft_channel.set_send(~channels.rev_channel.bus, 1.0);
	~channels.youtube_channel = ~makeMixerChannel.("YouTube", ~decoderBus);
	~channels.youtube_channel.set_send(~channels.rev_channel.bus, 1.0);
	~channels.percussion = ~makeMixerChannel.("Percussion", ~decoderBus);
	~channels.percussion.set_send(~channels.rev_channel.bus, 0.15);
	~channels.voice = ~makeMixerChannel.("Voice", ~decoderBus);
	~channels.voice.set_amp(0.65);
	~channels.voice.set_send(~channels.rev_channel.bus, 0.15);
	~channels.drone = ~makeMixerChannel.("Drone", ~decoderBus);
	~channels.drone.set_send(~channels.long_rev.bus, 1.0);

	~channels.idle_channel = ~makeMixerChannel.("Idle", ~decoderBus);
	~channels.idle_channel.set_send(~channels.rev_channel.bus, 0.2);
	~channels.idle_channel.set_amp(0.6);
	~channels.idle_rev = ~makeMixerChannel.("Idle", ~channels.idle_channel.bus);
	~channels.idle_rev.set_send(~channels.long_rev.bus, 0.05);

	~channels.tick_channel = ~makeMixerChannel.("Tick", ~decoderBus);
	~channels.tick_channel.set_send(~channels.rev_channel.bus, 1.0);
	~channels.tick_channel.set_amp(0.0);

	{
		~makeSoundForestGui.([~channels.tick_channel, ~channels.default_channel, ~channels.google_channel, ~channels.facebook_channel,
			~channels.amazon_channel, ~channels.cloudflare_channel, ~channels.youtube_channel, ~channels.percussion, ~channels.voice,
			~channels.drone, ~channels.idle_channel, ~channels.rev_channel, ~channels.long_rev], ~allClouds);
	}.defer;

	// Create the global stats object (environment)
	// Stats are structured in the following hierarchy:
	// ~stats => device(local_ip) => service(remote) -> packets[/in], packets[\out]
	// Each service is given a sound process with sounds for different levels of activity.
	~stats = Dictionary[];

	~makeStatDevice = { | device |
		var statDevice = ();
		statDevice.services = ();
		statDevice.bus = Bus.audio(s, 1);
		statDevice.channel = ~makeMixerChannel.(device.asString, ~decoderBus);
		statDevice.channel.set_send(~channels.rev_channel.bus, 1.0);
		statDevice
	};

	~makeStatService = { | identifier |
		var service = ();
		service.identifier = identifier;
		service.packets = Dictionary[];
		service.packets.add(\in -> 0);
		service.packets.add(\out -> 0);
		service.locations = Dictionary[];
		service
	};

	// Adds a packet to the global stats, taking care of creating new services etc.
	~addPacketToStats = { | device, isOutgoing, service, remote_ip, remote_location |
		var inout, statService, statDevice;
		if(isOutgoing == true, {
			inout = \out;
		}, {
			inout = \in;
		});

		statDevice = ~stats[device];
		if(statDevice == nil, {
			~stats.put(device, ~makeStatDevice.(device));
			statDevice = ~stats[device];
		});


		statService = statDevice.services[service];
		if(statService == nil, {
			statDevice.services.put(service, ~makeStatService.(service));
			statService = statDevice.services[service];
			~addSoundProcessToService.(statService, inout);
		});
		~addPacketToService.(statService, inout, remote_location);
	};

	~addPacketToService = { | statService, inout, remote_location |
		var statLocation;
		statService.packets[inout] = statService.packets[inout] + 1;
		// Add to the correct stat location
		statLocation = statService.locations[remote_location];
		if(statLocation != nil, {
			statLocation.packets[inout] = statLocation.packets[inout] + 1;
		}, {
			statService.locations[remote_location] = ();
			statService.locations[remote_location].packets = Dictionary[];
			statService.locations[remote_location].packets.add(\in -> 0);
			statService.locations[remote_location].packets.add(\out -> 0);
			statService.locations[remote_location].packets[inout] = 1;
		});
	};


	// Sound process factory
	~addSoundProcessToService = { | service, inout |
		// The tick function is the function for launching sounds that is being called
		var soundType = [\standard1, \standard2, \standard3].choose;
		switch(service.identifier,
			\Google, { soundType = \Google },
			\Youtube, { soundType = \YouTube },
			"Google,Youtube".asSymbol, { soundType = \YouTube},
			"Youtube,Google".asSymbol, {soundType = \YouTube},
			\Amazon, { soundType = \Amazon },
			"Slack,Amazon".asSymbol, { soundType = \Slack},
			\Facebook, { soundType = \Facebook },
			\Cloudflare, { soundType = \Cloudflare },
			\Microsoft, { soundType = \Microsoft },
			"Github,Microsoft".asSymbol, { soundType = \GitHub },
			"Whatsapp,Facebook".asSymbol, { soundType = \WhatsApp },
			"Instagram,Facebook".asSymbol, { soundType = \Instagram },
			\Instagram, { soundType = \Instagram },
		);
		// ("Adding sound process " ++ soundType ++ " to service " ++ service).postln;
		service.soundType = soundType;
		service.tick = { | self, channel |
			if(~sonifyLive, {
				~playSound.(self.soundType, \in, self.packets[\in], channel);
				~playSound.(self.soundType, \out, self.packets[\out], channel);
			});
			if(~sonifySequencer, {
				~updateSequencer.(self.soundType, \in, self.packets[\in], channel);
				~updateSequencer.(self.soundType, \out, self.packets[\out], channel);
			});
			if(~sonifyVoice, {
				var packets = self.packets[\in] + self.packets[\out];
				~playVoice.(self.soundType, packets, channel);
			});
		};
	};

	"sequencer.scd".loadRelative; // LOAD AND INIT SEQUENCER


	//////////////////////////////////////////////////////
	/////// SYNTH INSTANTIATION
	/////////////////////////////////////////////////////

	// Play a certain sound based on a number of parameters
	~playSound = { | type, inout, packets, channel |
		var activity = \none, chord = [~ch1, ~ch2, ~ch3, ~ch4].choose;
		if(packets >= ~highActivityThreshold, {
			activity = \high;
			chord = chord;
		}, {
			if(packets >= ~mediumActivityThreshold, {
				activity = \medium;
				chord = chord[0..(chord.size()*2/3 - 1).asInteger]
			}, {
				if(packets >= ~lowActivityThreshold, {
					activity = \low;
					chord = chord[0..(chord.size()/3 - 1).asInteger]
				});
			});
		});
		if(activity != \none) {
			// type.postln;
			switch(type,
				\standard1, {
					var freq = ~s53.degreeToFreq(~chord.choose, 0.midicps, ~octave),
					amp = 0.5,
					release_coeff = 1.0,
					thump_atk = rrand(0.18, 0.21);

					if(~positionThroughService) {
						channel = ~channels.default_channel;
					};
					switch(activity,
						\low, {
							amp = amp * rrand(0.3, 0.7);
						},
						\medium, {
							amp = amp * rrand(0.7, 1.2);
							thump_atk = rrand(1, 2);
						},
						\high, {
							amp = amp * rrand(1.2, 2.0);
							freq = freq * (2.pow(rrand(-1, 1.0).round));
							release_coeff = rrand(0.3, 0.5);
							thump_atk = rrand(2, 3);
						}
					);
					if(inout == \out, {
						if(rrand(0.0, 1.0) > 0.5, {
							channel.play_on(\tick2,
								[
									\freq, rrand(10000, 11000),
									\rq, exprand(0.001, 0.1),
									\out, channel.bus,
									\amp, exprand(0.015, 0.05) * amp * ~tickAmp,
									\atk, 0.001 * release_coeff,
									\rel, 0.01, //0.01,
									\pan, rrand(-0.5, 0.5),
								]
							);
						}, {
							channel.play_on(\reverse_sine, [
								\freq, freq,
								\atk, rrand(1.0, 5.0) * release_coeff,
								\rel, rrand(0.1, 4 * release_coeff),
								\c0, rrand(1, 4),
								\c1, \sine,
								\pan, rrand(-0.7, 0.7),
								\amp, 0.05 * amp,
								\out, channel.bus]);
						});
					}, {
						channel.play_on(\thump, [
							\freq, freq,
							\atk, thump_atk,
							\rel, 2,
							\c0, -3,
							\c1, \sine,
							\pan, rrand(-0.7, 0.7),
							\amp, 0.05 * amp,
							\out, channel.bus]);
					});
				},
				\standard2, {
					var freq = ~s53.degreeToFreq(~chord.choose, 0.midicps, ~octave),
					amp = 0.5,
					release_coeff = 1.0,
					thump_atk = rrand(0.18, 0.21);

					if(~positionThroughService) {
						channel = ~channels.default_channel;
					};
					switch(activity,
						\low, {
							amp = amp * rrand(0.3, 0.7);
						},
						\medium, {
							amp = amp * rrand(0.7, 1.2);
							thump_atk = rrand(1, 2);
						},
						\high, {
							amp = amp * rrand(1.2, 2.0);
							freq = freq * (2.pow(rrand(-1, 1.0).round));
							release_coeff = rrand(0.3, 0.5);
							thump_atk = rrand(2, 3);
						}
					);
					if(inout == \out, {
						if(rrand(0.0, 1.0) > 0.5, {
							var gustFreq = freq;
							while({gustFreq < 900}, {gustFreq = gustFreq * 2});
							channel.play_on(\gust,
								[
									\freq, min(gustFreq, 4000),
									\rq, exprand(0.05, 0.2),
									\out, channel.bus,
									\amp, exprand(0.03, 0.1) * amp,
									\atk, rrand(1.0, 3.0) * release_coeff,
									\rel, rrand(1, 5) * release_coeff, //0.01,
									\pan1, rrand(-0.5, 0.5),
									\pan2, rrand(-0.5, 0.5),
								]
							);
						}, {
							channel.play_on(\long_sine, [
								\freq, freq,
								\length, rrand(1.0, 5.0) * release_coeff,
								\pan, rrand(-0.7, 0.7),
								\amp, 0.05 * amp,
								\out, channel.bus]);
						});
					}, {
						var thumpFreq = freq;
						while({thumpFreq < 100}, {thumpFreq = thumpFreq * 2});
						channel.play_on(\thump, [
							\freq, thumpFreq,
							\atk, thump_atk,
							\rel, rrand(2, 3),
							\c0, -3,
							\c1, \sine,
							\pan, rrand(-0.7, 0.7),
							\amp, 0.05 * amp,
							\out, channel.bus]);
					});
				},
				\standard3, {
					var freq = ~s53.degreeToFreq(~chord.choose, 0.midicps, ~octave + 1),
					amp = 0.5,
					release_coeff = 1.0,
					thump_atk = rrand(0.18, 0.21);

					if(rrand(0.0, 1.0) > 0.5) {
						while({freq < 150}, {freq = freq * 2});
					};

					if(~positionThroughService) {
						channel = ~channels.default_channel;
					};
					switch(activity,
						\low, {
							amp = amp * rrand(0.3, 0.7);
						},
						\medium, {
							amp = amp * rrand(0.7, 1.2);
							thump_atk = rrand(1, 2);
						},
						\high, {
							amp = amp * rrand(1.2, 2.0);
							freq = freq * (2.pow(rrand(-1, 1.0).round));
							release_coeff = rrand(0.3, 0.5);
							thump_atk = rrand(2, 3);
						}
					);
					if(inout == \out, {
						if(rrand(0.0, 1.0) > 0.5, {
							channel.play_on(\tick2,
								[
									\freq, rrand(7000, 10000),
									\rq, exprand(0.001, 0.1),
									\out, channel.bus,
									\amp, exprand(0.02, 0.05) * amp * ~tickAmp,
									\atk, 0.001 * release_coeff,
									\rel, 0.01, //0.01,
									\pan, rrand(-0.5, 0.5),
								]
							);
						}, {
							channel.play_on(\reverse_sine, [
								\freq, freq,
								\atk, rrand(1.0, 5.0) * release_coeff,
								\rel, rrand(0.1, 4 * release_coeff),
								\c0, rrand(1, 4),
								\c1, \sine,
								\pan, rrand(-0.7, 0.7),
								\amp, 0.05 * amp,
								\out, channel.bus]);
						});
					}, {
						channel.play_on(\thump, [
							\freq, freq,
							\atk, thump_atk,
							\rel, 2,
							\c0, -3,
							\c1, \sine,
							\pan, rrand(-0.7, 0.7),
							\amp, 0.05 * amp,
							\out, channel.bus]);
					});
				},
				\Google, {
					var freq = ~s53.degreeToFreq(~chord.choose, 0.midicps, ~octave + 1),
					amp = 0.5,
					release_coeff = 1.0;

					if(~positionThroughService) {
						channel = ~channels.google_channel;
					};
					switch(activity,
						\low, {
							amp = amp * rrand(0.3, 0.7);
						},
						\medium, {
							amp = amp * rrand(0.7, 1.2);
						},
						\high, {
							amp = amp * rrand(1.2, 2.0);
							freq = freq * (2.pow(rrand(-1, 1.0).round));
							release_coeff = rrand(0.3, 0.5);
						}
					);
					if(inout == \out, {
						channel.play_on(\reverse_google, [
							\freq, freq,
							\atk, rrand(1.0, 5.0) * release_coeff,
							\rel, rrand(0.1, 4 * release_coeff),
							\c0, rrand(1, 4),
							\c1, \sine,
							\pan, rrand(-0.7, 0.7),
							\amp, 0.05 * amp,
							\out, channel.bus]);
					}, {
						channel.play_on(\tick2,
							[
								\freqis, min(freq * 4, 14000),
								\rq, exprand(0.001, 0.1),
								\out, channel.bus,
								\amp, exprand(0.02, 0.1) * amp,
								\atk, 0.5 * release_coeff,
								\rel, 0.01, //0.01,
								\pan, rrand(-0.5, 0.5),
							]
						);
					});
				},
				\Amazon, {
					var freq = ~s53.degreeToFreq(~chord.choose, 0.midicps, ~octave),
					amp = 0.5,
					release_coeff = 1.0;

					if(~positionThroughService) {
						channel = ~channels.amazon_channel;
					};
					switch(activity,
						\low, {
							amp = amp * rrand(0.3, 0.7);
						},
						\medium, {
							amp = amp * rrand(0.7, 1.2);
						},
						\high, {
							amp = amp * rrand(1.2, 2.0);
							freq = freq * (2.pow(rrand(-1, 1.0).round));
							release_coeff = rrand(0.3, 0.5);
						}
					);
					if(inout == \out, {
						if(activity == \low, {
							channel.play_on(\tick2,
								[
									\freq, freq * 2,
									\rq, exprand(0.001, 0.1),
									\out, channel.bus,
									\amp, exprand(0.03, 0.2) * amp,
									\atk, 0.01 * release_coeff,
									\rel, 0.01, //0.01,
									\pan, rrand(-0.5, 0.5),
								]
							);
						}, {
							channel.play_on(\reverse_saw, [
								\freq, freq,
								\atk, rrand(1.5, 5.0) * release_coeff,
								\rel, rrand(0.1, 4 * release_coeff),
								\c0, rrand(2, 4),
								\c1, \sine,
								\pan, rrand(-0.7, 0.7),
								\amp, 0.025 * amp,
								\out, channel.bus]);
						});
					}, {
						channel.play_on(\tick2,
							[
								\freq, (freq * 4).min(18000),
								\rq, exprand(0.001, 0.1),
								\out, channel.bus,
								\amp, exprand(0.01, 0.05) * amp,
								\atk, 0.001 * release_coeff,
								\rel, 0.01, //0.01,
								\pan, rrand(-0.5, 0.5),
							]
						);
					});
				},
				\Cloudflare, {
					var freq = ~s53.degreeToFreq(~chord.choose, 0.midicps, ~octave),
					amp = 0.5,
					release_coeff = 1.0;

					if(~positionThroughService) {
						channel = ~channels.cloudflare_channel;
					};
					switch(activity,
						\low, {
							amp = amp * rrand(0.3, 0.7);
						},
						\medium, {
							amp = amp * rrand(0.7, 1.2);
						},
						\high, {
							amp = amp * rrand(1.2, 2.0);
							freq = freq * (2.pow(rrand(-1, 1.0).round));
							release_coeff = rrand(0.3, 0.5);
						}
					);
					if(inout == \out, {
						channel.play_on(\softy, [
							\freq, freq,
							\atk, 3,
							\rel, 2,
							\c0, 2,
							\c1, \sine,
							\pan, rrand(-0.7, 0.7),
							\amp, 0.05,
							\out, channel.bus]);
					}, {
						if(activity == \high, {
							/*channel.play_on(\glitchy_rise, [
							\freq, freq,
							\atk, 0.1,
							\rel, rrand(2, 4),
							\c0, -3,
							\c1, -6,
							\pan, rrand(-0.7, 0.7),
							\amp, 0.05 * amp,
							\out, channel.bus]);*/
							channel.play_on(\tick2,
								[
									\freq, (freq * 4).min(18000),
									\rq, exprand(0.001, 0.1),
									\out, channel.bus,
									\amp, exprand(0.1, 0.5) * amp,
									\atk, 0.01 * release_coeff,
									\rel, 0.01, //0.01,
									\pan, rrand(-0.5, 0.5),
								]
							);
						}, {
							channel.play_on(\thump, [
								\freq, freq,
								\atk, 0.5,
								\rel, 2,
								\c0, -3,
								\c1, \sine,
								\pan, rrand(-0.7, 0.7),
								\amp, 0.05 * amp,
								\out, channel.bus]);

						});
					});
				},
				\Microsoft, {
					var freq = ~s53.degreeToFreq(~chord.choose, 0.midicps, ~octave),
					amp = 0.5,
					release_coeff = 1.0;

					if(~positionThroughService) {
						channel = ~channels.microsoft_channel;
					};
					switch(activity,
						\low, {
							amp = amp * rrand(0.3, 0.7);
						},
						\medium, {
							amp = amp * rrand(0.7, 1.2);
						},
						\high, {
							amp = amp * rrand(1.2, 2.0);
							freq = freq * (2.pow(rrand(-1, 1.0).round));
							release_coeff = rrand(0.3, 0.5);
						}
					);
					if(inout == \out, {
						channel.play_on(\softy, [
							\freq, freq,
							\atk, 3,
							\rel, 2,
							\c0, 2,
							\c1, \sine,
							\pan, rrand(-0.7, 0.7),
							\amp, 0.05,
							\out, channel.bus]);
					}, {
						if(activity == \high, {
							/*channel.play_on(\glitchy_rise, [
							\freq, freq,
							\atk, 0.1,
							\rel, rrand(2, 4),
							\c0, -3,
							\c1, -6,
							\pan, rrand(-0.7, 0.7),
							\amp, 0.05 * amp,
							\out, channel.bus]);*/
							channel.play_on(\tick2,
								[
									\freq, (freq * 4).min(18000),
									\rq, exprand(0.001, 0.1),
									\out, channel.bus,
									\amp, exprand(0.1, 0.5) * amp,
									\atk, 0.01 * release_coeff,
									\rel, 0.01, //0.01,
									\pan, rrand(-0.5, 0.5),
								]
							);
						}, {
							channel.play_on(\thump, [
								\freq, freq,
								\atk, 0.5,
								\rel, 2,
								\c0, -3,
								\c1, \sine,
								\pan, rrand(-0.7, 0.7),
								\amp, 0.05 * amp,
								\out, channel.bus]);

						});
					});
				},
				\YouTube, {
					var freq = ~s53.degreeToFreq(~chord.choose, 0.midicps, ~octave),
					amp = 0.5,
					release_coeff = 1.0;

					if(~positionThroughService) {
						channel = ~channels.youtube_channel;
					};
					switch(activity,
						\low, {
							amp = amp * rrand(0.3, 0.7);
						},
						\medium, {
							amp = amp * rrand(0.7, 1.2);
							release_coeff = rrand(1.0, 1.5);
						},
						\high, {
							amp = amp * rrand(1.2, 2.0);
							freq = freq * (2.pow(rrand(-1, 1.0).round));
							release_coeff = rrand(1.5, 2.5);
						}
					);
					if(inout == \out, {
						channel.play_on(\bounce_away, [
							\freq, freq,
							\atk, 0.1,
							\rel, rrand(1.5, 2.0) * release_coeff,
							\c0, 2,
							\c1, \sine,
							\pan, rrand(-0.7, 0.7),
							\amp, 0.1 * amp,
							\out, channel.bus]);
					}, {
						/*channel.play_on(\bounce_away, [
						\freq, freq*2,
						\rel, 0.1,
						\atk, rrand(0.7, 1.0) * release_coeff,
						\c1, 2,
						\c0, \sine,
						\pan, rrand(-0.7, 0.7),
						\amp, 0.1 * amp,
						\out, channel.bus]);*/
						channel.play_on(\thump, [
							\freq, freq,
							\atk, 0.3,
							\rel, 1,
							\c0, -3,
							\c1, \sine,
							\pan, rrand(-0.9, 0.9),
							\amp, 0.05 * amp,
							\out, channel.bus]);
					});
				},
				\Facebook, {
					var freq = ~s53.degreeToFreq(~chord.choose, 0.midicps, ~octave-1),
					amp = 0.5,
					release_coeff = 1.0,
					thump_atk = rrand(0.18, 0.21);

					if(rrand(0.0, 1.0) > 0.5) {
						while({freq < 100}, {freq = freq * 2});
					};

					if(~positionThroughService) {
						channel = ~channels.facebook_channel;
					};
					switch(activity,
						\low, {
							amp = amp * rrand(0.3, 0.7);
						},
						\medium, {
							amp = amp * rrand(0.7, 1.2);
							release_coeff = rrand(1.0, 1.5);
							thump_atk = rrand(0.5, 1);
						},
						\high, {
							amp = amp * rrand(1.2, 2.0);
							freq = freq * (2.pow(rrand(-1, 1.0).round));
							release_coeff = rrand(0.3, 0.7);
							thump_atk = rrand(1.0, 2);
						}
					);
					if(inout == \out, {
						channel.play_on(\reverse_google, [
							\freq, freq,
							\atk, rrand(1.0, 5.0) * release_coeff,
							\rel, rrand(0.1, 4 * release_coeff),
							\c0, rrand(1, 4),
							\c1, \sine,
							\pan, rrand(-0.7, 0.7),
							\amp, 0.05 * amp,
							\out, channel.bus]);
					}, {
						channel.play_on(\thump, [
							\freq, freq,
							\atk, thump_atk,
							\rel, rrand(0.5, 2),
							\c0, -3,
							\c1, \sine,
							\pan, rrand(-0.7, 0.7),
							\amp, 0.05 * amp,
							\out, channel.bus]);
					});
				},
				\WhatsApp, {
				},
				\Slack, {
				},
				\Signal, {
				},
				\Instagram, {
				},
				\GitHub, {
				}
			);
		};
	};

	// Play a certain sound based on a number of parameters
	~playVoice = { | type, packets, channel |
		var activity = \none, chord = [~ch1, ~ch2, ~ch3, ~ch4].choose, bufnum = nil;
		if(packets >= ~highActivityThreshold, {
			activity = \high;
			chord = chord;
		}, {
			if(packets >= ~mediumActivityThreshold, {
				activity = \medium;
				chord = chord[0..(chord.size()*2/3 - 1).asInteger]
			}, {
				if(packets >= ~lowActivityThreshold, {
					activity = \low;
					chord = chord[0..(chord.size()/3 - 1).asInteger]
				});
			});
		});
		channel = ~channels.voice;
		if(activity != \none) {
			switch(type,
				\Google, {
					if(~positionThroughService) {
						channel = ~channels.google_channel;
					};
					bufnum = ~voiceServices.google;
				},
				\Amazon, {
					if(~positionThroughService) {
						channel = ~channels.amazon_channel;
					};
					bufnum = ~voiceServices.amazon;
				},
				\Cloudflare, {
					if(~positionThroughService) {
						channel = ~channels.cloudflare_channel;
					};
				},
				\Microsoft, {
					if(~positionThroughService) {
						channel = ~channels.microsoft_channel;
					};
					bufnum = ~voiceServices.microsoft;
				},
				\YouTube, {
					if(~positionThroughService) {
						channel = ~channels.youtube_channel;
					};
					bufnum = ~voiceServices.youtube;
				},
				\Facebook, {
					if(~positionThroughService) {
						channel = ~channels.facebook_channel;
					};
					bufnum = ~voiceServices.facebook;
				},
				\WhatsApp, {
					bufnum = ~voiceServices.whatsapp;
				},
				\Slack, {
					bufnum = ~voiceServices.slack;
				},
				\Signal, {
					bufnum = ~voiceServices.signal;
				},
				\Instagram, {
					bufnum = ~voiceServices.instagram;
				},
				\GitHub, {
					bufnum = ~voiceServices.github;
				}
			);
		};

		if(bufnum != nil) {
			channel.play_on(\service_voice, [\buf, bufnum, \out, channel.bus]);
		};
	};

	s.sync();

	~newPageLoadEvent = { | url, hostname |
		var freq, amp = 0.5;
		// Reset sequencer
		~sequencer = ~newSequencer.(32);
		~resetCurrentFrame.();
		~droneAmpPhase = 0;
		// Change root
		~root = ~root + [-8, 9, 17, -22].choose;
		~root = ((~root + 22 - ~baseRoot) % 53) - 22 + ~baseRoot; // bring it back into the range -22 - 31
		// Play start of main frame sounds
		~channels.default_channel.play_on(\gust,
			[
				\freq, rrand(500, 2000),
				\rq, exprand(0.05, 0.2),
				\out, ~channels.default_channel.bus,
				\amp, exprand(0.03, 0.1),
				\atk, rrand(0.7, 1.5),
				\rel, rrand(1, 4), //0.01,
				\pan1, rrand(-0.5, 0.5),
				\pan2, rrand(-0.5, 0.5),
			]
		);
		freq = ~s53.degreeToFreq(~root, 0.midicps, 3);
		~channels.default_channel.play_on(\thump, [
			\freq, freq,
			\atk, 0.6,
			\rel, 2,
			\c0, -3,
			\c1, \sine,
			\pan, 0.0,
			\amp, 0.1 * amp,
			\out, ~channels.default_channel.bus]);
		~channels.default_channel.play_on(\thump, [
			\freq, freq * 2,
			\atk, 0.6,
			\rel, 2,
			\c0, -3,
			\c1, \sine,
			\pan, -0.3,
			\amp, 0.1 * amp,
			\out, ~channels.default_channel.bus]);
		~channels.default_channel.play_on(\thump, [
			\freq, freq * 4,
			\atk, 0.6,
			\rel, 2,
			\c0, -3,
			\c1, \sine,
			\pan, 0.3,
			\amp, 0.1 * amp,
			\out, ~channels.default_channel.bus]);


		~newMainFrameTime = Date.localtime.rawSeconds;

		~tickClock.tempo = 2;
		("url: " + url + " hostname: " + hostname).postln;
		~overallStats.currentFrame.hostname = hostname;
	};


	//////////////////////////////////////////////////////
	/////// OSC PACKET PARSING
	/////////////////////////////////////////////////////

	// Receive OSC packets on web traffic
	~num_packets = 0;
	~packet_density = 0;
	~sub_tam_last_launch = Date.localtime.rawSeconds;
	~newMainFrameTime = Date.localtime.rawSeconds;
	~vis_sender = NetAddr("127.0.0.1", 9771);
	~packetRecPanWidth = 0;
	~currentTabUrl = "";
	// Receive packages of web traffic data
	// /request_completed OSC packets
	o = OSCFunc({ arg msg, time, addr, recvPort;
		var
		fromCache = msg[1],
		ip = msg[2],
		method = msg[3],
		statusCode = msg[4],
		content_type = msg[5],
		content_length = msg[6],
		requestId = msg[7],
		tabId = msg[8],
		timeStamp = msg[9],
		type = msg[10], // image, ping, xmlhttprequest, script, font, sub_frame, stylesheet, main_frame
		url = msg[11],
		hostname = msg[12],
		services = msg[13],
		location = msg[14],
		tab_url = msg[15],

		freq, ip_parts, rel = 0.0;

		if(~idle == true) {
			// Sometimes the idle deactivation message fails to send
			// so we deactivate the idle state whenever there is activity
			~stopIdleMusic.()
		};

		if(~idle == false && (~home == false)) {

			if(~currentTabUrl != tab_url) {
				("RESET" + tab_url).postln;
				~currentTabUrl = tab_url;
				~newPageLoadEvent.(url, hostname);
			};

			// The first request is seldom the correct main hostname
			if(url == ~currentTabUrl) {
				~overallStats.currentFrame.hostname = hostname;
			};

			// [msg, time, addr, recvPort].postln;
			// services.postln;
			// hostname.postln;
			// method.postln;
			// type.postln;
			// location.postln;

			if(services.asString.size < 2) {
				services = hostname;
			};

			if(content_length == 'N.A', {
				content_length = 0;
			});

			~addPacketToStats.(\localhost, [true, false].choose, services, ip, location);
			~registerOverallStats.(ip, location, type, content_length, hostname);
			~addPercussiveToSequencer.();

			// msg.postln;
			if(rrand(0.0, 1.0) > 0.9) {
				~packetRecPanWidth = rrand(0, 1.0);
			};
			if(rrand(0.0, 1.0) > 0.995) {
				rel = rrand(0.2, 1.0);
			};

			// Percussive sound when a packet is received
			if(~overallActivity < (~maxActivity * 0.5)) {
				{
					rrand(0.0, 0.2).wait;
					~channels.tick_channel.play_on(\tick2,
						[
							\freq, ~s53.degreeToFreq(~chord.choose + 159, 0.midicps, 5).min(15000),
							\rq, exprand(0.0001, 0.1),
							\out, ~channels.tick_channel.bus,
							\amp, rrand(0.0001, 0.001) * ~tickAmp,
							\atk, rrand(0.000, 0.004),
							\c0, -10,
							\rel, rrand(0.01, 0.05) + rel, //0.01,
							\c1, -12,
							\pan, rrand(-1*~packetRecPanWidth, ~packetRecPanWidth),
						]
					);
				}.fork;
			};
			~num_packets = ~num_packets + 1;
		};
		// ("num packets: " + ~num_packets).postln;
	}, '/request_completed', nil, 57130); // create the OSCFunc

	p = OSCFunc({ arg msg, time, addr, recvPort;
		// [msg, time, addr, recvPort].postln;
		var fromCache = msg[1],
		ip = msg[2],
		method = msg[3],
		statusCode = msg[4],
		content_type = msg[5],
		content_length = msg[6],
		requestId = msg[7],
		tabId = msg[8],
		timeStamp = msg[9],
		type = msg[10],
		url = msg[11],
		hostname = msg[12],
		services = msg[13],
		location = msg[14],
		tab_url = msg[15];

		if(~currentTabUrl != tab_url) {
			("RESET" + tab_url).postln;
			~currentTabUrl = tab_url;
			~newPageLoadEvent.(url, hostname);
		};
		// The first request is seldom the correct main hostname
		if(url == ~currentTabUrl) {
			~overallStats.currentFrame.hostname = hostname;
		};

	}, '/request_created');

	q = OSCFunc({ arg msg, time, addr, recvPort;
		[msg, time, addr, recvPort].postln;
		if(msg[1] == 'active') {
			~stopIdleMusic.()
		};
		if(msg[1] == 'inactive') {
			~startIdleMusic.()
		};
	}, '/idle');

	r = OSCFunc({ arg msg, time, addr, recvPort;
		[msg, time, addr, recvPort].postln;
		if(msg[1] == 'open') {
			// ~home = true;
		};
		if(msg[1] == 'close') {
			~home = false;
		};
	}, '/home');


	//////////////////////////////////////////////////////
	/////// SOUND PROCESS AND ANALYSIS UPDATE LOOP
	/////////////////////////////////////////////////////

	// An update loop plays sounds according to the stats collected and the waits
	~tickClock = TempoClock(120/60);
	~overallActivity = 0;
	~maxActivity = 60;
	~baseRoot = 17;
	~root = ~baseRoot;
	~tickAmp = 0.5;
	~tickAmpTarget = 1.0;
	~tickAmpStepsLeft = 120;
	~tickAmpStep = (~tickAmpTarget - ~tickAmp) / ~tickAmpStepsLeft;
	~counter = 0;

	// calculate the decay coefficient
	~timeBetweenUpdateTicks = 0.25 / ~tickClock.tempo; // in seconds

	~decayTimeTicks = ~overTimeStatsDecayTime/~timeBetweenUpdateTicks;
	~decayCoeff = (0.001).pow(1.0/~decayTimeTicks); // decay by 60 dB i.e. to within 0.1%
	s.sync();
	Routine({
		loop {
			var allDevices = ~stats.values,
			numInPackets = 0, numOutPackets = 0,
			numPitchesPerChord, root, harmonicComplexity = 0, numScripts, now = Date.localtime.rawSeconds,
			timeSinceMainFrame = now - ~newMainFrameTime;

			allDevices.do { |statDevice|
				var allServices = statDevice.services.values, totalPacketsForDevice = 0;
				allServices.do { | service |
					service.tick(statDevice.channel);
					numInPackets = numInPackets + service.packets[\in];
					numOutPackets = numOutPackets + service.packets[\out];
					totalPacketsForDevice = totalPacketsForDevice + service.packets[\in];
					totalPacketsForDevice = totalPacketsForDevice + service.packets[\out];
					service.packets[\in] = 0;
					service.packets[\out] = 0;
				};
				statDevice.channel.set_activity((totalPacketsForDevice/~maxActivity).min(1.0));
			};

			if(~tickAmpStepsLeft <= 0) {
				~tickAmpStepsLeft = rrand(30, 240);
				~tickAmpTarget = exprand(0.05, 1.0);
				~tickAmpStep = (~tickAmpTarget - ~tickAmp) / ~tickAmpStepsLeft;
			};
			~tickAmp = ~tickAmp + ~tickAmpStep;
			~tickAmpStepsLeft = ~tickAmpStepsLeft - 1;

			~overallActivity = ~overallActivity * 0.9 + ((numInPackets + numOutPackets) * 0.1);
			// ("overall: " + ~overallActivity).postln;

			~updateOverallStatsTick.(~decayCoeff); // Bring the overTime stats closer to the current frame


			~updateDrone.(timeSinceMainFrame);

			/*tick_channel.play_on(\tick2,
			[
			\freq, rrand(7000, 9000),
			\rq, exprand(0.001, 0.1),
			\out, tick_channel.bus,
			\amp, rrand(0.01, 0.05),
			\atk, 0.0,
			\rel, 0.01, //0.01,
			\pan, rrand(-0.1, 0.1),
			]
			);*/

			// Update chord
			/*if(~overallActivity > (~maxActivity * 0.5)) {
				if(rrand(0.0, 1.0) > 0.98) {
					~root = ~root + [-8, 0, 9, 17, -22].choose;
					~root = ((~root + 22 - ~baseRoot) % 53) - 22 + ~baseRoot; // bring it back into the range -22 - 31
				};
			};
			if(~overallActivity > (~maxActivity * 0.2)) {
				if(rrand(0.0, 1.0) > 0.99) {
					// TODO: Maybe change chord depending on activity instead of cycling through?
					~changeChord.();
				};
			};*/

			// numPitchesPerChord = (~overallActivity.linexp(0, ~maxActivity, 3.0, ~ch1.size+2.99)-3.0).asInteger;
			numPitchesPerChord = 6;
			// ("nump: " + numPitchesPerChord).postln;
			~chord = ~ch1[0..numPitchesPerChord] ++ ~ch2[0..numPitchesPerChord] ++ ~ch3[0..numPitchesPerChord] ++ ~ch4[0..numPitchesPerChord];
			~chord = ~chord + ~root;

			// tempo = 2 per second * 4 = 8 updates per second
			// 1/(15*8) = 0.008333

			if(~overallActivity > 2.0, {
				// ~droneAmpPhase = ~droneAmpPhase - 0.004;
				~droneAmpPhase = ~droneAmpPhase + (~overallActivity * 0.03);
				while({~droneAmpPhase > 1.0 }, { ~droneAmpPhase = ~droneAmpPhase - 1.0; });
			}, {
				~droneAmpPhase = ~droneAmpPhase + 0.0083;
				~droneAmpPhase = ~droneAmpPhase.min(1.0);
			});
			~droneAmpPhase = ~droneAmpPhase.max(0);
			// ~droneAmpPhase.postln;

			// Update sequencer
			if(~counter % 2 == 0 && (~idle == false)) {
				if(~overallActivity < 0.7) {
					~adjustPercussionLevels.(~sequencer, 0.96); // linear decrease in percussion levels
				};
				~updatePercussionInSequencer.(~sequencer);
				~playSequencer.(~sequencer);
			};
			/*if(~overallStats.currentFrame.numRequests > 200 && (~sequencer.numSteps < 64), {
				// Double the grid
				~doubleSequencerGrid.(~sequencer);
				~tickClock.tempo = ~tickClock.tempo * 2;
				"Doubled The Grid".postln;
			});

			if(~overallStats.currentFrame.numRequests > 500 && (~sequencer.numSteps < 128), {
				// Double the grid
				~doubleSequencerGrid.(~sequencer);
				"Doubled The Grid Again (without tempo adjustment)".postln;
			});*/

			~counter = ~counter + 1;
			0.25.wait;
		};
	}).play(~tickClock);

	s.sync;

	~startIdleMusic.();
});
