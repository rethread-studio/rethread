/*(
SynthDef(\unstable_sine, {
	var sig, env, mod, freq = \freq.kr(220);
	env = Env.adsr(\atk.kr(0.1), \decay.kr(0.01), \sus.kr(1.0), \rel.kr(2.2)).ar(2);
	mod = SinOsc.ar(freq * \mod_ratio.kr(1.0), mul: freq * \mod_mul.kr(1.0) * LFNoise1.kr(LFNoise1.kr(0.2).range(0.5, 3)).range(0.1, 1.01).pow(4));
	sig = SinOsc.ar(freq + mod, mul: \amp.kr(0.5)) * env * LFNoise1.kr(4).range(0.3, 1.0);
	sig = Pan2.ar(sig, \pan.kr(0));
	Out.ar(\out.kr(0), sig);
}).add;
)




(*/
//
{
var s53 = Scale.chromatic('et53'), chord;
/*~revBus = Bus.audio(s, 2);
~rev = Synth(\medium_reverb, [\in, ~revBus, \mix, 0.3, \out, 0]);*/
chord = [-53, 17, -22, 48, 9+53, 26+53];
chord = [-53, -22, 53, 9+53, 22+53, 31+53];

chord.do{ |degree|
	var freq = s53.degreeToFreq(degree, 36.midicps, 0);
	Synth(\unstable_sine, [\freq, freq, \mod_ratio, 4.0, \mod_mul, 5, \amp, 0.05, \out, ~revBus]);
};
}.();

//)