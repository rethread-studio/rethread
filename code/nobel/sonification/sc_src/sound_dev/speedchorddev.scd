
(
~playShortChord = { | chord |
	chord.do{ | degree |
		var freq = ~s53.degreeToFreq(degree + ~root, 0.midicps, ~octave);
		Synth(\long_sine, [\freq, freq, \atk, 0.05, \rel, 0.1, \length, 0.2, \amp, 0.1]);
	};

};
	~playShortChord.(~activeChord);
)

~activeChord = ~chordAsia

(
{
	~root = rrand(-17, 17);
	loop {
		~activeChord = [~chordSweden, ~chordEurope, ~chordAfrica, ~chordOceania, ~chordAsia].choose;
		~playShortChord.(~activeChord);
		0.1.wait;
	};
}.fork;
)