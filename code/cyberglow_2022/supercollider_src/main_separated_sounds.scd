// Use this to record different sounds on different channels e.g. whispers on one channel, beeps on another

(
s.newBusAllocators;
s.options.memSize = 1024*256;
s.waitForBoot({
	var voice_path;
	~enable_ftrace = true;
	~enable_user = true;
	~enable_ambient = true;
	~enable_server = true;

	~use_auto_fade = true;

	~whisper_amp = 2.5;
	~useAmbisonicsDecoder = false;
	~encoderType = \separate;

	~synthesis_mode = \active_mode;
	~ftrace_beep_dur = 0.08;

	~set_synthesis_mode = { | new_mode |
		("set_synthesis_mode: " + new_mode).postln;
		switch(new_mode,
			\active_mode, {
				~synthesis_mode = new_mode;
				~fade_channels = [
					~channels.user_whispers,
					~channels.beep,
					~channels.tick,
					~channels.noise,
					~channels.user_gestures,
					~channels.server_gestures
				];
				// ~channels.tick.set_amp(1);
				// ~channels.noise.set_amp(1);
				~ftrace_beep_dur = 0.08;
				~revSynths.do{|syn| syn.set(\mix, 0.1);};
				~delaySynths.do{|syn| syn.set(\enable_delay, 0);};
				~serverProcessingSynths.do{|syn| syn.set(\enable_delay, 0);};
				~mainGlitchSynths.do{|syn| syn.set(\lpf_freq, 12900);};
			},
			\soft_mode, {
				~synthesis_mode = new_mode;
				~fade_channels = [
					~channels.user_whispers,
					~channels.beep,
					~channels.user_gestures,
					~channels.server_gestures
				];
				~channels.tick.set_amp(1);
				~channels.noise.set_amp(1);
				~ftrace_beep_dur = 0.15;
				~revSynths.do{|syn| syn.set(\mix, 0.3)};
				~delaySynths.do{|syn| syn.set(\enable_delay, 1);};
				~serverProcessingSynths.do{|syn| syn.set(\enable_delay, 1);};
				~mainGlitchSynths.do{|syn| syn.set(\lpf_freq, 3000);};
			},
			{("tried to set invalid synthesis mode: \"" + new_mode + "\"").postln;}
		);
	};

	~ambisonicsOrder = 1; // Currently 1, 3 or 5 are supported
	switch(~encoderType,
		\ambisonic, {
			~mixerChannelOutputs = (~ambisonicsOrder+1).pow(2);
		},
		\stereo, {
			~mixerChannelOutputs = 2;
		},
		\quad, {
			~mixerChannelOutputs = 4;
		},
		\separate, {
			~mixerChannelOutputs = 2;
			~separateChannelOutputsNext = ~mixerChannelOutputs * 4; // we want NORTH, EAST, SOUTH and WEST on the same channel always
			~northChannel = 0;
			~eastChannel = ~mixerChannelOutputs;
			~southChannel = ~mixerChannelOutputs * 2;
			~westChannel = ~mixerChannelOutputs * 3;
	});
	~firstOutputBus = 0;
	~decoderBus = Bus.audio(s, ~mixerChannelOutputs);


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
	// if we record each sound by itself, we will want one glitch synth for each channel

	~revSynths = List[];
	~tapeSynths = List[];
	~serverProcessingSynths = List[];
	~ambientSynths = List[];
	~ambientInputBuses = List[];
	~ambientOutputBuses = List[];
	~ambientAddAfters = List[];
	~delaySynths = List[];
	~tickSoftenerSynths = List[];
	~mainGlitchSynths = List[];
	if(~encoderType != \separate,  {
		~mainBus = Bus.audio(s, ~mixerChannelOutputs);
		~main_glitch = Synth(\main_out_glitch, [\in, ~mainBus, \out, 0]);
		~mainGlitchSynths.add(~main_glitch);
		~revBus = Bus.audio(s, ~mixerChannelOutputs);
		~rev = Synth(\medium_reverb, [\in, ~revBus, \mix, 0.10, \out, ~mainBus]);
		~revSynths.add(~rev);
		~tapeBus = Bus.audio(s, ~mixerChannelOutputs);
		~tape = Synth(\tape_dist, [\in, ~tapeBus, \mix, 0.15, \out, ~revBus]);
		~tapeSynths.add(~tape);

		~tickBus = Bus.audio(s, ~mixerChannelOutputs);
		if(~encoderType == \quad, {
			~tick_softener = Synth(\tick_softener, [\in, ~tickBus, \out, ~revBus.index+2]);
		}, {
			~tick_softener = Synth(\tick_softener, [\in, ~tickBus, \out, ~revBus]);
		});
		~tickSoftenerSynths.add(~tick_softener);
		~ambientBus = Bus.audio(s, ~mixerChannelOutputs);
		~delayFxBus = Bus.audio(s, ~mixerChannelOutputs);
		~delay = Synth(\delay_fx, [\in, ~delayFxBus, \out, ~revBus]);
		~delaySynths.add(~delay);
		~ambient_reverb = Synth(\ambient_reverb, [\in, ~ambientBus, \out, 0]);
		~ambientSynths.add(~ambient_reverb);
		~serverBus = Bus.audio(s, ~mixerChannelOutputs);
		~server_processing = Synth(\server_channel, [\in, ~serverBus, \out, ~revBus, \amp, 0.5]);
		~serverProcessingSynths.add(~server_processing);
	}, {
		// We still need one standard set of synths for temporary effects e.g. transitions
		~mainBus = Bus.audio(s, ~mixerChannelOutputs);
		~main_glitch = Synth(\main_out_glitch, [\in, ~mainBus, \out, 0]);
		~mainGlitchSynths.add(~main_glitch);
		~revBus = Bus.audio(s, ~mixerChannelOutputs);
		~rev = Synth(\medium_reverb, [\in, ~revBus, \mix, 0.10, \out, ~mainBus]);
		~revSynths.add(~rev);
	});

	s.sync;

	"harmony.scd".loadRelative;

	"ftrace_processes.scd".loadRelative;

	~makeMixerChannel = { | name, out, amp = 1, gain = 1 |
		var bus, synth, extra_effect_synths, reverb_synth, reverb_bus, group, azimuth, elevation, reverb_mix = 0.25, pitch_offset = 0;
		bus = Bus.audio(s, 2);
		// reverb_bus = Bus.audio(s, 2);
		group = Group(s);

		switch(~encoderType,

			\stereo, {
				synth = Synth(\mixer_channel, [\in, bus, \out, out, \amp, amp * gain], group, \addToTail);
			},
			\quad, {
				synth = Synth(\mixer_channel, [\in, bus, \out, out, \amp, amp * gain], group, \addToTail);
			},
			\separate, {
				switch(name.asSymbol,
					\whisper, {
						var mainBus = Bus.audio(s, ~mixerChannelOutputs), main_glitch;
						main_glitch = Synth(\main_out_glitch, [\in, mainBus, \out, out], group);
						~mainGlitchSynths.add(main_glitch);
						synth = Synth(\mixer_channel, [\in, bus, \out, mainBus, \amp, amp * gain], group);

					},
					\ambient, {
						var ambientBus, ambient_reverb;
						ambientBus = Bus.audio(s, ~mixerChannelOutputs);
						ambient_reverb = Synth(\ambient_reverb, [\in, ambientBus, \out, out], group);
						~ambientSynths.add(ambient_reverb);
						~ambientInputBuses.add(ambientBus);
						~ambientOutputBuses.add(out);
						synth = Synth(\mixer_channel, [\in, bus, \out, ambientBus, \amp, amp * gain], group);
						~ambientAddAfters.add(synth);
					},
					\beep, {
						var delayFxBus = Bus.audio(s, ~mixerChannelOutputs), revBus, rev, delay, mainBus, main_glitch;
						revBus = Bus.audio(s, ~mixerChannelOutputs);
						mainBus = Bus.audio(s, ~mixerChannelOutputs);
						main_glitch = Synth(\main_out_glitch, [\in, mainBus, \out, out], group);
						~mainGlitchSynths.add(main_glitch);
						rev = Synth(\medium_reverb, [\in, revBus, \mix, 0.10, \out, mainBus], group);
						~revSynths.add(rev);
						delay = Synth(\delay_fx, [\in, delayFxBus, \out, revBus], group);
						~delaySynths.add(delay);
						synth = Synth(\mixer_channel, [\in, bus, \out, delayFxBus, \amp, amp * gain], group);
					},
					\tick, {
						var revBus, rev, delay, mainBus,
							main_glitch, tickBus, tick_softener;
						revBus = Bus.audio(s, ~mixerChannelOutputs);
						mainBus = Bus.audio(s, ~mixerChannelOutputs);
						tickBus = Bus.audio(s, ~mixerChannelOutputs);
						main_glitch = Synth(\main_out_glitch, [\in, mainBus, \out, out], group);
						~mainGlitchSynths.add(main_glitch);
						rev = Synth(\medium_reverb, [\in, revBus, \mix, 0.10, \out, mainBus], group);
						~revSynths.add(rev);
						tick_softener = Synth(\tick_softener, [\in, tickBus, \out, revBus], group);
						~tickSoftenerSynths.add(tick_softener);
						synth = Synth(\mixer_channel, [\in, bus, \out, tickBus, \amp, amp * gain], group);
					},
					\noise, {
						var mainBus = Bus.audio(s, ~mixerChannelOutputs), main_glitch;
						main_glitch = Synth(\main_out_glitch, [\in, mainBus, \out, out], group);
						~mainGlitchSynths.add(main_glitch);
						synth = Synth(\mixer_channel, [\in, bus, \out, mainBus, \amp, amp * gain], group);
					},
					\user_gestures, {
						var delayFxBus = Bus.audio(s, ~mixerChannelOutputs), revBus, rev, delay, mainBus, main_glitch;
						revBus = Bus.audio(s, ~mixerChannelOutputs);
						mainBus = Bus.audio(s, ~mixerChannelOutputs);
						main_glitch = Synth(\main_out_glitch, [\in, mainBus, \out, out], group);
						~mainGlitchSynths.add(main_glitch);
						rev = Synth(\medium_reverb, [\in, revBus, \mix, 0.10, \out, mainBus], group);
						~revSynths.add(rev);
						delay = Synth(\delay_fx, [\in, delayFxBus, \out, revBus], group);
						~delaySynths.add(delay);
						synth = Synth(\mixer_channel, [\in, bus, \out, delayFxBus, \amp, amp * gain], group);
					},
					\server_gestures, {
						var delayFxBus = Bus.audio(s, ~mixerChannelOutputs), revBus, rev, delay, mainBus, main_glitch, tickBus, tick_softener, serverBus, server_processing;
						revBus = Bus.audio(s, ~mixerChannelOutputs);
						mainBus = Bus.audio(s, ~mixerChannelOutputs);
						serverBus = Bus.audio(s, ~mixerChannelOutputs);

						main_glitch = Synth(\main_out_glitch, [\in, mainBus, \out, out], group);
						~mainGlitchSynths.add(main_glitch);
						rev = Synth(\medium_reverb, [\in, revBus, \mix, 0.10, \out, mainBus], group);
						~revSynths.add(rev);
						server_processing = Synth(\server_channel, [\in, serverBus, \out, revBus, \amp, 0.5], group);
						~serverProcessingSynths.add(server_processing);
						synth = Synth(\mixer_channel, [\in, bus, \out, serverBus, \amp, amp * gain], group);
					},
				);
				/*~channels.user_whispers = ~makeMixerChannel.("whisper", ~mainBus);
				~channels.user_ambient = ~makeMixerChannel.("ambient", ~ambientBus);
				~channels.beep = ~makeMixerChannel.("beep", ~delayFxBus);
				~channels.tick = ~makeMixerChannel.("tick", ~tickBus);
				~channels.noise = ~makeMixerChannel.("noise", ~mainBus);
				~channels.user_gestures = ~makeMixerChannel.("user_gestures", ~delayFxBus);
				~channels.server_gestures = ~makeMixerChannel.("server_gestures", ~serverBus);*/
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
			// Use play on to make sure that the
			play_on: {|self, synth_name, args, extra_latency = 0 |
				// s.makeBundle(~latency, {Synth(synth_name, args, self.my_group)} );
				self.my_clock.sched(~latency + extra_latency, Synth(synth_name, args, self.my_group, addAction: \addToHead));
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

	switch(~encoderType,
		\quad, {
			~channels.user_whispers = ~makeMixerChannel.("whisper", ~mainBus);
			~channels.user_ambient = ~makeMixerChannel.("ambient", ~ambientBus);
			~channels.beep = ~makeMixerChannel.("beep", ~delayFxBus.index + 2);
			~channels.tick = ~makeMixerChannel.("tick", ~tickBus);
			~channels.noise = ~makeMixerChannel.("noise", ~mainBus.index + 2);
			~channels.user_gestures = ~makeMixerChannel.("user_gestures", ~delayFxBus);
			~channels.server_gestures = ~makeMixerChannel.("server_gestures", ~serverBus);
		},
		\stereo, {
			~channels.user_whispers = ~makeMixerChannel.("whisper", ~mainBus);
			~channels.user_ambient = ~makeMixerChannel.("ambient", ~ambientBus);
			~channels.beep = ~makeMixerChannel.("beep", ~delayFxBus);
			~channels.tick = ~makeMixerChannel.("tick", ~tickBus);
			~channels.noise = ~makeMixerChannel.("noise", ~mainBus);
			~channels.user_gestures = ~makeMixerChannel.("user_gestures", ~delayFxBus);
			~channels.server_gestures = ~makeMixerChannel.("server_gestures", ~serverBus);
		},
		\separate, {
			var out = 2;
			~channels.user_whispers = ~makeMixerChannel.("whisper", out);
			out = out + ~mixerChannelOutputs;
			~channels.user_ambient = ~makeMixerChannel.("ambient", out);
			out = out + ~mixerChannelOutputs;
			~channels.beep = ~makeMixerChannel.("beep", out);
			out = out + ~mixerChannelOutputs;
			~channels.tick = ~makeMixerChannel.("tick", out);
			out = out + ~mixerChannelOutputs;
			~channels.noise = ~makeMixerChannel.("noise", out);
			out = out + ~mixerChannelOutputs;
			~channels.user_gestures = ~makeMixerChannel.("user_gestures", out);
			out = out + ~mixerChannelOutputs;
			~channels.server_gestures = ~makeMixerChannel.("server_gestures", out);
		}
	);

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
		});
	};

	~changeChordAction = {
		var numAmbient = ~ambientSynths.size;
		~ambientSynths.do{ | syn | syn.release(4); };
		~ambientSynths.clear;
		(0..(numAmbient-1)).do{ |i|
			var new_ambient_synth =
				Synth(\ambient_reverb, [\in, ~ambientInputBuses[i], \out, ~ambientOutputBuses[i]],
					target:	~ambientAddAfters[i], addAction: \addAfter);
			~ambientSynths.add(new_ambient_synth);
			i.postln;
		};

		("change chord action").postln;
	};

	"gestures.scd".loadRelative;
	"channel_auto_fader.scd".loadRelative;
	"presets.scd".loadRelative;

	~enable_auto_fade.();

	~trigger_transition = { | time_to_next_transition |
		// This will be called when a /transition OSC message is received
		if(~use_auto_fade, {
			~trigger_auto_fade.(time_to_next_transition);
		});
	};

	~start_tick_process.();
	~start_beep_process.();
	/*~enable_ftrace = false;
	~enable_user = false;
	~enable_server = false;*/
	"osc.scd".loadRelative; // don't receive OSC messages until everything is set up

	~set_synthesis_mode.(~synthesis_mode);
});

)
~start_auto_fade.()
~stop_auto_fade.()

~autoChangePreset.()
~trigger_transition.(10)
{~presets.choose.() }.fork;

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

/*
# Panning

Back speakers: 2 and 3
Front speakers: 0 and 1

Reverb in all speakers
Direct sound more directed


## ftrace
~channels.beep = ~makeMixerChannel.("beep", ~revBus);
~channels.tick = ~makeMixerChannel.("tick", ~tickBus);
~channels.noise = ~makeMixerChannel.("noise", ~mainBus);

## user and server
~channels.user_whispers = ~makeMixerChannel.("whisper", ~mainBus);
~channels.user_ambient = ~makeMixerChannel.("ambient", ~ambientBus);
~channels.user_gestures = ~makeMixerChannel.("user_gestures", ~revBus);
~channels.server_gestures = ~makeMixerChannel.("server_gestures", ~serverBus);


*/


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
~set_synthesis_mode.(\active_mode);
~set_synthesis_mode.(\soft_mode);
~rev.set(\mix, 0.3)

(
~mainGlitchSynths.do{|syn| syn.set();}
)