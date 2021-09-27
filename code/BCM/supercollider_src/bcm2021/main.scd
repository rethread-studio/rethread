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
//////////////////////////////////////////////////////
/////// GLOBAL COMPOSITIONAL CHANGES
/////////////////////////////////////////////////////
~h2chordOctaves = 2;
~attackSmear = 0.0;
~tickClock.tempo = ~tickClock.tempo*0.5;
)

(
//// RUN THIS BLOCK TO START EVERYTHING

//////////////////////////////////////////////////////
/////// CONSTANTS AND SETUP
/////////////////////////////////////////////////////

// Routing and mixer channels
~useAmbisonics = false; // Set to false to use a simple stereo output

~controlPositionWithMouse = false; // If the mouse position will infulence ambisonics positioning
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
~azimuthStep = (0.5 * pi);
~elevationPosition = 0.0;
~elevationStep = 0.0;


// Sonification activity thresholds
~highActivityThreshold = 20;
~mediumActivityThreshold = 10;
~lowActivityThreshold = 1;

// What latency in seconds to use for scheduling playback on the server
// If you get "late ..." messages, increase this number'
~latency = 0.5;

// default values
~h2chordOctaves = 2;
~attackSmear = 0.0;

"../sound_forest_mixer_gui.scd".loadRelative;
"device_gui.scd".loadRelative;

"synthdefs.scd".loadRelative; // LOAD SYNTHDEFS

"direct_sonification.scd".loadRelative;
"sonify_service.scd".loadRelative;
"sonify_len.scd".loadRelative;

// CmdPeriod.removeAll; // Reset the CmdPeriod functions

// HARMONY init
"harmonic_change1.scd".loadRelative;
"harmonic_change2.scd".loadRelative;
~harmonyVersion = 2;

~changeHarmonicFramework = { | version |
	~harmonyVersion = version;
	switch(version,
		1, {
			~initHarmony1.();
		},
		2, {
			~initHarmony2.();
		}
	);
};
~changeHarmonicFramework.(~harmonyVersion);

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
		var bus, synth, reverb_synth, reverb_bus, group, azimuth, elevation, reverb_mix = 0.25;
		bus = Bus.audio(s, ~mixerChannelOutputs);
		reverb_bus = Bus.audio(s, 2);
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
		reverb_synth = Synth(\medium_reverb, [\out, bus, \in, reverb_bus, \mix, reverb_mix, \amp, 2.0],
			target: synth, addAction: \addBefore);
		(
			my_synth: synth,
			my_reverb_synth: reverb_synth,
			my_group: group,
			my_amp: amp,
			my_send_amp: 0.0,
			activity_level: 0,
			activity_level_peak: 0,
			reverb_mix: reverb_mix,
			azimuth: azimuth,
			elevation: elevation,
			// Hover spat movement
			hover_vel: [0.0, 0.0], // [relative_azimuth, relative_elevation]
			hover_pos: [0.0, 0.0],
			hover_acc: [0.0, 0.0],
			hover_ticks_since_random: 0,
			azimuth_rotation: 0.0,
			azimuth_rotation_step: 0.0,
			azimuth_rotate: false,
			activity_elevation: 0.0,
			// Toggles for how to sonify the device
			sonifyInstantlyToggle: true, // sonify right away
			sonifyServicesToneToggle: true,
			sonifyServicesWhisperToggle: true,
			sonifyLengthToggle: true,
			sonifyActivityTickToggle: true,

			spatHoverToggle: true,
			spatElevationActivityToggle: false,

			bus: bus,
			reverb_bus: reverb_bus,
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
			set_reverb_mix: { |self, level|
				self.reverb_mix = level;
				self.my_reverb_synth.set(\mix, level);
			},
			set_activity: {|self, activity|
				self.activity_level = activity;
				self.my_synth.set(\activity, activity);
				if(activity > self.activity_level_peak, {
					self.activity_level_peak = activity;
				});
			},
			spat_rotate: {|self, length |
				// Convert length to rotation per update tick
				self.azimuth_rotation_step = (2*pi)/(length*100);
				self.azimuth_rotate = true;
			},
			// Use play on to make sure that the
			play_on: {|self, synth_name, args, extra_latency = 0 |
				// s.makeBundle(~latency, {Synth(synth_name, args, self.my_group)} );
				self.my_clock.sched(~latency + extra_latency, Synth(synth_name, args, self.my_group, addAction: \addToHead));
			},

			// Update spatial effects, combine their results and apply them to the synth
			update_spat: {|self|
				var random_hover_point,
				activity_spat_fx = self.activity_level * 0.7 + 0.3 // how dramatic the effects on spatialisation will be
				;
				// Hover (movement towards randomised points)
				// Every x ticks a new random position is chosen and used to calculate an acceleration vector.
				// Acceleration changes velocity which creates a smooth change.
				if(self.spatHoverToggle, {
					if(self.hover_ticks_since_random > 3, {
						var acc_mag;
						self.hover_ticks_since_random = 0;
						random_hover_point = [rrand(-0.3, 0.3), rrand(-0.1, 0.1)];
						self.hover_acc = [random_hover_point[0]-self.hover_pos[0], random_hover_point[1]-self.hover_pos[1]];
						// normalize the vector; doesn't make sense since the azimuth and elevation aren't the same scale
						/*acc_mag = sqrt(self.hover_acc[0].pow(2) + self.hover_acc[1].pow(2));
						self.hover_acc = [self.hover_acc[0]/acc_mag, self.hover_acc[1]/acc_mag];*/
					}, {
						self.hover_ticks_since_random = self.hover_ticks_since_random + 1;
					});
					self.hover_vel[0] = self.hover_vel[0] + (self.hover_acc[0] * 0.001);
					self.hover_vel[1] = self.hover_vel[1] + (self.hover_acc[1] * 0.001);
					// TODO: Limit velocity
					self.hover_vel[0] = max(min(self.hover_vel[0], 0.15), -0.15);
					self.hover_vel[1] = max(min(self.hover_vel[1], 0.05), -0.05);

					self.hover_pos[0] = self.hover_pos[0] + (self.hover_vel[0] * activity_spat_fx);
					self.hover_pos[1] = self.hover_pos[1] + (self.hover_vel[1] * activity_spat_fx);
					// Limit hover_pos to reasonable positions
					self.hover_pos[0] = max(min(self.hover_pos[0], 0.5), -0.5);
					self.hover_pos[1] = max(min(self.hover_pos[1], pi*0.125), pi * (-0.125));
					// ("a: " + self.hover_pos[0] + " e: " + self.hover_pos[1]).postln;
				}, {
					self.hover_pos[0] = 0.0;
					self.hover_pos[1] = 0.0;
				});

				// spatial rotation
				if(self.azimuth_rotate, {
					self.azimuth_rotation = self.azimuth_rotation + self.azimuth_rotation_step;
					if(self.azimuth_rotation > (pi*2)
						|| (self.azimuth_rotation < (pi*(-2))), {
						self.azimuth_rotate = false;
						self.azimuth_rotation = 0.0;
					});
				});

				// elevation based on activity level
				if(self.spatElevationActivityToggle, {
					self.activity_elevation = self.activity_level * pi * 0.5;
				}, {
					self.activity_elevation = 0.0;
				});

				self.my_synth.set(\azimuth, self.azimuth + self.azimuth_rotation + self.hover_pos[0]);
				self.my_synth.set(\elevation, self.elevation + self.hover_pos[1] + self.activity_elevation);
			},
			update_gui: { |self, gui|
				{
					gui.spat_text_azimuth.string = "azimuth: " + (self.azimuth + self.azimuth_rotation + self.hover_pos[0]).round(0.001);
					gui.spat_text_elevation.string = "elevation: " + (self.elevation + self.hover_pos[1] + self.activity_elevation).round(0.001);
				}.defer;
			},
			update_first: { |self|
				if(self.sonifyActivityTickToggle, {
					// ("activity: " + self.activity_level_peak).postln;
					self.play_on(\tick2,
						[
							\freq, self.activity_level_peak * 3000 + 4000,
							\rq, exprand(0.0001, 0.1),
							\out, self.reverb_bus,
							\amp, rrand(0.001, 0.02),
							\atk, 0.000,
							\rel, rrand(0.01, 0.05), //0.01,
							\c1, -12,
							\pan, 0,
						]
					);
				});
				self.activity_level_peak = self.activity_level_peak * 0.8;
			},
		)
	};

	~decoder = Synth(\decoder, [\in, ~decoderBus, \out, ~firstOutputBus]);

	~channels = Environment(know: true);
	// Set up all the channels
