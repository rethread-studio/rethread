// Sonification of the size of packets using different percussive sounds

~sonify_len = { | len, device |
	switch(~lengthVersion,
		1, {
			~sonify_len1.(len, device);
		},
		2, {
			~sonify_len2.(len, device);
	});
};

~sonify_len1 = { | len, device |
	var delay = 0, channel = ~stats[device].channel, bus = channel.reverb_bus, tick_amp = 0.3 * ~tickAmp;
	if(~randomizeTiming, { delay = rrand(0.0, 0.3); });
	delay = delay + rrand(0.0, ~attackSmear);
	if(channel.sonifyLengthToggle) {
		{
			delay.wait;

			if(len < 80, {
				channel.play_on(\tick3,
					[
						\freq, 1000,
						\rq, exprand(0.2, 0.4),
						\out, bus,
						\amp, rrand(0.01, 0.1) * tick_amp,
						\atk, rrand(0.000, 0.004) + 0.001,
						\c0, -10,
						\rel, rrand(0.01, 0.05) + 0.01, //0.01,
						\c1, -12,
						\pan, 0,
					]
				);
			});
			if(len >= 80 && (len < 140), {
				channel.play_on(\tick3,
					[
						\freq, 2000,
						\rq, exprand(0.2, 0.4),
						\out, bus,
						\amp, rrand(0.01, 0.1) * tick_amp,
						\atk, rrand(0.000, 0.004) + 0.001,
						\c0, -10,
						\rel, rrand(0.01, 0.05) + 0.01, //0.01,
						\c1, -12,
						\pan, 0,
					]
				);
			});
			if(len >= 140 && (len < 300), {
				channel.play_on(\tick3,
					[
						\freq, 8000,
						\rq, exprand(0.1, 0.2),
						\out, bus,
						\amp, rrand(0.01, 0.1) * tick_amp,
						\atk, rrand(0.000, 0.004) + 0.001,
						\c0, -10,
						\rel, rrand(0.01, 0.05) + 0.01, //0.01,
						\c1, -12,
						\pan, 0,
					]
				);
			});
			if(len >= 300 && (len < 500), {
				channel.play_on(\tick3,
					[
						\freq, 10000,
						\rq, exprand(0.1, 0.2),
						\out, bus,
						\amp, rrand(0.01, 0.1) * 1.5 * tick_amp,
						\atk, rrand(0.000, 0.004) + 0.001,
						\c0, -10,
						\rel, rrand(0.01, 0.05) + 0.01, //0.01,
						\c1, -12,
						\pan, 0,
					]
				);
			});
			if(len >= 500 && (len < 2000), {
				var freq = ~s53.degreeToFreq(~chord.choose, 0.midicps, ~octave + 1),
				iScale = ((len-500)/1500.0) * 8 + 1;
				channel.play_on(\fm,
					[
						\freq, freq,
						\mRatio, 5,
						\cRatio, 4,
						\index, 1,
						\iScale, iScale,
						\atk, 0.01,
						\rel, 0.03,
						\out, bus,
						\amp, rrand(0.01, 0.1) * 1.5 * ~tickAmp,
						\pan, 0,
					]
				);
			});
			if(len >= 2000 && (len < 6000), {
				var rel = ((len-2000)/4000.0) * 0.05 + 0.01;
				// activated by things like YouTube
				channel.play_on(\dist_noise,
					[
						\freq, 12100,
						\lpf, 8000,
						\out, bus,
						\rel, rel,
						\amp, rrand(0.1, 0.2) * ~tickAmp,
						\pan, 0,
					]
				);

			});
			if(len >= 6000 && (len < 10000), {
				var rel = ((len-6000)/4000.0) * 0.17 + 0.03;
				channel.play_on(\dist_noise,
					[
						\freq, 12500,
						\lpf, 7000,
						\out, bus,
						\rel, rel,
						\amp, rrand(0.1, 0.2) * ~tickAmp,
						\pan, 0,
					]
				);
			});
			if(len >= 10000, {
				var freq = ~s53.degreeToFreq(~chord.choose, 0.midicps, ~octave-4);
				channel.play_on(\fm,
					[
						\freq, freq,
						\mRatio, 10,
						\cRatio, 4,
						\index, 1,
						\iScale, rrand(4, 6),
						\atk, 0.01,
						\rel, 5.0,
						\cRel, -10,
						\out, bus,
						\amp, rrand(0.01, 0.02) * 2.5 * ~tickAmp,
						\pan, 0,
					]
				);
			});
		}.fork;
	};

};


