~ttsBuffer = Buffer.read(s, "/home/erik/Musik/syscalls_spoken/2.wav", 0, -1);
(
var paths = PathName("/home/erik/Musik/syscalls_spoken");
var winenv = Env([0, 1, 0], [0.5, 0.5], [8, -8]);
~voices = Dictionary.new;
paths.files.do{|path| path.fileName.postln;
	~voices.add(path.fileName.asSymbol ->
		Buffer.read(s, path.fullPath));
};
~winBuffer = Buffer.sendCollection(s, winenv.discretize, 1);
)

(
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
)
~voices.at('Signal.wav');
(
OSCdef(\voice_break, { arg msg, time, addr, recvPort;
	msg.postln;
	{
		var winenv = Env([0, 1, 0], [0.5, 0.5], [8, -8]);
		z = Buffer.sendCollection(s, winenv.discretize, 1);
		s.sync;
		20.wait; // TODO: Time it so that the voice finishes just before the break is over
		{ var sig, bufnum = ~ttsBuffer, envbuf = z, pan = 0, pos, cutfreq = [350, 1000, 100];
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
			sig = sig * LFNoise2.kr(1).range(0.1, 1.0) * XLine.kr(0.5, 1.0, 1);
			sig = Pan2.ar(sig * 4);

			SendTrig.kr(pos > 0.99, 1);
			Out.ar(0, sig);
		}.play;
	}.fork;
}, '/break_voice', nil);


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

)

~voices['Focus.wav'].duration