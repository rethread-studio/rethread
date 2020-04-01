// Thousands of sounds
(
s.waitForBoot({
// SynthDefs written by Eli Fieldsteel, https://sccode.org/1-5bA
	//fm synth
	SynthDef(\fm, {
		arg freq=500, mRatio=1, cRatio=1,
		index=1, iScale=5, cAtk=4, cRel=(-4),
		amp=0.2, atk=0.01, rel=3, pan=0,
		out=0, fx=0, fxsend=(-25);
		var car, mod, env, iEnv;

		//index of modulation
		iEnv = EnvGen.kr(
			Env(
				[index, index*iScale, index],
				[atk, rel],
				[cAtk, cRel]
			)
		);

		//amplitude envelope
		env = EnvGen.kr(Env.perc(atk,rel,curve:[cAtk,cRel]),doneAction:2);

		//modulator/carrier
		mod = SinOsc.ar(freq * mRatio, mul:freq * mRatio * iEnv);
		car = SinOsc.ar(freq * cRatio + mod) * env * amp;

		car = Pan2.ar(car, pan);

		//direct out/reverb send
		Out.ar(out, car);
		Out.ar(fx, car * fxsend.dbamp);
	}).add;

	//reverb
	SynthDef(\reverb, {
		arg in=0, out=0, dec=4, lpf=1500;
		var sig;
		sig = In.ar(in, 2).sum;
		sig = DelayN.ar(sig, 0.03, 0.03);
		sig = CombN.ar(sig, 0.1, {Rand(0.01,0.099)}!32, dec);
		sig = SplayAz.ar(2, sig);
		sig = LPF.ar(sig, lpf);
		5.do{sig = AllpassN.ar(sig, 0.1, {Rand(0.01,0.099)}!2, 3)};
		sig = LPF.ar(sig, lpf);
		sig = LeakDC.ar(sig);
		Out.ar(out, sig);
	}).add;

	~vbus = Bus.audio(s, 2);
	s.sync;

	Synth(\reverb, [\in, ~vbus]);

});

~freqs = 1000.collect{ rrand(400, 1200) };
{
	loop {
		var freq = ~freqs.choose, mRatio = rrand(1, 1).floor, iScale = 1, atk = 0.1, amp = 0.005, revdb = -30;
		if(rrand(0.0, 1.0) > 0.99) {
			mRatio = 9;
			iScale = 2;
			amp = 0.2;
			atk = 2;
			revdb = -40;
		};
		Synth(\fm, [
			\freq, freq,
			\mRatio, mRatio,
			\index, 1.0,
			\iScale,iScale,
			\atk, atk,
			\rel, 1 + atk,
			\amp, 0.005,
			\pan, rrand(-0.25, 0.25),
			\out, 0,
			\fx, ~vbus,
			\fxsend, revdb,
		]);
		0.01.wait;
	}
}.fork;
)

~freqs = 20.collect{ (100 * rrand(1, 48).floor)/rrand(1, 24).floor};

~freqs = 5.collect{ rrand(24, 96).floor.midicps};

~freqs = 20.collect{ (Scale.major.degrees.choose + (12 * rrand(2, 5).floor)).midicps};

~freqs = 10.collect{ (Scale.choose(5, 12).degrees.choose + (12 * rrand(3, 5).floor)).midicps};

~freqs = 6.collect{ (rrand(12, 32).floor * 2).midicps};

Scale.choose()

(
{ var num = 0;
	loop { var numFreqs = sin(num*0.1) * 0.5 + 0.5;
		numFreqs = (numFreqs.pow(3) * 50 + 1).asInt;
		("numFreqs: " + numFreqs).postln;
		~freqs = numFreqs.collect{ rrand(400, 1200) };
		num = num + 1;
		0.1.wait;
	};
}.fork;
)