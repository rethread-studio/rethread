// pitch based sonic landscape sketch

// two layers: webserver events and user events

// basic chord is changed when the question changes
// the chord can be changed to a close variant within a question

// the meaning of the harmony: harmony often conveys meaning through tension/resolution, consonance/dissonance or the movement between chords e.g. mediantic, false resolutions etc.

// webserver layer: higher pitched sounds, using higher extensions
// one such higher extension can be used as a kind of temporary root up there for a gesture or similar, e.g. building a chord on top of the added tone


// user layer: focus on root and fifth

(
SynthDef(\softy, {
	var sig, env, freq = \freq.kr(220), rel = \rel.kr(2);
	env = Env.perc(\atk.kr(0.1), rel, curve: [\c0.kr(\cub), \c1.kr(\cub)]).kr(2);
	sig = Resonz.ar(PinkNoise.ar(mul: env), freq, 0.007, mul: 20);
	sig = LPF.ar(sig, Line.ar(100, 4000, rel/2));
	sig = sig * \amp.kr(0.5) * AmpCompA.kr(freq, 20);
	sig = Pan2.ar(sig, \pan.kr(0));
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\dist_sine, {
	var sig, env, freq = \freq.kr(220);
	env = Env.linen(\atk.kr(0.01), \sus.kr(0.5), \rel.kr(0.2)).ar(2);
	sig = SinOsc.ar(freq);
	sig = AnalogTape.ar(sig, 0.1, 0.3, 0.2, oversample: 3);
	sig = AnalogVintageDistortion.ar(
		sig,
		drivegain: 0.1,
		bias: 0.2,
		lowgain: 0.1,
		highgain: 0.1,
		shelvingfreq: 600,
		oversample: 2,
	);
	sig = Pan2.ar(sig * \amp.kr(0.5) * env * AmpCompA.kr(freq, 20), \pan.kr(0));
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\dist_tri, {
	var sig, env, freq = \freq.kr(220);
	env = Env.linen(\atk.kr(0.01), \sus.kr(0.5), \rel.kr(0.2)).ar(2);
	sig = DPW3Tri.ar(freq);
	sig = AnalogTape.ar(sig, 0.0, 0.1, 0.2, oversample: 3);
	sig = AnalogVintageDistortion.ar(
		sig,
		drivegain: 0.05,
		bias: 0.0,
		lowgain: 0.05,
		highgain: 0.05,
		shelvingfreq: 600,
		oversample: 2,
	);
	sig = Pan2.ar(sig * \amp.kr(0.5) * env * AmpCompA.kr(freq, 20), \pan.kr(0));
	Out.ar(\out.kr(0), sig);
}).add;
SynthDef(\dist_saw, {
	var sig, env, freq = \freq.kr(220);
	env = Env.linen(\atk.kr(0.01), \sus.kr(0.5), \rel.kr(0.2)).ar(2);
	sig = DPW3Tri.ar(freq);
	sig = AnalogTape.ar(sig, 0.0, 0.1, 0.2, oversample: 3);
	sig = AnalogVintageDistortion.ar(
		sig,
		drivegain: 0.05,
		bias: 0.0,
		lowgain: 0.05,
		highgain: 0.05,
		shelvingfreq: 600,
		oversample: 2,
	);
	sig = Pan2.ar(sig * \amp.kr(0.5) * env * AmpCompA.kr(freq, 20), \pan.kr(0));
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

)

(
// with reverb

~revBus = Bus.audio(s, 2);
~rev = Synth(\medium_reverb, [\in, ~revBus, \mix, 0.15]);

~lowBus = Bus.audio(s, 2);
~lowFilter = Synth(\low_rumble_filter,  [\in, ~lowBus, \lpf, 100, \amp, 0.1, \out, ~revBus]);

~highActivityBus = Bus.audio(s, 2);
~highActivityChannel = Synth(\mixer_channel, [\in, ~highActivityBus, \out, ~revBus]);

)

(
~rootFreq = 60.midicps;
~s53 = Scale.chromatic('et53');
~playChord = { |chord, length = 3|
	{
		var numPitches = chord.size;
		chord.do { |degree|
			var freq = ~s53.degreeToFreq(degree, ~rootFreq, 0);
			Synth(\softy, [\freq, freq, \amp, 1.0/numPitches,\atk, length*0.3, \rel, length*0.7, \out, ~revBus, \pan, rrand(-0.5, 0.5)]);
			Synth(\sine, [\freq, freq,\atk, 0.01, \rel, length*0.25, \amp, 0.5/numPitches, \out, ~outBus]);
			exprand(0.01, 0.025).wait;
		};
	}.fork;
};
~arpChord = { |chord, length = 3, octave = 0|
	{
		var numPitches = chord.size;
		chord.do { |degree|
			var freq = ~s53.degreeToFreq(degree, ~rootFreq, octave);
			/*Synth(\softy, [\freq, freq, \amp, 1.0/numPitches,\atk, length*0.3, \rel, length*0.7, \out, ~revBus, \pan, rrand(-0.5, 0.5)]);*/
			Synth(\dist_saw, [\freq, freq,\atk, 0.2, \rel, length*0.75, \amp, 0.5/numPitches, \out, ~revBus]);
			0.1.wait;
		};
	}.fork;
};
)

~findClosestVoicing.([53, 9, 17, 31, 48], [0, 9, 17+53, 31, 48]+31);
(
// take a list of degrees and spread them out so that there is a minimum of distance between each pitch
~enforce_spread_voicing = { | chord, min_dist = 17 |
	var new_chord = chord.copy.sort;
	(new_chord.size-2).do{ |i|
		((i+1)..(new_chord.size-1)).do { |k|
			if((new_chord[k] - new_chord[i]).abs() < min_dist) {
				new_chord[k] = new_chord[k] + 53;
			};
		};
	};
	new_chord
};
)
~enforce_spread_voicing.([0, 3, 9, 17, 31]);
(
var degrees = ~chord2degrees.(~all_chords[0]) % 53;
~playChord.(degrees);
)

(
~chord = ~all_chords[2];
~last_chord_degrees = ~chord2degrees.(~chord);
)
(
~chord = ~all_chords[2];
~last_chord_degrees = ~enforce_spread_voicing.(~chord2degrees.(~chord));
)
(
var degrees, similar_chords, new_chord;
similar_chords = ~get_similar_chords.(~chord, 7);
if(similar_chords.size > 0) {
	new_chord = (similar_chords.choose)[0];
	new_chord.postln;
	degrees = ~chord2degrees.(~chord);
	degrees = ~findClosestVoicing.(~last_chord_degrees, degrees);
	// ~arpChord.(degrees.sort, 1);
	~last_chord_degrees = degrees;
	~chord = new_chord;
};
)

// set chord to random chord
~chord = ~all_chords.choose;

// automatically switch to a sinimalr chord every now and then
(
~chordSimilarSwitchRoutine = {
	loop {
		var degrees, similar_chords, new_chord;
		similar_chords = ~get_similar_chords.(~chord, 7);
		if(similar_chords.size > 0) {
			new_chord = (similar_chords.choose)[0];
			new_chord.postln;
			degrees = ~chord2degrees.(~chord);
			degrees = ~findClosestVoicing.(~last_chord_degrees, degrees);
			~arpChord.(degrees.sort, 1.5, -1);
			~last_chord_degrees = degrees;
			~chord = new_chord;
		};
		10.wait;
	};
}.fork;
)
~chordSimilarSwitchRoutine.stop

//// WEBSERVER LAYER
(
~server_gestures = [
	{ |chord|
		var length = rrand(0.1, 0.5),
		degree = ((chord.added_degrees + chord.root).choose) % 53 + 106,
		amp = rrand(0.01, 0.1),
		freq = ~s53.degreeToFreq(degree, ~rootFreq, 0);
		[
			{Synth(\sine, [\freq, freq, \amp, amp,\atk, length*0.3, \sus, 0, \rel, length*0.7, \out, ~revBus, \pan, rrand(-0.5, 0.5)]);},
			{Synth(\sine, [\freq, freq, \amp, amp,\atk, length*0.3, \sus, 0, \rel, length*0.7, \out, ~revBus, \pan, rrand(-0.5, 0.5)]);},
		].choose.();
	},
	{ |chord|
		var length = rrand(0.1, 0.5),
		degree = ((chord.added_degrees + chord.root).choose) % 53 + 106,
		amp = rrand(0.01, 0.1),
		freq = ~s53.degreeToFreq(degree, ~rootFreq, 0);
		Synth(\dist_saw, [\freq, freq, \amp, amp,\atk, 0.01, \sus, 0.0, \rel, length, \out, ~revBus, \pan, rrand(-0.5, 0.5)]);
	},
	{ |chord|
		var length = rrand(0.3, 0.5),
		degree = ((chord.added_degrees + chord.root).choose),
		amp = exprand(0.005, 0.03),
		temp_chord = ([0, 9, 22, 31] + degree) % 53 + 106;
		{
			var pan = rrand(-0.5, 0.5);
			temp_chord.do { |d, i|
				var freq = ~s53.degreeToFreq(d, ~rootFreq, [0, 1].choose);
				Synth(\sine, [\freq, freq, \amp, amp * 1.1.pow(i+1), \atk, length, \sus, 0.0, \rel, 0.001, \out, ~revBus, \pan, pan]);
				(length*0.2).wait;
			};
		}.fork;
	},
	{ |chord|
		var length = rrand(0.1, 0.4),
		degree = ((chord.added_degrees + chord.root).choose),
		amp = exprand(0.005, 0.02),
		temp_chord = ([0, 31] + degree) % 53 + 106;
		{
			var pan = rrand(-0.5, 0.5);
			temp_chord.do { |d, i|
				var freq = ~s53.degreeToFreq(d, ~rootFreq, [0, 1].choose);
				Synth(\sine, [\freq, freq, \amp, amp * 1.1.pow(i+1), \atk, length, \sus, 0.0, \rel, 0.001, \out, ~revBus, \pan, pan]);
				(length*0.2).wait;
			};
		}.fork;
	},
];
)
~server_gestures[1].(~chord)
( // run random server gestures
~serverGestureRoutine = {
	loop {
		~server_gestures.choose.(~chord);
		exprand(0.1, 1.0).wait;
	}
}.fork;
)
~serverGestureRoutine.stop

//// USER LAYER

// user gestures
(
~user_gestures = [
	{ |chord|
		var length = rrand(0.5, 4.0), freq = ~s53.degreeToFreq(chord.root, ~rootFreq, [-1, 0].choose),
		amp = exprand(0.005, 0.1);
		Synth(\softy, [\freq, freq, \amp, 0.1,\atk, length*0.3, \rel, length*0.7, \out, ~revBus, \pan, rrand(-0.5, 0.5)]);
	},
	{ |chord|
		var length = rrand(0.5, 4.0), freq = ~s53.degreeToFreq(chord.fifth + chord.root, ~rootFreq, 0),
		amp = exprand(0.005, 0.1);
		Synth(\softy, [\freq, freq, \amp, 0.1,\atk, length*0.3, \rel, length*0.7, \out, ~revBus, \pan, rrand(-0.5, 0.5)]);
	},
	{ |chord|
		var length = rrand(0.5, 2.0),
		degree = ([chord.root, chord.fifth + chord.root].choose) % 53 - 53,
		amp = exprand(0.005, 0.1),
		freq = ~s53.degreeToFreq(degree, ~rootFreq, [-1, 0].choose);
		Synth(\sine, [\freq, freq, \amp, amp,\atk, length*0.3, \sus, length * 0.1, \rel, length*0.6, \out, ~revBus, \pan, rrand(-0.5, 0.5)]);
	},
	{ |chord|
		var length = rrand(0.3, 1.0),
		degree = ([chord.root, chord.fifth + chord.root, chord.third + chord.root].choose) % 53,
		amp = exprand(0.005, 0.1),
		freq = ~s53.degreeToFreq(degree, ~rootFreq, -1);
		Synth(\sine, [\freq, freq, \amp, amp, \atk, 0.01, \sus, 0, \rel, length, \out, ~revBus, \pan, rrand(-0.5, 0.5)]);
	},
	{ |chord|
		var length = rrand(0.3, 1.0),
		degree = ([chord.root, chord.fifth + chord.root, chord.third + chord.root].choose) % 53,
		amp = exprand(0.005, 0.1),
		freq = ~s53.degreeToFreq(degree, ~rootFreq, [-2, -1].choose);
		Synth(\dist_sine, [\freq, freq, \amp, amp, \atk, length, \sus, 0, \rel, 0.1, \out, ~revBus, \pan, rrand(-0.5, 0.5)]);
	},
	{ |chord|
		var length = rrand(0.3, 1.0),
		degree = ([chord.root, chord.fifth + chord.root, chord.third + chord.root].choose) % 53,
		amp = exprand(0.005, 0.1),
		freq = ~s53.degreeToFreq(degree, ~rootFreq, -2);
		Synth(\dist_tri, [\freq, freq, \amp, amp, \atk, 0.01, \sus, 0.1, \rel, length, \out, ~revBus, \pan, rrand(-0.5, 0.5)]);
	},
];
)
( // run random user gestures
~userGestureRoutine = {
	loop {
		~user_gestures.choose.(~chord);
		rrand(0.1, 1.0).wait;
	}
}.fork;
)
~userGestureRoutine.stop