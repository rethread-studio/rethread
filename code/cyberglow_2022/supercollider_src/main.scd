
(
s.waitForBoot({
	var voice_path;

	~enable_ftrace = true;
	~enable_user = true;
	~enable_server = true;

	~whisper_amp = 1.5;
	~useAmbisonicsDecoder = false;
	~encoderType = \stereo;

	~ambisonicsOrder = 1; // Currently 1, 3 or 5 are supported
	switch(~encoderType,
		\ambisonic, {
			~mixerChannelOutputs = (~ambisonicsOrder+1).pow(2);
		},
		\stereo, {
			~mixerChannelOutputs = 2;
		},
		\separate, {
			~mixerChannelOutputs = 1;
			~separateChannelOutputsNext = ~mixerChannelOutputs * 4; // we want NORTH, EAST, SOUTH and WEST on the same channel always
			~northChannel = 0;
			~eastChannel = ~mixerChannelOutputs;
			~southChannel = ~mixerChannelOutputs * 2;
			~westChannel = ~mixerChannelOutputs * 3;
	});
	~firstOutputBus = 0;
	~decoderBus = Bus.audio(s, ~mixerChannelOutputs);
	// Ambisonics positioning parameters
	~azimuthPosition = -0.45; // The start position, and later on current position for the next device
	~azimuthStep = (0.5 * pi);
	~elevationPosition = 0.0;
	~elevationStep = 0.0;
	~fixedAzimuthPositions = Dictionary[];
	[\NORTH, \EAST, \SOUTH, \WEST].do { |symbol, i|
		~fixedAzimuthPositions.put(symbol, ~azimuthPosition);
		~azimuthPosition = ~azimuthPosition + ~azimuthStep;
		if(~azimuthPosition > pi) {
			~azimuthPosition = ~azimuthPosition - 2pi;
		};
		if(~azimuthPosition < -pi) {
			~azimuthPosition = ~azimuthPosition + 2pi;
		};
	};

	"synthdefs.scd".loadRelative;
	s.sync;
	"transitions.scd".loadRelative;

	~rootFreq = 60.midicps;
	~s53 = Scale.chromatic('et53');
	~clock = TempoClock(1, queueSize: 8192);

	// What latency in seconds to use for scheduling playback on the server
	// If you get "late ..." messages, increase this number'
	~latency = 0.5;
	~nv = 0.1; // smallest note value for scheduling quantisation
	~mainBus = Bus.audio(s, 2);
	~main_glitch = Synth(\main_out_glitch, [\in, ~mainBus, \out, 0]);
	~revBus = Bus.audio(s, 2);
	~rev = Synth(\medium_reverb, [\in, ~revBus, \mix, 0.10, \out, ~mainBus]);
	~tapeBus = Bus.audio(s, 2);
	~tape = Synth(\tape_dist, [\in, ~tapeBus, \mix, 0.15, \out, ~revBus]);


	"harmony.scd".loadRelative;

	"ftrace_processes.scd".loadRelative;



	~makeMixerChannel = { | name, out, amp = 1, gain = 1 |
		var bus, synth, reverb_synth, reverb_bus, group, azimuth, elevation, reverb_mix = 0.25, pitch_offset = 0;
		bus = Bus.audio(s, ~mixerChannelOutputs);
		// reverb_bus = Bus.audio(s, 2);
		group = Group(s);
		azimuth = ~fixedAzimuthPositions.at(name.asSymbol);
		if(azimuth == nil, {
			azimuth = ~azimuthPosition;
			~azimuthPosition = ~azimuthPosition + ~azimuthStep;
			if(~azimuthPosition > pi) {
				~azimuthPosition = ~azimuthPosition - 2pi;
			};
			if(~azimuthPosition < -pi) {
				~azimuthPosition = ~azimuthPosition + 2pi;
			};
		});

		switch(name.asSymbol,
			\NORTH, { pitch_offset = 31 }, // 31
			\SOUTH,  { pitch_offset = 0 }, // 0
			\EAST, { pitch_offset = 9 }, // 9
			\WEST, { pitch_offset = -31 }, // -31
		);
		elevation = ~elevationPosition;
		~elevationPosition = ~elevationPosition + ~elevationStep;
		switch(~encoderType,
			\ambisonic, {
				synth = Synth(\mixer_channel, [\in, bus, \out, out, \azimuth, azimuth, \elevation, elevation], group, \addToTail);
			},
			\stereo, {
				synth = Synth(\mixer_channel, [\in, bus, \out, out, \amp, amp * gain], group, \addToTail);
			},
			\separate, {
				~mixerChannelOutputs = 2;
				~separateChannelOutputsNext = ~mixerChannelOutputs * 4; // we want NORTH, EAST, SOUTH and WEST on the same respective channels always
				~northChannel = 0;
				~eastChannel = ~mixerChannelOutputs;
				~southChannel = ~mixerChannelOutputs * 2;
				~westChannel = ~mixerChannelOutputs * 3;
				switch(name.asSymbol,
					\NORTH, { out = ~northChannel; },
					\EAST, { out = ~eastChannel; },
					\SOUTH, { out = ~southChannel; },
					\WEST, { out = ~westChannel; },
					{
						out = ~separateChannelOutputsNext;
						~separateChannelOutputsNext = ~separateChannelOutputsNext + ~mixerChannelOutputs;
					}
				);
				synth = Synth(\mixer_channel, [\in, bus, \out, out, \amp, amp * gain], group, \addToTail);
			}
		);
		// reverb_synth = Synth(\medium_reverb, [\out, bus, \in, reverb_bus, \mix, reverb_mix, \amp, 1.7, \damp, 0.45],
		// target: synth, addAction: \addBefore);
		(
			my_synth: synth,
			// my_reverb_synth: reverb_synth,
			my_group: group,
			my_amp: amp, // amp can be used to fade and for effects
			my_gain: gain, // gain should be set depending on the material being played and not used for effects
			my_send_amp: 0.0,
			activity_level: 0,
			activity_level_peak: 0,
			activity_level_slow: 0,
			pitch_offset: pitch_offset,
			reverb_mix: reverb_mix,
			auto_reverb_min: 0.0,
			auto_reverb_max: 1.0,
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

			reverbActivityToggle: true,

			bus: bus,
			reverb_bus: reverb_bus,
			name: name,
			my_clock: TempoClock(1, queueSize: 8192),
			set_amp: {|self, amp|
				self.my_amp = amp;
				self.my_synth.set(\amp, amp * self.my_gain);
			},
			set_gain: {|self, gain|
				self.my_gain = gain;
				self.my_synth.set(\amp, self.my_amp * self.my_gain);
			},
			set_lpf_freq: {|self, freq|
				self.my_lpf_freq = freq;
				self.my_synth.set(\lpf_freq, freq);
			},
			set_lag_time: {|self, lag_time|
				self.my_synth.set(\lag_time, lag_time);
			},
			enable_lpf: { |self, enable = true|
				self.my_synth.set(\enable_lpf, enable.asInteger);
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
					gui.rev_mix_slider.valueAction = self.reverb_mix;
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
							\amp, rrand(0.001, 0.02) * ~activity_tick_amp,
							\atk, 0.001,
							\rel, rrand(0.01, 0.05), //0.01,
							\c1, -12,
							\pan, 0,
						]
					);
				});

				self.activity_level_peak = self.activity_level_peak * 0.8;

				self.activity_level_slow = (self.activity_level_slow * 0.9) + (self.activity_level_peak * 0.1);

				if(self.reverbActivityToggle, {
					var rev_width = self.auto_reverb_max - self.auto_reverb_min;
					self.set_reverb_mix(self.auto_reverb_min + (self.activity_level_slow.pow(1.5) * rev_width));
				});
			},
		)
	};

	~channels = Environment(know: true);

	~channels.user_whispers = ~makeMixerChannel.("whisper", ~mainBus);
	~channels.user_ambient = ~makeMixerChannel.("ambient", ~mainBus);
	~channels.beep = ~makeMixerChannel.("beep", ~revBus);
	~channels.tick = ~makeMixerChannel.("tick", ~revBus);
	~channels.noise = ~makeMixerChannel.("noise", ~mainBus);
	~channels.user_gestures = ~makeMixerChannel.("user_gestures", ~revBus);
	~channels.server_gestures = ~makeMixerChannel.("server_gestures", ~revBus);

	~fade_channels = [
		~channels.user_whispers,
		~channels.beep,
		~channels.tick,
		~channels.noise,
		~channels.user_gestures,
		~channels.server_gestures
	];



	// Load buffers with voice recordings of services
	voice_path = "./sounds/".resolveRelative;


	~voiceBuffers = Environment(know: true);
	~voiceBuffers.answer = Buffer.readChannel(s, voice_path ++ "answer.wav", 0, -1, [0]);
	~voiceBuffers.click = Buffer.readChannel(s, voice_path ++ "click.wav", 0, -1, [0]);
	~voiceBuffers.emote = Buffer.readChannel(s, voice_path ++ "emote.wav", 0, -1, [0]);
	~voiceBuffers.enter_answer = Buffer.readChannel(s, voice_path ++ "enter_answer.wav", 0, -1, [0]);
	~voiceBuffers.exit_answer = Buffer.readChannel(s, voice_path ++ "exit_answer.wav", 0, -1, [0]);
	~voiceBuffers.leave = Buffer.readChannel(s, voice_path ++ "leave.wav", 0, -1, [0]);
	~voiceBuffers.move = Buffer.readChannel(s, voice_path ++ "move.wav", 0, -1, [0]);
	~voiceBuffers.new = Buffer.readChannel(s, voice_path ++ "new.wav", 0, -1, [0]);
	~voiceBuffers.play = Buffer.readChannel(s, voice_path ++ "play.wav", 0, -1, [0]);
	~voiceBuffers.start = Buffer.readChannel(s, voice_path ++ "start.wav", 0, -1, [0]);
	~voiceBuffers.user_answer = Buffer.readChannel(s, voice_path ++ "user_answer.wav", 0, -1, [0]);


	~user_whisper = { | action, channel |
		var buf = nil;
		switch(action,
			\answer, { buf = ~voiceBuffers.answer },
			\click, { buf = ~voiceBuffers.click },
			\emote, { buf = ~voiceBuffers.emote },
			\enterAnswer, { buf = ~voiceBuffers.enter_answer },
			\exitAnswer, { buf = ~voiceBuffers.exit_answer },
			\leave, { buf = ~voiceBuffers.leave },
			\move, { buf = ~voiceBuffers.move },
			\new, { buf = ~voiceBuffers.new },
			\play, { buf = ~voiceBuffers.play },
			\start, { buf = ~voiceBuffers.start },
			\user_answer, { buf = ~voiceBuffers.user_answer },
		);
		if (buf != nil, {
			channel.play_on(\service_voice, [\buf, buf, \amp, ~whisper_amp, \out, channel.bus]);
		});y
	};

	~changeChordAction = {
		~ambient_reverb.release;
		~ambient_reverb = Synth(\ambient_reverb, [\in, ~ambientBus, \out, 0], target: ~main_glitch, addAction: \addBefore);
		("change chord action").postln;
	};

	"gestures.scd".loadRelative;
	"osc.scd".loadRelative;
	"channel_auto_fader.scd".loadRelative;
	"presets.scd".loadRelative;

	~start_tick_process.();
	~start_beep_process.();
	~start_auto_fade.();
	/*~enable_ftrace = false;
	~enable_user = false;
	~enable_server = false;*/

});
)
~start_auto_fade.()
~stop_auto_fade.()

