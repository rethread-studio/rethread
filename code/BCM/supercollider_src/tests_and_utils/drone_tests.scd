(
var chord = [~ch1, ~ch2, ~ch3, ~ch4].choose;
~droneSynths.do{|syn| syn.release};
~droneSynths = chord.collect{ |degree|
	var octave = rrand(1, 3).floor,
	freq = ~s53.degreeToFreq(degree, 0.midicps, ~octave+octave);
	Synth(\softy_sustained, [
		\freq, freq,
		\atk, rrand(1, 4),
		\rel, rrand(2, 5),
		\c0, 2,
		\c1, \sine,
		\minrq, 0.002,
		\maxrq, 0.01,
		\rq, rrand(0.007, 0.01),
		\pan, rrand(-0.7, 0.7),
		\amp, 0.05,
		\out, 0]);
};
)

(
var chord = [~ch1, ~ch2, ~ch3, ~ch4].choose;
~droneSynths.do{|syn, i|
	var octave = rrand(1, 3).floor,
	freq = ~s53.degreeToFreq(chord[i], 0.midicps, ~octave+octave);
	syn.set(\freq, freq)
};
)

(
~droneSynths.do{|syn, i|
	syn.set(\amp, 0.1)
};
)


~changeChord.();