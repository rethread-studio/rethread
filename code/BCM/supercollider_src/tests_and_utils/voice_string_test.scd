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
	var sig, gen, trig, freq = 800, coef;
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
	var sig, gen, trig, freq = 400, coef, localin;
	trig = Impulse.ar(freq/2);
	gen = PlayBuf.ar(1, ~buf, 1.0, loop: 1);
	coef = MouseX.kr(-0.5, 0.5);

	localin = LocalIn.ar(1);
	sig = CombC.ar(gen, 0.2, freq.reciprocal, MouseY.kr(0.1, 2.0));
	sig = sig + (localin * 0.5);
	LocalOut.ar(LPF.ar(sig, freq));
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

( // one string, many voices
SynthDef(\string_with_input, {
	var sig, gen = In.ar(\in.kr(10), 1), trig = Impulse.kr(0) + Impulse.kr(6.0),
	// we need to adda tiny number to avoid freq.reciprocal to doa division by 0 on the first sample
	// there has to be a more elegant way
	freq = Demand.kr(trig, 0, Dseq(40 * [1, 10, 8, 50, 20, 4, 3, 5], inf)) + 0.00000001,
	pluckTrig = Impulse.ar(freq),
	coef = freq.linexp(40, 4000, 0.5, 0.01);
	freq.reciprocal.poll;
	sig = Pluck.ar(gen, pluckTrig, 0.2, freq.reciprocal, MouseY.kr(0.1, 2.0), coef);
	sig = Pan2.ar(sig);
	Out.ar(\out.kr(0), sig);
}).add;
{
	var voiceBus = Bus.audio(s, 1);
	s.sync();

	Synth(\string_with_input, [\in, voiceBus]);

	loop {
		{
			var sig, bufnum = ~services.choose;
			sig = PlayBuf.ar(1, bufnum, BufRateScale.ir(bufnum), loop: 0, doneAction: 2);
			Out.ar(voiceBus, sig);
		}.play;
		// [0.125, 0.25, 0.5].choose.wait;
		0.3.wait;
	}
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