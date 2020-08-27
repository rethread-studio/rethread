( // For setting up the server on Mac using MADIface XT
s.options.device = "MADIface XT (23757085)";
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
~controlPositionWithMouse = true; // If the mouse position will infulence ambisonics positioning
// If ~positionThroughService is true, positioning is based on what service something comes from instead of what device
~positionThroughService = true;
~ambisonicsOrder = 3; // Currently 1, 3 or 5 are supported
if(~useAmbisonics == true, {
	~mixerChannelOutputs = (~ambisonicsOrder+1).pow(2);
}, {
	~mixerChannelOutputs = 2;
});
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

//////////////////////////////////////////////////////
/////// SYNTHDEFS
/////////////////////////////////////////////////////

SynthDef(\bubbly_filter, { |out|
	var sig, maxfreq = \maxfreq.kr(2000), minfreq = \minfreq.kr(100), speed = \speed.kr(3), freq, in, delay_pan;
	speed = LFNoise1.kr(2).range(5, 12);
	freq = SinOsc.ar(speed).range(minfreq, maxfreq);
	in = In.ar(\in.kr(10), 2);
	// sig = RLPF.ar(in, freq, 0.1);
	sig = BMoog.ar(in, freq, 0.1, 0.0, 0.95);
	sig = sig + (LocalIn.ar(2).mirror * 0.7);
	delay_pan = LFNoise1.ar(LFNoise1.kr(0.1).range(0.1, 0.5)).range(-0.001, 0.001);
	sig = [DelayL.ar(sig[0], 0.1, delay_pan.max(0)), DelayL.ar(sig[1], 0.1, (delay_pan * -1).max(0))];
	LocalOut.ar(sig);
	Out.ar(out, sig * \amp.kr(0.5));
}).add;

SynthDef(\long_sine, {
	var sig, env, freq = \freq.kr(220);

	env = Env.sine(\length.kr(5)).kr(2);
	sig = SinOsc.ar(freq) * \amp.kr(0.2) * env * 0.1;
	sig = Pan2.ar(sig, \pan.kr(0));

	Out.ar(\out.kr(0), sig);
}).add;
SynthDef(\tick2, {
	var sig, env, rq = \rq.kr(0.1);
	env = Env.perc(\atk.kr(0), \rel.kr(0.05)).ar(2);
	sig = Impulse.ar(0);
	sig = sig * 0.5;
	// high freq and rq values causes the filter to blow up violently
	sig = RHPF.ar(sig, \freq.kr(1000).min(18000).max(20), rq.min(5)) * env;
	sig = Pan2.ar(sig, \pan.kr(0)) * \amp.kr(1.0) * 10;
	sig = sig.tanh; // Should never happen, but better to soft clip
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\sub_tam, {
	// FM synth for a sub bass type sound rev_channel.buswith some noise on top
	var freq = \freq.kr(32), sig, env, sig1, sig2, sig3,
	mod1_1, mRatio = \mRatio.kr(2), mod1_2, mod2_1, mod2_2,
	mod2_1_ratio = 16*6, mod2_2_ratio = SinOsc.ar(freq*Rand(10, 14)).range(1, 16*8) *4,
	feedback, atk = \atk.kr(05), rel = \rel.kr(5), brightnessRamp, lowcut;

	env = Env.perc(atk, rel, 1.0, [\c0.kr(2), \c1.kr(-4)]).ar(2);

	brightnessRamp = XLine.kr(0.1, 1, atk);

	feedback = LocalIn.ar(1);
	mod1_2 = SinOsc.ar(freq * 8 + feedback, mul: freq * mRatio);
	LocalOut.ar(mod1_2 * 0.1);
	mod1_1 = SinOsc.ar(freq * mRatio + mod1_2, mul: freq * mRatio * Line.kr(0.0, 1.0, atk/2));
	sig1 = SinOsc.ar(freq + mod1_1) * env;

	mod2_2 = SinOsc.ar(freq * mod2_2_ratio, mul: freq * mod2_2_ratio * brightnessRamp * freq);
	mod2_1 = SinOsc.ar(freq * mod2_1_ratio + mod2_2, mul: freq * mod2_1_ratio * brightnessRamp);
	sig2 = SinOsc.ar(freq * 16 + mod2_1) * env.pow(1.5) * XLine.kr(0.05, 0.4, atk+rel);

	sig = sig1 + sig2;
	sig = sig * \amp.kr(0.5);
	// sig = sig + (DPW3Tri.ar(freq*2) * 0.5 * env.pow(3));
	lowcut = brightnessRamp.pow(3);
	sig = (HPF.ar(sig, 100) * lowcut) + (sig * (1-lowcut));

	sig = Pan2.ar(sig, \pan.kr(0));
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\medium_reverb, { | out = 0, amp = 1, mix = 0.3  |
	var sig, wet;

	sig = In.ar(\in.kr(10), 2);
	mix = mix.lag(\mixLag.kr(10));

	wet = JPverb.ar(sig, 3.0, 0.9, 4.0, 0.8);
	wet = GVerb.ar(sig, 300, 103, 0.43, 0.51, 15, -5.dbamp, -26.dbamp, -20.dbamp);
	wet = Greyhole.ar(sig, \delayTime.kr(0.1), \damp.kr(0.7), \size.kr(1.0), \diff.kr(0.8), \feedback.kr(0.9));

	sig = (sig * (1-mix)) + (wet*mix);
	sig = Limiter.ar(sig, 0.95);
	Out.ar(out, sig);
}).add;

// Create different synthdefs for mixer_channels (incl. the encoder) and the decoder depending on the settings above.
if(~useAmbisonics, {
	SynthDef(\decoder, { | in = 10, out = 0 |
		var sig;
		sig = In.ar(in, ~mixerChannelOutputs.asInteger);
		if(~ambisonicsOrder == 1, {
			sig = KMHLSDome1h1pNormal6.ar(sig[0], sig[1], sig[2], sig[3], gain:-10);
		});
		if(~ambisonicsOrder == 3, {
			sig = KMHLSDome3h3pNormal6.ar(sig[0], sig[1], sig[2], sig[3], sig[4], sig[5], sig[6], sig[7],
				sig[8], sig[9], sig[10], sig[11], sig[12], sig[13], sig[14], sig[15], gain:-10);
		});
		if(~ambisonicsOrder == 5, {
			sig = KMHLSDome5h5pNormal6.ar(sig[0], sig[1], sig[2], sig[3], sig[4], sig[5], sig[6], sig[7],
				sig[8], sig[9], sig[10], sig[11], sig[12], sig[13], sig[14], sig[15],
				sig[16], sig[17], sig[18], sig[19], sig[20], sig[21], sig[22], sig[23],
				sig[24], sig[25], sig[26], sig[27], sig[28], sig[29], sig[30], sig[31],
				sig[32], sig[33], sig[34], sig[35], gain:-10);
		});
		Out.ar(out, sig);
	}).add;
	SynthDef(\mixer_channel, { | in = 10, out = 0 |
		var sig = In.ar(in, 2),
		// For the HOAEncoder* set of UGens, the azimuth is at the very left at pi/2 and the very right at -pi/2.
		// Going further moves us behind the origin.
		radius = \radius.kr(0.0), azimuth = \azimuth.kr(0.0), elevation = \elevation.kr(0), yes = \use_radius.kr(1.0);
		// radius = MouseY.kr(0.0, 1.0);
		if(~controlPositionWithMouse) {
			azimuth = azimuth + MouseX.kr(pi * 1, -pi * 1);
			elevation = elevation + MouseY.kr(pi * 0.5, 0);
		};
		sig = Mix(sig) * \amp.kr(0.5);
		if(~ambisonicsOrder == 1, {
			sig = HOAEncoder1.ar(
				sig,
				1.0,
				radius,
				azimuth,
				elevation,
				yes
			);
		});
		if(~ambisonicsOrder == 3, {
			sig = HOAEncoder3.ar(
				sig,
				1.0,
				radius,
				azimuth,
				elevation,
				yes
			);
		});
		if(~ambisonicsOrder == 5, {
			sig = HOAEncoder5.ar(
				sig,
				1.0,
				radius,
				azimuth,
				elevation,
				yes
			);
		});
		Out.ar(out, sig);
	}).add;
}, {
	// no ambisonics, just straight through as stereo
	SynthDef(\decoder, { |in = 10, out = 0 |
		var sig = In.ar(in, ~mixerChannelOutputs.asInteger);
		Out.ar(out, sig);
	}).add;

	SynthDef(\mixer_channel, { | in = 10, out = 0, send = 12, send_amp = 0 |
		var sig = In.ar(in, 2);
		sig = sig * \amp.kr(0.5);
		Out.ar(out, sig);
		Out.ar(send, sig * send_amp);
	}).add;
});

SynthDef(\reverse_sine, {
	var sig, env, freq = \freq.kr(220);

	env = Env.perc(\atk.kr(2), \rel.kr(0.1), curve: [\c0.kr(\cub), \c1.kr(\sine)]).kr(2);
	sig = SinOsc.ar(freq) * env;
	2.do { |i| var mult = i+2;
		sig = sig + SinOsc.ar(freq * mult * 1.01, // * LFNoise1.kr(7).range(0.98, 1.02),
			mul: env.pow(mult*mult));
	};

	sig = sig * 0.3 * \amp.kr(0.5);
	sig = Pan2.ar(sig, \pan.kr(0));

	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\reverse_saw, {
	var sig, env, freq = \freq.kr(220);

	env = Env.perc(\atk.kr(2), \rel.kr(0.1), curve: [\c0.kr(\cub), \c1.kr(\sine)]).kr(2);
	sig = Saw.ar(freq) * env;
	2.do { |i| var mult = i+2;
		sig = sig + Saw.ar(freq * mult * 1.01, // * LFNoise1.kr(7).range(0.98, 1.02),
			mul: env.pow(mult*mult));
	};

	sig = sig * 0.3 * \amp.kr(0.5);
	sig = Pan2.ar(sig, \pan.kr(0));

	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\reverse_google, {
	var sig, env, freq = \freq.kr(220);

	env = Env.perc(\atk.kr(2), \rel.kr(0.1), curve: [\c0.kr(\cub), \c1.kr(\sine)]).kr(2);
	sig = Pulse.ar(freq) * env;
	2.do { |i| var mult = i+2;
		sig = sig + DPW3Tri.ar(freq * mult * 1.01, // * LFNoise1.kr(7).range(0.98, 1.02),
			mul: env.pow(mult*mult));
	};

	sig = sig * 0.3 * \amp.kr(0.5) * LFSaw.ar(Rand(1.5, 3)).range(0.2, 1.0).lag(0.01);
	sig = Pan2.ar(sig, \pan.kr(0));

	Out.ar(\out.kr(0), sig);
}).add;


SynthDef(\thump, {
	var sig, env, freq = \freq.kr(220);
	env = Env.perc(\atk.kr(0.1), \rel.kr(2), curve: [\c0.kr(\cub), \c1.kr(\sine)]).kr(2);
	sig = Resonz.ar(PinkNoise.ar(mul: env.pow(100) * 20), freq, 0.007, mul: 20);
	sig = sig * \amp.kr(0.5);
	sig = Pan2.ar(sig, \pan.kr(0));
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\softy, {
	var sig, env, freq = \freq.kr(220);
	env = Env.perc(\atk.kr(0.1), \rel.kr(2), curve: [\c0.kr(\cub), \c1.kr(\sine)]).kr(2);
	sig = Resonz.ar(PinkNoise.ar(mul: env), freq, 0.007, mul: 20);
	sig = sig * \amp.kr(0.5);
	sig = Pan2.ar(sig, \pan.kr(0));
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\glitchy_rise, { | freq = 500, mRatio = 1, pan = 0, height = 2, atk = 0.1, rel = 1.1 |
	var sig, env, mod, modfreq;

	env = Env.perc(atk, rel, curve: [\c0.kr(2), \c1.kr(\sine)]).kr(2);

	modfreq = freq * Line.kr(1.0, height, atk + rel);
	mod = SinOsc.ar(modfreq * mRatio) * modfreq * mRatio;
	sig = Pulse.ar(min(max(modfreq + mod, 20), 20000)) * 0.07 * env;
	sig = sig + (Pulse.ar(freq) * 0.07 * env.pow(2));
	sig = Pan2.ar(sig, pan);
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\bounce_away, { | freq = 300 |
	var trig, sig, pan = \pan.kr(0);
	trig = Impulse.ar(Line.ar(Rand(3, 10), Rand(5, 20), 2));
	sig = Saw.ar([freq, freq * 8, Rand(freq * 8, freq*12).min(19000), Rand(freq*13, freq*14).min(19000)]) * 0.3 * Decay.ar(trig, Line.kr(0.03, 0.005, 2));
	sig = Mix(sig);
	sig = sig * Env.perc(\atk.kr(0.01), \rel.kr(2), curve: [\c0.kr(2), \c1.kr(\sine)]).kr(2);
	sig = Pan2.ar(sig, pan) * \amp.kr(0.5);
	Out.ar(\out.kr(0), sig);
}).add;


//////////////////////////////////////////////////////
/////// STARTING EVERYTHING
/////////////////////////////////////////////////////

{
	var filter_bus, filter, drone,
	drone_channel, cloud_channel, sine_channel, filter_channel, sub_channel,
	rain_channel, rev_channel, tick_channel,
	default_channel, google_channel, facebook_channel, amazon_channel, cloudflare_channel, youtube_channel;

	s.newBusAllocators; // Make sure we don't run out of busses if we restart multiple times

	~s53 = Scale.chromatic('et53'); // For decoding 53edo
	~ch1 = [0, 31, 57, 120, 43, 137];
	~ch2 = [17, 39, 53, 74, 137, 88];
	~ch3 = [31, 88, 163, 106, 120, 151];
	~ch4 = [43, 74, 106, 57, 163, 180];
	~chord = ~ch1 ++ ~ch2 ++ ~ch3 ++ ~ch4;
	~octave = 3;

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
		synth = Synth(\mixer_channel, [\in, bus, \out, out, \azimuth, azimuth, \elevation, elevation], group, \addToTail);
		(
			my_synth: synth,
			my_group: group,
			my_amp: amp,
			my_send_amp: 0.0,
			azimuth: azimuth,
			elevation: elevation,
			bus: bus,
			name: name,
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
			// Use play on to make sure that the
			play_on: {|self, synth_name, args|
				s.makeBundle(~latency, {Synth(synth_name, args, self.my_group)} );
			},
		)
	};

	~decoder = Synth(\decoder, [\in, ~decoderBus]);

	// Set up all the channels
	rev_channel = ~makeMixerChannel.("Reverb", ~decoderBus);
	rev_channel.play_on(\medium_reverb, [\out, rev_channel.bus, \in, rev_channel.bus, \mix, 1.0]);
	sub_channel = ~makeMixerChannel.("Sub", ~decoderBus);
	sub_channel.set_send(rev_channel.bus, 0.2);
	rain_channel = ~makeMixerChannel.("Rain", ~decoderBus);
	rain_channel.set_send(rev_channel.bus, 1.0);
	default_channel = ~makeMixerChannel.("Default", ~decoderBus);
	default_channel.set_send(rev_channel.bus, 1.0);
	google_channel = ~makeMixerChannel.("Google", ~decoderBus);
	google_channel.set_send(rev_channel.bus, 1.0);
	facebook_channel = ~makeMixerChannel.("Facebook", ~decoderBus);
	facebook_channel.set_send(rev_channel.bus, 1.0);
	amazon_channel = ~makeMixerChannel.("Amazon", ~decoderBus);
	amazon_channel.set_send(rev_channel.bus, 1.0);
	cloudflare_channel = ~makeMixerChannel.("Coudflare", ~decoderBus);
	cloudflare_channel.set_send(rev_channel.bus, 1.0);
	youtube_channel = ~makeMixerChannel.("YouTube", ~decoderBus);
	youtube_channel.set_send(rev_channel.bus, 1.0);
	tick_channel = ~makeMixerChannel.("Tick", ~decoderBus);
	tick_channel.set_send(rev_channel.bus, 1.0);
	tick_channel.set_amp(0.0);

	~makeSoundForestGui.([tick_channel, default_channel, google_channel, facebook_channel, amazon_channel, cloudflare_channel, youtube_channel, rev_channel], ~allClouds);

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
		var soundType = \standard;
		switch(service.identifier,
			\Google, { soundType = \Google },
			"Google,Youtube".asSymbol, { soundType = \YouTube},
			\Amazon, { soundType = \Amazon },
			"Slack,Amazon".asSymbol, { soundType = \Slack},
			\Facebook, { soundType = \Facebook },
			\Cloudflare, { soundType = \Cloudflare },
			"Github,Microsoft".asSymbol, { soundType = \GitHub }
		);
		service.soundType = soundType;
		if(inout == \in, {
			service.tick = { | self, channel |
				~playSound.(self.soundType, \in, self.packets[\in], channel);
			};
		}, {
			service.tick = { | self, channel |
				~playSound.(self.soundType, \out, self.packets[\out], channel);
			};
		});
	};


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
				\standard, {
					var freq = ~s53.degreeToFreq(~chord.choose, 0.midicps, ~octave),
					amp = 0.5,
					release_coeff = 1.0,
					thump_atk = rrand(0.18, 0.21);

					if(~positionThroughService) {
						channel = default_channel;
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
									\freqis, min(freq * 4, 18000),
									\rq, exprand(0.001, 0.1),
									\out, channel.bus,
									\amp, exprand(0.05, 0.2) * amp,
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
					var freq = ~s53.degreeToFreq(~chord.choose, 0.midicps, ~octave),
					amp = 0.5,
					release_coeff = 1.0;

					if(~positionThroughService) {
						channel = google_channel;
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
						"Google tick".postln;
						channel.play_on(\tick2,
							[
								\freqis, min(freq * 4, 18000),
								\rq, exprand(0.001, 0.1),
								\out, channel.bus,
								\amp, exprand(0.1, 0.5) * amp,
								\atk, 0.01 * release_coeff,
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
						channel = amazon_channel;
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
								\atk, rrand(1.0, 5.0) * release_coeff,
								\rel, rrand(0.1, 4 * release_coeff),
								\c0, rrand(1, 4),
								\c1, \sine,
								\pan, rrand(-0.7, 0.7),
								\amp, 0.05 * amp,
								\out, channel.bus]);
						});
					}, {
						"Amazon tick".postln;
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
						channel = cloudflare_channel;
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
							"Cloudflare tick".postln;
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
						channel = youtube_channel;
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
						channel.play_on(\bounce_away, [
							\freq, freq*2,
							\rel, 0.1,
							\atk, rrand(0.7, 1.0) * release_coeff,
							\c1, 2,
							\c0, \sine,
							\pan, rrand(-0.7, 0.7),
							\amp, 0.1 * amp,
							\out, channel.bus]);
					});
				},
				\Facebook, {
					var freq = ~s53.degreeToFreq(~chord.choose, 0.midicps, ~octave-2),
					amp = 0.5,
					release_coeff = 1.0,
					thump_atk = rrand(0.18, 0.21);

					if(~positionThroughService) {
						channel = facebook_channel;
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
							\pan, rrand(-0.7, 0.7),channel = default_channel;
							\amp, 0.05 * amp,
							\out, channel.bus]);
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
				}
			);

		};
	};


	//////////////////////////////////////////////////////
	/////// OSC PACKET PARSING
	/////////////////////////////////////////////////////

	// Receive OSC packets on web traffic
	~num_packets = 0;
	~packet_density = 0;
	~sub_tam_last_launch = Date.localtime.rawSeconds;
	~vis_sender = NetAddr("127.0.0.1", 9771);
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

		freq, ip_parts;

		// Some packets aren't interesting, such as communication with the router
		if(local_ip != "192.168.0.1".asSymbol && (local_ip != "192.168.0.255".asSymbol)) {
			// [msg, time, addr, recvPort].postln;
			// Convert out to a boolean
			if(out == \true, { out = true }, { out = false });

			// Extract all the integers from the remote_ip
			ip_parts = remote_ip.asString.split($.).collect{ |num| num.asInteger};

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
		Synth(\tick2,
			[
				\freq, ~s53.degreeToFreq(~chord.choose + 159, 0.midicps, 5).min(15000),
				\rq, exprand(0.001, 0.1),
				\out, 0,
				\amp, rrand(0.002, 0.01),
				\atk, 0.0001,
				\rel, 0.01, //0.01,
				\pan, rrand(-0.1, 0.1),
			]
		);
	}, '/package', nil, 57130); // create the OSCFunc


	//////////////////////////////////////////////////////
	/////// SOUND PROCESS AND ANALYSIS UPDATE LOOP
	/////////////////////////////////////////////////////

	// An update loop plays sounds according to the stats collected and the waits
	~tickClock = TempoClock(120/60);
	Routine({
		loop {
			var allDevices = ~stats.values,
			numInPackets = 0, numOutPackets = 0;

			allDevices.do { |statDevice|
				var allServices = statDevice.services.values;
				allServices.do { | service |
					service.tick(statDevice.channel);
					numInPackets = numInPackets + service.packets[\in];
					numOutPackets = numOutPackets + service.packets[\out];
					service.packets[\in] = 0;
					service.packets[\out] = 0;
				};
			};

			tick_channel.play_on(\tick2,
				[
					\freq, rrand(7000, 9000),
					\rq, exprand(0.001, 0.1),
					\out, tick_channel.bus,
					\amp, rrand(0.01, 0.05),
					\atk, 0.0,
					\rel, 0.01, //0.01,
					\pan, rrand(-0.1, 0.1),
				]
			);

			0.25.wait;
		};
	}).play(~tickClock);
}.value();
)

(
Synth(\tick2,
	[
		\freq, ~s53.degreeToFreq(~chord.choose + 159, 0.midicps, 5).min(15000),
		\rq, exprand(0.001, 0.1),
		\out, 0,
		\amp, rrand(0.005, 0.03),
		\atk, 0.0001,
		\rel, 0.01, //0.01,
		\pan, rrand(-0.1, 0.1),
	]
);
)