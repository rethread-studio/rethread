~s53 = Scale.chromatic('et53');


(
/*SynthDef(\synth, {
	var sig, env, freq = \freq.kr(440);
	sig = Pluck.ar((SinOsc.ar(freq) + PinkNoise.ar()) * 0.15, Impulse.kr(0), 1.0/10.0, 1.0/freq, 10);
	DetectSilence.ar(sig, 0.00001, 0.1, 2);
	sig = sig * \amp.kr(0.5)*AmpCompA.kr(freq, 0.midicps);
	Out.ar(\out.kr(0), Pan2.ar(sig, \pan.kr(0.0)));
}).add;*/
SynthDef(\synth, {
	var sig, env, freq = \freq.kr(440);
	// sig = DPW3Tri.ar(freq) * Env.perc(0.01, 2.0).kr(2);
	sig = DPW4Saw.ar(freq) * Env.perc(0.5, 2.0).kr;
	sig = LPF.ar(sig, (freq * 10 + 300).clip(10, 20000));
	DetectSilence.ar(sig, 0.00001, 0.1, 2);
	sig = sig * \amp.kr(0.5)*AmpCompA.kr(freq, 0.midicps);
	Out.ar(\out.kr(0), Pan2.ar(sig, \pan.kr(0.0)));
}).add;
SynthDef(\synth_sus, {
	var sig, env, freq = \freq.kr(440);
	// sig = DPW3Tri.ar(freq) * Env.perc(0.01, 2.0).kr(2);
	sig = DPW4Saw.ar(freq) * Env.asr(0.5, 1.0, 2.0).kr(2);
	sig = LPF.ar(sig, (freq * 10 + 300).clip(10, 20000));
	DetectSilence.ar(sig, 0.00001, 0.1, 2);
	sig = sig * \amp.kr(0.5)*AmpCompA.kr(freq, 0.midicps);
	Out.ar(\out.kr(0), Pan2.ar(sig, \pan.kr(0.0)));
}).add;
~play_chord = { | degrees |
	{
	degrees.do{ |deg, i| var freq = ~s53.degreeToFreq(deg, 48.midicps, 1), pan = 0;
			// pan = (i.asFloat / degrees.size) * 2.0 - 1.0;
			Synth(\synth, [\freq, freq, \pan, pan, \amp, 1 / degrees.size * 0.5]);
		0.1.wait;
	};
	}.fork;
};
)
(
~play_chord.([-53, -22, 0, 17, 31, 48, 62, 53+26])
~play_chord.([-53, 0, 31, 48, 62, 53+17, 53+26, 106]-31)
~play_chord.([-53, -22, 0, 17, 31, 48, 62, 53+26]+5)
~play_chord.([-22-53, -22, 0, 17, 31, 43, 62, 53+26] +31)
~play_chord.([-53, -22, 0, 17, 31, 48, 53, 53+26, 106, 106+9])
)
(
~play_chord.([ -53, -22, 0, 17, 31, 48, 62, 79 ])
~play_chord.([ -84, -31, 0, 17, 31, 39, 48, 75 ])
~play_chord.([ -48, -17, 5, 22, 36, 53, 67, 84 ])
~play_chord.([ -48+9, -17, 5, 22, 36, 48, 58, 84 ])
~play_chord.([ -48+9, -17+9, 9, 22, 36, 53, 58, 89 ])
~play_chord.([ -22-53, -22, -17+9, 9, 31, 36, 48, 62, 89 ])
~play_chord.([ -22-53-31, -22, 5, 27, 36, 48, 53+17, 89+22 ]-1)
~play_chord.([ -53, -22, 43-53, 9, 31, 53, 62, 89+17 ])

// YEAH
~play_chord.([ -53, 0, 9, 31, 53, 62, 40+53, 137 ] - 31)
~play_chord.([ -53, 0, 9, 31, 53, 62, 40+53, 137 ] - 31+5)
~play_chord.([ -53, 0, 9, 31, 53, 62, 40+53, 137 ] - 31-3)
~play_chord.([ -53, 0, 9, 22, 31, 62, 40+53, 48+53 ] - 31+14)
~play_chord.([ -53, 0, 9, 31, 53, 62, 40+53, 137 ] - 31+14)
~play_chord.([ -53, 0, 9, 31, 40+9, 53+9, 62+9, 137+9 ] - 31+14)
~play_chord.([ -53, 0, 9, 31, 53, 62, 40+53, 137 ] - 31-3)
~play_chord.([ -53, 0, 9, 14, 31, 40, 53, 62, 137-5 ] - 31-3)

~play_chord.([ -53, 0, 9, 22, 31, 53, 22+53, 43+53 ] - 31+31)
~play_chord.([ -53, 0, 9, 31, 53, 62, 40+53, 137 ] - 31+5)
~play_chord.([ -53, 0, 9, 31, 53, 62, 40+53, 137 ] - 31)

//

~play_chord.([ -53-31, -22, 39-53, 0, 31, 39, 62, 89+17 ])


~play_chord.([ -53-31, -22, 39-53, 0, 31, 39, 62, 89+17 ])

~play_chord.([ -31, 22, 39, 53, 65, 83, 136 ])
~play_chord.([ -9, 27, -9+53, 8+53, 35+53, 128 ])
~play_chord.([ -14, -14+31, 48, 70, 84, 101, 128-5 ])
~play_chord.([ -22, 9, 48, 74, 86, 101-5, 128-9 ])

~play_chord.([ -31, 22, 39, 53, 65, 83, 136 ]-8)
~play_chord.([ -9, 27, -9+53, 8+53, 35+53, 128 ]-3)
~play_chord.([ -14, -14+31, 48, 70, 84, 101, 128-5 ])
~play_chord.([ -22, 9, 48, 74, 86, 101-5, 128-9 ]+2)

~play_chord.([-22-53, -22, 0, 17, 31, 43, 62, 53+26] +31)
~play_chord.([-53, -22, 0, 17, 31, 48, 53, 53+26, 53+40, 106, 106+9])
)
[0, 17, 36, 44]-14+5

