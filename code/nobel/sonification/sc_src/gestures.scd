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

