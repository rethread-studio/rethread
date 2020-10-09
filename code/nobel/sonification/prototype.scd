// Nobel prototype

s.waitForBoot({

	SynthDef(\thump, {
		var sig, env, freq = \freq.kr(220);
		env = Env.perc(\atk.kr(0.1), \rel.kr(2), curve: [\c0.kr(\cub), \c1.kr(\sine)]).kr(2);
		sig = Resonz.ar(PinkNoise.ar(mul: env.pow(100) * 20), freq, 0.007, mul: 20);
		sig = sig * \amp.kr(0.5) * env;
		sig = Pan2.ar(sig, \pan.kr(0));
		Out.ar(\out.kr(0), sig);
	}).add;

	SynthDef(\softy, {
		var sig, env, freq = \freq.kr(220);
		env = Env.perc(\atk.kr(0.1), \rel.kr(2), curve: [\c0.kr(\cub), \c1.kr(\sine)]).kr(2);
		sig = Resonz.ar(PinkNoise.ar(mul: env), freq, 0.007, mul: 20);
		sig = sig * \amp.kr(0.5) * env;
		sig = Pan2.ar(sig, \pan.kr(0));
		Out.ar(\out.kr(0), sig);
	}).add;
	SynthDef(\reverb, {
		var snd, wet;
		snd = In.ar(\in.kr(0), 2);
		wet = snd.sum + PitchShift.ar(snd, 0.2, 2);
		wet = DelayN.ar(wet, 0.25, 0.25);
		wet = GVerb.ar(wet, 200, 2);
		wet = HPF.ar(wet, 100) * -3.dbamp;
		wet = LPF.ar(wet, 7000);
		snd = snd + (wet * \wetness.kr(0.1));
		// Add a little bit of tape flutter
		snd = DelayC.ar(snd, 0.2, LFNoise2.kr(1).range(0, 0.005));

		//snd = (snd * Demand.kr(Dust.kr(5), 1, Dseq([1, 0], inf))) + (snd*0.5);

		Out.ar(\out.kr(0), snd);
	}).add;

	s.sync;

	~revBus = Bus.audio(s, 2);
	Synth(\reverb, [\in, ~revBus, \wetness, 0.1]);

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
	~chord = ~ch1;

	// ROUTINES
	~rootFreq = 0.midicps;
	~thumpAtk = 0.2;
	~thumpRel = 2;
	~thumpOctave = 3;
	~thumpMinWait = 0.2;
	~thumpWaitWidth = 1.0;
	~thumpAmp = 0.2;

	{ // play thump
		loop {
			rrand(0, ~chord.size-1).asInteger.do {
				var freq = ~s53.degreeToFreq(~chord.choose, ~rootFreq, ~thumpOctave);
				Synth(\thump, [
					\freq, freq,
					\atk, ~thumpAtk,
					\rel, ~thumpRel,
					\c0, -3,
					\c1, \sine,
					\pan, rrand(-0.7, 0.7),
					\amp, ~thumpAmp,
					\out, ~revBus]);
				rrand(0.02, 0.05).wait;
			};
			rrand(~thumpMinWait, ~thumpMinWait + ~thumpWaitWidth).wait;
		}
	}.fork;

	{ // change thump parameters
		loop {
			[
				{ ~thumpAtk = exprand(0.1, 1); },
				{ ~thumpRel = rrand(1, 6); },
				{ ~thumpRel = rrand(0.5, 4); },
				{ ~thumpOctave = rrand(2, 6); },
				{ ~thumpMinWait = rrand(0.15, 1); },
				{ ~thumpWaitWidth = rrand(0.15, 2); },
				{ ~thumpAmp = rrand(0.05, 0.15); },
			].choose.();
			rrand(0.5, 2).wait;
		}
	}.fork;

	~softyAtk = 1;
	~softyRel = 4;
	~softyOctave = 3;
	~softyMinWait = 0.2;
	~softyWaitWidth = 1.0;
	~softyAmp = 0.2;

	{ // play thump
		loop {
			rrand(0, ~chord.size-1).asInteger.do {
				var freq = ~s53.degreeToFreq(~chord.choose, ~rootFreq, rrand(2, ~softyOctave).round);
				Synth(\softy, [
					\freq, freq,
					\atk, ~softyAtk,
					\rel, ~softyRel,
					\c0, -3,
					\c1, \sine,
					\pan, rrand(-0.7, 0.7),
					\amp, ~softyAmp,
					\out, ~revBus]);
				rrand(0.02, 0.05).wait;
			};
			rrand(~softyMinWait, ~softyMinWait + ~softyWaitWidth).wait;
		}
	}.fork;

	{ // change softy parameters
		loop {
			[
				{ ~softyAtk = rrand(0.5, 4); },
				{ ~softyRel = rrand(1, 10); },
				{ ~thumpRel = rrand(0.5, 4); },
				{ ~softyOctave = rrand(2, 6); },
				{ ~softyMinWait = rrand(0.3, 2); },
				{ ~softyWaitWidth = rrand(0.3, 3); },
				{ ~softyAmp = rrand(0.05, 0.3); },
			].choose.();
			rrand(0.5, 2).wait;
		}
	}.fork;

	{ // chord change
		loop {
			rrand(1, 8).do {
				~chord = [~ch1, ~ch2, ~ch3, ~ch4].choose;
				exprand(1, 10).wait;
			};
			~changeChord.(rrand(0, ~numChords-1).asInteger);
		}
	}.fork;

});