(
~inv2DArray = {|array2d|
	var new_a = [], row_length = array2d[0].size;
	row_length.do { |i|
		var col = [];
		array2d.do{|row| col = col.add(row[i]);};
		new_a = new_a.add(col);
	};
	new_a
};
~chords = [
	[ -53, -22, 0, 17, 31, 48, 62, 79 ],
	[ -84, -31, 0, 17, 31, 39, 48, 75 ],
	[ -48, -17, 5, 22, 36, 53, 67, 84 ],
	[ -48+9, -17, 5, 22, 36, 48, 58, 84 ],
	[ -48+9, -17+9, 9, 22, 36, 53, 58, 89 ],
	[ -22-53, -22, -17+9, 9, 31, 36, 48, 62, 89 ],
	[ -107, -23-5, 4, 27, 35, 47, 69, 110 ],
	[ -53, -22, 43-53, 9, 31, 53, 62, 89+17 ],
	[ -53-31, -22, 39-53, 0, 31, 39, 62, 89+17 ]
];
)
~chords.plot
~inv2DArray.(~chords).plot
(
{
	~chords.do{ |chord, i| var degree = chord[4], freq = ~s53.degreeToFreq(degree, 48.midicps, 1), pan = 0;
			// pan = (i.asFloat / degrees.size) * 2.0 - 1.0;
		Synth(\synth, [\freq, freq, \pan, pan, \amp, 0.25]);
		1.wait;
	};
}.fork;
)

(
{
	~all_have_changed = false;
	~num_changed = [false, false, false, false, false, false, false, false];
	8.do {|i|
		fork{
			var degree = ~chords[0][i], freq = ~s53.degreeToFreq(degree, 48.midicps, 1),synth = Synth(\synth_sus, [\freq, freq, \pan, 0, \amp, 0.25]), last_flip = true;
			~chords.do{|chord|
				var degree = chord[i], freq = ~s53.degreeToFreq(degree, 48.midicps, 1), pan = 0;
				// (rrand(2, 4).floor * 0.25).wait;
				(4*0.25).wait;
				synth.set(\freq, freq);
				~num_changed[i] = true;
				while({~all_have_changed == last_flip}, {0.05.wait});
				last_flip = last_flip.not;
				if(i==7, {0.5.wait;});
			}

		}
	};
	fork {
		loop {
		while({
			var all_changed = true;
			~num_changed.do{|change|
				all_changed = all_changed && change;
			};
			all_changed.not
		}, {0.05.wait});
		("all changed " + ~num_changed).postln;
		~all_have_changed = ~all_have_changed.not;
		~num_changed = [false, false, false, false, false, false, false, false];
			0.001.wait;
		}

	};
}.fork;
)
([ -107, -23, 4, 26, 35, 47, 69, 110 ]+107-5)%53
35+23
[ -53, -22, 0, 17, 31, 48, 62, 79 ].size
[ -53-31, -22, 39-53, 0, 31, 39, 62, 89+17 ].size