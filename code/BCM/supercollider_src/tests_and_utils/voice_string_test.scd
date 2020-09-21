(
{
	var sig, gen, trig, freq = MouseX.kr(100, 500, 'exponential');
	trig = Impulse.ar(freq/2);
	gen = WhiteNoise.ar(0.1);
	sig = Pluck.ar(gen, trig, 0.2, freq.reciprocal, 1.0, 0.3);
	Pan2.ar(sig);
}.play;
)

(
~buf = Buffer.readChannel(s,
	"/media/erik/OS/Users/erikn/Documents/SuperCollider/fragile_nodes/sounds/Viskningar/Viskningar (Manga roster talar) edit_freeze_Erik NG.wav",
	0, -1, [0]
);
)
(
~ipBuffer = Buffer.readChannel(s,
	"/home/erik/Musik/BCM_voice/internet_protocol.wav",
	0, -1, [0]
);
)
(
~services = "/home/erik/Musik/BCM_voice/spoken/*.wav".resolveRelative.pathMatch.collect( { |file|
	Buffer.readChannel(s, file, channels: [0]);});
)

(
// Many freqneucies are interesting: 1000, 4000, 400, 40
// Lower frequencies sound better with a coef around 0.5
{
	var sig, gen, trig, freq = 40, coef;
	trig = Impulse.ar(freq/2);
	gen = PlayBuf.ar(1, ~services.choose, 1.0, loop: 1);
	coef = MouseX.kr(-0.5, 0.5);
	sig = Pluck.ar(gen, trig, 0.2, freq.reciprocal, MouseY.kr(0.1, 2.0), coef);
	Pan2.ar(sig);
}.play;
)



(
// Many freqneucies are interesting: 1000, 4000, 400, 40
// Lower frequencies sound better with a coef around 0.5
{
	var sig, gen, trig, freq = 100, coef, localin;
	trig = Impulse.ar(freq/2);
	gen = PlayBuf.ar(1, ~services.choose, 1.0, loop: 1);
	coef = MouseX.kr(-0.5, 0.5);

	localin = LocalIn.ar(1);
	sig = gen + (localin * 0.1);
	sig = CombC.ar(sig, 0.2, freq.reciprocal, MouseY.kr(0.1, 2.0));
	LocalOut.ar(OnePole.ar(sig, coef) * 0.9 * Decay.ar(Impulse.ar(freq/2), freq.reciprocal));
	Pan2.ar(sig);
}.play;
)

( // many singular voiced strings
{
	loop {
		{
			var sig, gen, trig, freq = 40 * [1, 10, 8, 50, 20, 4, 3, 5].choose, coef;
			trig = Impulse.ar(freq);
			gen = PlayBuf.ar(1, ~services.choose, 1.0, loop: 0);
			coef = freq.linlin(40, 4000, 0.5, 0.01);
			sig = Pluck.ar(gen, trig, 0.2, freq.reciprocal, MouseY.kr(0.1, 2.0), coef) * 0.25;
			DetectSilence.ar(sig, doneAction: 2);
			Pan2.ar(sig);
		}.play;
		// [0.125, 0.25, 0.5].choose.wait;
		0.4.wait;
	}
}.fork;
)
(
[ 22, 93, 0, 9, 71, 53, 40, 71, 9, 31, 62, 102, 62, 102, 22, 40, 84, 124, 84, 124, 31, 53, 93, 115 ].collect{ |degree|
	~s53.degreeToFreq(degree, 0.midicps, 3)
};
)
( // one long voice recording on a string
{
	{
		var sig, gen, trig, freq = 100, coef, trigSpeed;
		trigSpeed = MouseX.kr(1, 5);
		trig = Impulse.ar(freq/trigSpeed);
		gen = PlayBuf.ar(1, ~ipBuffer, 1.0, loop: 0);
		coef = freq.linlin(40, 4000, 0.5, 0.01);
		// coef = MouseX.kr(0.001, 0.5, 'exponential');
		sig = Pluck.ar(gen, trig, 0.2, freq.reciprocal, MouseY.kr(0.1, 2.0), coef) * 0.25;
		DetectSilence.ar(sig, doneAction: 2);
		Pan2.ar(sig);
	}.play;
}.fork;
)

~chord = [0, 14, 22, 31, 14, 45, 14, 9, 40, 9, 5, 36, 5]
( // one string, many voices
var pitches = ~chord.collect { |degree|
	~s53.degreeToFreq(degree, 0.midicps, 4)
};
SynthDef(\string_with_input, {
	var sig, gen = In.ar(\in.kr(10), 1), trig = Impulse.kr(0) + In.kr(\trig.kr(0), 1),
	// we need to adda tiny number to avoid freq.reciprocal to doa division by 0 on the first sample
	// there has to be a more elegant way
	freq = Demand.kr(trig, 0, Dseq(pitches, inf)) + 0.00000001,
	pluckTrig = Impulse.ar(freq),
	coef = freq.linexp(40, 4000, 0.5, 0.01);

	gen = (gen * 5).tanh * 0.5;
	sig = Pluck.ar(gen, pluckTrig, 0.2, freq.reciprocal.lag(0.03), MouseY.kr(0.1, 5.0), coef) * 0.05;
	sig = sig + Resonz.ar(sig, freq, 0.05, mul: 0.3);
	sig = Compander.ar(sig, sig, 0.5, 1.0, 1/3);
	sig = [sig, sig] + [DelayL.ar(sig, 0.1, TRand.kr(0.0001, 0.03, trig)), DelayL.ar(sig, 0.1, TRand.kr(0.0001, 0.03, trig))];
	sig = (sig * 0.8) + (JPverb.ar(sig, 2) * 0.2);
	// sig = Pan2.ar(sig);
	Out.ar(\out.kr(0), sig);
}).add;
~triggerBus = Bus.control(s, 1);
)
(
{
	var trig = Impulse.kr(1.5);
	Out.kr(~triggerBus, trig);
}.play;
)
(
{
	var voiceBus = Bus.audio(s, 1);
	s.sync();

	Synth(\string_with_input, [\in, voiceBus, \trig, ~triggerBus]);

	loop {
		rrand(0, 10).do {
			{
				var sig, bufnum = ~services.choose;
				sig = PlayBuf.ar(1, bufnum, BufRateScale.ir(bufnum), loop: 0, doneAction: 2);
				Out.ar(voiceBus, sig);
			}.play;
			// [0.125, 0.25, 0.5].choose.wait;
			0.1.wait;
		};
		rrand(0.5, 3).wait;
	}
}.fork;
)

(
{
	var voiceBus = Bus.audio(s, 1);
	s.sync();

	Synth(\string_with_input, [\in, voiceBus, \trig, ~triggerBus]);

	{
		var sig, bufnum = ~ipBuffer;
		sig = PlayBuf.ar(1, bufnum, BufRateScale.ir(bufnum), loop: 0, doneAction: 2);
		Out.ar(voiceBus, sig);
	}.play;
}.fork;
)


///// FILTERED VOICE

( // many singular voiced strings
{
	{
		var sig, gen, freq = 1000, coef, bwr, makeupGain;
		bwr = MouseX.kr(0.001, 0.5, 'exponential');
		makeupGain = 1.0/bwr;
		gen = PlayBuf.ar(1, ~ipBuffer, 1.0, loop: 0, doneAction: 2);
		// coef = MouseX.kr(0.001, 0.5, 'exponential');
		sig = Resonz.ar(gen, freq, bwr) * makeupGain * 0.25;
		Pan2.ar(sig);
	}.play;
}.fork;
)