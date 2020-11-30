~now = { Date.localtime.rawSeconds };

s.waitForBoot({
	~startTime = ~now.();

	"synthdefs.scd".loadRelative;

	~revBus = Bus.audio(s, 2);
	~rev = Synth(\medium_reverb, [\in, ~revBus, \out, 0, \mix, 0.15, \rt, 2.0]);

	~noiseBuf = Buffer.alloc(s, s.sampleRate * 4, 1);

	s.sync();

	~capacitors = List[];
	// "capacitor.scd".loadRelative;

	~allPackets = List[];

	~glitchMinFreq = 2;
	~glitchMaxFreq = 10000;
	~glitchRangeCurve = 80;

	"receive_osc.scd".loadRelative;

	"gestures.scd".loadRelative;

	{
		loop {
			~pingGesture.();
			rrand(1, 8).floor.wait;
		};
	}.fork;

	{ // Change glitch parameters randomly
		loop {
			~glitchMinFreq = exprand(2, 100);
			~glitchMaxFreq = rrand(2000, 10000);
			~glitchRangeCurve = rrand(0.0, 1.0).lincurve(0.0, 1.0, 2, 80, -6);
			rrand(0.5, 2.0).wait;
		};
	}.fork;

	// Play from the buffer that contains the glitch content of all the packets coming in
	// Synth(\loop_buffer, [\bufnum, ~noiseBuf, \out, ~revBus, \amp, 0.25]);

});

/*
Synth(\loop_buffer, [\bufnum, ~noiseBuf, \out, ~revBus, \amp, 0.25]);

*/