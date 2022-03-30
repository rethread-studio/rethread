
~sounds = Environment(know: true);
~sounds.adding = { |  |
	Synth(\tick2, [\freq, 11000, \amp, 0.01]);
};
~sounds.subtract = {
	Synth(\tick2, [\freq,  6000, \amp, 0.01]);
};


~sounds.clamp = {
	Synth(\dist_noise, [\freq, 14000, \amp, 0.01, \rel, 0.02]);
};
~sounds.multiply = {
	Synth(\tick2, [\freq, 500, \amp, 0.01]);
};
~sounds.divide = {
	Synth(\tick2, [\freq, 200, \amp, 0.01]);
};

~sounds.enter_function = {
	Synth(\sine, [\freq, 200, \amp, 0.1, \atk, 0.1, \rel, 1.5]);
};