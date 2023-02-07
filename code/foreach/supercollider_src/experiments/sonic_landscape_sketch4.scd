// same idea as sketch 3, user and webserver events
// add a rhythmical grid and rhythmical aspects to the pitches.

// TODO: make it more rhythmical
// - sharper attacks
// - shorter sounds
// -


(
~latency = 0.5;
~nv = 0.1; // smallest note value for scheduling
~clock = TempoClock(1, queueSize: 8192);
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
SynthDef(\tick2, {
	var sig, env, rq = \rq.kr(0.1);
	env = Env.perc(\atk.kr(0), \rel.kr(0.05), curve: [\c0.kr(-4), \c1.kr(-4)]).ar(2);
	sig = Impulse.ar(0);
	sig = sig * 0.5;
	// high freq and rq values causes the filter to blow up violently
	sig = RHPF.ar(sig, \freq.kr(1000).min(18000).max(20), rq.min(5)) * env;
	sig = Pan2.ar(sig, \pan.kr(0)) * \amp.kr(1.0) * 10;
	sig = sig.tanh; // Should never happen, but better to soft clip
	sig = AnalogTape.ar(sig, 0.0, 0.4, 0.1, oversample: 3);
	Out.ar(\out.kr(0), sig);
}).add;
SynthDef(\sine, {
	var sig, env;
	env = Env.linen(\atk.kr(0.01), \sus.kr(0.5), \rel.kr(0.2)).ar(2);
	sig = SinOsc.ar(\freq.kr(220), mul: \amp.kr(0.5)) * env;
	sig = Pan2.ar(sig, \pan.kr(0));
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\medium_reverb, { | out = 0, amp = 1, mix = 0.3  |
	var sig, wet, in;

	in = In.ar(\in.kr(10), 2);
	mix = mix.lag(\mixLag.kr(10));

	sig = HPF.ar(in, 120);

	wet = JPverb.ar(sig, 3.0, 0.9, 4.0, 0.8);
	// wet = GVerb.ar(sig, 300, 103, 0.43, 0.51, 15, -5.dbamp, -26.dbamp, -20.dbamp);
	// wet = Greyhole.ar(sig, \delayTime.kr(0.1), \damp.kr(0.7), \size.kr(1.0), \diff.kr(0.8), \feedback.kr(0.9));

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

~highActivityBus = Bus.audio(s, 2);
~highActivityChannel = Synth(\mixer_channel, [\in, ~highActivityBus, \out, ~revBus]);

)


// init chord to random chord and chord functions
(
~chord = ~all_chords.choose;
~last_chord_degrees = ~chord2degrees.(~chord);
~changeChordToSimilar = {
	var degrees, similar_chords, new_chord;
	similar_chords = ~get_similar_chords.(~chord, 7);
	if(similar_chords.size > 0) {
		new_chord = (similar_chords.choose)[0];
		new_chord.postln;
		degrees = ~chord2degrees.(~chord);
		degrees = ~findClosestVoicing.(~last_chord_degrees, degrees);
		~arpChord.(degrees.sort, 1.5, -1);
		~last_chord_degrees = degrees;
		~last_chord_degrees.postln;
		~chord = new_chord;
	};
};
~changeChordToRandom = {
	~chord = ~all_chords.choose;
	~last_chord_degrees = ~chord2degrees.(~chord);
};
)
~changeChordToSimilar.()
~changeChordToRandom.()

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
		var length = rrand(0.07, 0.3),
		atk = 0.001,
		extra_latency = ((atk/~nv) - (atk/~nv).floor) * ~nv,
		degree = ~last_chord_degrees.choose + 106,
		amp = rrand(0.01, 0.1),
		freq = ~s53.degreeToFreq(degree, ~rootFreq, 0);
		[
			{~clock.sched(~latency + extra_latency, Synth(\sine, [\freq, freq, \amp, amp,\atk, atk, \sus, 0, \rel, length*0.7, \out, ~revBus, \pan, rrand(-0.5, 0.5)]));},
			{~clock.sched(~latency + extra_latency, Synth(\sine, [\freq, freq, \amp, amp,\atk, atk, \sus, 0, \rel, length*0.7, \out, ~revBus, \pan, rrand(-0.5, 0.5)]));},
		].choose.();
	},
	{ |chord|
		var length = rrand(0.1, 0.5),
		atk = length,
		extra_latency = ((atk/~nv) - (atk/~nv).floor) * ~nv,
		degree = ~last_chord_degrees.choose + 106,
		amp = rrand(0.01, 0.1),
		freq = ~s53.degreeToFreq(degree, ~rootFreq, 0);
		~clock.sched(~latency + extra_latency, Synth(\dist_saw, [\freq, freq, \amp, amp,\atk, 0.01, \sus, 0.0, \rel, length, \out, ~revBus, \pan, rrand(-0.5, 0.5)]));
	},
	{ |chord|
		var length = rrand(0.2, 0.4),
		atk = length,
		extra_latency = ((atk/~nv) - (atk/~nv).floor) * ~nv,
		degree = ((chord.added_degrees + chord.root).choose),
		amp = exprand(0.005, 0.03),
		temp_chord = ([0, 9, 22, 31] + degree) % 53 + 106;
		{
			var pan = rrand(-0.5, 0.5);
			temp_chord.do { |d, i|
				var freq = ~s53.degreeToFreq(d, ~rootFreq, [0, 1].choose);
				~clock.sched(~latency + extra_latency, Synth(\sine, [\freq, freq, \amp, amp * 1.1.pow(i+1), \atk, length, \sus, 0.0, \rel, 0.001, \out, ~revBus, \pan, pan]));
				(length*0.2).wait;
			};
		}.fork;
	},
	{ |chord|
		var length = rrand(0.1, 0.4),
		atk = length,
		extra_latency = ((atk/~nv) - (atk/~nv).floor) * ~nv,
		// degree = ((chord.added_degrees + chord.root).choose),
		degree = ~last_chord_degrees.choose + 106,
		amp = exprand(0.005, 0.02),
		temp_chord = ([0, 31] + degree) % 53 + 106;
		{
			var pan = rrand(-0.5, 0.5);
			temp_chord.do { |d, i|
				var freq = ~s53.degreeToFreq(d, ~rootFreq, [0, 1].choose);
				~clock.sched(~latency + extra_latency, Synth(\sine, [\freq, freq, \amp, amp * 1.1.pow(i+1), \atk, atk, \sus, 0.0, \rel, 0.001, \out, ~revBus, \pan, pan]));
				(length*0.2).wait;
			};
		}.fork;
	},
];
)
~server_gestures[1].(~chord)

