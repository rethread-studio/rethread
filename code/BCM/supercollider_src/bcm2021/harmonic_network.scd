// harmonic network

// A network of harmonic motion can be designed from the lattices in Harmonic Experience

// A unit of the lattice consists of both the major and minor versions of chords a 5th apart, e.g. C F Bb
// Any chord can move by fifths up or down, preserving its major/minor mode. It can also move by 2 5ths if you immediately go back to the chord in between e.g. F G C.

// A major chord can move down the lattice to the parallel chords of the chords in the some 5th row (e.g. C -> fm/cm/gm)
// or up the lattice to a minor chord m3 below or M3 above (e.g. C -> am/em).

// A minor chord can move to the parallel chords like the major ones, and it can move down the lattice to chords in major M3 below or m3 above.

// A list of possible chords can be created this way, and they can be weighted by probability. Some chord changes should be less common than others (e.g. C -> cm and am -> C).

// We could also add some "gravity" to return back to the starting chord eventually.

(
~makeChord = { | root = 0, mode = \major |
	(
		root: root,
		mode: mode,
		list_weighted_next: { | self |
			var chords = List[], weights = List[], opposite_mode = \minor;
			if(self.mode == \minor, { opposite_mode = \major });
			// 5ths with the same mode
			chords.add(~makeChord.(self.root-31, self.mode)); weights.add(1);
			chords.add(~makeChord.(self.root+31, self.mode)); weights.add(1);

			// pentamerous parallel
			chords.add(~makeChord.(self.root-31, opposite_mode)); weights.add(1);
			chords.add(~makeChord.(self.root, opposite_mode)); weights.add(0.2);
			chords.add(~makeChord.(self.root+31, opposite_mode)); weights.add(1);

			// pentamerous movement
			switch(self.mode,
				\minor, {
					chords.add(~makeChord.(self.root-17, \major)); weights.add(0.5);
					chords.add(~makeChord.(self.root+14, \major)); weights.add(0.5);
				},
				\major, {
					chords.add(~makeChord.(self.root+17, \minor)); weights.add(0.5);
					chords.add(~makeChord.(self.root-14, \minor)); weights.add(0.5);
				}
			);
			weights = weights.asArray.normalizeSum;
			[chords, weights]
		},
		degrees: { | self |
			var degrees = List[];
			degrees.add(self.root % 53);
			degrees.add((self.root + 31) % 53);

			switch(self.mode,
				\minor, {
					degrees.add((self.root + 14) % 53);
				},
				\major, {
					degrees.add((self.root + 17) % 53);
				}
			);
		},
	)
};
)


c = ~makeChord.();

// Change to a new chord according to the weights
(var chords, weights, degrees;
chords = c.list_weighted_next();
weights = chords[1];
chords = chords[0];
c = chords.wchoose(weights);
degrees = c.degrees();
~launchChord.(degrees, 1);
)

(
	~s53 = Scale.chromatic('et53'); // For decoding 53edo
~padSynths = [];
~launchChord = { | degrees, length, octave = 5 |
	{
		~padSynths = degrees.collect{ |degree|
			{ var sig;
				sig = SinOsc.ar(~s53.degreeToFreq(degree + (53*octave), 0.midicps, 0), 0, 0.05)!2 * Env.perc(0.1, length).kr(2);
				Out.ar(0, sig);
				// Out.ar(~rbus, sig*0.1);
			}.play;
			0.02.wait;
		};
	}.fork;
};
)


// Test for harmonic_change2.scd
(
~h2ChangeChord.();
~chord.postln;
~h2TicksFromCenter.postln;
~launchChord.(~chord, 1);
)