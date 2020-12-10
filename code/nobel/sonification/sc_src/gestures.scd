// Gestures

~morseGesture = { | freq, pan |
	rrand(5, 15).do {
		var dur = [0.1, 0.15, 0.2].choose * 0.25;
		Synth(\morse, [\out, ~decodeBus, \freq, freq, \amp, rrand(0.25, 0.5), \rel, dur, \pan, pan + rrand(-0.5, 0.5)]);
		dur.wait;
	}
};

~pingGesture = {
	{
		var freq = 87.5 * [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].choose,
		latency = rrand(1, 5).floor*0.5,
		gap = 0.05,
		startPan = rrand(0.1, 0.5) * [1, -1].choose,
		centerPan = rrand(-0.8, 0.8);
		while({freq > 3000}, { freq = freq * 0.5});
		Synth(\ping, [\freq, freq, \atk, 0.01, \rel, latency, \startPan, startPan + centerPan, \endPan, (startPan*(-1)) + centerPan, \out, ~revBus, \out, ~decodeBus]);

		(latency + gap).wait;
		[1, 3/2, 5/4, 2].do {|ratio| Synth(\softy, [\freq, freq * ratio * 0.25, \amp, 0.2, \pan, (startPan*(-1)) + centerPan, \atk, 0.1, \rel, rrand(0.3, 1.0)])};
		latency = rrand(1, 5).floor*0.5;
		startPan = startPan * (-1.0);
		Synth(\ping, [\freq, freq, \atk, 0.01, \rel, latency, \startPan, startPan + centerPan, \endPan, (startPan*(-1)) + centerPan, \out, ~decodeBus]);

		latency.wait;
		[1, 9/8, 5/4, 7/4].do {|ratio| Synth(\softy, [\freq, freq * ratio * 0.25, \amp, 0.2, \pan, (startPan*(-1)) + centerPan, \atk, 0.1, \rel, rrand(0.3, 1.0), \out, ~revBus])};
		~morseGesture.(freq, centerPan);

	}.fork;
};

// Give each region a chord where the "Stockholm" pitch is consonant/natural, but that don't contain it.
// Based on the distance from Stockholm the chord can get more complex
~stockholmPitch = 53;
// ~chordSweden = [0, 9, 22, 31, 48, 62, 75, 84, 101]; // suspended quality chord
~chordSweden = [31, 48, 62, 75]; // suspended quality chord
~chordEurope = [-8, 9, 23, 31, 45, 62, 76, 93, 107]; // 107 on top is 14 away from 93, but somewhat dissonant against 53
~chordAmericas = [-26, -9, 5, 22, 39, 75, 89, 106, 120]; // Polychord Ab / F / F#
~chordAfrica = [-79, -62, -48, -26, -9, 5, 150];
~chordOceania = [-39, -8, 14, 36, 84, 115];
~chordAsia = [-44, -22, 0, 14, 31, 39] ++ [ 67, 75, 84, 98, 106 ];
// ~chordOceania = [-40, -9, 22, 84, 115];
// -9 + 53 + 53 + 53
~octave = 5;
~activeChord = ~chordSweden;
~glissChordIndex = 0;
~glissGesture = { | duration, out = true |
	{
		var startFreq = ~s53.degreeToFreq(~stockholmPitch + ~root, 0.midicps, ~octave),
		endFreq = ~s53.degreeToFreq(~activeChord[~glissChordIndex] + ~root, 0.midicps, ~octave),
		endPan = rrand(0.4, 1.0) * [1, -1].choose,
		centerPan = rrand(-0.2, 0.2),
		amp = rrand(0.4, 0.9);
		// out = [true, false].choose;
		if(out, {
			Synth(\glissPing, [\startFreq, startFreq, \endFreq, endFreq, \atk, 0.01, \rel, duration, \startPan, centerPan, \endPan, endPan + centerPan, \out, ~decodeBus, \amp, amp]);
		}, {
			Synth(\glissPing, [\startFreq, endFreq, \endFreq, startFreq, \atk, 0.2, \rel, duration, \startPan, endPan + centerPan, \endPan, centerPan, \out, ~decodeBus, \amp, amp]);
		});
		~glissChordIndex = ~glissChordIndex + 1;
		if(~glissChordIndex >= ~activeChord.size) {
			~glissChordIndex = 0;
			~activeChord = ~activeChord.scramble;
		};
	}.fork;
};