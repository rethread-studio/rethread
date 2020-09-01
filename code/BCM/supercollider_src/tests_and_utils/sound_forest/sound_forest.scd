
(
"../sound_forest_mixer_gui.scd".loadRelative;

SynthDef(\fm_drone, {
	arg freq=500, mRatio=1, cRatio=1,
	index=1, iScale=5, cAtk=4, cRel=(-4),
	amp=0.2, atk=0.01, rel=3, pan=0, gate = 1,
	out=0, fx=0, fxsend = -inf,
	car2, mod2,
	sig;
	var car, mod, env, iEnv;

	index = SinOsc.ar(\index_lfo_freq.kr(3)).range(1, LFNoise1.ar(2).range(3, 9));
	mRatio = LFNoise1.kr(1/10).range(2, 8);
	// index = 1;

	//amplitude envelope
	env = EnvGen.kr(Env.asr(atk, 1.0, rel,curve:[cAtk,cRel]), gate: gate, doneAction:2);

	//modulator/carrier
	mod = SinOsc.ar(freq * mRatio, mul:freq * mRatio * index);
	car = SinOsc.ar(freq * cRatio + mod) * LFNoise1.kr(1/8).range(0.4, 1.0).pow(2);

	mod2 = SinOsc.ar(freq * 2, mul:freq * 2 * index);
	car2 = SinOsc.ar(freq + mod2);

	sig = Mix(car + car2);
	sig = RLPF.ar(sig, \lpf.kr(600), 0.4);
	sig = sig * env * amp;
	sig = Pan2.ar(sig, pan);

	//direct out/reverb send
	Out.ar(out, sig);
	Out.ar(fx, sig * fxsend.dbamp);
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
	sig = Pan2.ar(sig, \pan.kr(0)) * \amp.kr(1.0) * 10;
	sig = sig.tanh; // Should never happen, but better to soft clip
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\sub_tam, {
	// FM synth for a sub bass type sound rev_channel.buswith some noise on top
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
	var freq = \freq.kr(200), length = \length.kr(0.5), brightness = \brightness.kr(0.9),
	sin = SinOsc.ar(freq) * 0.05,
	sig = Pulse.ar(freq) * 0.05,
	env = Env.perc(\atk.kr(0.01), length, 1.0, -12).ar(2);
	// Apply LPF to the square wave
	sig = LPF.ar(sig, freq*Line.kr(\start_harm.kr(4), \end_harm.kr(1.0), length)) * \amp.kr(0.5);
	// Mix the square and the sine
	sig = ( (sig * brightness) + (sin * (1-brightness)) ) * env;

	sig = Pan2.ar(sig, \pan.kr(0));
	Out.ar(\out.kr(0), sig);
}).add;
)
(
var filter_bus, filter, drone, drone_channel, cloud_channel, sine_channel, filter_channel, sub_channel, rain_channel, rev_channel;

s.newBusAllocators;

~s53 = Scale.chromatic('et53');
~chord = [0, 14, 31, 44];

// Helper functions
~makeCloud = { |octave, pan = 0| var ev;
	ev = (
		octave: octave,
		rq_max: 0.03,
		dynamic_amp: 0.5,
		amp: 0.5,
		amp_min: 0.25,
		amp_max: 1.0,
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

// Set up all the channels
// ~revBus = Bus.audio(s, 2);
rev_channel = ~makeMixerChannel.("Reverb", 0);
rev_channel.play_on(\medium_reverb, [\out, rev_channel.bus, \in, rev_channel.bus, \mix, 1.0]);
filter_bus = Bus.audio(s, 2);
cloud_channel = ~makeMixerChannel.("Clouds", 0);
cloud_channel.set_send(rev_channel.bus, 0.5);
filter_channel = ~makeMixerChannel.("Filter", 0);
filter_channel.set_send(rev_channel.bus, 0.2);
drone_channel = ~makeMixerChannel.("Drone", filter_bus);
drone_channel.set_amp(0.5);
sine_channel = ~makeMixerChannel.("Sines", filter_bus);
sub_channel = ~makeMixerChannel.("Sub", 0);
sub_channel.set_send(rev_channel.bus, 0.0);
rain_channel = ~makeMixerChannel.("Rain", 0);
rain_channel.set_send(rev_channel.bus, 1.0);
~random_fm_channel = ~makeMixerChannel.("Rnd FM", 0);
~random_fm_channel.set_amp(0.1);

~startRev.(cloud_channel.bus);

filter = filter_channel.play_on(\bubbly_filter, [\speed, 13, \in, filter_bus, \out, filter_channel.bus]);
drone = drone_channel.play_on(\fm_drone, [\freq, 32, \amp, 0.1, \cRatio, 1, \mRatio, 2, \index, 7, \index_lfo_freq, 7, \iScale, 4, \out, drone_channel.bus]);

// Drone update process
~droneParams = ();
~droneParams.energy = 0.0;
~droneParams.amp = 0.0;
{
	var reciprocal_steps_per_second = 100.reciprocal, energyDecay = (0.001 / 1.0).pow(reciprocal_steps_per_second/20.0);
	("drone energy decay: " ++ energyDecay).postln;
	loop {
		var amp = ~droneParams.energy.linlin(0, 10, 0.001, 0.8);
		~droneParams.amp = (~droneParams.amp * 0.9) + (amp * 0.1);
		drone.set(\amp, ~droneParams.amp);

		~droneParams.energy = ~droneParams.energy * energyDecay;
		reciprocal_steps_per_second.wait;
	};
}.fork;


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
~rainParams.start_harm = 4.0; // How bright the LPF on the pulse starts relative to freq
~rainParams.brightness = 0.5;
// ~rainParams.out = 0;
~rainParams.out = rain_channel.bus;
~rainParams.octave = 6;
/*{ var delay_mod = 1.0;
	loop { var chord_size = ~chord.size;
		~chord.do{ |degree, i|
			var freq = ~s53.degreeToFreq(degree, 0.midicps, ~rainParams.octave),
			intensity = rrand(i/(chord_size * 2), 1.0), // different curves here shape the fall and the sense of downbeat
			amp = intensity.linexp(0, 1, 0.05, 1.0) * 2;

			rain_channel.play_on(\rain_pulse, [
				\freq, freq,
				\pan, ~rainParams.pan,
				\length, ~rainParams.length,
				\start_harm, ~rainParams.start_harm,
				\brightness, ~rainParams.brightness,
				\end_harm, 1.0,
				\amp, amp,
				\out, ~rainParams.out]);

			~rainParams.delay.wait;
		};
		~chordDeltasToChord.();
		~rainParams.delay = 1.0/rrand(2, 16);
	}
}.fork;*/

~cloud = ~makeCloud.(5, 0);
~cloud.del_max = 0.5;
~cloud.amp_min = 0.01;
~cloud.amp = 0.4;
~cloud.out_bus = cloud_channel.bus;

~cloud2 = ~makeCloud.(6, 0);
~cloud2.del_max = 0.5;
~cloud2.amp_min = 0.01;
~cloud2.amp = 0.4;
~cloud2.out_bus = cloud_channel.bus;

~allClouds = [~cloud, ~cloud2];

~makeSoundForestGui.([drone_channel, sine_channel, filter_channel, cloud_channel, rain_channel, ~random_fm_channel, sub_channel, rev_channel], ~allClouds);


// Receive OSC packets on web traffic
~num_packets = 0;
// Receive packages of web traffic data
o = OSCFunc({ arg msg, time, addr, recvPort;
	var timestamp = msg[1],
	local_ip = msg[2],
	remote_ip = msg[3],
	out = msg[4],
	local_location = msg[5],
	remote_location = msg[6],
	len = msg[7].asFloat,
	protocol = msg[8],
	services = msg[9],
	speaker = msg[10],
	local_mac = msg[11],

	freq, mRatio = 2, iScale = 1, rel = len.linexp(1, 2000, 0.01, 2), amp = 0.6, ip_parts, degree;

	// Post all the data for every packet:
	// [msg, time, addr, recvPort].postln;

	// Convert out to a boolean
	if(out == \true, { out = true }, { out = false });

	if(out == true) {
		mRatio = 9;
	};

	switch(remote_location.asSymbol,
		\Sweden, { ~chord = [ 159, 155, 124, 106, 102, 71, 53, 49, 18, 0, -4 ] },
		"United States".asSymbol, { ~chord = [ 159, 154, 145, 137, 132, 123 ] }
	);

	// Interpret the IP as a float, convert it to midi note numbers and convert that to frequency.
	// freq = remote_ip.asFloat.linexp(0.0, 255.255, 48, 72).floor.midicps;

	// Extract all the integers from the remote_ip
	ip_parts = remote_ip.asString.split($.).collect{ |num| num.asInteger};
	degree = ~chord[ip_parts[3] % ~chord.size];
	freq = ~s53.degreeToFreq(degree, 0.midicps, ~rainParams.octave);

	if(services == \Google, {
		iScale = 2;
		freq = freq * 2;
	});


	rain_channel.play_on(\rain_pulse, [
		\freq, freq,
		\pan, ~rainParams.pan,
		\length, ~rainParams.length,
		\start_harm, ~rainParams.start_harm,
		\brightness, ~rainParams.brightness,
		\end_harm, 1.0,
		\amp, amp,
		\out, ~rainParams.out]);

	// Add to drone energy
	~droneParams.energy = ~droneParams.energy + 1.0;


	// count the number of packets received
	~num_packets = ~num_packets + 1;

}, '/package'); // create the OSCFunc

)
~droneParams.energy


Synth(\sub_tam, [\freq, 32, \amp, rrand(0.1, 0.7), \pan, rrand(-0.5, 0.5), \c0, 2, \atk, 4, \rel, 1, \out, 0]);