~sonify_len2 = { | len, device |
	var delay = 0, channel = ~stats[device].channel, bus = channel.reverb_bus, tick_amp = 0.3 * ~tickAmp, sine_amp = 1.5,
	po = channel.pitch_offset;
	if(~randomizeTiming, { delay = rrand(0.0, 0.3); });
	delay = delay + rrand(0.0, ~attackSmear);
	if(channel.sonifyLengthToggle) {
		{
			delay.wait;

			if(len < 80, {
				var freq = ~s53.degreeToFreq(~chord[~chord.size-1] + po, 0.midicps, 3);
				channel.play_on(\long_sine_transient,
					[
						\freq, freq,
						\mRatio, 5,
						\cRatio, 2.0,
						\index, 1,
						\iScale, 2,
						\atk, 0.03,
						\rel, 1.0,
						\length, 1.0,
						\cRel, -10,
						\out, bus,
						\amp, rrand(0.01, 0.02) * 2.5 * sine_amp,
						\pan, 0,
					]
				);
			});
			if(len >= 80 && (len < 140), {
				var freq = ~s53.degreeToFreq(~chord[((~chord.size-1) * 0.8).round(1.0)] + po, 0.midicps, 3);
				channel.play_on(\long_sine_transient,
					[
						\freq, freq,
						\mRatio, 1,
						\cRatio, 2.0,
						\index, 1,
						\iScale, 1,
						\atk, 0.01,
						\rel, 0.5,
						\length, 1.0,
						\cRel, -10,
						\out, bus,
						\amp, rrand(0.01, 0.02) * 2.5 * sine_amp,
						\pan, 0,
					]
				);
			});
			if(len >= 140 && (len < 300), {
				var freq = ~s53.degreeToFreq(~chord[((~chord.size-1) * 0.65).round] + po, 0.midicps, 3);
				channel.play_on(\long_sine_transient,
					[
						\freq, freq,
						\mRatio, 1,
						\cRatio, 2.0,
						\index, 1,
						\iScale, 1,
						\atk, 0.1,
						\rel, 2.0,
						\length, 1.5,
						\cRel, -10,
						\out, bus,
						\amp, rrand(0.01, 0.02) * 2.5 * sine_amp,
						\pan, 0,
					]
				);
			});
			if(len >= 300 && (len < 500), {
				var freq = ~s53.degreeToFreq(~chord[(~chord.size * 0.4).round] + po, 0.midicps, 3);
				channel.play_on(\long_sine_transient,
					[
						\freq, freq,
						\mRatio, 1,
						\cRatio, 2.0,
						\index, 2,
						\iScale, 1,
						\atk, 0.1,
						\rel, 2.0,
						\length, 2.0,
						\cRel, -10,
						\out, bus,
						\amp, rrand(0.01, 0.02) * 2.5 * sine_amp,
						\pan, 0,
					]
				);
			});
			if(len >= 500 && (len < 2000), {
				var freq = ~s53.degreeToFreq(~chord.choose + po, 0.midicps, ~octave + 1),
				iScale = ((len-500)/1500.0) * 8 + 1;
				channel.play_on(\long_sine_transient,
					[
						\freq, freq,
						\mRatio, 5,
						\cRatio, 4,
						\index, 1,
						\iScale, iScale,
						\atk, 0.01,
						\rel, 0.1,
						\length, 3.0,
						\out, bus,
						\amp, rrand(0.01, 0.1) * 1.5 * sine_amp,
						\pan, 0,
					]
				);
			});
			if(len >= 2000 && (len < 6000), {
				var freq = ~s53.degreeToFreq(~chord[1] + po, 0.midicps, 4);
				channel.play_on(\long_sine_transient,
					[
						\freq, freq,
						\mRatio, 1,
						\cRatio, 2.0,
						\index, 1,
						\iScale, 1,
						\atk, rrand(0.1, 0.2),
						\rel, 3.0,
						\length, 3.0,
						\cRel, -10,
						\out, bus,
						\amp, rrand(0.01, 0.02) * 2.5 * sine_amp,
						\pan, 0,
					]
				);
			});
			if(len >= 6000 && (len < 10000), {
				var freq = ~s53.degreeToFreq(~chord[2] + po, 0.midicps, 3);
				channel.play_on(\long_sine_transient,
					[
						\freq, freq,
						\mRatio, 1,
						\cRatio, 2.0,
						\index, 1,
						\iScale, 1,
						\atk, 0.1,
						\rel, rrand(1.5, 3.0),
						\length, rrand(1.5, 3.0),
						\cRel, -10,
						\out, bus,
						\amp, rrand(0.01, 0.02) * 2.5 * sine_amp,
						\pan, 0,
					]
				);
				channel.play_on(\long_sine_transient,
					[
						\freq, freq * 2,
						\mRatio, 1,
						\cRatio, 2.0,
						\index, 1,
						\iScale, 1,
						\atk, 0.02,
						\rel, rrand(1.5, 3.0),
						\length, rrand(1.5, 3.0),
						\cRel, -10,
						\out, bus,
						\amp, rrand(0.01, 0.02) * 2.5 * sine_amp,
						\pan, 0,
					]
				);
			});
			if(len >= 10000, {
				var freq = ~s53.degreeToFreq(~chord[0] + po, 0.midicps, 2);
				channel.play_on(\long_sine_transient,
					[
						\freq, freq,
						\mRatio, 1,
						\cRatio, 2.0,
						\index, 1,
						\iScale, rrand(4, 6),
						\atk, 0.4,
						\rel, 5.0,
						\length, 5.0,
						\cRel, -10,
						\out, bus,
						\amp, rrand(0.01, 0.02) * 2.5 * sine_amp,
						\pan, 0,
					]
				);
				channel.play_on(\long_sine_transient,
					[
						\freq, freq * 2,
						\mRatio, 1,
						\cRatio, 2.0,
						\index, 1,
						\iScale, rrand(4, 6),
						\atk, 0.05,
						\rel, 5.0,
						\length, 5.0,
						\cRel, -10,
						\out, bus,
						\amp, rrand(0.01, 0.02) * 1.5 * sine_amp,
						\pan, 0,
					]
				);
			});
		}.fork;
	};

};
/*(
var freq = ~s53.degreeToFreq(~chord[1], 0.midicps, 2);
				Synth(\fm,
					[
						\freq, freq,
						\mRatio, 1,
						\cRatio, 2.0,
						\index, 1,
						\iScale, 1,
						\atk, 0.2,
						\rel, 3.0,
						\cRel, -10,
						\out, bus,
						\amp, rrand(0.01, 0.02) * 2.5,
						\pan, 0,
					]
);
)*/

