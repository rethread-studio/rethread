
(
~s53 = Scale.chromatic('et53'); // For decoding 53edo
~chord = [0, 14, 31, 44];
~octave = 4;

~revBus = Bus.audio(s, 2);
~rev = Synth(\medium_reverb,  [\in, ~revBus]);
)

(
~ch1 = [0, 17, 31, 43];
~ch2 = [43, 57, 74, 88];
~ch3 = [74, 88, 106, 120];
~ch4 = [120, 137, 163];
~chord = ~ch1 ++ ~ch2 ++ ~ch3 ++ ~ch4;
)

( // spread the notes so that the chords are more equal in register
~ch1 = [0, 31, 57, 120, 43];
~ch2 = [17, 31, 74, 137, 88];
~ch3 = [31, 88, 163, 106, 120];
~ch4 = [43, 74, 106, 57, 163];
~chord = ~ch1 ++ ~ch2 ++ ~ch3 ++ ~ch4;
)

( // make ~ch2 less dissonant
~ch1 = [0, 31, 57, 120, 43, 137];
~ch2 = [17, 39, 53, 74, 137, 88];
~ch3 = [31, 88, 163, 106, 120, 151];
~ch4 = [43, 74, 106, 57, 163, 180];
~chord = ~ch1 ++ ~ch2 ++ ~ch3 ++ ~ch4;
)

~ch9 = [74, 88, 106, 120, 137]
~ch9 - 74

17 + 22

[0, 1] ++ [2, 3]

~chord = [0, 17, 31, 43, 57, 74, 88, 106, 120, 137, 163];

// thirds
~chord = [0, 17, 31, 48, 62, 79, 93, 110, 124, 141, 155];
~chord = [ 0, 14, 31, 45, 62, 76, 93, 107, 124, 138, 155 ];
~chord = [ 0, 14, 31, 45, 59, 76, 90, 104, 121, 135, 149, 166, 180 ];
~chord = [ 0, 17, 31, 43, 60, 74, 86, 103, 117, 129, 146, 160, 172 ];
~chord = [ 0, 17, 31, 48, 65, 79, 96, 113, 127, 144, 161, 175, 192 ];

~playSoft.(~chord)
~playMedium.(~chord)
~playSaw.(~chord)

( var note = 0;
~chord = [0];
5.do{ |i|
	var add = [14, 31] + note;
	note = add[add.size-1];
	note.postln;
	~chord = ~chord ++ add;
};
~chord
)
// minor 7
( var note = 0;
~chord = [0];
4.do{ |i|
	var add = [14, 31, 45] + note;
	note = add[add.size-1];
	note.postln;
	~chord = ~chord ++ add;
};
~chord
)
// harmonic 7
( var note = 0;
~chord = [0];
4.do{ |i|
	var add = [17, 31, 43] + note;
	note = add[add.size-1];
	note.postln;
	~chord = ~chord ++ add;
};
~chord
)
// major 7
( var note = 0;
~chord = [0];
4.do{ |i|
	var add = [17, 31, 48] + note;
	note = add[add.size-1];
	note.postln;
	~chord = ~chord ++ add;
};
~chord
)

// sussy chords
~chord = [0, 9, 22, 31, 44, 53, 66, 75, 88, 97, 110, 119];
(
~ch1 = [0, 9, 75, 88];
~ch2 = [9, 31, 97, 110];
~ch3 = [22, 53, 88, 97];
~ch4 = [31, 44, 97, 119];
~chord = ~ch1 ++ ~ch2 ++ ~ch3 ++ ~ch4;
)
~chord = [ 0, 9, 22, 31, 40, 53, 62, 71, 84, 93, 102, 115, 124 ];
(
~ch1 = [0, 9, 71, 93, 53, 22];
~ch2 = [9, 31, 62, 102, 40, 71];
~ch3 = [22, 40, 84, 124, 62, 102];
~ch4 = [31, 53, 93, 115, 124, 84];
~chord = ~ch1 ++ ~ch2 ++ ~ch3 ++ ~ch4;
)
~chord = [ 0, 9, 22, 31, 36, 45, 58, 67, 72, 81, 94, 103, 108, 117, 130, 139, 144 ];
~chord = [ 0, 9, 22, 31, 40, 49, 62, 71, 80, 89, 102, 111, 120 ];
( var note = 0;
~chord = [0];
4.do{ |i|
	var add = [9, 22, 31] + note;
	note = add[add.size-1];
	note.postln;
	~chord = ~chord ++ add;
};
~chord
)
( var note = 0;
~chord = [0];
3.do{ |i|
	var add = [9, 22, 31, 40] + note;
	note = add[add.size-1];
	note.postln;
	~chord = ~chord ++ add;
};
~chord
)

~playSoft.(~ch4)
~playMedium.(~chord)
~playSaw.(~ch4)

~playSoft.(~chord)
~playMedium.(~chord)
~playSaw.(~chord)

(
{
[~ch1, ~ch2, ~ch3, ~ch4, ~chord].do {|chord|
	~playSaw.(chord);
	2.wait;
};
}.fork;
)

~findChordInChord.(~chord, [17, 31])
~findChordInChord.(~chord, [14, 31])

(
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

~playSoft = { | chord |
	chord.do{ | degree |
		var freq = ~s53.degreeToFreq(degree, 0.midicps, ~octave);
		Synth(\softy, [\out, ~revBus, \freq, freq, \amp, 0.1]);

	};
};
~playMedium = {| chord |
	chord.do{ | degree |
		var freq = ~s53.degreeToFreq(degree, 0.midicps, ~octave,);
		Synth(\thump, [\out, ~revBus, \freq, freq, \amp, 0.1]);

	};
};

~playSaw = {| chord |
	chord.do{ | degree |
		var freq = ~s53.degreeToFreq(degree, 0.midicps, ~octave);
		Synth(\reverse_saw, [\out, ~revBus, \freq, freq, \amp, 0.1]);

	};
};

~findPitchClassInChord = { | class, chord |
	var result = false;
	chord.do{ | degree |
		if(class == (degree % 53)) {
			result = true;
		};
	};
	result;
};

~findChordInChord = { | chord, searchChord |
	var roots = Set[];
	chord.do{ | rootDegree | var rootMod, foundPitches = 0;
		rootMod = rootDegree % 53;
		searchChord.do { | searchDegree |
			if(~findPitchClassInChord.((rootMod + searchDegree) % 53, chord)) {
				foundPitches = foundPitches + 1;
			};
		};
		if(foundPitches == searchChord.size()) {
			roots.add(rootMod);
		};
	};
	roots
};
)

