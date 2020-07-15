
(
"../sound_forest_mixer_gui.scd".loadRelative;
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
	var freq = \freq.kr(32), sig, env, sig1, sig2, sig3, mod1_1, mRatio = \mRatio.kr(2), mod1_2,
	mod2_1, mod2_2, mod2_1_ratio = 16*6, mod2_2_ratio = SinOsc.ar(freq*Rand(10, 14)).range(1, 16*8) *4, feedback,
	atk = \atk.kr(05), rel = \rel.kr(5), brightnessRamp, lowcut;

	env = Env.perc(atk, rel, 1.0, [\c0.kr(2), \c1.kr(-4)]).ar(2);

	brightnessRamp = XLine.kr(0.1, 1, atk);

	feedback = LocalIn.ar(1);
	mod1_2 = SinOsc.ar(freq * 8 + feedback, mul: freq * mRatio);
	LocalOut.ar(mod1_2 * 0.1);
	mod1_1 = SinOsc.ar(freq * mRatio + mod1_2, mul: freq * mRatio * Line.kr(0.0, 1.0, atk/2));
	sig1 = SinOsc.ar(freq + mod1_1) * env;

	mod2_2 = SinOsc.ar(freq * mod2_2_ratio, mul: freq * mod2_2_ratio * brightnessRamp * freq);
	mod2_1 = SinOsc.ar(freq * mod2_1_ratio + mod2_2, mul: freq * mod2_1_ratio * brightnessRamp);
	sig2 = SinOsc.ar(freq * 16 + mod2_1) * env.pow(1.5) * XLine.kr(0.05, 0.4, atk+rel);

	sig = sig1 + sig2;
	sig = sig * \amp.kr(0.5);
	// sig = sig + (DPW3Tri.ar(freq*2) * 0.5 * env.pow(3));
	lowcut = brightnessRamp.pow(3);
	sig = (HPF.ar(sig, 100) * lowcut) + (sig * (1-lowcut));

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

SynthDef(\reverse_sine, {
	var sig, env, freq = \freq.kr(220);

	env = Env.perc(\atk.kr(2), \rel.kr(0.1), curve: [\c0.kr(\cub), \c1.kr(\sine)]).kr(2);
	sig = SinOsc.ar(freq) * env;
	2.do { |i| var mult = i+2;
		sig = sig + SinOsc.ar(freq * mult * 1.01, // * LFNoise1.kr(7).range(0.98, 1.02),
			mul: env.pow(mult*mult));
	};

	sig = sig * 0.3 * \amp.kr(0.5);
	sig = Pan2.ar(sig, \pan.kr(0));

	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\reverse_saw, {
	var sig, env, freq = \freq.kr(220);

	env = Env.perc(\atk.kr(2), \rel.kr(0.1), curve: [\c0.kr(\cub), \c1.kr(\sine)]).kr(2);
	sig = Saw.ar(freq) * env;
	2.do { |i| var mult = i+2;
		sig = sig + Saw.ar(freq * mult * 1.01, // * LFNoise1.kr(7).range(0.98, 1.02),
			mul: env.pow(mult*mult));
	};

	sig = sig * 0.3 * \amp.kr(0.5);
	sig = Pan2.ar(sig, \pan.kr(0));

	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\reverse_google, {
	var sig, env, freq = \freq.kr(220);

	env = Env.perc(\atk.kr(2), \rel.kr(0.1), curve: [\c0.kr(\cub), \c1.kr(\sine)]).kr(2);
	sig = Pulse.ar(freq) * env;
	2.do { |i| var mult = i+2;
		sig = sig + DPW3Tri.ar(freq * mult * 1.01, // * LFNoise1.kr(7).range(0.98, 1.02),
			mul: env.pow(mult*mult));
	};

	sig = sig * 0.3 * \amp.kr(0.5) * LFSaw.ar(Rand(1.5, 3)).range(0.2, 1.0).lag(0.01);
	sig = Pan2.ar(sig, \pan.kr(0));

	Out.ar(\out.kr(0), sig);
}).add;


SynthDef(\thump, {
	var sig, env, freq = \freq.kr(220);
	env = Env.perc(\atk.kr(0.1), \rel.kr(2), curve: [\c0.kr(\cub), \c1.kr(\sine)]).kr(2);
	sig = Resonz.ar(PinkNoise.ar(mul: env.pow(100) * 20), freq, 0.007, mul: 20);
	sig = sig * \amp.kr(0.5);
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
		},
		growAmp: {|self, growth|
			self.dynamic_amp = self.dynamic_amp * growth;
			self.dynamic_amp = max(min(self.dynamic_amp, 1.0), 0.0001);
		},

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
sine_channel = ~makeMixerChannel.("Sines", filter_bus);
sub_channel = ~makeMixerChannel.("Sub", 0);
sub_channel.set_send(rev_channel.bus, 0.2);
rain_channel = ~makeMixerChannel.("Rain", 0);
rain_channel.set_send(rev_channel.bus, 1.0);
~random_fm_channel = ~makeMixerChannel.("Rnd FM", 0);
~random_fm_channel.set_amp(0.1);

~startRev.(cloud_channel.bus);

filter = filter_channel.play_on(\bubbly_filter, [\speed, 13, \in, filter_bus, \out, filter_channel.bus]);

// play long sines
{
	loop {
		var freq = ~s53.degreeToFreq(~chord.choose, 0.midicps, 5);
		sine_channel.play_on(\long_sine, [\freq, freq, \amp, rrand(0.02, 0.4), \pan, rrand(-0.5, 0.5), \out, sine_channel.bus]);
		rrand(1, 5).wait;
	};
}.fork;

// play sub base
/*{
	loop {
		sub_channel.play_on(\sub_tam, [\freq, 32, \amp, rrand(0.1, 0.7), \pan, rrand(-0.5, 0.5), \c0, 2, \atk, rrand(2, 15), \rel, rrand(3, 10), \out, sub_channel.bus]);
		rrand(7, 30).wait;
	};
}.fork;*/

// play rain
~chordDeltas = [9, 5, 17, 9, 13].reverse;
~chord = [ 0, 17, 31, 39, 53, 62, 75, 84, 96, 106] +  53;
~rainParams = ();
~rainParams.pan = 0;
~rainParams.length = 2;
~rainParams.delay = 0.2;
~rainParams.start_harm = 4.0; // How bright the LPF on the pulse starts relative to freq
~rainParams.brightness = 0.5;
// ~rainParams.out = 0;
~rainParams.out = rain_channel.bus;
~rainParams.octave = 3;
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

~cloud = ~makeCloud.(6, 0);
~cloud.del_max = 0.1;
~cloud.amp_min = 0.01;
~cloud.amp = 0.4;
~cloud.out_bus = cloud_channel.bus;

~allClouds = [~cloud];

~makeSoundForestGui.([sine_channel, filter_channel, cloud_channel, rain_channel, sub_channel, rev_channel], ~allClouds);

// Receive OSC packets on web traffic
~num_packets = 0;
~packet_density = 0;
~sub_tam_last_launch = Date.localtime.rawSeconds;
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

	freq, mRatio = 2, iScale = 1, rel = len.linexp(1, 2000, 0.01, 2), amp = 0.6, ip_parts, degree,
	reverse_synth = \reverse_sine;

	// Post all the data for every packet:
	// [msg, time, addr, recvPort].postln;

	// Convert out to a boolean
	if(out == \true, { out = true }, { out = false });

	/*switch(remote_location.asSymbol,
		\Sweden, { ~chord = [ 159, 155, 124, 106, 102, 71, 53, 49, 18, 0, -4 ] },
		"United States".asSymbol, { ~chord = [ 159, 154, 145, 137, 132, 123 ] }
	);*/

	// Interpret the IP as a float, convert it to midi note numbers and convert that to frequency.
	// freq = remote_ip.asFloat.linexp(0.0, 255.255, 48, 72).floor.midicps;

	// Extract all the integers from the remote_ip
	ip_parts = remote_ip.asString.split($.).collect{ |num| num.asInteger};
	// degree = ~chord[ip_parts[3] % ~chord.size];
	degree = ~chord.choose; // random pitch from the chord
	freq = ~s53.degreeToFreq(degree, 0.midicps, ~rainParams.octave);

	/*if(services.asString.size > 2) {
		services.postln;
	};*/
	switch(services,
		\Google, { "Google".postln; reverse_synth = \reverse_google },
		"Google,Youtube".asSymbol, {},
		\Amazon, { services.postln; reverse_synth = \reverse_saw },
		"Slack,Amazon".asSymbol, {},
		\Facebook, { services.postln; },
		\Cloudflare, { services.postln; },
		"Github,Microsoft".asSymbol, { services.postln; }
	);

	// count the number of packets received
	~num_packets = ~num_packets + 1;
	~packet_density = ~packet_density + 1;

	if(~packet_density > 100, {
		if(Date.localtime.rawSeconds - ~sub_tam_last_launch > 10.0, {
			"sub_tam launched".postln;
			~sub_tam_last_launch = Date.localtime.rawSeconds;
			sub_channel.play_on(\sub_tam, [
				\freq, 32,
				\amp, rrand(0.1, 0.7),
				\pan, rrand(-0.5, 0.5),
				\c0, 2,
				\atk, rrand(2, 15),
				\rel, rrand(3, 10),
				\out, sub_channel.bus]);
		}, {

		});
		~cloud.growAmp(1.008);
	}, {
		// only do if the packet density isn't too high
		if(s.peakCPU < 80 && (s.numSynths < 100),  {
			// Play a reverse sine if the packet is going out, and a thump if it's going in
			if(out == true, {
				rain_channel.play_on(reverse_synth, [
					\freq, freq,
					\atk, rrand(1.0, 5.0),
					\rel, rrand(0.1, 4),
					\c0, rrand(1, 4),
					\c1, \sine,
					\pan, rrand(-0.7, 0.7),
					\amp, 0.05 * amp,
					\out, ~rainParams.out]);
			}, {
				rain_channel.play_on(\thump, [
					\freq, freq,
					\atk, rrand(0.18, 0.21),
					\rel, 2,
					\c0, -3,
					\c1, \sine,
					\pan, rrand(-0.7, 0.7),
					\amp, 0.05 * amp,
					\out, ~rainParams.out]);
			});
		});

	});

	// Add to drone energy
	~droneParams.energy = ~droneParams.energy + 1.0;



}, '/package'); // create the OSCFunc

{ // Exponential envelope growth = pow(end / start, 1.0 / counter);
	var steps = 100, growth = (0.001).pow(1.0/steps);
	loop {
		~packet_density.postln;
		~packet_density = ~packet_density * growth;
		steps.reciprocal.wait;
	};
}.fork;

// Slowly decrease the amp of clouds used for high intensity bursts of data
{
	var steps = 100, growth = (0.001).pow(1.0/(steps*5.0));
	loop {
		~cloud.growAmp(growth);
		steps.reciprocal.wait;
	};
}.fork;


)
s.peakCPU
~rainParams.octave = 3
~droneParams.energy
(2.0).pow(1.0/10)
(
Synth(\reverse_google, [
	\freq, 200,
	\atk, rrand(1.0, 5.0),
	\rel, rrand(0.1, 4),
	\c0, rrand(1, 4),
	\c1, \sine,
	\pan, rrand(-0.7, 0.7),
	\amp, 0.1,
	\out,0]);
)
Date.localtime.rawSeconds