/*	~channels.rev_channel = ~makeMixerChannel.("Reverb", ~decoderBus);
	~channels.rev_channel.play_on(\medium_reverb, [\out, ~channels.rev_channel.bus, \in, ~channels.rev_channel.bus, \mix, 1.0, \amp, 2.0]);
	~channels.rev_channel.set_amp(0.3);*/
	/*~channels.sub_channel = ~makeMixerChannel.("Sub", ~decoderBus);
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
	~channels.youtube_channel.set_send(~channels.rev_channel.bus, 1.0);*/
/*	~channels.tick_channel = ~makeMixerChannel.("Tick", ~decoderBus);
	~channels.tick_channel.set_send(~channels.rev_channel.bus, 1.0);*/
	// ~channels.tick_channel.set_amp(0.0);

/*	{
		~makeSoundForestGui.([~channels.tick_channel, ~channels.rev_channel], ~allClouds);
	}.defer;*/

	// Create the global stats object (environment)
	// Stats are structured in the following hierarchy:
	// ~stats => device(local_ip) => service(remote) -> packets[/in], packets[\out]
	// Each service is given a sound process with sounds for different levels of activity.
	~stats = Dictionary[];
	~device_guis = Dictionary[];

	~makeStatDevice = { | device |
		var statDevice = ();
		statDevice.services = ();
		statDevice.my_symbol = device;
		statDevice.channel = ~makeMixerChannel.(device.asString, ~decoderBus);
		// statDevice.channel.set_send(~channels.rev_channel.bus, 1.0);
		{
			~device_guis.put(device, ~makeDeviceGui.(device, statDevice.channel));
		}.defer;
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
		service.soundType = soundType;
		service.tick = { | self, channel |
			~playSound.(self.soundType, \in, self.packets[\in], channel);
			~playSound.(self.soundType, \out, self.packets[\out], channel);
		};
	};

	// "sequencer.scd".loadRelative; // LOAD AND INIT SEQUENCER


	//////////////////////////////////////////////////////
	/////// SYNTH INSTANTIATION
	/////////////////////////////////////////////////////

	// Play a certain sound based on a number of parameters
	~playSound = { | type, inout, packets, channel |
		var activity = \none;
		if(packets > ~highActivityThreshold, {
			activity = \high;
		}, {
			if(packets > ~mediumActivityThreshold, {
				activity = \medium;
			}, {
				if(packets > ~lowActivityThreshold, {
					activity = \low;
				});
			});
		});
		if(activity != \none) {
			~sonify_service.(type, activity, channel);
		};
	};

	s.sync();


	//////////////////////////////////////////////////////
	/////// OSC PACKET PARSING
	/////////////////////////////////////////////////////

	// Receive OSC packets on web traffic
	~num_packets = 0;
	~numPacketsThisTick = 0;
	~packet_density = 0;
	~vis_sender = NetAddr("127.0.0.1", 9771);
	~packetRecPanWidth = 0;
	~len_per_device = Dictionary[];
	~lengths = List[];
	~ipPackets = Dictionary[];
	// Receive packages of web traffic data
	o = OSCFunc({ arg msg, time, addr, recvPort;
		var timestamp = msg[1],
		local_ip = msg[2],
		remote_ip = msg[3],
		out = msg[4],
		local_location = msg[5],
		remote_location = msg[6],
		len = msg[7].asFloat, // size of the packet
		protocol = msg[8],
		services = msg[9],
		device = msg[10], // the name of the device/raspberry pi
		local_mac = msg[11],

		freq, ip_parts, rel = 0.0, len_list,
		ignore = false; // if the packet should be ignored

		// Temporary hack to ignore the packets being sent to myself for the piece
		if(remote_ip == "130.229.150.112".asSymbol) {
			ignore = true;
		};

		if(ignore == false) {

			~lengths.add(len); // save all lengths to have a look at the distribution
			len_list = ~len_per_device.at(device);
			if(len_list == nil, { len_list = List[] });
			len_list.add(len);
			~len_per_device.put(device, len_list);

			if(services.asString == "") {
				var numPrevPackets = ~ipPackets.at(remote_ip);
				if(numPrevPackets == nil, {numPrevPackets = 0 });
				~ipPackets[remote_ip] = numPrevPackets + 1;
				services = remote_ip;
			};
			// Some packets aren't interesting, such as communication with the router
			if(local_ip != "192.168.0.1".asSymbol && (local_ip != "192.168.0.255".asSymbol)) {
				// [msg, time, addr, recvPort].postln;
				// Convert out to a boolean
				if(out == \true, { out = true }, { out = false });

				// Extract all the integers from the remote_ip
				// ip_parts = remote_ip.asString.split($.).collect{ |num| num.asInteger};
				// services.postln;

				~addPacketToStats.(device, out, services, remote_ip, remote_location);
			};

			// msg.postln;
			if(rrand(0.0, 1.0) > 0.9) {
				~packetRecPanWidth = rrand(0, 1.0);
			};
			if(rrand(0.0, 1.0) > 0.995) {
				rel = rrand(0.2, 1.0);
			};

			if(~stats[device].channel.sonifyInstantlyToggle, {
				~sonify_instantly.(len, out, services, device);
			});
			// Percussive sound when a packet is received
			/*if(~overallActivity < (~maxActivity * 0.5)) {
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
			};*/
			~num_packets = ~num_packets + 1;
			~numPacketsThisTick = ~numPacketsThisTick + 1;
			// ("num packets: " + ~num_packets).postln;
		};
	}, '/package', nil, 57130); // create the OSCFunc


	//////////////////////////////////////////////////////
	/////// SOUND PROCESS AND ANALYSIS UPDATE LOOP
	/////////////////////////////////////////////////////

	// An update loop plays sounds according to the stats collected and the waits
	~tickClock = TempoClock(100/60);
	~overallActivity = 0;
	~maxActivity = 60;
	~baseRoot = 17;
	~root = ~baseRoot;
	~tickAmp = 0.5;
	~tickAmpTarget = 1.0;
	~tickAmpStepsLeft = 120;
	~tickAmpStep = (~tickAmpTarget - ~tickAmp) / ~tickAmpStepsLeft;
	~counter = 0;
	~randomizeTiming = false;
	s.sync();
	Routine({
		loop {
			var allDevices = ~stats.values,
			numInPackets = 0, numOutPackets = 0,
			numPitchesPerChord, root;

			if(~numPacketsThisTick > 100, {
				~randomizeTiming = true;
			}, {
				~randomizeTiming = false;
			});

			allDevices.do { |statDevice|
				var allServices = statDevice.services.values, totalPacketsForDevice = 0, gui;
				allServices.do { | service |
					if((service.packets[\in] + service.packets[\out]) > 0, {
						service.tick(statDevice.channel);
						numInPackets = numInPackets + service.packets[\in];
						numOutPackets = numOutPackets + service.packets[\out];
						totalPacketsForDevice = totalPacketsForDevice + service.packets[\in];
						totalPacketsForDevice = totalPacketsForDevice + service.packets[\out];
						service.packets[\in] = 0;
						service.packets[\out] = 0;
					});
				};
				statDevice.channel.set_activity((totalPacketsForDevice/~maxActivity).min(1.0));
				// statDevice.channel.update_spat();
				statDevice.channel.update_first();
				// Update values in the gui e.g. spatialisation
				gui = ~device_guis.at(statDevice.my_symbol);
				if(gui != nil, {
					statDevice.channel.update_gui(gui);
				});
			};

			// ("~numPacketsThisTick: " + ~numPacketsThisTick).postln;

			// Sonify the size of the packets (the "len")
			~len_per_device.keysValuesDo{|device, len_list|
				~sonify_len.(len_list.maxItem, device);
				/*if(len_list.size > 1, {
				~sonify_len.(len_list.maxItem, device);
				});
				if(len_list.size > 4, {
				~sonify_len.(len_list.mean, device);
				});*/
			};
			~len_per_device.clear;

			if(~tickAmpStepsLeft <= 0) {
				~tickAmpStepsLeft = rrand(30, 240);
				~tickAmpTarget = exprand(0.05, 1.0);
				~tickAmpStep = (~tickAmpTarget - ~tickAmp) / ~tickAmpStepsLeft;
			};
			~tickAmp = ~tickAmp + ~tickAmpStep;
			~tickAmpStepsLeft = ~tickAmpStepsLeft - 1;


			~overallActivity = ~overallActivity * 0.99 + ((numInPackets + numOutPackets) * 0.01);

			switch(~harmonyVersion,
				1, { ~updateHarmony1.(~overallActivity) },
				2, { ~updateHarmony2.(~overallActivity) }
			);

			// Update sequencer
			if(~counter % 1 == 0) {
				~playSequencer.(~sequencer);
			};

			~numPacketsThisTick = 0;

			~counter = ~counter + 1;

			0.25.wait;
		};
	}).play(~tickClock);

	// channel update for spatialization etc
	Routine({
		loop {
			~stats.do{|device|
				device.channel.update_spat();
			};
			0.05.yield;
		}
	}).play();
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
~sonify_instantly.(10, true, \Google, 1);
~tickClock.tempo = ~tickClock.tempo*0.5