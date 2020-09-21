( // For setting up the server on Mac using MADIface XT
s.options.device = "MADIface XT (23757085)";
s.options.numOutputBusChannels = 36;
s.reboot;
)

(
s.options.numOutputBusChannels = 36;
s.reboot;
)

(
//// RUN THIS BLOCK TO START EVERYTHING

//////////////////////////////////////////////////////
/////// CONSTANTS AND SETUP
/////////////////////////////////////////////////////

// Routing and mixer channels
~useAmbisonics = false; // Set to false to use a simple stereo output
~sonifyLive = false;
~sonifySequencer = true;
~controlPositionWithMouse = true; // If the mouse position will infulence ambisonics positioning
// If ~positionThroughService is true, positioning is based on what service something comes from instead of what device
~positionThroughService = true;
~ambisonicsOrder = 3; // Currently 1, 3 or 5 are supported
if(~useAmbisonics == true, {
	~mixerChannelOutputs = (~ambisonicsOrder+1).pow(2);
}, {
	~mixerChannelOutputs = 2;
});
~firstOutputBus = 0;
~decoderBus = Bus.audio(s, ~mixerChannelOutputs);

// Ambisonics positioning parameters
~azimuthPosition = 0.0; // The start position, and later on current position for the next device
~azimuthStep = (6.1 * pi)/7; // The distance between different devices, a 7 pointed star that's a little bit off so it doesn't quite return to the same spot
~elevationPosition = 0.0;
~elevationStep = 0.0;


// Sonification activity thresholds
~highActivityThreshold = 20;
~mediumActivityThreshold = 10;
~lowActivityThreshold = 1;

// What latency in seconds to use for scheduling playback on the server
// If you get "late ..." messages, increase this number'
~latency = 0.2;


"../sound_forest_mixer_gui.scd".loadRelative;

"synthdefs.scd".loadRelative; // LOAD SYNTHDEFS


//////////////////////////////////////////////////////
/////// STARTING EVERYTHING
/////////////////////////////////////////////////////

{
	var filter_bus, filter, drone, voice_path;

	s.newBusAllocators; // Make sure we don't run out of busses if we restart multiple times

	//////////////////////////////////////////////////////
	/////// HARMONIC CONTENT
	/////////////////////////////////////////////////////

	~s53 = Scale.chromatic('et53'); // For decoding 53edo
	// Rich chord with harmonic 7
	~ch1 = [120, 43, 0, 31, 57, 137];
	~ch2 = [88, 74, 17, 39, 53, 137];
	~ch3 = [106, 151, 31, 88, 163, 120];
	~ch4 = [57, 163, 43, 74, 106, 180];
	// suspended quality chord
	~ch1 = [22, 93, 0, 9, 71, 53];
	~ch2 = [40, 71, 9, 31, 62, 102];
	~ch3 = [62, 102, 22, 40, 84, 124];
	~ch4 = [84, 124, 31, 53, 93, 115];
	~currentChord = 0;
	~numChords = 2;
	~changeChord = { | num = -1 |
		// if num is -1 then
		if(num == -1, {
			~currentChord = (~currentChord + 1) % ~numChords;
		}, {
			~currentChord = num % ~numChords;
		});

		switch(~currentChord,
			0, {
				~ch1 = [22, 93, 0, 9, 71, 53];
				~ch2 = [40, 71, 9, 31, 62, 102];
				~ch3 = [62, 102, 22, 40, 84, 124];
				~ch4 = [84, 124, 31, 53, 93, 115];
			},
			1, {
				// Rich chord with harmonic 7
				~ch1 = [120, 43, 0, 31, 57, 137];
				~ch2 = [88, 74, 17, 39, 53, 137];
				~ch3 = [106, 151, 31, 88, 163, 120];
				~ch4 = [57, 163, 43, 74, 106, 180];
			}
		);
	};
	~chord = ~ch1 ++ ~ch2 ++ ~ch3 ++ ~ch4;
	~octave = 3;

	// Load buffers with voice recordings of services
	voice_path = "../sounds/BCM_voice/spoken/".resolveRelative;

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
			play_on: {|self, synth_name, args|
				// s.makeBundle(~latency, {Synth(synth_name, args, self.my_group)} );
				self.my_clock.sched(~latency, Synth(synth_name, args, self.my_group));
			},
		)
	};

	~decoder = Synth(\decoder, [\in, ~decoderBus, \out, ~firstOutputBus]);

	~channels = Environment(know: true);
	// Set up all the channels
	~channels.rev_channel = ~makeMixerChannel.("Reverb", ~decoderBus);
	~channels.rev_channel.play_on(\medium_reverb, [\out, ~channels.rev_channel.bus, \in, ~channels.rev_channel.bus, \mix, 1.0, \amp, 2.0]);
	~channels.rev_channel.set_amp(0.3);
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
	~channels.tick_channel = ~makeMixerChannel.("Tick", ~decoderBus);
	~channels.tick_channel.set_send(~channels.rev_channel.bus, 1.0);
	~channels.tick_channel.set_amp(0.0);

	{
		~makeSoundForestGui.([~channels.tick_channel, ~channels.default_channel, ~channels.google_channel, ~channels.facebook_channel, ~channels.amazon_channel, ~channels.cloudflare_channel, ~channels.youtube_channel, ~channels.rev_channel], ~allClouds);
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
		// If there is no service name, use the remote_ip as an identifier instead
		if(service.asString.size < 2) {
			service = remote_ip;
		};
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
			"Google,Youtube".asSymbol, { soundType = \YouTube},
			"Youtube,Google".asSymbol, {soundType = \YouTube},
			\Amazon, { soundType = \Amazon },
			"Slack,Amazon".asSymbol, { soundType = \Slack},
			\Facebook, { soundType = \Facebook },
			\Cloudflare, { soundType = \Cloudflare },
			\Microsoft, { soundType = \Microsoft },
			"Github,Microsoft".asSymbol, { soundType = \GitHub }
		);
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
		};
	};

	"sequencer.scd".loadRelative; // LOAD AND INIT SEQUENCER


	//////////////////////////////////////////////////////
	/////// SYNTH INSTANTIATION
	/////////////////////////////////////////////////////

	// Play a certain sound based on a number of parameters
	~playSound = { | type, inout, packets, channel |
		var activity = \none, chord = [~ch1, ~ch2, ~ch3, ~ch4].choose;
		if(packets > ~highActivityThreshold, {
			activity = \high;
			chord = chord;
		}, {
			if(packets > ~mediumActivityThreshold, {
				activity = \medium;
				chord = chord[0..(chord.size()*2/3 - 1).asInteger]
			}, {
				if(packets > ~lowActivityThreshold, {
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

					channel.play_on(\service_voice, [\buf, ~voiceServices.google]);
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
					if(~sequencer.google != true) {
						// Add to sequencer
						~addToSequencer.(~sequencer, rrand(0, ~sequencer.numSteps).floor,
							{
								channel.play_on(\service_voice, [\buf, ~voiceServices.google]);
								Synth(\tick2,
									[
										\freq, ~s53.degreeToFreq(~chord.choose + 159, 0.midicps, 5).min(15000),
										\rq, exprand(0.0001, 0.1),
										\out, 0,
										\amp, rrand(0.001, 0.02),
										\atk, 0.000,
										\rel, rrand(0.01, 0.05), //0.01,
										\c1, -12,
										\pan, rrand(-1, 1),
									]
								);
						});
						~sequencer.google = true;
					};
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
					channel.play_on(\service_voice, [\buf, ~voiceServices.amazon]);
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
								\atk, rrand(1.0, 5.0) * release_coeff,
								\rel, rrand(0.1, 4 * release_coeff),
								\c0, rrand(1, 4),
								\c1, \sine,
								\pan, rrand(-0.7, 0.7),
								\amp, 0.05 * amp,
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
					if(~sequencer.amazon != true) {
						// Add to sequencer
						~addToSequencer.(~sequencer, rrand(0, ~sequencer.numSteps).floor,
							{
								channel.play_on(\service_voice, [\buf, ~voiceServices.amazon]);
								Synth(\tick2,
									[
										\freq, ~s53.degreeToFreq(~chord.choose + 159, 0.midicps, 5).min(15000),
										\rq, exprand(0.0001, 0.1),
										\out, 0,
										\amp, rrand(0.001, 0.02),
										\atk, 0.000,
										\rel, rrand(0.01, 0.05), //0.01,
										\c1, -12,
										\pan, rrand(-1, 1),
									]
								);
						});
						~sequencer.amazon = true;
					};
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
					channel.play_on(\service_voice, [\buf, ~voiceServices.microsoft]);
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
					channel.play_on(\service_voice, [\buf, ~voiceServices.youtube]);
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
					channel.play_on(\service_voice, [\buf, ~voiceServices.facebook]);
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
				}
			);

		};
	};

	s.sync();


	//////////////////////////////////////////////////////
	/////// OSC PACKET PARSING
	/////////////////////////////////////////////////////

	// Receive OSC packets on web traffic
	~num_packets = 0;
	~packet_density = 0;
	~sub_tam_last_launch = Date.localtime.rawSeconds;
	~vis_sender = NetAddr("127.0.0.1", 9771);
	~packetRecPanWidth = 0;
	// Receive packages of web traffic data
	o = OSCFunc({ arg msg, time, addr, recvPort;
		var timestamp = msg[1],
		local_ip = msg[2],
		remote_ip = msg[3],
		out = msg[4],
		local_location = msg[5],
		remote_location = msg[6],
		len = msg[7].asFloat,
		protocol = msg[8],
		services = msg[9],
		speaker = msg[10],
		local_mac = msg[11],

		freq, ip_parts, rel = 0.0;

		// Some packets aren't interesting, such as communication with the router
		if(local_ip != "192.168.0.1".asSymbol && (local_ip != "192.168.0.255".asSymbol)) {
			// [msg, time, addr, recvPort].postln;
			// Convert out to a boolean
			if(out == \true, { out = true }, { out = false });

			// Extract all the integers from the remote_ip
			ip_parts = remote_ip.asString.split($.).collect{ |num| num.asInteger};
			services.postln;

			~addPacketToStats.(local_ip.asSymbol, out, services, remote_ip, remote_location);
		};
		{
			var service_or_ip = services;
			if(service_or_ip.asString == "") {
				service_or_ip = remote_ip;
			};
			// Send it on to the visualisation program
			// ~vis_sender.sendMsg("/bcm-packet", remote_location, len, service_or_ip);
		}.value();
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
						\out, 0,
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
		// ("num packets: " + ~num_packets).postln;
	}, '/package', nil, 57130); // create the OSCFunc


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
	s.sync();
	Routine({
		loop {
			var allDevices = ~stats.values,
			numInPackets = 0, numOutPackets = 0,
			numPitchesPerChord, root;

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


			~overallActivity = ~overallActivity * 0.99 + ((numInPackets + numOutPackets) * 0.01);
			// ("overall: " + ~overallActivity).postln;

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
			if(~overallActivity > (~maxActivity * 0.5)) {
				if(rrand(0.0, 1.0) > 0.98) {
					~root = ~root + [-8, 0, 9, 17, -22].choose;
					~root = ((~root + 22 - ~baseRoot) % 53) - 22 + ~baseRoot; // bring it back into the range -22 - 31
					~root = ~root;
				};
			};
			if(~overallActivity > (~maxActivity * 0.2)) {
				if(rrand(0.0, 1.0) > 0.99) {
						// TODO: Maybe change chord depending on activity instead of cycling through?
					~changeChord.();
				};
			};

			numPitchesPerChord = (~overallActivity.linexp(0, ~maxActivity, 3.0, ~ch1.size+2.99)-3.0).asInteger;
			// ("nump: " + numPitchesPerChord).postln;
			~chord = ~ch1[0..numPitchesPerChord] ++ ~ch2[0..numPitchesPerChord] ++ ~ch3[0..numPitchesPerChord] ++ ~ch4[0..numPitchesPerChord];
			~chord = ~chord + ~root;

			// Update sequencer
			if(~counter % 1 == 0) {
				~playSequencer.(~sequencer);
			};

			~counter = ~counter + 1;
			0.25.wait;
		};
	}).play(~tickClock);
}.fork;
)

~ch1[0..0]
( // Test for percussive sound when packets are received
{ var panWidth = 0.1;
	loop {
		exprand(1, 50).do{
			if(rrand(0.0, 1.0) > 0.9) {
				panWidth = rrand(0, 1.0);
			};
			Synth(\tick2,
				[
					\freq, ~s53.degreeToFreq(~chord.choose + 159, 0.midicps, 5).min(15000),
					\rq, exprand(0.0001, 0.1),
					\out, 0,
					\amp, rrand(0.001, 0.02),
					\atk, 0.000,
					\rel, rrand(0.01, 0.05), //0.01,
					\c1, -12,
					\pan, rrand(-1*panWidth, panWidth),
				]
			);
			100.reciprocal.wait;
		};
		0.3.wait;
	};
}.fork;
)
~root = 22