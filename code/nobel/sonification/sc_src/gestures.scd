// Gestures

~morseGesture = { | freq, pan |
	rrand(5, 15).do {
		var dur = [0.1, 0.15, 0.2, 0.25, 0.3].choose;
		Synth(\morse, [\out, ~revBus, \freq, freq, \amp, rrand(0.25, 0.5), \rel, dur, \pan, pan + rrand(-0.1, 0.1)]);
		dur.wait;
	}
};

~pingGesture = {
	{
		var freq = 87.5 * [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].choose,
		latency = rrand(1, 5).floor*0.5,
		startPan = rrand(0.3, 0.7) * [1, -1].choose,
		centerPan = rrand(-0.5, 0.5);
		while({freq > 3000}, { freq = freq * 0.5});
		Synth(\ping, [\freq, freq, \atk, 0.1, \rel, latency, \startPan, startPan + centerPan, \endPan, (startPan*(-1)) + centerPan, \out, ~revBus, \out, ~revBus]);

		latency.wait;
		[1, 3/2, 5/4, 2].do {|ratio| Synth(\softy, [\freq, freq * ratio * 0.25, \amp, 0.2, \pan, (startPan*(-1)) + centerPan, \atk, 0.1, \rel, rrand(0.3, 1.0)])};
		latency = rrand(1, 5).floor*0.5;
		startPan = startPan * (-1.0);
		Synth(\ping, [\freq, freq, \atk, 0.1, \rel, latency, \startPan, startPan + centerPan, \endPan, (startPan*(-1)) + centerPan, \out, ~revBus]);

		latency.wait;
		[1, 9/8, 5/4, 7/4].do {|ratio| Synth(\softy, [\freq, freq * ratio * 0.25, \amp, 0.2, \pan, (startPan*(-1)) + centerPan, \atk, 0.1, \rel, rrand(0.3, 1.0), \out, ~revBus])};
		~morseGesture.(freq, centerPan);

	}.fork;
};

