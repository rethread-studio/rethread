
(
"sound_forest_mixer_gui.scd".loadRelative;

SynthDef(\fm_drone, {
	arg freq=500, mRatio=1, cRatio=1,
	index=1, iScale=5, cAtk=4, cRel=(-4),
	amp=0.2, atk=0.01, rel=3, pan=0, gate = 1,
	out=0, fx=0, fxsend = -inf;
	var car, mod, env, iEnv;

	index = SinOsc.ar(\index_lfo_freq.kr(3)).range(1, LFNoise1.ar(2).range(3, 9));
	// index = 1;

	//amplitude envelope
	env = EnvGen.kr(Env.asr(atk, 1.0, rel,curve:[cAtk,cRel]), gate: gate, doneAction:2);

	//modulator/carrier
	mod = SinOsc.ar(freq * mRatio, mul:freq * mRatio * index);
	car = SinOsc.ar(freq * cRatio + mod) * env * amp;

	car = Pan2.ar(car, pan);

	//direct out/reverb send
	Out.ar(out, car);
	Out.ar(fx, car * fxsend.dbamp);
}).add;

SynthDef(\bubbly_filter, { |out|
	var sig, maxfreq = \maxfreq.kr(2000), minfreq = \minfreq.kr(100), speed = \speed.kr(3), freq, in, delay_pan;
	speed = LFNoise1.kr(2).range(5, 12);
	freq = SinOsc.ar(speed).range(minfreq, maxfreq);
	in = In.ar(\in.kr(10), 2);
	// sig = RLPF.ar(in, freq, 0.1);
	sig = BMoog.ar(in, freq, 0.1, 0.0, 0.95);
	sig = sig + (LocalIn.ar(2).mirror * 0.7);
	delay_pan = LFNoise1.ar(LFNoise1.kr(0.1).range(0.1, 0.5)).range(-0.001, 0.001);
	sig = [DelayL.ar(sig[0], 0.1, delay_pan.max(0)), DelayL.ar(sig[1], 0.1, (delay_pan * -1).max(0))];
	LocalOut.ar(sig);
	Out.ar(out, sig * \amp.kr(0.5));
}).add;

SynthDef(\long_sine, {
	var sig, env, freq = \freq.kr(220);

	env = Env.sine(\length.kr(5)).kr(2);
	sig = SinOsc.ar(freq) * \amp.kr(0.2) * env * 0.1;
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
	sig = Pan2.ar(sig, \pan.kr(0)) * \amp.kr(1.0) * 100;
	sig = sig.tanh; // Should never happen, but better to soft clip
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\sub_tam, {
	// FM synth for a sub bass type sound with some noise on top
	var freq = \freq.kr(50), sig, env, sig1, sig2, sig3, mod1_1, mRatio = \mRatio.kr(2), mod1_2,
	mod2_1, mod2_2, mod2_1_ratio = 16*6, mod2_2_ratio = SinOsc.ar(freq*rrand(10, 14)).range(1, 16*5);
	env = Env.perc(\atk.kr(0.001), \rel.kr(8), 1.0, [\c0.kr(4), \c1.kr(-4)]).ar(2);

	mod1_2 = SinOsc.ar(freq * 3, mul: freq * mRatio * env * 0.5);
	mod1_1 = SinOsc.ar(freq * mRatio + mod1_2, mul: freq * mRatio * env.pow(2));
	sig1 = SinOsc.ar(freq + mod1_1) * env;

	mod2_2 = SinOsc.ar(freq * mod2_2_ratio, mul: freq * mod2_2_ratio * env.pow(4));
	mod2_1 = SinOsc.ar(freq * mod2_1_ratio + mod2_2, mul: freq * mod2_1_ratio * env.pow(3));
	sig2 = SinOsc.ar(freq * 16 + mod2_1) * env.pow(2) * 0.005;

	sig = sig1 + sig2;
	sig = sig * \amp.kr(0.5);
	// sig = sig + (DPW3Tri.ar(freq*2) * 0.5 * env.pow(3));

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

SynthDef(\mixer_channel, { | in = 10, out = 0, send = 12, send_amp = 0 |
	var sig = In.ar(in, 2);
	sig = sig * \amp.kr(0.5);
	Out.ar(out, sig);
	Out.ar(send, sig * send_amp);
}).add;

SynthDef(\rain_pulse, {
	var freq = \freq.kr(200), length = \length.kr(0.5),
	sig = Pulse.ar(freq) * 0.05 * Env.perc(\atk.kr(0.01), length, 1.0, -12).ar(2);
	sig = RLPF.ar(sig, freq*Line.kr(4, 1.0, length), 0.1) * \amp.kr(0.5);
	sig = Pan2.ar(sig, \pan.kr(0));
	Out.ar(\out.kr(0), sig);
}).add;
)
(
var filter_bus, filter, drone, drone_channel, cloud_channel, sine_channel, filter_channel, sub_channel, rain_channel, rev_channel;

s.newBusAllocators;

~s53 = Scale.chromatic('et53');
~chord = [0, 14, 31, 44];
~makeCloud = { |octave, pan = 0| var ev;
	ev = (
		octave: octave,
		rq_max: 0.03,
		dynamic_amp: 0.5,
		amp: 0.5,
		amp_min: 0.1,
		amp_max: 0.5,
		del_min: 0.05,
		del_max: 0.1,
		atk: (1/10.pow(octave-3)).max(0.001),
		rel: 0.1,
		pan: pan,
		root: 0.midicps,
		out_bus: 0,

		playATick: {|self|
			Synth(\tick2,
				[
					\freq, ~s53.degreeToFreq(~chord.choose, self.root, self.octave),
					\rq, exprand(0.001, self.rq_max),
					\out, self.out_bus,
					\amp, exprand(self.amp_min, self.amp_max) * self.amp * self.dynamic_amp,
					\atk, self.atk,
					\rel, self.rel, //0.01,
					\pan, rrand(-0.1, 0.1) + self.pan,
				]
			);
			rrand(self.del_min, self.del_max).wait;
		}
	);
	ev.loopFunc = Task({
		loop{
			ev.playATick();
		};
	});
	ev.loopFunc.start;
	ev
};

~chordDeltasToChord = {
	var lastNote = 159, chordFreqs;
	~chord = [lastNote] ++ rrand(2, ~chordDeltas.size*rrand(1, 4).floor).collect{|i|
		var newNote = lastNote - ~chordDeltas[i % ~chordDeltas.size];
		lastNote = newNote;
		newNote;
	};
};

~makeMixerChannel = { | name, out, amp = 1 |
	var bus, synth, group;
	bus = Bus.audio(s, 2);
	group = Group(s);
	synth = Synth(\mixer_channel, [\in, bus, \out, out], group, \addToTail);
	(
		my_synth: synth,
		my_group: group,
		my_amp: amp,
		my_send_amp: 0.0,
		bus: bus,
		name: name,
		set_amp: {|self, amp|
			self.my_amp = amp;
			self.my_synth.set(\amp, amp);
		},
		set_send: {|self, send, send_amp = 0|
			self.my_synth.set(\send, send);
			self.set_send_amp(send_amp);
		},
		set_send_amp: {|self, send_amp|
			self.my_send_amp = send_amp;
			self.my_synth.set(\send_amp, send_amp);
		},
		// Use play on to make sure that the
		play_on: {|self, synth_name, args|
			Synth(synth_name, args, self.my_group);
		},
	)
};


// ~revBus = Bus.audio(s, 2);
rev_channel = ~makeMixerChannel.("Reverb", 0);
rev_channel.play_on(\medium_reverb, [\out, rev_channel.bus, \in, rev_channel.bus, \mix, 1.0]);
filter_bus = Bus.audio(s, 2);
cloud_channel = ~makeMixerChannel.("Clouds", rev_channel.bus);
cloud_channel.set_send(rev_channel.bus, 0.5);
filter_channel = ~makeMixerChannel.("Filter", 0);
filter_channel.set_send(rev_channel.bus, 0.2);
drone_channel = ~makeMixerChannel.("Drone", filter_bus);
sine_channel = ~makeMixerChannel.("Sines", filter_bus);
sub_channel = ~makeMixerChannel.("Sub", 0);
sub_channel.set_send(rev_channel.bus, 0.0);
rain_channel = ~makeMixerChannel.("Rain", 0);
rain_channel.set_send(rev_channel.bus, 0.0);
~random_fm_channel = ~makeMixerChannel.("Rnd FM", 0);
~random_fm_channel.set_amp(0.1);

~startRev.(cloud_channel.bus);

filter = filter_channel.play_on(\bubbly_filter, [\speed, 13, \in, filter_bus, \out, filter_channel.bus]);
drone = drone_channel.play_on(\fm_drone, [\freq, 32, \amp, 0.1, \cRatio, 1, \mRatio, 2, \index, 7, \index_lfo_freq, 7, \iScale, 4, \out, drone_channel.bus]);
// play long sines
{
	loop {
		sine_channel.play_on(\long_sine, [\freq, rrand(700, 2000), \amp, rrand(0.01, 0.2), \pan, rrand(-0.5, 0.5), \out, sine_channel.bus]);
		rrand(1, 5).wait;
	};
}.fork;

// play sub base
{
	loop {
		sub_channel.play_on(\sub_tam, [\freq, 32, \amp, rrand(0.1, 0.7), \pan, rrand(-0.5, 0.5), \c0, 2, \atk, rrand(4, 8), \rel, 1, \out, sub_channel.bus]);
		rrand(7, 20).wait;
	};
}.fork;

// play rain
~chordDeltas = [9, 5, 17, 9, 13].reverse;
~chord = [ 190, 177, 168, 151, 146, 137, 124, 115, 98, 93, 84 ] - 53;
~rainParams = ();
~rainParams.pan = 0;
~rainParams.length = 2;
~rainParams.delay = 0.2;
// ~rainParams.out = 0;
~rainParams.out = rain_channel.bus;
~rainParams.octave = 6;
{ var delay_mod = 1.0;
	loop { var chord_size = ~chord.size;
		~chord.do{ |degree, i|
			var freq = ~degree53_to_freq.value(degree + (53*~rainParams.octave), ~rootFreq),
			intensity = rrand(i/(chord_size * 2), 1.0), // different curves here shape the fall and the sense of downbeat
			amp = intensity.linexp(0, 1, 0.05, 1.0) * 2;

			rain_channel.play_on(\rain_pulse, [\freq, freq, \pan, ~rainParams.pan, \length, ~rainParams.length, \amp, amp, \out, ~rainParams.out]);

			~rainParams.delay.wait;
		};
		~chordDeltasToChord.();
		~rainParams.delay = 1.0/rrand(2, 16);
	}
}.fork;

~cloud = ~makeCloud.(5, 0);
~cloud.del_max = 0.5;
~cloud.amp_min = 0.01;
~cloud.amp = 0.4;
~cloud.out_bus = cloud_channel.bus;

~allClouds = [~cloud];

~makeSoundForestGui.([drone_channel, sine_channel, filter_channel, cloud_channel, rain_channel, ~random_fm_channel, sub_channel, rev_channel], ~allClouds);
)


/// Random FM synth
(
var layers = 20, freq = 100;
~random_fm_synth.release;
~random_fm_synth = SynthDef(\random_fm, {
	var freq = LFNoise2.kr(LFNoise1.kr(0.2).range(0.2, 6)).range(0, 1).lincurve(0, 1, 40, 200, 8),
	sig = DC.ar(1.0); // 1.0 so that the first sine has a frequency
	layers.do {|i|
		var index = rrand(1, 4).round, ratio = rrand(1, 8).round/rrand(1, 4).round;
		sig = SinOsc.ar(freq * ratio + sig) * freq * index * ratio;
		// multiply by an lfo
		sig = sig * SinOsc.kr(rrand(0.1, 4.0)).range(1.0 - (((layers-i)/layers) * 0.5), 1.0);
	};
	sig = SinOsc.ar(freq + sig) * 0.5 * \amp.kr(0.5);
	sig = Pan2.ar(sig, \pan.kr(0));
	Out.ar(\out.kr(~random_fm_channel.bus), sig);
}).play;
)
1000.sqrt