~autoChangePreset.()

{~presets.choose.() }.fork;

(
// "slow down" == go darker and slower
var lead_up_time = 6, cresc_time = 2;

{
	// high pitch
	{
		var sig = SinOsc.ar([3500, 3520], mul: 0.1);
		sig = sig * Env([0, 1.0, 0], [lead_up_time, 0.001]).ar(2);
		sig
	}.play;

	// mid freq noisy tone
	(lead_up_time - cresc_time).wait;
	~cresc = Synth(\windy, [\freq, 100, \out, ~revBus, \amp, 0.7, \atk, cresc_time, \curve_atk, 7, \rel, 0]);

	cresc_time.wait;
	~cresc.release;
	Synth(\tick3, [\freq, 8000, \out, ~revBus, \amp, 0.25]);
	Synth(\tick3, [\freq, 12000, \out, ~revBus, \amp, 0.25]);
	// new settings:
	~ftrace_noise_freq_ratio = 0.1;
	~freq_ratio = 0.5;
	// low pitch rumble
	~lowRumble = Synth(\windy, [\freq, 15, \out, ~lowBus, \amp, 0.2, \atk, 0.0, \rel, 5]);
	// lower pitch
	{
		var sig = SinOsc.ar([3500, 3520]*0.25, mul: 0.125);
		sig = sig * Env([0.5, 0], [2]).ar(2);
		Out.ar(~revBus.index, sig);
	}.play;
	0.5.wait;
	~lowRumble.release;
}.fork;
)

