(
{
	~s53 = Scale.chromatic(\et53);
	Buffer.freeAll;
	// ~ttsBuffer = Buffer.read(s, "/home/erik/Musik/syscalls_spoken/2.wav", 0, -1);

	{var paths = PathName("/home/erik/Musik/syscalls_spoken");
		var winenv = Env([0, 1, 0], [0.5, 0.5], [8, -8]);
		~voices = Dictionary.new;
		paths.files.do{|path| path.fileName.postln;
			~voices.add(path.fileName.asSymbol ->
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
			sig = sig * LFNoise2.kr(1).range(0.1, 1.0) * XLine.kr(0.5, 1.0, 1);
			sig = Pan2.ar(sig * 4);

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

	OSCdef(\voice_break, { arg msg, time, addr, recvPort;
		var file = (msg[1].asString ++ ".wav").asSymbol;
		file = ~voices[file];
		{
			Ndef(\rumbling_bass).release(25);
			26.wait;
			~start_rumbling_bass.();
		}.fork;
		msg.postln;
		{
			var winenv = Env([0, 1, 0], [0.5, 0.5], [8, -8]);
			z = Buffer.sendCollection(s, winenv.discretize, 1);
			s.sync;
			(30-(file.duration*1.1 + 0.5)).wait; // TODO: Time it so that the voice finishes just before the break is over
			{ var sig, bufnum = file, envbuf = z, pan = 0, pos, cutfreq = [350, 1000, 100];
				/*sig = PlayBuf.ar(1, bufnum, BufRateScale.kr(bufnum));
				sig = PitchShift.ar(sig, 0.2, 1.5);*/
				pos = Line.kr(0, 1, BufSamples.kr(bufnum)/BufSampleRate.kr(bufnum) * 1.1, doneAction: 2);
				sig = GrainBuf.ar(1, Impulse.kr(LFNoise1.kr(2).range(30, 60)), LFNoise1.kr(3).range(0.15, 0.4), bufnum, LFNoise1.kr(20).range(0.95, 1.1) * 0.8,
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
				// sig = sig * LFNoise2.kr(1).range(0.1, 1.0);
				sig = Pan2.ar(sig * 3);

				SendTrig.kr(pos > 0.99, 1);
				Out.ar(0, sig);
			}.play;
		}.fork;
	}, '/break_voice', nil);


	Ndef(\root, {25});
	Ndef(\root).fadeTime = 0.05;
	Ndef(\rumbling_bass).clear;
	~start_rumbling_bass = {
		Ndef(\rumbling_bass, {
			var sig, pitch_mix = LFNoise1.kr(0.1).range(0, 1).pow(2.0),
			bwr1 = {LFNoise1.kr(0.05).range(0.001, 1.0).clip(0.001, 1.0).pow(4)}!4,
			bwramp1 = (0.00001 / bwr1).clip(0.00001, 1.0).pow(0.33) * 300.0,
			bwr2 = {LFNoise1.kr(0.05).range(0.001, 0.5).clip(0.001, 1.0).pow(3)}!5,
			bwramp2 = (0.00001 / bwr2).clip(0.00001, 1.0).pow(0.5) * 300.0;
			// pitch_mix = 0.0;
			// bwramp1.poll;
			sig = BrownNoise.ar()!4;
			// sig = PinkNoise.ar()!4;
			// sig = LPF.ar(sig, LFNoise2.kr(0.5).range(100, 2000) * LFNoise1.kr(2).range(0.8, 1.0));
			sig = Resonz.ar(sig, Ndef(\root).kr*[4, 8, 12, 16],bwr1) * bwramp1;
			sig = Mix(sig);
			sig = Limiter.ar(sig);
			sig = sig * 0.5 + (AnalogVintageDistortion.ar(sig*LFNoise1.kr(0.1).range(0.01, 0.1), LFNoise1.kr(0.03).range(0.0, 2.5), LFNoise1.kr(0.2).range(0.0, 0.5)) * LFNoise1.kr(0.1).range(0.0, 0.5).pow(1.5));
			sig = LPF.ar(sig, (LFNoise1.kr(0.05).range(0, 1).pow(3)* 10000+50) * LFNoise1.kr(2).range(0.7, 1.0) * LFNoise1.kr(5).range(0.9, 1.0));
			sig = HPF.ar(sig, (LFNoise1.kr(0.05).range(0, 1).pow(2.5) *200 + 10) * LFNoise1.kr(LFNoise1.kr(2).range(1, 5)).range(0.5, 1.0));
			sig = Limiter.ar(sig, 0.9);
			// sig = sig!2 + (JPverb.ar(sig, 2.0) * LFNoise1.ar(0.1).range(0.0, 0.5).pow(2));
			sig = (sig * (1.0-pitch_mix)) + (Splay.ar(Resonz.ar(sig, Ndef(\root).kr*[4, 6, 8, 12, 16], bwr2)*bwramp2) * pitch_mix * 0.2);
			sig = BPeakEQ.ar(sig, 300, 0.5, -2);
			sig = BPeakEQ.ar(sig, 2000, 1.0, -3);
			sig = Limiter.ar(sig, 0.9);

			sig = sig * 0.1 * Line.kr(0.001, 1.0, 10.0);
			// sig = Pan2.ar(sig*0.5);
			(sig!2).flatten
		}).play(16, 4);
	};
	~start_rumbling_bass.();


	// Ndef(\rumbling_bass).release(0.1)


	OSCdef(\voiceFocusEnabled, { arg msg, time, addr, recvPort;
		var  focus = ~voices['Focus.wav'], file = (msg[1].asString ++ ".wav").asSymbol;
		file = ~voices[file];
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
		var file = ~voices['FocusDisabled.wav'];
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

		Ndef(\root, {root});

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
			env = EnvGen.kr(Env([0, 1, 0.5, 0], [Rand(0.7, 1.9), length*0.34, length *0.66], [\lin, \lin, -6]), doneAction: 2) * Rand(0.1, 1.0);
			sig = Pan2.ar(sig)*env * 0.1;
			Out.ar(8, sig * front_back_mix);
			Out.ar(10, sig * (1.0-front_back_mix));
		}.play;

	}, '/background_noise', nil);
	OSCdef(\play_peak_binary, { arg msg, time, addr, recvPort;
		var length = msg[1].asFloat,
		file = ~binaries.values.choose;
		// file = ~binaries["thunderbird_8bit.wav".asSymbol];
		msg.postln;
		Synth(\binary_playbuf, [\buf, file, \length, length, \amp, 0.043]);

	}, '/peak_binary', nil);

}.fork;
)


(
~end_movement = { var movement_duration = 40;
	{
		~play_changed_harmony = false;
		// Replace the rumbling Ndef by something slowly descending
		Ndef(\root2, {Line.kr(25, 25*0.5, movement_duration*0.5)});
		Ndef(\rumbling_bass).fadeTime = 20;
		0.1.wait;
		Ndef(\rumbling_bass, {
			var sig, pitch_mix = Line.kr(0.0, 1.0, movement_duration*0.3), bwr = XLine.kr(1.0, 0.001, movement_duration * 0.7);
			sig = BrownNoise.ar()!4;
			// sig = LPF.ar(sig, LFNoise2.kr(0.5).range(100, 2000) * LFNoise1.kr(2).range(0.8, 1.0));
			sig = Resonz.ar(sig, Ndef(\root2).kr*[4, 8, 12, 16], {LFNoise1.kr(0.05).range(0.001, 1.0).clip(0.001, 1.0).pow(3)}!4);
			sig = Mix(sig);
			sig = sig * 0.5 + (AnalogVintageDistortion.ar(sig*LFNoise1.kr(0.1).range(0.01, 0.1), LFNoise1.kr(0.03).range(0.0, 2.5), LFNoise1.kr(0.2).range(0.0, 0.5)) * LFNoise1.kr(0.1).range(0.0, 0.5).pow(1.5));
			sig = LPF.ar(sig, XLine.kr(10000, 100, movement_duration) * LFNoise1.kr(2).range(0.7, 1.0) * LFNoise1.kr(5).range(0.9, 1.0));
			sig = HPF.ar(sig, (LFNoise1.kr(0.05).range(0, 1).pow(2.5) *200 + 10) * LFNoise1.kr(2).range(0.8, 1.0));
			sig = Limiter.ar(sig, 0.9);
			// sig = sig!2 + (JPverb.ar(sig, 2.0) * LFNoise1.ar(0.1).range(0.0, 0.5).pow(2));
			sig = (sig * (1.0-pitch_mix)) + (Splay.ar(Resonz.ar(sig, Ndef(\root2).kr*[4, 6, 8, 12, 16], bwr)) * pitch_mix * 0.2);
			sig = Limiter.ar(sig, 0.9);

			sig = sig * 0.1;
			// sig = Pan2.ar(sig*0.5);
			(sig!2).flatten
		}).play;
		movement_duration.wait;
		Ndef(\rumbling_bass).release(10);
	}.fork;
};
OSCdef(\end_movement, { arg msg, time, addr, recvPort;

	msg.postln;
	~end_movement.();

}, '/end_movement', nil);

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
