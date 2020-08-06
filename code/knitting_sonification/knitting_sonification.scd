
// Read the JSON trace of the USB activity
(
g = File("test4.json".resolveRelative,"r");
j = g.readAllString.parseYAML;
)

j[0]["_index"]
j[0]["_index"]
j[0]["_source"]["layers"]["frame"]["frame.len"]
j[0]["_source"]["layers"]["ftdift"] //["ftdift.if_a_rx_payload"]

(
var pattern = List[];
~hexStringToBinary = { | string |
	var bits = "",
	string_parts;
	string_parts = string.split($:);
	string_parts.do { |hex|
		var num = hex.hexToInt;
		bits = bits ++ num.asBinaryString;
	};
	bits
};
j.do { |entry|
	if( entry["_source"]["layers"]["frame"]["frame.len"].asInteger > 20) {
		var ftdift = entry["_source"]["layers"]["ftdift"];
		// entry["_source"]["layers"]["frame"]["frame.time_relative"].postln;
		if(ftdift != nil) {
			if(ftdift.class == Dictionary) {
				var rx_payload = entry["_source"]["layers"]["ftdift"]["ftdift.if_a_rx_payload"],
				tx_payload = entry["_source"]["layers"]["ftdift"]["ftdift.if_a_tx_payload"];
				if(rx_payload != nil) {
					("rx: " ++ rx_payload).postln;
				};
				if(tx_payload != nil) {
					// tx_payload.postln;
					if(tx_payload.size < 47) {
						tx_payload.postln;

					};
					if(tx_payload.size == 47) {
						var counter = tx_payload[0..7],
						unknown = tx_payload[9..34],
						pattern_bits = tx_payload[15..]; // 12 includes something that's either 01 or 0a
						// pattern_bits.postln;
						pattern.add(~hexStringToBinary.(pattern_bits));
					};
				};
			};
		}
	};
};
~pattern = pattern;
)
(// Play the trace in real time, only the packets that carry a payload
var latency = 0.2;
~revBus = Bus.audio(s, 2);
~rev = Synth(\medium_reverb, [\in, ~revBus, \mix, 0.1]);
{
	j.do { |entry|
		if( entry["_source"]["layers"]["frame"]["frame.len"].asInteger > 20) {
			var ftdift = entry["_source"]["layers"]["ftdift"];
			// entry["_source"]["layers"]["frame"]["frame.time_relative"].postln;
			if(ftdift != nil) {
				if(ftdift.class == Dictionary) {
					var rx_payload = entry["_source"]["layers"]["ftdift"]["ftdift.if_a_rx_payload"],
					tx_payload = entry["_source"]["layers"]["ftdift"]["ftdift.if_a_tx_payload"];
					if(rx_payload != nil) {
						("rx: " ++ rx_payload).postln;
						s.makeBundle(latency - 0.02, {Synth(\thump, [\freq, 220*8, \amp, 0.15, \atk, 0.02, \pan, -0.5, \rel, 0.5, \out, ~revBus]);});
					};
					if(tx_payload != nil) {
						// tx_payload.postln;
						// if(tx_payload.size < 47) {
							("tx: " ++ tx_payload).postln;
							s.makeBundle(latency - 0.02, {Synth(\thump, [\freq, 220*9, \amp, 0.15, \atk, 0.02, \pan, 0.5, \rel, 0.5, \out, ~revBus]);});
					// };
						if(tx_payload.size == 47) {

						};
					};
				};
			}
		};
	entry["_source"]["layers"]["frame"]["frame.time_delta"].asFloat.wait;
};
}.fork;
)
( // Play the pattern bit by bit
{ var latency = 0.2;
	SynthDef(\softy, {
		var sig, env, freq = \freq.kr(220);
		env = Env.perc(\atk.kr(0.1), \rel.kr(2), curve: [\c0.kr(\cub), \c1.kr(\sine)]).kr(2);
		sig = Resonz.ar(PinkNoise.ar(mul: env), freq, 0.007, mul: 20);
		sig = sig * \amp.kr(0.5);
		sig = Pan2.ar(sig, \pan.kr(0));
		Out.ar(\out.kr(0), sig);
	}).add;
	SynthDef(\tick2, {
		var sig, env, rq = \rq.kr(0.1);
		env = Env.perc(\atk.kr(0), \rel.kr(0.05)).ar(2);
		sig = Impulse.ar(0);
		sig = sig * 0.5;
		// high freq and rq values causes the filter to blow up violently
		sig = RHPF.ar(sig, \freq.kr(1000).min(18000).max(20), rq.min(5)) * env;
		sig = Pan2.ar(sig, \pan.kr(0)) * \amp.kr(1.0) * 10;
		sig = sig.tanh; // Should never happen, but better to soft clip
		Out.ar(\out.kr(0), sig);
	}).add;
	SynthDef(\thump, {
		var sig, env, freq = \freq.kr(220), freq_atk, atk = \atk.kr(0.1);
		env = Env.perc(atk, \rel.kr(2), curve: [\c0.kr(\cub), \c1.kr(\sine)]).kr(2);
		freq_atk = SinOsc.ar(freq * 2) * Line.ar(freq*4, 0, atk);
		// freq = SinOsc.ar(freq + freq_atk) * freq;
		freq = freq + freq_atk;
		sig = Resonz.ar(PinkNoise.ar(mul: env.pow(100) * 20), freq, 0.007, mul: 20);
		sig = sig + SinOsc.ar(freq, Rand(0.0, 2pi), 0.1);
		sig = sig * \amp.kr(0.5) * env;
		sig = Pan2.ar(sig, \pan.kr(0));
		Out.ar(\out.kr(0), sig);
	}).add;
	SynthDef(\medium_reverb, { | out = 0, amp = 1, mix = 0.3  |
		var sig, wet;

		sig = In.ar(\in.kr(10), 2);
		mix = mix.lag(\mixLag.kr(10));

		wet = JPverb.ar(sig, 3.0, 0.9, 4.0, 0.8);
		wet = GVerb.ar(sig, 300, 103, 0.43, 0.51, 15, -5.dbamp, -26.dbamp, -20.dbamp);
		wet = Greyhole.ar(sig, \delayTime.kr(0.1), \damp.kr(0.7), \size.kr(1.0), \diff.kr(0.8), \feedback.kr(0.9));

		sig = (sig * (1-mix)) + (wet*mix);
		sig = Limiter.ar(sig, 0.95);
		Out.ar(out, sig);
	}).add;
	s.sync;
	~revBus = Bus.audio(s, 2);
	~rev = Synth(\medium_reverb, [\in, ~revBus, \mix, 0.3]);
	// Play a pattern
	~pattern.do{ |line|
		// Play line start sound
		s.makeBundle(latency - 0.1, {Synth(\thump, [\freq, 220, \amp, 1, \atk, 0.1, \rel, 2, \out, ~revBus])});
		{line.postln;}.defer;
		// Synth(\thump, [\freq, 55*4, \amp, 0.1, \atk, 0.1, \rel, 2]);
		// Synth(\thump, [\freq, 55*6, \amp, 0.05, \atk, 0.1, \rel, 2]);
		line.do { |bit, i|
			if( bit == $1) {
				// Play bit sound
				s.makeBundle(latency, {Synth(\tick2, [\freq, rrand(8000, 10000), \rq, 0.01, \out, ~revBus]);});
			};

			if( i % 8 == 0) {
				s.makeBundle(latency - 0.02, {Synth(\thump, [\freq, 220*8, \amp, 0.15, \atk, 0.02, \rel, 0.5, \out, ~revBus]);});
			};
			if( i % 4 == 0) {
				s.makeBundle(latency - 0.02, {Synth(\thump, [\freq, 220*9, \amp, 0.05, \atk, 0.02, \rel, 0.05, \out, ~revBus]);});
			};

			0.05.wait;
		};
	};
}.fork;
)