~enable_ftrace = true;
~enable_user = false;
~enable_server = false;

(
~ftrace_noise_freq_ratio = 1;
~freq_ratio = 1.0;
)


~voiceBuffers.click.play
~channels.user_whispers.play_on(\service_voice, [\buf, ~voiceBuffers.click, \amp, ~whisper_amp, \out, ~channels.user_whispers.bus]);

~start_tick_process.()
~stop_tick_process.()
~start_beep_process.();
~stop_beep_process.()

(
{
	~main_glitch.set(\lag_time, 5);
	~main_glitch.set(\enable_pitch_shift, 1);
	~main_glitch.set(\pitch_shift_ratio, 3);
	~main_glitch.set(\pitch_dispersion, 1);
	3.wait;
	~cresc = Synth(\windy, [\freq, 200, \out, ~revBus, \amp, 0.7, \atk, 2, \curve_atk, 7, \rel, 0]);
	2.wait;
	~cresc.release;
	~main_glitch.set(\lag_time, 0.2);
	~main_glitch.set(\enable_pitch_shift, 0);
	~main_glitch.set(\pitch_shift_ratio, 1.0);
	~main_glitch.set(\pitch_dispersion, 0);
	{
		var sig = SinOsc.ar({LFNoise2.kr(8).range(3500, 3540)}!2/20, mul: 0.125*0.5);
		sig = sig * Env([0.5, 0], [5]).ar(2);
		Out.ar(~revBus.index, sig);
	}.play;
}.fork;
)
~lowRumble.release
~main_glitch.set(\lag_time, 5)
~main_glitch.set(\enable_pitch_shift, 1)
~main_glitch.set(\pitch_shift_ratio, 0.5)
~main_glitch.set(\enable_bit_crush, 1)
~main_glitch.set(\sample_rate, 1000)

{~random_non_transition.();}.fork