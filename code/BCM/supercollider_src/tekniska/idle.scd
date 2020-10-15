//

~startIdleMusic = {
	var chord;
	~idle = true;
	~sequencer = ~newSequencer.(32);
	~resetCurrentFrame.();
	~droneAmpPhase = 1.0;
	~changeChord.(rrand(0, 2));
	chord = [~ch1, ~ch2, ~ch3, ~ch4].choose;
	chord = chord.collect{ |degree| ~s53.degreeToFreq(degree + ~root, 0.midicps, ~octave) };
	~idlePdefs = List[\thumps];


	Pdef(\thumps, Pbind(
		\instrument, \thump,
		\dur, Prand([0.25, 0.5, 1, Pseq([0.25, 0.25, 0.5])], inf),
		\freq, Pxrand(chord, inf),
		\atk, Pwhite(0.01, 0.03),
		\rel, Pwhite(2, 5),
		\c0, 0,
		\c1, \sine,
		\pan, Pwhite(-0.7, 0.7),
		\amp, Pwhite(0.03, 0.05),
		\out, ~channels.default_channel.bus
	)).play;

	Pdef(\kick, Pbind(\instrument, \kick,
		\dur, Prand([4, 8,
			Pseq([0.25, 3.75]),
			Pseq([3.75, 0.25]),
			Pseq([0.25, 3.5, 0.25]),
		], inf),
		\att, Pwhite(0.001, 0.01),
		\rel, Pwhite(0.1, 0.3),
		\sinfreq, Pwhite(170, 230),
		\glissf, Pwhite(0.4, 0.6),
		\glisstime, 0.035,
		\wobble, 0.4,
		\clickAdd, Pwhite(-700, 400),
		\amp, Pwhite(0.05, 0.20) * 0.1,
		\out, ~channels.percussion.bus
	)).play;

	Pdef(\perc1, Pbind(\instrument, \fm,
		\dur, Pxrand([
			Pseq([1/4, 1/8, 3/8, 1/4]),
			Pseq([1/6, 1/6, 1/6, 0.5, 1/12, 1/12, 1/12, 3/12]),
			Pseq([1/6, 1/6, 1/6, 0.5, 1/8, 1/8, 1/4, 3/16, 1/16]),
			Pseq([1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8]),
			Pseq([1/4, 1/4, 1/4, 1/4]),
			Pseq([0.5, 1/8, 1/8, 1/8, 1/8]),
			Pseq([0.5, 3/12, 1/12, 1/12, 1/12]),
			Pseq([0.5, 1/10, 2/10, 1/10, 1/10]),
			Pseq([1/12, 1/12, 1/12, 3/12, 1/12, 1/12, 1/12, 3/12]),
			Pseq([1/8, 7/8]),
			Pseq([1/8, 15/8]),
			Pseq([8]),
			Pseq([4]),
		], inf),
		\freq, 2000,
		\mRatio, Pwhite(1, 3),
		\cRatio, Pwhite(2, 16),
		\index, 2.4,
		\iScale, Pwhite(1, 10),
		\atk, 0.02,
		\rel, 0.01,
		\amp, Pwhite(0.015, 0.03),
		\out, ~channels.percussion.bus
	)).play;
};

~stopIdleMusic = {
	~idle = false;
	Pdef(\thumps).stop;
	Pdef(\chord).stop;
	Pdef(\perc1).stop;
	Pdef(\kick).stop;
};

/*~startIdleMusic.()
~stopIdleMusic.()*/