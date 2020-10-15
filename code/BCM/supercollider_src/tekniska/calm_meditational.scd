~startIdleMusic = {
	var chord;
	~idle = true;
	~sequencer = ~newSequencer.(32);
	~resetCurrentFrame.();
	~droneAmpPhase = 1.0;
	~changeChord.(1);
	chord = [~ch1, ~ch2, ~ch3, ~ch4].choose;
	chord = chord.collect{ |degree| ~s53.degreeToFreq(degree + ~root, 0.midicps, ~octave) };
	~idlePdefs = List[\thumps];


	Pdef(\thumps, Pbind(
		\instrument, \thump,
		\dur, Prand([0.5, 1, 2, Pseq([0.25, 0.25, 1])], inf),
		\freq, Pxrand(chord, inf),
		\atk, Pwhite(0.1, 0.7),
		\rel, Pwhite(2, 5),
		\c0, 0,
		\c1, \sine,
		\pan, Pwhite(-0.7, 0.7),
		\amp, Pwhite(0.03, 0.05),
		\out, ~channels.default_channel.bus
	)).play;

	Pdef(\chord, Pbind(
		\instrument, \softy,
		\dur, Pwhite(1, 3),
		\freq, Pxrand([Pxrand(chord, 1), Pxrand(chord*2, 1)], inf),
		\atk, Pwhite(0.6, 4),
		// \rel, rrand(1, 3),
		\rel, Pwhite(1, 3),
		\c0, 2,
		\c1, \sine,
		\minrq, 0.001,
		\maxrq, 0.003,
		\brightness, 0,
		\stutterAmount, 0,
		\stutterSpeed, 0,
		\pan, Pwhite(-0.7, 0.7),
		\amp, 0.05,
		\out, ~channels.drone.bus
	)).play;
};

~stopIdleMusic = {
	~idle = false;
	Pdef(\thumps).stop;
	Pdef(\chord).stop;
};