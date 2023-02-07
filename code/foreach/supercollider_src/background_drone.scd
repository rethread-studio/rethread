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
~background_chords = [
	[-53, 17, -22, 48, 9+53, 26+53, 106],
	[-53, -22, 53, 9+53, 22+53, 31+53, 106],
	[-53 + 17, -22, 0, 0+53, 31+53, 43+53, 106],
	[-53, -22, 0, 0, 31+53, 53, 106]
];
~background_chord = ~background_chords[2];

{
	var s53 = Scale.chromatic('et53');
	/*~revBus = Bus.audio(s, 2);
	~rev = Synth(\medium_reverb, [\in, ~revBus, \mix, 0.3, \out, 0]);*/
	// chord = [-53, -22, 53, 9+53, 22+53, 31+53];
	~transposition = 0;

	~background_drone_synths = ~background_chord.collect{ |degree|
		var freq = s53.degreeToFreq(degree, 36.midicps, 0);
		Synth(\unstable_sine, [\freq, freq, \mod_ratio, 6.0, \mod_mul, 5, \amp, 0.05, \out, ~backgroundBus])
	};

	~set_background_drone_amplitudes = { |speed|
		~background_drone_synths.do { | synth, i|
			var speed_amp = speed.pow(i*0.05);
			synth.set(\amp, 0.015 + (0.035 * speed_amp));
			synth.set(\speed, 1 + (speed * 10));
			synth.set(\mod_mul, 7 + (speed * 2 * (i/~background_chord.size)));
		};
	};
	~set_background_drone_amplitudes.(~speed_setting); // init from speed_setting
	~change_background_drone_root = {
		var transposed_chord;
		~transposition = ~transposition + [-22, -17, -8, -5, 0, 5, 9, 14, 22].choose;
		if(~transposition > 106) {
			~transposition = ~transposition - 53;
		};
		if(~transposition < -106) {
			~transposition = ~transposition + 53;
		};
		transposed_chord = ~background_chord + ~transposition;
		~background_drone_synths.do{ |synth, i|
			var degree = transposed_chord[i], freq = s53.degreeToFreq(degree, 40.midicps, 0);
			synth.set(\freq, freq);
		};
		~set_background_drone_amplitudes.(~speed_setting);
	};

}.();
{
	loop{
		~background_chord = ~background_chords.choose;
		~change_background_drone_root.();
		~set_background_drone_amplitudes.(rrand(0.1, 0.5));
		(rrand(1, 6).floor * 2).wait;
	}
}.fork;