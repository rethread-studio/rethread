(
{
	Ndef.clear;
	~s53 = Scale.chromatic(\et53);
	Buffer.freeAll;
	// ~ttsBuffer = Buffer.read(s, "/home/erik/Musik/syscalls_spoken/2.wav", 0, -1);

	{var paths = PathName("/home/erik/Musik/syscalls_spoken/focus");
		var winenv = Env([0, 1, 0], [0.5, 0.5], [8, -8]);
		~voices_focus = Dictionary.new;
		paths.files.do{|path| path.fileName.postln;
			~voices_focus.add(path.fileName.asSymbol ->
				Buffer.read(s, path.fullPath));
		};
		~winBuffer = Buffer.sendCollection(s, winenv.discretize, 1);
	}.();
	{var paths = PathName("/home/erik/Musik/syscalls_spoken/movements");
		var winenv = Env([0, 1, 0], [0.5, 0.5], [8, -8]);
		~voices_movements = Dictionary.new;
		paths.files.do{|path| path.fileName.postln;
			~voices_movements.add(path.fileName.asSymbol ->
				Buffer.read(s, path.fullPath));
		};
		~winBuffer = Buffer.sendCollection(s, winenv.discretize, 1);
	}.();


	{ // Load binaries as sound files
		var path = PathName("/home/erik/Musik/syscalls_binaries");
		~binaries = Dictionary.new;
		path.files.do{|path| path.fileName.postln;
			path.extension.postln;
			if(path.extension == "wav", {
				~binaries.add(path.fileName.asSymbol ->
					Buffer.readChannel(s, path.fullPath, channels: [0]));
			});
		};
	}.();


	{
		SynthDef(\prayer_bell, { |out=0, t_trig = 1, sing_switch = 0, freq = 2434, amp = 0.5, decayscale = 1, lag = 10, i_doneAction = 0|
		var sig, input, first, freqscale, mallet, sing;
		freqscale = freq / 2434;
		freqscale = Lag3.kr(freqscale, lag);
		decayscale = Lag3.kr(decayscale, lag);

		mallet = LPF.ar(Trig.ar(t_trig, SampleDur.ir)!2, 10000 * freqscale) * amp;
		sing = LPF.ar(
			LPF.ar(
				{
					PinkNoise.ar * Integrator.kr(sing_switch * 0.001, 0.999).linexp(0, 1, 0.01, 1) * amp
				} ! 2,
				2434 * freqscale
			) + Dust.ar(0.1), 10000 * freqscale
		) * LFNoise1.kr(0.5).range(-45, -30).dbamp;
		input = mallet + (sing_switch.clip(0, 1) * sing);


		sig = DynKlank.ar(`[
			[
				(first = LFNoise1.kr(0.5).range(2424, 2444)) + Line.kr(20, 0, 0.5),
				first + LFNoise1.kr(0.5).range(1,3),
				LFNoise1.kr(1.5).range(5435, 5440) - Line.kr(35, 0, 1),
				LFNoise1.kr(1.5).range(5480, 5485) - Line.kr(10, 0, 0.5),
				LFNoise1.kr(2).range(8435, 8445) + Line.kr(15, 0, 0.05),
				LFNoise1.kr(2).range(8665, 8670),
				LFNoise1.kr(2).range(8704, 8709),
				LFNoise1.kr(2).range(8807, 8817),
				LFNoise1.kr(2).range(9570, 9607),
				LFNoise1.kr(2).range(10567, 10572) - Line.kr(20, 0, 0.05),
				LFNoise1.kr(2).range(10627, 10636) + Line.kr(35, 0, 0.05),
				LFNoise1.kr(2).range(14689, 14697) - Line.kr(10, 0, 0.05)
			],
			[
				LFNoise1.kr(1).range(-10, -5).dbamp,
				LFNoise1.kr(1).range(-20, -10).dbamp,
				LFNoise1.kr(1).range(-12, -6).dbamp,
				LFNoise1.kr(1).range(-12, -6).dbamp,
				-20.dbamp,
				-20.dbamp,
				-20.dbamp,
				-25.dbamp,
				-10.dbamp,
				-20.dbamp,
				-20.dbamp,
				-25.dbamp
			],
			[
				20 * freqscale.pow(0.2),
				20 * freqscale.pow(0.2),
				5,
				5,
				0.6,
				0.5,
				0.3,
				0.25,
				0.4,
				0.5,
				0.4,
				0.6
			] * freqscale.reciprocal.pow(0.5)
		], input, freqscale, 0, decayscale);
		DetectSilence.ar(sig, doneAction: i_doneAction);
			Out.ar(out, (sig!2).flatten);
	}).add;
		SynthDef(\grain_voice, {
			var sig, bufnum = \bufnum.ir(10), envbuf = ~winBuffer, pan = 0, pos, cutfreq = [350, 1000, 100];
			/*sig = PlayBuf.ar(1, bufnum, BufRateScale.kr(bufnum));
			sig = PitchShift.ar(sig, 0.2, 1.5);*/
			pos = Line.kr(0, 1, BufSamples.kr(bufnum)/BufSampleRate.kr(bufnum) * 1.1, doneAction: 2);
			sig = GrainBuf.ar(1, Impulse.kr(LFNoise1.kr(2).range(30, 60)), LFNoise1.kr(3).range(0.15, 0.4), bufnum, LFNoise1.kr(20).range(0.95, 1.05) * 0.9,
				pos, 2, pan, envbuf);
			//sig = PlayBuf.ar(1, bufnum, BufRateScale.ir(bufnum));
			sig = LPF.ar(sig, 4000);
			sig = HPF.ar(sig, 100);
			sig = BPeakEQ.ar(sig, 1500, 0.2, 10);
			cutfreq.do{|cut|
				sig = BPeakEQ.ar(sig, cut, 0.8, -10);
			};
			sig = (sig * 0.5) + (FreeVerb.ar(sig, 0.2) * 0.5);
			sig = (sig*0.5) + (sig * (Demand.kr(Dust.kr(LFNoise1.kr(1/2).range(5, 20)) + Impulse.kr(0), 0, Dseq([1, 0], inf))) * 0.5);
			sig = sig * LFNoise2.kr(1).range(0.1, 1.0);
			sig = Pan2.ar(sig * 2);

			SendTrig.kr(pos > 0.99, 1);
			Out.ar(0, sig);
		}).add;
		SynthDef(\grain_voice_mvt,
			{ | bufnum, envbuf, rate_min = 0.9 | var sig, pan = 0, pos, cutfreq = [350, 1000, 100];
				/*sig = PlayBuf.ar(1, bufnum, BufRateScale.kr(bufnum));
				sig = PitchShift.ar(sig, 0.2, 1.5);*/
				pos = Line.kr(0, 1, BufSamples.kr(bufnum)/BufSampleRate.kr(bufnum) * 1.1, doneAction: 2);
				sig = GrainBuf.ar(1, Impulse.kr(LFNoise1.kr(2).range(30, 60)), LFNoise1.kr(3).range(0.15, 0.4), bufnum,
					rate: LFNoise1.kr(3).range(rate_min, 1.1) * 0.8 * [1.0, 0.875, 0.75],
					pos: pos,
					interp: 2, pan: pan, envbufnum: envbuf);
				sig = Mix(sig * [1.0, 0.5, 0.25]);
				//sig = PlayBuf.ar(1, bufnum, BufRateScale.ir(bufnum));
				sig = LPF.ar(sig, 4000);
				sig = HPF.ar(sig, 100);
				sig = BPeakEQ.ar(sig, 1500, 0.2, 10);
				cutfreq.do{|cut|
					sig = BPeakEQ.ar(sig, cut, 0.8, -10);
				};
				sig = (sig * 0.5) + (FreeVerb.ar(sig, 0.2) * 0.5);
				sig = (sig*0.5) + (sig * (Demand.kr(Dust.kr(LFNoise1.kr(1/2).range(5, 20)) + Impulse.kr(0), 0, Dseq([1, 0], inf))) * 0.5);
				// sig = sig * LFNoise2.kr(1).range(0.1, 1.0);
				sig = Pan2.ar(sig * 1);
				sig = (sig!2).flatten;

				SendTrig.kr(pos > 0.99, 1);
				Out.ar(0, sig);
		}).add;
		SynthDef(\grain_voice_mvt_end,
			{ | bufnum, envbuf | var sig, pan = 0, pos, cutfreq = [350, 1000, 100];
				/*sig = PlayBuf.ar(1, bufnum, BufRateScale.kr(bufnum));
				sig = PitchShift.ar(sig, 0.2, 1.5);*/
				pos = EnvGen.kr(Env([0, 1], BufDur.ir(bufnum) * 5.0, [-6]), doneAction: 2);
				// pos = Line.kr(0, 1, BufSamples.kr(bufnum)/BufSampleRate.kr(bufnum) * Line.kr(1.1, 5.0, 30.0), doneAction: 2);
				sig = GrainBuf.ar(1, Impulse.kr(LFNoise1.kr(2).range(30, 60)), LFNoise1.kr(3).range(0.15, 0.4), bufnum,
					rate: LFNoise1.kr(3).range(0.9, 1.1) * 0.8 * [1.0, 0.875, 0.75] * XLine.kr(1.0, 0.4, 30.0),
					pos: pos,
					interp: 2, pan: pan, envbufnum: envbuf);
				sig = Mix(sig * [1.0, 0.5, 0.25]);
				//sig = PlayBuf.ar(1, bufnum, BufRateScale.ir(bufnum));
				sig = LPF.ar(sig, 4000);
				sig = HPF.ar(sig, 100);
				sig = BPeakEQ.ar(sig, 1500, 0.2, 10);
				cutfreq.do{|cut|
					sig = BPeakEQ.ar(sig, cut, 0.8, -10);
				};
				sig = (sig * 0.5) + (FreeVerb.ar(sig, 0.2) * 0.5);
				sig = (sig*0.5) + (sig * (Demand.kr(Dust.kr(LFNoise1.kr(1/2).range(5, 20)) + Impulse.kr(0), 0, Dseq([1, 0], inf))) * 0.5);
				// sig = sig * LFNoise2.kr(1).range(0.1, 1.0);
				sig = Pan2.ar(sig * 1 * Line.kr(1.0, 0.1, BufDur.ir(bufnum)).pow(0.25));
				sig = (sig!2).flatten;

				SendTrig.kr(pos > 0.99, 1);
				Out.ar(0, sig);
		}).add;
		SynthDef(\binary_playbuf, {
			var sig, env, buf = \buf.ir(0), length = \length.ir(0.1), out = \out.kr(0), front_back_mix = Line.ar(0.0, 1.0, length), start_frame = Rand(0, BufFrames.ir(buf) - (length * SampleRate.ir));
			env = EnvGen.kr(Env([0, 1, 1, 0], [0.02, length, 0.001]), doneAction: 2);
			sig = PlayBuf.ar(1, buf, startPos: start_frame, doneAction: 2)*env * \amp.kr(0.5);
			sig = LeakDC.ar(sig);
			Out.ar(out, Pan2.ar(sig, Rand(-1.0, 1.0)) * front_back_mix);
			Out.ar(out+2, Pan2.ar(sig, Rand(-1.0, 1.0)) * (1.0 - front_back_mix));
		}).add;

	}.();
	s.sync;
	~mvt_voice_counter = 0;
	OSCdef(\voice_break, { arg msg, time, addr, recvPort;
		var file = (msg[1].asString ++ ".wav").asSymbol;
		file = ~voices_movements[file];

		Synth(\prayer_bell, [\amp, 0.04]);
		/*		{
		Ndef(\rumbling_bass).release(25);
		26.wait;
		~start_rumbling_bass.();
		}.fork;*/
		msg.postln;
		~mvt_voice_counter = ~mvt_voice_counter + 1;
		{
			(30-(file.duration*1.1 + 0.5)).wait; // TODO: Time it so that the voice finishes just before the break is over
			Synth(\grain_voice_mvt, [\bufnum, file, \envbuf, ~winBuffer, \rate_min, 0.96 - ((~mvt_voice_counter/20) * 0.4)]);
		}.fork;
	}, '/break_voice', nil);

	OSCdef(\rumble_change, {
		arg msg, time, addr, recvPort;
		var bass_mode = msg[1].asInteger;
		msg.postln;
		switch(bass_mode.asSymbol,
			\0, {},
			\1, {
				Ndef(\rumbling_bass).release(20);
				{
					25.wait;
					~start_rumbling_bass.();
				}.fork;
			},
			\2, {
				Ndef(\rumbling_bass).release(20);
			},
			{}
		);

	}, '/rumble_change', nil);


	Ndef(\root, {25});
	Ndef(\root).fadeTime = 0.05;
	Ndef(\rumbling_bass).clear;
	Ndef(\bwr_low, {0.01});
	Ndef(\bwr_high, {1.5});
	Ndef(\bwr_high).fadeTime = 2;
	Ndef(\bwr_low).fadeTime = 2;
	Ndef(\lpf_low, {50});
	Ndef(\lpf_high, {10000});
	{
		var buffers = ~binaries.values,
		binaryBus = Bus.audio(s, 1);
		buffers.do { |buf, i|
			{
				(i*0.1).wait;
				loop { var length = rrand(0.2, 2.0);
					rrand(0.1, 0.5).wait;
					Synth(\binary_playbuf, [\buf, buf, \length, length, \amp, 0.63, \out, binaryBus]);
					length.wait;
				}
			}.fork;

		};
		Ndef(\rumbling_noise_source, {
			var sig;
			sig = BrownNoise.ar()!4 * 0.5;
			sig = sig + (In.ar(binaryBus, 1)!4);
			sig
		});
	}.();
	~start_rumbling_bass = {
		Ndef(\rumbling_bass, {
			var sig, pitch_mix = LFNoise1.kr(0.1).range(0, 1).pow(2.0),
			bwr1 = {LFNoise1.kr(0.05).range(Ndef.kr(\bwr_low, 1), Ndef.kr(\bwr_high, 1)).clip(0.001, 1.0).pow(4)}!4,
			bwramp1 = (0.00001 / bwr1).clip(0.00001, 1.0).pow(0.33) * 300.0,
			bwr2 = {LFNoise1.kr(0.05).range(Ndef.kr(\bwr_low, 1), Ndef.kr(\bwr_high, 1) * 0.5).clip(0.001, 1.0).pow(3)}!5,
			bwramp2 = (0.00001 / bwr2).clip(0.00001, 1.0).pow(0.5) * 300.0,
			lpf_low = Ndef.kr(\lpf_low, 1),
			lpf_high = Ndef.kr(\lpf_high, 1),
			lpf_mul = lpf_high - lpf_low
			;
			// pitch_mix = 0.0;
			// bwramp1.poll;
			sig = Ndef.ar(\rumbling_noise_source, 4);
			// sig = PinkNoise.ar()!4;
			// sig = BrownNoise.ar()!4;

			// sig = LPF.ar(sig, LFNoise2.kr(0.5).range(100, 2000) * LFNoise1.kr(2).range(0.8, 1.0));
			sig = Resonz.ar(sig, Ndef.kr(\root, 1)*[4, 8, 12, 16],bwr1) * bwramp1;
			sig = Mix(sig);
			sig = Limiter.ar(sig);
			sig = sig * 0.5 + (AnalogVintageDistortion.ar(sig*LFNoise1.kr(0.1).range(0.01, 0.1), LFNoise1.kr(0.03).range(0.0, 2.5), LFNoise1.kr(0.2).range(0.0, 0.5)) * LFNoise1.kr(0.1).range(0.0, 0.5).pow(1.5));
			sig = LPF.ar(sig, ((
				LFNoise1.kr(0.05).range(0, 1).pow(3) * lpf_mul + lpf_low)
			* LFNoise1.kr(2).range(0.7, 1.0)
			* LFNoise1.kr(5).range(0.9, 1.0)
			).clip(10, 19000));
			sig = HPF.ar(sig, (LFNoise1.kr(0.05).range(0, 1).pow(2.5) *200 + 10) * LFNoise1.kr(LFNoise1.kr(2).range(1, 5)).range(0.5, 1.0));
			sig = Limiter.ar(sig, 0.9);
			// sig = sig!2 + (JPverb.ar(sig, 2.0) * LFNoise1.ar(0.1).range(0.0, 0.5).pow(2));
			sig = (sig * (1.0-pitch_mix))!2 + ((Splay.ar(Resonz.ar(sig, Ndef.kr(\root, 1)*[4, 6, 8, 12, 16], bwr2)*bwramp2) * pitch_mix * 0.2));
			sig = BPeakEQ.ar(sig, 300, 0.5, -2);
			sig = BPeakEQ.ar(sig, 2000, 1.0, -3);
			sig = Limiter.ar(sig, 0.9);

			sig = sig * 0.05 * Line.kr(0.001, 1.0, 5.0);
			// sig = Pan2.ar(sig*0.5);
			(sig!2).flatten;
		}).play(16, 4);
	};
	~start_rumbling_bass.();

	// OSCdef(\background_ramp, { arg msg, time, addr, recvPort;
	// 	var
	// 	fade_duration = msg[1].asFloat,
	// 	bwr_low_start = msg[2].asFloat,
	// 	bwr_low_end = msg[3].asFloat,
	// 	bwr_high_start = msg[4].asFloat,
	// 	bwr_high_end = msg[5].asFloat,
	// 	lpf_low_start = msg[6].asFloat,
	// 	lpf_low_end = msg[7].asFloat,
	// 	lpf_high_start = msg[8].asFloat,
	// 	lpf_high_end = msg[9].asFloat;
	// 	msg.postln;
	// 	Ndef(\bwr_low).fadeTime = 0.01;
	// 	Ndef(\bwr_high).fadeTime = 0.01;
	// 	Ndef(\lpf_low).fadeTime = 0.01;
	// 	Ndef(\lpf_high).fadeTime = 0.01;
	// 	Ndef(\bwr_low, {bwr_low_start});
	// 	Ndef(\bwr_high, {bwr_high_start});
	// 	Ndef(\lpf_low, {lpf_low_start});
	// 	Ndef(\lpf_high, {lpf_high_start});
	// 	Ndef(\bwr_low).fadeTime = fade_duration;
	// 	Ndef(\bwr_high).fadeTime = fade_duration;
	// 	Ndef(\lpf_low).fadeTime = fade_duration;
	// 	Ndef(\lpf_high).fadeTime = fade_duration;
	// 	Ndef(\bwr_low, {bwr_low_end});
	// 	Ndef(\bwr_high, {bwr_high_end});
	// 	Ndef(\lpf_low, {lpf_low_end});
	// 	Ndef(\lpf_high, {lpf_high_end});
	// }, '/background_ramp', nil);


	// Ndef(\rumbling_bass).release(0.1)


	OSCdef(\voiceFocusEnabled, { arg msg, time, addr, recvPort;
		var  focus = ~voices_focus['Focus.wav'], file = (msg[1].asString ++ ".wav").asSymbol;
		file = ~voices_focus[file];
		/*	("Found buffer: " ++ file).postln;
		focus.postln;
		msg.postln;*/
		{
			Synth(\grain_voice, [\bufnum, focus, \envbuf, ~winBuffer]);
			(focus.duration + 0.3).wait;
			Synth(\grain_voice, [\bufnum, file, \envbuf, ~winBuffer]);
		}.fork;
	}, '/voice/focus/enabled', nil);


	OSCdef(\voiceFocusDisabled, { arg msg, time, addr, recvPort;
		var file = ~voices_focus['FocusDisabled.wav'];
		// msg.postln;
		Synth(\grain_voice, [\bufnum, file, \envbuf, ~winBuffer]);

	}, '/voice/focus/disabled', nil);

	~play_changed_harmony = true;
	// Change root of background rumble
	OSCdef(\change_harmony, { arg msg, time, addr, recvPort;
		var
		root = msg[1].asFloat,
		num_pitches_in_chord = msg[2].asInteger,
		chord = msg[3..(num_pitches_in_chord+3)],
		chord_freqs = chord.collect{|degree| ~s53.degreeToFreq(degree, root, 4)};
		// file = ~binaries["thunderbird_8bit.wav".asSymbol];
		msg.postln;
		root.postln;
		chord.postln;
		if(~play_changed_harmony, {
			if(rrand(0.0, 1.0) > 0.4, {

				chord_freqs.do{|f|
					var length = rrand(6.0, 14.0);
					{
						var sig, pan = Rand(0, 3.9999);
						pan = Select.kr(pan, [
							[1, 0, 0, 0],
							[0, 1, 0, 0],
							[0, 0, 1, 0],
							[0, 0, 0, 1],
						]);
						sig = WhiteNoise.ar()*0.2;
						sig = Resonz.ar(sig, (f.cpsmidi + [0, 0.01, -0.01, 0.02, -0.02]).midicps, XLine.kr(Rand(0.8, 0.1), 0.001, length)) * XLine.kr(0.01, 1.0, length);
						sig = Mix(sig);
						sig = LPF.ar(sig, 4000);
						sig = sig * EnvGen.kr(Env([0, 1, 1, 0], [3, length-5, 2]), doneAction:2);
						sig * pan;
						sig

					}.play;
				};
			});
		});

		Ndef(\root, {~s53.degreeToFreq(chord[0], root, 0)});

	}, '/change_harmony', nil);

	// Triggered background noise
	OSCdef(\background_noise, { arg msg, time, addr, recvPort;
		var length = msg[1].asFloat,
		root = msg[2].asFloat, comparisonPitch = root.log2.frac, chosenComparison = 1, chosenFreq;
		// file = ~binaries["thunderbird_8bit.wav".asSymbol];
		msg.postln;

		[1, 3/2, 5/4].do{|interval|
			var comp = abs((root*interval).log2.frac-1000.log2.frac);
			if(comp < chosenComparison) {
				chosenComparison = comp;
				chosenFreq = root*interval;
			};
		};
		while({chosenFreq * 2.0 < 1500}, {chosenFreq = chosenFreq * 2.0});
		("Chosen freq: " ++ chosenFreq).postln;

		{
			var sig, env, front_back_mix = Rand(0, 1.0);
			sig = Resonz.ar(PinkNoise.ar*5, chosenFreq, LFNoise1.kr(0.25).range(0.0001, 0.01));
			sig = LPF.ar(sig, LFNoise1.kr(0.5).range(900, 10000));
			env = EnvGen.kr(Env([0, 1, 0.5, 0], [Rand(0.7, 1.9), length*0.34, length *0.66], [\lin, \lin, -6]), doneAction: 2) * Rand(0.2, 1.0).pow(2);
			sig = Pan2.ar(sig * 0.1*env);
			Out.ar(8, sig * front_back_mix);
			Out.ar(10, sig * (1.0-front_back_mix));
		}.play;

	}, '/background_noise', nil);
	OSCdef(\play_peak_binary, { arg msg, time, addr, recvPort;
		var length = msg[1].asFloat,
		file = ~binaries.values.choose;
		// file = ~binaries["thunderbird_8bit.wav".asSymbol];
		msg.postln;
		Synth(\binary_playbuf, [\buf, file, \length, length, \amp, 0.040]);

	}, '/peak_binary', nil);



	~end_movement = { var movement_duration = 30, movement_duration_remaining = movement_duration;
		{
			~play_changed_harmony = false;
			Synth(\prayer_bell, [\amp, 0.04]);
			// Replace the rumbling Ndef by something slowly descending
			Ndef(\root2, {Line.kr(25, 25*0.5, movement_duration*0.5)});
			Ndef(\rumbling_bass).fadeTime = movement_duration*0.5;
			0.1.wait;
			Ndef(\rumbling_bass, {
				var sig, pitch_mix = Line.kr(0.0, 1.0, movement_duration*0.3), bwr = XLine.kr(1.0, 0.001, movement_duration * 0.7);
				sig = Ndef.ar(\rumbling_noise_source, 4);
				// sig = BrownNoise.ar()!4;
				// sig = LPF.ar(sig, LFNoise2.kr(0.5).range(100, 2000) * LFNoise1.kr(2).range(0.8, 1.0));
				sig = Resonz.ar(sig, Ndef(\root2).kr*[4, 8, 12, 16], bwr);
				sig = Mix(sig);
				sig = sig * 0.5 + (AnalogVintageDistortion.ar(sig*LFNoise1.kr(2).range(0.01, 0.1), LFNoise1.kr(0.03).range(0.0, 2.5), LFNoise1.kr(0.2).range(0.0, 0.5)) * LFNoise1.kr(0.1).range(0.0, 0.5).pow(1.5));
				sig = LPF.ar(sig, XLine.kr(10000, 10, movement_duration) * LFNoise1.kr(2).range(0.7, 1.0) * LFNoise1.kr(5).range(0.9, 1.0));
				sig = HPF.ar(sig, (LFNoise1.kr(0.05).range(0, 1).pow(2.5) *200 + 10) * LFNoise1.kr(2).range(0.8, 1.0));
				sig = Limiter.ar(sig, 0.9);
				// sig = sig!2 + (JPverb.ar(sig, 2.0) * LFNoise1.ar(0.1).range(0.0, 0.5).pow(2));
				sig = (sig * (1.0-pitch_mix))!2 + (Splay.ar(Resonz.ar(sig, Ndef(\root2).kr*[4, 6, 8, 12, 16], bwr)) * pitch_mix * 0.2);
				sig = Limiter.ar(sig, 0.9);

				sig = sig * 0.1;
				// sig = Pan2.ar(sig*0.5);
				(sig!2).flatten
			}).play;

			3.wait;
			~voices_movements.do{ |mvt, i| var gap = rrand(0.3, 0.4) * i.linlin(0, ~voices_movements.size, 3.0, 0.5);
				Synth(\grain_voice_mvt_end, [\bufnum, mvt, \envbuf, ~winBuffer]);
				movement_duration_remaining = movement_duration_remaining - gap;
				gap.wait;
			};
			movement_duration_remaining.wait;
			Ndef(\rumbling_bass).release(10);
			10.wait;
			Synth(\binary_playbuf, [\buf, ~binaries.values[0], \length, 0.2, \amp, 0.40, \out, 0]);
			0.05.wait;
			Synth(\binary_playbuf, [\buf, ~binaries.values[1], \length, 0.05, \amp, 0.40, \out, 0]);
			s.freeAll;
		}.fork;
	};
	OSCdef(\end_movement, { arg msg, time, addr, recvPort;

		msg.postln;
		~end_movement.();

	}, '/end_movement', nil);

}.fork;
)


( var length = 10;
[200, 250, 300].do{|f|{
	var sig;
	sig = WhiteNoise.ar();
	sig = Resonz.ar(sig, (f.cpsmidi + [0, 0.01, -0.01, 0.02, -0.02]).midicps, XLine.kr(0.5, 0.001, length)) * XLine.kr(0.01, 1.0, length);
	sig = Mix(sig);
	sig = sig * EnvGen.kr(Env([0, 1, 1, 0], [0.1, length-0.2, 2]), doneAction:2);
	sig


}.play;
}
)
(
Ndef(\resonantsnare, { |pan=0|
	var trig = Impulse.kr(1);
	var snare = AnalogSnareDrum.ar(
		trig, decay: TRand.kr(0.1,0.5,trig)
	);

	var sig = Resonator.ar(
		input: snare,
		freq: TExpRand.kr(25.0,250.0,trig),
		position: 0.0,
		resolution: 24,
		structure: SinOsc.kr(0.01).unipolar,
		brightness: SinOsc.kr(0.01, 0.5*pi).unipolar * 0.5,
		damping: TRand.kr(0.2,0.8, trig)
	);

	// Limiter
	sig = sig.tanh;

	Pan2.ar(sig, pan);
}).play;
)

b = NetAddr.new("127.0.0.1", 57120);    // create the NetAddr
b.sendMsg("/break_voice", 4);    // send the application the message "hello" with the parameter "there"

(
var buffers = ~binaries.values,
binaryBus = Bus.audio(s, 1);
buffers.do { |buf, i|
	{
		(i*0.1).wait;
		loop { var length = rrand(0.2, 2.0);
			rrand(0.1, 0.5).wait;
			Synth(\binary_playbuf, [\buf, buf, \length, length, \amp, 0.43, \out, binaryBus]);
			length.wait;
		}
	}.fork;

};
Ndef(\rumbling_noise_source, {
	var sig;
	sig = BrownNoise.ar()!4 * 0.5;
	sig = sig + (In.ar(binaryBus, 1)!4);

	sig
});
)
~binaries.values

