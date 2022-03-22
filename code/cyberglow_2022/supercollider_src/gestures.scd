~freq_ratio = 1.0;

{
	var channel = ~channels.server_gestures;
	~server_gestures = [
		{ |chord|
			var length = rrand(0.07, 0.3),
			atk = 0.001,
			extra_latency = ((atk/~nv) - (atk/~nv).floor) * ~nv,
			degree = ~last_chord_degrees.choose + 106,
			amp = rrand(0.01, 0.1),
			freq = ~s53.degreeToFreq(degree, ~rootFreq, 0) * ~freq_ratio;
			[
				{channel.play_on(\sine, [\freq, freq, \amp, amp,\atk, atk, \sus, 0, \rel, length*0.7, \out, channel.bus, \pan, rrand(-0.5, 0.5)], extra_latency);},
				{channel.play_on(\sine, [\freq, freq, \amp, amp,\atk, atk, \sus, 0, \rel, length*0.7, \out, channel.bus, \pan, rrand(-0.5, 0.5)], extra_latency);},
			].choose.();
		},
		{ |chord|
			var length = rrand(0.1, 0.5),
			atk = length,
			extra_latency = ((atk/~nv) - (atk/~nv).floor) * ~nv,
			degree = ~last_chord_degrees.choose + 106,
			amp = rrand(0.01, 0.1),
			freq = ~s53.degreeToFreq(degree, ~rootFreq, 0) * ~freq_ratio;
			channel.play_on(\dist_saw, [\freq, freq, \amp, amp,\atk, 0.01, \sus, 0.0, \rel, length, \out, channel.bus, \pan, rrand(-0.5, 0.5)], extra_latency);
		},
		{ |chord|
			var length = rrand(0.2, 0.4),
			atk = length,
			extra_latency = ((atk/~nv) - (atk/~nv).floor) * ~nv,
			degree = ((chord.added_degrees + chord.root).choose),
			amp = exprand(0.005, 0.03),
			temp_chord = ([0, 9, 22, 31] + degree) % 53 + 106;
			{
				var pan = rrand(-0.5, 0.5);
				temp_chord.do { |d, i|
					var freq = ~s53.degreeToFreq(d, ~rootFreq, [0, 1].choose) * ~freq_ratio;
					channel.play_on(\sine, [\freq, freq, \amp, amp * 1.1.pow(i+1), \atk, length, \sus, 0.0, \rel, 0.001, \out, channel.bus, \pan, pan], extra_latency);
					(length*0.2).wait;
				};
			}.fork;
		},
		{ |chord|
			var length = rrand(0.1, 0.4),
			atk = length,
			extra_latency = ((atk/~nv) - (atk/~nv).floor) * ~nv,
			// degree = ((chord.added_degrees + chord.root).choose),
			degree = ~last_chord_degrees.choose + 106,
			amp = exprand(0.005, 0.02),
			temp_chord = ([0, 31] + degree) % 53 + 106;
			{
				var pan = rrand(-0.5, 0.5);
				temp_chord.do { |d, i|
					var freq = ~s53.degreeToFreq(d, ~rootFreq, [0, 1].choose) * ~freq_ratio;
					channel.play_on(\sine, [\freq, freq, \amp, amp * 1.1.pow(i+1), \atk, atk, \sus, 0.0, \rel, 0.001, \out, channel.bus, \pan, pan], extra_latency);
					(length*0.2).wait;
				};
			}.fork;
		},
	];
}.();



//// USER GESTURES
{
	var channel = ~channels.user_gestures, ambient_channel = ~channels.user_ambient;
	~user_gestures = [
		{ |chord, pan|
			var length = rrand(2.0, 5.0),
			atk = length * 0.3,
			extra_latency = ((atk/~nv) - (atk/~nv).floor) * ~nv,
			freq = ~s53.degreeToFreq(chord.root, ~rootFreq, [-2, -1, 0].choose) * ~freq_ratio,
			amp = exprand(0.005, 0.1);
			ambient_channel.play_on(\softy, [\freq, freq, \amp, 0.1,\atk, atk, \rel, length-atk, \out, ambient_channel.bus, \pan, pan], extra_latency);
		},
		{ |chord, pan|
			var length = rrand(2.0, 5.0),
			atk = length * 0.3,
			extra_latency = ((atk/~nv) - (atk/~nv).floor) * ~nv,
			freq = ~s53.degreeToFreq(chord.fifth + chord.root, ~rootFreq, 0) * ~freq_ratio,
			amp = exprand(0.005, 0.1);
			ambient_channel.play_on(\softy, [\freq, freq, \amp, 0.1,\atk, atk, \rel, length-atk, \out, ambient_channel.bus, \pan, pan], extra_latency);
		},
		{ |chord, pan|
			var length = rrand(1.0, 2.5),
			atk = rrand(0.02, 0.3),
			extra_latency = ((atk/~nv) - (atk/~nv).floor) * ~nv,
			degree = ([chord.root, chord.fifth + chord.root].choose) % 53 - 53,
			amp = exprand(0.005, 0.1),
			freq = ~s53.degreeToFreq(degree, ~rootFreq, [-1, 0].choose) * ~freq_ratio;
			ambient_channel.play_on(\dist_sine, [\freq, freq, \amp, amp,\atk, atk, \sus, length * 0.1, \rel, length*0.6, \out, ambient_channel.bus, \pan, pan], extra_latency);
		},
		{ |chord, pan|
			var length = rrand(0.6, 1.5),
			atk = rrand(0.1, 0.3),
			extra_latency = atk,
			degree = ([chord.root % 53, (chord.fifth + chord.root) % 53, ((chord.third + chord.root)%53) + 53].choose),
			amp = exprand(0.005, 0.1),
			freq = ~s53.degreeToFreq(degree, ~rootFreq, -1) * ~freq_ratio;
			channel.play_on(\dist_sine, [\freq, freq, \amp, amp, \atk, atk, \sus, 0, \rel, length, \out, 0, \pan, pan, \out, channel.bus], extra_latency);
		},
		{ |chord, pan|
			var length = rrand(0.8, 2.0),
			atk = rrand(0.1, 0.3),
			extra_latency = atk,
			degree = ([chord.root % 53, (chord.fifth + chord.root) % 53, ((chord.third + chord.root)%53) + 53].choose),
			amp = exprand(0.005, 0.1),
			freq = ~s53.degreeToFreq(degree, ~rootFreq, [-2, -1].choose) * ~freq_ratio;
			channel.play_on(\dist_sine, [\freq, freq, \amp, amp, \atk, atk, \sus, 0, \rel, length, \out, channel.bus, \pan, pan], extra_latency);
		},
		{ |chord, pan|
			var length = rrand(0.8, 2.0),
			atk = 0.01,
			extra_latency = atk,
			degree = ([chord.root % 53, (chord.fifth + chord.root) % 53, ((chord.third + chord.root)%53) + 53].choose),
			amp = exprand(0.005, 0.1),
			freq = ~s53.degreeToFreq(degree, ~rootFreq, -2) * ~freq_ratio;

			channel.play_on(\dist_tri, [\freq, freq, \amp, amp, \atk, atk, \sus, 0.1, \rel, length, \out, channel.bus, \pan, pan], extra_latency);
		},
	];
}.();