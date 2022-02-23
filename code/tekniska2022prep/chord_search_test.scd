(
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
		fifth: 26,
		// extensions are stored as degrees
		added_degrees: [5, 44],
	),
	(
		root: 0,
		third: 17,
		fifth: 36,
		// extensions are stored as degrees
		added_degrees: [9, 44],
	),
	(
		root: 0,
		third: 17,
		fifth: 36,
		// extensions are stored as degrees
		added_degrees: [44, 22],
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
	~chord2triad.(chord) ++ (chord.added_degrees + chord.root)
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
		if(difference <= max_difference && difference != 0) {
			similar_chords.add([other_chord, difference]);
		};
	};
	similar_chords
};
)

~all_chords.size
~chord2degrees.(~all_chords[31]) % 53
~chord.added_degrees
(
var origin_chord = ~chord_types[0];
("origin chord: " + ~chord2degrees.(origin_chord)).postln;
~get_similar_chords.(~chord_types[0], 4).do { | result |
	var alt_chord = result[0], diff = result[1];
	( "" ++ ~chord2degrees.(alt_chord) + " " + diff).postln;a

};
)