~serverGestureRoutine.stop


//// USER LAYER

// user gestures
(
~user_gestures = [
	{ |chord, pan|
		var length = rrand(2.0, 5.0),
		atk = length * 0.3,
		extra_latency = ((atk/~nv) - (atk/~nv).floor) * ~nv,
		freq = ~s53.degreeToFreq(chord.root, ~rootFreq, [-2, -1, 0].choose),
		amp = exprand(0.005, 0.1);
		~clock.sched(~latency + extra_latency, Synth(\softy, [\freq, freq, \amp, 0.1,\atk, atk, \rel, length-atk, \out, 0, \pan, pan]));
	},
	{ |chord, pan|
		var length = rrand(2.0, 5.0),
		atk = length * 0.3,
		extra_latency = ((atk/~nv) - (atk/~nv).floor) * ~nv,
		freq = ~s53.degreeToFreq(chord.fifth + chord.root, ~rootFreq, 0),
		amp = exprand(0.005, 0.1);
		~clock.sched(~latency + extra_latency, Synth(\softy, [\freq, freq, \amp, 0.1,\atk, atk, \rel, length-atk, \out, 0, \pan, pan]));
	},
	{ |chord, pan|
		var length = rrand(1.0, 2.5),
		atk = rrand(0.02, 0.3),
		extra_latency = ((atk/~nv) - (atk/~nv).floor) * ~nv,
		degree = ([chord.root, chord.fifth + chord.root].choose) % 53 - 53,
		amp = exprand(0.005, 0.1),
		freq = ~s53.degreeToFreq(degree, ~rootFreq, [-1, 0].choose);
		~clock.sched(~latency + extra_latency, Synth(\dist_sine, [\freq, freq, \amp, amp,\atk, atk, \sus, length * 0.1, \rel, length*0.6, \out, ~revBus, \pan, pan]));
	},
	{ |chord, pan|
		var length = rrand(0.6, 1.5),
		atk = rrand(0.1, 0.3),
		extra_latency = atk,
		degree = ([chord.root % 53, (chord.fifth + chord.root) % 53, ((chord.third + chord.root)%53) + 53].choose),
		amp = exprand(0.005, 0.1),
		freq = ~s53.degreeToFreq(degree, ~rootFreq, -1);
		~clock.sched(~latency + extra_latency, Synth(\dist_sine, [\freq, freq, \amp, amp, \atk, atk, \sus, 0, \rel, length, \out, 0, \pan, pan]));
	},
	{ |chord, pan|
		var length = rrand(0.8, 2.0),
		atk = rrand(0.1, 0.3),
		extra_latency = atk,
		degree = ([chord.root % 53, (chord.fifth + chord.root) % 53, ((chord.third + chord.root)%53) + 53].choose),
		amp = exprand(0.005, 0.1),
		freq = ~s53.degreeToFreq(degree, ~rootFreq, [-2, -1].choose);
		~clock.sched(~latency + extra_latency, Synth(\dist_sine, [\freq, freq, \amp, amp, \atk, atk, \sus, 0, \rel, length, \out, ~revBus, \pan, pan]));
	},
	{ |chord, pan|
		var length = rrand(0.8, 2.0),
		degree = ([chord.root % 53, (chord.fifth + chord.root) % 53, ((chord.third + chord.root)%53) + 53].choose),
		amp = exprand(0.005, 0.1),
		freq = ~s53.degreeToFreq(degree, ~rootFreq, -2);

		~clock.sched(~latency + 0.01, Synth(\dist_tri, [\freq, freq, \amp, amp, \atk, 0.01, \sus, 0.1, \rel, length, \out, ~revBus, \pan, pan]));
	},
];
)
(
~rootFreq = 60.midicps;
~s53 = Scale.chromatic('et53');
~clock = TempoClock(1, queueSize: 8192);
~revBus = Bus.audio(s, 2);
~rev = Synth(\medium_reverb, [\in, ~revBus, \mix, 0.15]);
~playUser = true;
~playServer = false;
~userPan = 0;
// run random user gestures
~userGestureRoutine = Routine({
	loop {
		if(~playUser) {
			~user_gestures.choose.(~chord, ~userPan);
		};
		[0.1, 0.2, 0.4, 0.6].choose.wait;
	}
}).play(~clock);

// run random server gestures
~serverGestureRoutine = Routine({
	loop {
		if(~playServer) {
			~server_gestures.choose.(~chord);
		};
		[0.1, 0.2, 0.15, 0.25, 0.3].choose.wait;
	}
}).play(~clock);

/*Routine({
loop {
Synth(\tick2, [
\freq, rrand(6000, 6500),
\rq, 0.1,
\amp, 0.5,
\atk, 0.002,
\out, ~outBus ]);
0.2.wait;
}
}).play(clock: ~clock);*/
)
~userGestureRoutine.stop
~playUser = false;
~playServer = true;
~userPan = -0