// average len: 349
// median: 98
// max value: 27166
// min value: 46
// most common values [count, len]
// [ 2758, 98 ]
// [ 1886, 66 ]
// [ 753, 97 ]
// [ 700, 86 ]
// [ 659, 155 ]
// [ 658, 144 ]
// [ 393, 122 ]
// [ 287, 120 ]
// [ 209, 54 ]
// [ 175, 60 ]
// [ 161, 105 ]
// [ 144, 1484 ]
// [ 129, 78 ]
// [ 95, 99 ]
// [ 94, 137 ]
// [ 78, 85 ]
// [ 74, 74 ]
// [ 61, 101 ]
// [ 57, 1399 ]
// [ 52, 93 ]
// [ 50, 135 ]
// [ 47, 112 ]
// [ 41, 2902 ]
// [ 40, 90 ]
// [ 39, 1394 ]
// [ 34, 4320 ]

/*
~lengths.size
~lengths.sum/~lengths.size
~lengths.median
~lengths.occurrencesOf(46)
~lengths.minItem
~lengths.asArray.sort.reverse[0..100]

List[1, 2, 3, 4].sum;
(0..8).sum { |i| 1 / (2 ** i) };

(
~occurrences = List[];
(46..27166).do {|i|
var count = ~lengths.occurrencesOf(i);
if(count > 0, {~occurrences.add([count, i]) });
};
"done".postln;
)

~sortedOccurrences = ~occurrences.sort({|a, b| a[0] > b[0]});

(
~sortedOccurrences.do{|a|
a.postln;
};
)
*/