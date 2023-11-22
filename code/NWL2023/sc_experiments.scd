~buf = Buffer.readChannel(s, "/home/erik/Nextcloud/reinverse_traces/buf_org.wav", channels:[0]);
~buf = Buffer.readChannel(s, "/home/erik/Nextcloud/reinverse_traces/buf_org_intructions_only.wav", channels:[0]);
(
{
	var sig, env, noise, trig = Impulse.kr((32/60 * 0.25));
	env = EnvGen.kr(Env.perc(0.01, 1.0), trig);
	noise = PlayBuf.ar(1, ~buf, 0.5);
	sig = Pluck.ar(noise * env, trig, delaytime: ([48, 53, 55, 57].midicps * 0.5).reciprocal, coef: 0.8, decaytime: 0.5);
	sig = Mix.ar(sig) * 0.5;
	sig = sig * (noise * SinOsc.kr(0.7).range(0.3, 0.01) + 1.0);
	sig = JPverb.ar(sig, 20.0, 0.5, size: 1.0, earlyDiff: 0.9) + sig;
	sig = sig * (noise * SinOsc.kr(0.3).range(0.3, 0.01) + 1.0);
	sig = (sig.tanh*2) * 0.5;
	Line.kr(0, 1, 60, doneAction: 2);
	sig * 0.3
	// sig!2 * 0.2
}.play;
)

(
~s53 = Scale.chromatic('et53');
~toFreq53 = {|list|
	list.collect{|deg| ~s53.degreeToFreq(deg, 100, 1)
	};
};
)
(
var scale = ~toFreq53.([0, 17, 31, 48, 53+9, 53+26, 53+40, 53+40+17, 53+40+17+14]);
scale.postln;
{
	Out.ar(10, PlayBuf.ar(1, ~buf, rate: 0.1));
}.play(addAction: \addToHead);
{ var i= 0;
	loop{
		{
			var sig, noise, freq = scale[i];
			noise = In.ar(10);
			sig = SinOsc.ar(freq * 0.5 * (noise * Rand(0, 0.015) + 1)) * Env.perc(10.1, 10.0).kr(2) * ExpRand(0.01, 0.2);
			sig = LPF.ar(sig, 2000);
			Pan2.ar(sig, Rand(-0.5, 0.5))
		}.play(addAction: \addToTail);
		(60/32 * 0.125).wait;
		i = (i+1) % scale.size;
	}
}.fork;
)

// Sines and noise
(
var scale = ~toFreq53.([0, 17, 31, 48, 53+9, 53+26, 53+40, 53+40+17, 53+40+17+14]);
scale.postln;
{
	Out.ar(10, PlayBuf.ar(1, ~buf, rate: 0.2));
}.play(addAction: \addToHead);

{ var i= 0;
	loop {
		var noise_amount = [0, 1, 8, 32].choose;
		scale.do{|freq|
			{
				var sig, noise;
				noise = In.ar(10);
				sig = SinOsc.ar(freq * 0.5 * (noise * Rand(0, 0.025) + 1 + (noise*freq*noise_amount))) * Env.perc(10.1, 10.0).kr(2) * ExpRand(0.01, 0.2);
				sig = LPF.ar(sig, 2000);
				sig = AllpassN.ar(sig, 0.2, 0.1, 0.5);
				Pan2.ar(sig, Rand(-0.5, 0.5))
			}.play(addAction: \addToTail);

		};
		if(rrand(0.0, 1.0) > 0.1, {
			{var sig;
				sig = (SinOsc.ar(2500) * 50).tanh * 0.1* Env.perc(0.001, 0.3).kr(0);
				sig = JPverb.ar(sig, 10) + sig;
				DetectSilence.ar(sig);
				sig!2
			}.play;
		});
		(60/32 * 4).wait;
		i = (i+1) % scale.size;
	}
}.fork;
)

// Sines and noise 2
(
var scale = ~toFreq53.([0, 17, 31, 48, 53+9, 53+26, 53+40, 53+40+17, 53+40+17+14]);
scale.postln;
{
	Out.ar(10, PlayBuf.ar(1, ~buf, rate: 0.2));
}.play(addAction: \addToHead);

{ var i= 0;
	loop {
		var noise_amount = [0, 1, 8, 32].choose;
		scale.do{|freq|
			{
				var sig, noise;
				noise = In.ar(10);
				sig = SinOsc.ar(freq * 0.5 * (noise * Rand(0, 0.025) + 1) + (noise*freq*noise_amount)) * Env.perc(10.1, 10.0).kr(2) * ExpRand(0.01, 0.2);
				sig = LPF.ar(sig, 2000);
				sig = AllpassN.ar(sig, 0.2, 0.1, 0.5);
				Pan2.ar(sig, Rand(-0.5, 0.5))
			}.play(addAction: \addToTail);

		};
		if(rrand(0.0, 1.0) > 0.1, {
			{var sig;
				sig = (SinOsc.ar(2500) * 5).tanh * 0.05* Env.perc(0.001, 0.3).kr(0);
				sig = JPverb.ar(sig, 10) + sig;
				DetectSilence.ar(sig);
				sig!2
			}.play;
		});
		(60/32 * 4).wait;
		i = (i+1) % scale.size;
	}
}.fork;
)

// Slowly modulated sines
(
var scale = ~toFreq53.([0, 17, 31, 48, 53+9, 53+26, 53+40, 53+40+17, 53+40+17+14]+53);
scale.postln;
{
	Out.ar(10, PlayBuf.ar(1, ~buf, rate: 0.02));
}.play(addAction: \addToHead);

{ var i= 0;
	loop {
		var noise_amount = [0, 1, 8, 32].choose;
		scale.do{|freq|
			{
				var sig, noise;
				noise = In.ar(10);
				sig = SinOsc.ar(freq * 0.5 * (noise * Line.kr(0, 0.425, 10.0) + 1)) * Env.perc(0.1, 10.0).kr(2) * ExpRand(0.01, 0.2);
				sig = LPF.ar(sig, 2000);
				sig = AllpassN.ar(sig, 0.2, 0.1, 0.5);
				Pan2.ar(sig, Rand(-0.5, 0.5))
			}.play(addAction: \addToTail);

			(60/32 * 0.25).wait;
		};
		(60/32 * 1).wait;
		// scale = scale * [1.5, 0.75, 0.5, 5/4, 4/5];
		scale = scale * [3/2, 3/4, 2/3, 5/4, 4/5, 4/3].choose;

		i = (i+1) % scale.size;
	}
}.fork;
)



// At wider beams: bright sine tone fading in