( // Play the pattern randomly
{ var latency = 0.2;
	SynthDef(\softy, {
		var sig, env, freq = \freq.kr(220);
		env = Env.perc(\atk.kr(0.1), \rel.kr(2), curve: [\c0.kr(\cub), \c1.kr(\sine)]).kr(2);
		sig = Resonz.ar(PinkNoise.ar(mul: env), freq, 0.007, mul: 20);
		sig = sig * \amp.kr(0.5);
		sig = Pan2.ar(sig, \pan.kr(0));
		Out.ar(\out.kr(0), sig);
	}).add;
	SynthDef(\tick2, {
		var sig, env, rq = \rq.kr(0.1);
		env = Env.perc(\atk.kr(0), \rel.kr(0.05)).ar(2);
		sig = Impulse.ar(0);
		sig = sig * 0.5;
		// high freq and rq values causes the filter to blow up violently
		sig = RHPF.ar(sig, \freq.kr(1000).min(18000).max(20), rq.min(5)) * env;
		sig = Pan2.ar(sig, \pan.kr(0)) * \amp.kr(1.0) * 10;
		sig = sig.tanh; // Should never happen, but better to soft clip
		Out.ar(\out.kr(0), sig);
	}).add;
	SynthDef(\thump, {
		var sig, env, freq = \freq.kr(220), freq_atk, atk = \atk.kr(0.1);
		env = Env.perc(atk, \rel.kr(2), curve: [\c0.kr(\cub), \c1.kr(\sine)]).kr(2);
		freq_atk = SinOsc.ar(freq * 2) * Line.ar(freq*4, 0, atk);
		// freq = SinOsc.ar(freq + freq_atk) * freq;
		freq = freq + freq_atk;
		sig = Resonz.ar(PinkNoise.ar(mul: env.pow(100) * 20), freq, 0.007, mul: 20);
		sig = sig + SinOsc.ar(freq, Rand(0.0, 2pi), 0.1);
		sig = sig * \amp.kr(0.5) * env;
		sig = Pan2.ar(sig, \pan.kr(0));
		Out.ar(\out.kr(0), sig);
	}).add;
	SynthDef(\medium_reverb, { | out = 0, amp = 1, mix = 0.3  |
		var sig, wet;

		sig = In.ar(\in.kr(10), 2);
		mix = mix.lag(\mixLag.kr(10));

		wet = JPverb.ar(sig, 3.0, 0.9, 4.0, 0.8);
		wet = GVerb.ar(sig, 300, 103, 0.43, 0.51, 15, -5.dbamp, -26.dbamp, -20.dbamp);
		wet = Greyhole.ar(sig, \delayTime.kr(0.1), \damp.kr(0.7), \size.kr(1.0), \diff.kr(0.8), \feedback.kr(0.9));

		sig = (sig * (1-mix)) + (wet*mix);
		sig = Limiter.ar(sig, 0.95);
		Out.ar(out, sig);
	}).add;
	s.sync;
	~revBus = Bus.audio(s, 2);
	~rev = Synth(\medium_reverb, [\in, ~revBus, \mix, 0.1]);

	// Play a random bit from the pattern
	// This way the overall distribution of the pattern can be heard at once
	loop {
		var linenr = rrand(0, ~pattern.size-1), line = ~pattern[linenr], colnr = rrand(0, line.size-1), bit = line[colnr];
		if( bit == $1) {
			// freq depends on what line the bit is from, attack time depends on what column in the row it is from
			var freq = ((linenr / ~pattern.size) * 24.0 + 84.0).midicps, atk = (colnr / line.size).pow(3);
			// Play bit sound
			s.makeBundle(latency, {Synth(\tick2, [\freq, freq, \rq, 0.01, \atk, atk, \out, ~revBus]);});
		};

		0.005.wait;
	};
}.fork;
)

"a5:33:01:00:0a:00:00:00:00:00:00:00:00:00:00:00".size
"a5:33:01:00:0a:00:00:00:00:00:00:00:00:00:00:00"[0..7]
"a5:33:01:00:0a:00:00:00:00:00:00:00:00:00:00:00"[0..7]

"a5:33:32:00:01:00:00:07:80:00:00:00:00:03:f8:00"[9..34]
"a5:33:32:00:01:00:00:07:80:00:00:00:00:03:f8:00"[15..]
"a5:33:32:00:01:00:00:07:80:00:00:00:00:03:f8:00".split($:)
"f8".hexToInt
12.asBinaryString
~hexStringToBinary.("a5:ff")

rrand(0, 3)
120.midicps