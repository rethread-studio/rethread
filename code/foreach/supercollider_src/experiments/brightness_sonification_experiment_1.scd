// Receive brightness values before and after transformation. Map them to chord pitches. After the transformation, use a chord a mediant above.

(
s.waitForBoot {
	SynthDef(\softy, {
		var sig, env, freq = \freq.kr(220), rel = \rel.kr(2);
		env = Env.perc(\atk.kr(0.1), rel, curve: [\c0.kr(\cub), \c1.kr(\cub)]).kr(2);
		sig = Resonz.ar(PinkNoise.ar(mul: env), freq, 0.007, mul: 20);
		sig = LPF.ar(sig, Line.ar(100, 4000, rel/2));
		sig = sig * \amp.kr(0.5);
		sig = Pan2.ar(sig, \pan.kr(0));
		Out.ar(\out.kr(0), sig);
	}).add;
	SynthDef(\sine, {
		var sig, env, freq = \freq.kr(220);

		env = Env.perc(\atk.kr(0.01), \rel.kr(1.0)).kr(2);
		sig = SinOsc.ar(freq) * \amp.kr(0.2) * env * 0.1;
		sig = Pan2.ar(sig, \pan.kr(0));

		Out.ar(\out.kr(0), sig);
	}).add;
	SynthDef(\medium_reverb, { | out = 0, amp = 1, mix = 0.3  |
	var sig, wet, in;

	in = In.ar(\in.kr(10), 2);
	mix = mix.lag(\mixLag.kr(10));

	sig = HPF.ar(in, 120);

	/*wet = JPverb.ar(sig, 3.0, 0.9, 4.0, 0.8);
	wet = GVerb.ar(sig, 300, 103, 0.43, 0.51, 15, -5.dbamp, -26.dbamp, -20.dbamp);*/
	wet = Greyhole.ar(sig, \delayTime.kr(0.1), \damp.kr(0.7), \size.kr(1.0), \diff.kr(0.8), \feedback.kr(0.9));

	wet = HPF.ar(wet, 60);

	sig = (in * (1-mix)) + (wet*mix);
	sig = Limiter.ar(sig, 0.95);
	Out.ar(out, sig);
}).add;


	s.sync;

	~revBus = Bus.audio(s, 2);
	~rev = Synth(\medium_reverb, [\in, ~revBus, \mix, 0.2]);

	~values = List[];
	~chords = [
		[0, 9, 17, 31],
		[-22, 48, 0, 9, 17]
	];
	~chords = ~chords.collect{|chord|
		(chord - 53) ++ chord ++ (chord + 53) ++ (chord + 106)
	};
	~currentChord = 0;
	~rootFreq = 60.midicps;
	~s53 = Scale.chromatic('et53');
	~sonifyBrightnesses = { |values|
		var linear = values.collect{ |b| b/255.0 },
		numDegrees = ~chords[~currentChord].size,
		pitches = linear.collect{ |l| ~chords[~currentChord][(l*numDegrees).floor]; },
		numPitches = pitches.size;
		{
		pitches.do { |degree|
			var freq = ~s53.degreeToFreq(degree, ~rootFreq, 0);
				Synth(\softy, [\freq, freq, \amp, 1.0/numPitches, \rel, 0.8, \out, ~revBus]);
			Synth(\sine, [\freq, freq, \amp, 1.0/numPitches, \out, ~revBus]);
				exprand(0.001, 0.015).wait;
		};
		}.fork;
	};

	o = OSCFunc({ arg msg, time, addr, recvPort;
		[msg, time, addr, recvPort].postln;
		~values.add(msg[3]);
	}, '/luma_chord');
	o = OSCFunc({ arg msg, time, addr, recvPort;
		[msg, time, addr, recvPort].postln;
		~sonifyBrightnesses.(~values);
		~values = List[];
		~currentChord = (~currentChord + 1) % ~chords.size;
	}, '/luma_chord_finished');
};
)


b = NetAddr.new("127.0.0.1", 57120);    // create the NetAddr
b.sendMsg("/luma_chord", 1, 2, 3);    // send the application the message "hello" with the parameter "there"
