// init all data needed for chords

~chord_types = [
	(
		root: 0,
		third: 17,
		fifth: 31,
		// extensions are stored as degrees
		added_degrees: [8, 43],
	),
	(
		root: 0,
		third: 17,
		fifth: 31,
		// extensions are stored as degrees
		added_degrees: [9, 44],
	),
	(
		root: 0,
		third: 17,
		fifth: 31,
		// extensions are stored as degrees
		added_degrees: [9, 26],
	),
	(
		root: 0,
		third: 17,
		fifth: 31,
		// extensions are stored as degrees
		added_degrees: [9, 26, 40],
	),
	(
		root: 0,
		third: 17,
		fifth: 31,
		// extensions are stored as degrees
		added_degrees: [9, 48],
	),
	(
		root: 0,
		third: 17,
		fifth: 31,
		// extensions are stored as degrees
		added_degrees: [9, 48],
	),
	(
		root: 0,
		third: 17,
		fifth: 31,
		// extensions are stored as degrees
		added_degrees: [5, 44],
	),
	(
		root: 0,
		third: 17,
		fifth: 31,
		// extensions are stored as degrees
		added_degrees: [44, 22],
	),
	(
		root: 0,
		third: 14,
		fifth: 31,
		// extensions are stored as degrees
		added_degrees: [45, 9],
	),
	(
		root: 0,
		third: 14,
		fifth: 31,
		// extensions are stored as degrees
		added_degrees: [45, 9, 22],
	),
	(
		root: 0,
		third: 14,
		fifth: 31,
		// extensions are stored as degrees
		added_degrees: [22, 39],
	),
	(
		root: 0,
		third: 14,
		fifth: 31,
		// extensions are stored as degrees
		added_degrees: [9, 40],
	),
	(
		root: 0,
		third: 14,
		fifth: 31,
		// extensions are stored as degrees
		added_degrees: [9, 26, 48],
	),
];
~all_chords = List[];
// add variants with all roots
53.do { |r|
	~chord_types.do { | chord |
		var new_chord = (
			root: r,
			third: chord.third,
			fifth: chord.fifth,
			added_degrees: chord.added_degrees,
		);
		~all_chords.add(new_chord);
	};
};
// chord helper functions
~chord2triad = { |chord|
	[0, chord.third, chord.fifth] + chord.root
};
~chord2degrees = { |chord|
	~chord2triad.(chord) ++ (chord.added_degrees + chord.root + 53)
};
// get similar chords
~get_similar_chords = { | chord, max_difference = 2 |
	var origin_degrees = ~chord2degrees.(chord) % 53,
	similar_chords = List[];
	~all_chords.do{ | other_chord |
		var other_degrees = ~chord2degrees.(other_chord) % 53,
		difference = 0;
		origin_degrees.do{ |origin_d|
			var closest_diff = 9999;
			other_degrees.do{ |other_d|
				var diff = (origin_d-other_d).abs();
				if(diff > (53/2)) {
					diff = 53 - diff;
				};
				if(diff < closest_diff) {
					closest_diff = diff;
				};
			};
			difference = difference + closest_diff;
		};
		if(difference <= max_difference && (difference != 0)) {
			similar_chords.add([other_chord, difference]);
		};
	};
	similar_chords
};

~findClosestVoicing = { | currentChord, newDegrees, edo = 53, minNote = -22, maxNote = 106 |
	var newChord;
	newChord = newDegrees.collect { | degree, i |
		var minDistance = 1000, minDistIndex = 0, minDistOctave, newNote;
		// find the note in the current chord that is closest to the new note from above or below
		currentChord.do { | note, i | var distance = 10000, old, new, oldOctave;
			// In SuperCollider -22%53 == 31 so % works for negative numbers (wrapping them to positive)
			// check octave of the chord note. The octave is stored as the offset in degrees, not number of octaves
			oldOctave = note - (note%edo);
			// bring both notes into the lowest octave
			old = note%edo;
			new = degree%edo;
			// check distance
			distance = abs(new-old);
			if(distance < minDistance) {
				minDistance = distance;
				minDistOctave = oldOctave;
				minDistIndex = i;
			};

			// reverse the order of the notes
			if(old < new, {
				// bring new note down an octave
				new = new - edo;
				oldOctave = oldOctave - edo;
			}, {
				// bring new note up an octave
				new = new + edo;
				oldOctave = oldOctave + edo;
			});

			// check distance again in the reversed interval
			distance = abs(new-old);
			if(distance < minDistance) {
				minDistance = distance;
				minDistOctave = oldOctave;
				minDistIndex = i;
			};
		};
		// return the new adjusted note
		newNote = (degree%edo) + minDistOctave;
		if(newNote > maxNote, {
			newNote = newNote - edo;
		});
		if(newNote < minNote, {
			newNote = newNote + edo;
		});
		newNote
	};
	newChord
};


// init chord to random chord and chord functions
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
	~changeChordAction.();
};