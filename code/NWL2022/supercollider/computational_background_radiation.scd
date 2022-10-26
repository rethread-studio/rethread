(
SynthDef(\tick3, {
	var sig, env, rq = \rq.kr(0.3);
	env = Env.perc(\atk.kr(0), \rel.kr(0.5), curve: [\c0.kr(-4), \c1.kr(-4)]).ar(2);
	sig = Impulse.ar(0);
	sig = sig * 0.5;
	// high freq and rq values causes the filter to blow up violently
	sig = RHPF.ar(sig, \freq.kr(1000).min(18000).max(20), rq.min(5)) * env;
	sig = Pan2.ar(sig, \pan.kr(0)) * \amp.kr(1.0) * 10;
	sig = (sig*7).tanh;
	// sig = AnalogTape.ar(sig, 0.0, 0.4, 0.1, oversample: 3);
	Out.ar(\out.kr(0), sig);
}).add;
SynthDef(\long_reverb, {
	var snd, wet;
	snd = In.ar(\in.kr(0), 2);
	wet = snd.sum;
	// wet = PitchShift.ar(snd, 0.2, 2);
	wet = DelayN.ar(wet, 0.25, 0.25);
	wet = GVerb.ar(wet, 200, \rt.kr(2));
	wet = HPF.ar(wet, 100) * -3.dbamp;
	wet = LPF.ar(wet, 7000);
	snd = snd + (wet * \wetness.kr(0.1));
	// Add a little bit of tape flutter
	snd = DelayC.ar(snd, 0.2, LFNoise2.kr(1).range(0, 0.005));

	//snd = (snd * Demand.kr(Dust.kr(5), 1, Dseq([1, 0], inf))) + (snd*0.5);

	Out.ar(\out.kr(0), snd);
}).add;

SynthDef(\thump, {
	var sig, env, freq = \freq.kr(220);
	env = Env.perc(\atk.kr(0.1), \rel.kr(2), curve: [\c0.kr(\cub), \c1.kr(\sine)]).kr(2);
	sig = Resonz.ar(PinkNoise.ar(mul: env.pow(100) * 20), freq, 0.007, mul: 20);
	sig = sig * \amp.kr(0.5);
	sig = Pan2.ar(sig, \pan.kr(0));
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\softy, {
	var sig, env, freq = \freq.kr(220);
	env = Env.perc(\atk.kr(0.1), \rel.kr(2), curve: [\c0.kr(\cub), \c1.kr(\sine)]).kr(2);
	sig = Resonz.ar(PinkNoise.ar(mul: env), freq.max(20).min(18000), 0.007, mul: 20);
	sig = sig * \amp.kr(0.5);
	sig = Pan2.ar(sig, \pan.kr(0));
	Out.ar(\out.kr(0), sig);
}).add;



//10 wavetables with increasing complexitymovementRecord
~wt_sig = 10.collect({
	arg i;

	//random number of envelope segments
	var numSegs = i.linexp(0,9,4,40).round;

	Env(
		//env always begins and ends with zero
		//inner points are random from -1.0 to 1.0
		[0]++({1.0.rand}.dup(numSegs-1) * [1,-1]).scramble++[0],

		//greater segment duration variety in higher-index wavetables
		{exprand(1,i.linexp(0,9,1,50))}.dup(numSegs),

		//low-index wavetables tend to be sinusoidal
		//high index wavetables tend to have sharp angles and corners
		{[\sine,0,exprand(1,20) * [1,-1].choose].wchoose([9-i,3,i].normalizeSum)}.dup(numSegs)
	).asSignal(1024);
});

//load into 10 buffers in wavetable format
~wt_buf = Buffer.allocConsecutive(10, s, 2048, 1, {
	arg buf, index;
	buf.setnMsg(0, ~wt_sig[index].asWavetable);
});

SynthDef(\osc, {
	arg buf=0, freq=200, detune=0.2,
	amp=0.2, pan=0, out=0, rout=0, rsend=(-20),
	atk=0.01, sus=1, rel=0.01, c0=1, c1=(-1);
	var sig, env, detuneCtrl;
	env = EnvGen.ar(
		Env([0,1,1,0],[atk,sus,rel],[c0,0,c1]),
		doneAction:2
	);

	//array of eight Oscs with uniquely detune frequencies
	//and unique initial phase offsets
	detuneCtrl = LFNoise1.kr(0.1!8).bipolar(detune).midiratio;
	sig = Osc.ar(buf, freq * detuneCtrl, {Rand(0,2pi)}!8);

	sig = Splay.ar(sig); //spread 8 signals over stereo field
	sig = LeakDC.ar(sig); //remove DC bias
	sig = Balance2.ar(sig[0], sig[1], pan, amp); //L/R balance (pan)
	sig = sig * env;
	Out.ar(out, sig);
	Out.ar(rout, sig * rsend.dbamp); //"post-fader" send to reverb
}).add;

SynthDef(\sus_osc, {
	arg buf=0, freq=200, detune=0.2,
	amp=0.2, pan=0, out=0, rout=0, rsend=(-20),
	atk=0.01, sus=1, rel=0.01, c0=1, c1=(-1);
	var sig, env, detuneCtrl;
	amp = Lag.kr(amp, 0.5);
	freq = Lag.kr(freq, \portamento.kr(0.1));
	env = EnvGen.ar(
		Env([0,1,1,0],[atk,sus,rel],[c0,0,c1], releaseNode: 1),
		gate: \gate.kr(1),
		doneAction:2
	);

	//array of eight Oscs with uniquely detune frequencies
	//and unique initial phase offsets
	detuneCtrl = LFNoise1.kr(0.1!8).bipolar(detune).midiratio;
	sig = Osc.ar(buf, freq * detuneCtrl, {Rand(0,2pi)}!8);

	sig = Splay.ar(sig); //spread 8 signals over stereo field
	sig = LeakDC.ar(sig); //remove DC bias
	sig = Balance2.ar(sig[0], sig[1], pan, amp); //L/R balance (pan)
	sig = sig * env;
	Out.ar(out, sig);
	Out.ar(rout, sig * rsend.dbamp); //"post-fader" send to reverb
}).add;

SynthDef(\sine, {
	var sig, env;
	env = Env.perc(\attack_time.kr(0.01), \release_time.kr(2.0)).kr(2);
	sig = SinOsc.ar(\freq.kr(220)) * env * \amp.kr(0.5);
	sig = Pan2.ar(sig, \pan.kr(0));
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\medium_reverb, { | out = 0, amp = 1, mix = 0.3, rt = 3.0  |
	var sig, wet;

	sig = In.ar(\in.kr(10), 2);
	mix = mix.lag(\mixLag.kr(10));

	/*wet = JPverb.ar(sig, rt, 0.9, 4.0, 0.8);
	wet = GVerb.ar(sig, 300, 3, 0.43, 0.51, 15, -5.dbamp, -26.dbamp, -20.dbamp);*/
	wet = Greyhole.ar(sig, \delayTime.kr(0.1), \damp.kr(0.7), \size.kr(1.0), \diff.kr(0.8), \feedback.kr(0.7));

	sig = (sig * (1-mix)) + (wet*mix);
	sig = Limiter.ar(sig, 0.95);
	sig = LeakDC.ar(sig);
	Out.ar(out, sig);
}).add;
SynthDef(\kick,  { | dur2 = 0.3, atk = 0.0001, amp = 0.8, pan = 0 |
	var sig, freq;
	freq = EnvGen.ar(Env(\freq_l.kr([2960, 68, 46]), \freq_d.kr([0.03, 0.2]), \freq_c.kr([-13, -1])));
	sig = SinOsc.ar(
		freq,
		mul:EnvGen.ar(
			Env.perc( atk, max(dur2 - atk, atk), curve: \amp_c.kr([-1, 5])),
			doneAction: 2 )
	);
	sig = Pan2.ar(sig, pan, amp);
	Out.ar(\out.kr(0), sig);
}).add;
~chord = ([0, 3, 7, 8, 11, 12] + 36).midicps;

~from_53 = { | degrees |
	var s = Scale.chromatic('et53'), list = List[];
	degrees.do{|degree| list.add(s.degreeToFreq(degree, 0.midicps, 0))};
	list

};
)
~from_53.([0, 17])
(
{
	([0, 3, 7, 8, 11, 12] + 36).midicps.do{|freq|

		Synth(\softy, [\freq, freq * 4]);
		0.1.wait;
	};
}.fork;
)

~chord = ([0, 3, 7, 8, 11, 12] + 36).midicps;
~chord = ([0, 4, 7, 9, 11, 12] + 36 + -5).midicps;


(
{
	loop {
		var num_notes_in_gesture = [3, 5, 9].choose;

		num_notes_in_gesture.do { |i|
			var freq = ~chord.choose;
			Synth(\osc, [\freq, freq * [2, 4, 8][(i/num_notes_in_gesture) * 2.9], \atk, 0.01, \rel, 2, \buf, ~wt_buf[0..2].choose]);
			0.2.wait;
		};
		2.wait;
	};
}.fork;
)

(
{
	var beat_time = 0.15;
	loop {
		var num_notes_in_gesture = [3, 5, 9].choose;

		num_notes_in_gesture.do { |i|
			var freq = ~chord.choose;
			Synth(\osc, [\freq, freq * [1, 2, 4, 8][((num_notes_in_gesture-i)/num_notes_in_gesture) * 3.9], \atk, 0.01, \sus, 0,\rel, 2, \buf, ~wt_buf[0..2].choose, \out, ~revBus, \pan, -1, \detune, i * 0.01]);
			beat_time.wait;
		};
		((32-num_notes_in_gesture) * beat_time).wait;
	};
}.fork;

{
	var beat_time = 0.15;
	(4 * beat_time).wait;
	loop {
		var num_notes_in_gesture = [3, 5, 9].choose;

		num_notes_in_gesture.do { |i|
			var freq = ~chord.choose;
			Synth(\osc, [\freq, freq * [1, 2, 4, 8][((i)/num_notes_in_gesture) * 3.9], \atk, 0.01, \sus, 0,\rel, 2, \buf, ~wt_buf[0..2].choose, \out, ~revBus, \pan, 1, \detune, 0.2 - (i*0.01)]);
			beat_time.wait;
		};
		((32-num_notes_in_gesture) * beat_time).wait;
	};
}.fork;
)


(
fork{
	~revBus = Bus.audio(s, 2);
	~rev3Bus = Bus.audio(s, 2);
	s.sync;
	~rev = Synth(\long_reverb, [\in, ~revBus, \out, 0, \wetness, 0.1]);
	~rev3 = Synth(\medium_reverb, [\in, ~rev3Bus, \mix, 0.4, \feedback, 0.95, \size, 0.9, \damp, 0.65, \diff, 0.6]);
}
)
~rev3.set(\feedback, 0.95, \size, 0.9)
// NOISE
n = NdefMixer(s);
n.parent.alwaysOnTop_(true); // show mixer in front of IDE
if (\ProxyMeter.asClass.notNil) { ProxyMeter.addMixer(n); };

(
{
	Ndef(\glitch,{
		var length = 48000*1.0, seq = Demand.ar(Impulse.ar(0.05), 0, Dseq([[0, length, 100], [length, 0, 2000]], inf)), read_phase, reader, reader2, buffer,
		freq = LFNoise0.ar(2).range(500, 5000), sig;
		buffer=LocalBuf(length,2).clear;
		read_phase = LFNoise1.ar(200.5).range(0, length);
		// read_phase = Phasor.ar(Dust.ar(2), 1.0, 0.0, length, LFNoise1.kr(3).range(0, length));

		reader=BufRd.ar(2, buffer, read_phase)*0.7;
		reader2=BufRd.ar(2, buffer, length-read_phase-1)*0.7;

		r=LFNoise0.ar(0.01).unipolar;
		BufWr.ar(
			SinOsc.ar(freq, 0, Decay.ar(Impulse.ar(0.125), 1, 0.5))+((reader + reader2)*0.7),
			buffer,
			(LFNoise1.ar(0.5+LFPulse.ar([0.0125, 0.013], 0, 0.9, 0.01))+1)*(length/2)
		);
		BufWr.ar(
			SinOsc.ar(LFNoise1.ar(0.2).range(500, 5000), 0, Decay.ar(Impulse.ar(0.125), 2, 0.5)),
			buffer,
			(LFNoise1.ar(0.4+LFPulse.ar([0.0125, 0.013], 0, 0.9, 0.01))+1)*(length/2)
		);
		sig = (reader).tanh;
		sig
	});
	Ndef(\glitch_out, {
		var out = 0, delayTime = 0.1, amp = 1, mix = 0.4, rt = 3.0, feedback = 0.3, size = 0.7, damp = 0.65, diff = 0.6,
		sig, wet;

		sig = Ndef(\glitch).ar();
		/*wet = JPverb.ar(sig, rt, 0.9, 4.0, 0.8);
		wet = GVerb.ar(sig, 300, 3, 0.43, 0.51, 15, -5.dbamp, -26.dbamp, -20.dbamp);*/
		wet = Greyhole.ar(sig, delayTime, damp, size, diff, feedback);

		sig = (sig * (1-mix)) + (wet*mix);
		sig = Limiter.ar(sig, 0.95);
		sig = LeakDC.ar(sig);
		sig
	}).play();
}.fork;
)
Ndef(\glitch_out).stop

//

(

)
~rbps = 0.1;
(
Pdef(\tick, Pbind(\instrument, \tick3,
	\dur, Pseq([1], inf) * Pfunc({~rbps}) * 4,
	\freq, Pwhite(1000, 10000),
	\amp, 0.01,
	\rq, 0.1,
	\out, ~rev2Bus,
)).play;
)
(
Pdef(\kick, Pbind(\instrument, \kick,
	\dur, Pseq([9,1,7,7,1,7], inf) * Pfunc({~rbps}) * 4,
	\amp, Pseq([1, 0.5, 0.7, 1, 0.7, 0.5]*0.5, inf),
	\out, ~revBus,
)).play;
)

~chord = ([0, 3, 7, 8, 11, 12] + 36).midicps;
~chord = ([0, 4, 7, 9, 11, 12] + 36 + -5).midicps;
~chord = ([0, 3, 7, 8, 11, 12] + 36).midicps;
~chord = ([0, 3, 6, 9, 11, 12] + 36).midicps;

~chord = ~from_53.([0, 9, 17, 22, 31, 39] + 159);
~chord = ~from_53.([0, 9, 17, 31, 43] + 106);
~chord = ~from_53.([0, 5, 14, 31, 36, 45] + 159);

~chord = ~from_53.([0, 12, 31, 39, 43] + 106);
~chord = ~from_53.([0, 12, 13, 14, 15, 16, 17, 31, 39, 43] + 212);


// OSC
(
~section = Environment.new(know: true);
~section.min_depth = 0;
~section.average = 50;
~section.diversity = 0.0;
~section.max_depth = 100;
~section.depth_width = ~section.max_depth - ~section.min_depth;
~section.num_suppliers = 1;
~section.num_dependencies = 1;
~section.supplier_dist_evenness = 1.0;
~section.dependency_dist_evenness = 1.0;

~chord = ([0, 4, 7, 11]+12).midicps;
~chord = ~from_53.([0, 17, 31, 48] + 53);
~chord = ~from_53.([0, 17, 31, 39, 48] + 53);

OSCdef(\call, {|msg, time, addr, recvPort|
	var depth = msg[1]-~section.min_depth, sine_mix,
	// freq = msg[1] * 10 + 20,
	// freq = (msg[1] + 12).midicps,
	freq = ~chord[(depth %~chord.size)] * 2.pow((depth/~chord.size).floor()),
	buf, amp = 1.0, atk = 0.001;
	if(msg[2] == 0, {
		buf = ~wt_buf[0..4].choose;
		amp = 0.5;
	});
	if(msg[2] == 1 || msg[2] == -1, {
		buf = ~wt_buf[7..9].choose;
		atk = 0.25;
		// freq = msg[1] * 10 + 20;
	});
	if(msg[2] == -1, {
		freq = freq * 0.5;
	});

	// amp = ~section.depth_width.linlin(0, 100, 0.05, 0.2);
	// buf = ~wt_buf[((1.0-~section.supplier_dist_evenness) * 9).floor];
	// Synth(\tick3, [\freq, msg[1]* 20 + 100, \out, ~rev2Bus]);
	// TODO: Vary mix between wavetable and sine based on the section
	sine_mix = ((~section.diversity-0.5)*0.25).min(1).max(0);
	sine_mix.postln;
	Synth(\osc, [\freq, freq, \atk, atk, \sus, 0.1,\rel, 0.15, \amp, amp * 0.2 * sine_mix, \buf, buf, \out, ~revBus, \pan, rrand(-0.5, 0.5), \detune, rrand(0.0, 0.1)]);
	Synth(\sine, [\freq, freq, \amp, 0.05 * amp * (1.0-sine_mix)]);

	// msg.postln

}, '/call', nil);

OSCdef(\speed, {|msg, time, addr, recvPort|
	~rbps = msg[1].asFloat;
	// Synth(\tick3, [\freq, msg[1]* 20 + 100, \out, ~rev2Bus]);
	// msg.postln

}, '/speed', nil); // def style

OSCdef(\section, {|msg, time, addr, recvPort|
	var
	min_depth = msg[1].asInteger,
	max_depth = msg[2].asInteger,
	num_suppliers = msg[3].asInteger,
	num_dependencies = msg[4].asInteger,
	supplier_dist_evenness = msg[5].asFloat,
	dependency_dist_evenness = msg[6].asFloat,
	average = msg[7].asFloat,
	diversity = msg[8].asFloat;
	~section.min_depth = min_depth;
	~section.max_depth = max_depth;
	~section.depth_width = ~section.max_depth - ~section.min_depth;
	~section.num_suppliers = num_suppliers;
	~section.num_dependencies = num_dependencies;
	~section.supplier_dist_evenness = supplier_dist_evenness;
	~section.average = average;
	~section.dependency_dist_evenness = dependency_dist_evenness;
	~section.diversity = diversity;


	Synth(\osc, [\freq, 1000, \atk, 0.01, \sus, 0.00,\rel, 0.05, \amp, 0.2, \buf, ~wt_buf[0], \out, ~rev3Bus, \pan, 0, \detune, 0.3]);
	Synth(\sine, [\freq, 2000, \amp, 0.1, \atk, 0.07, \sus, 0.02,\rel, 6.5, \out, ~rev3Bus, \pan, 0]);


	msg.postln

}, '/section', nil);

)
OSCFunc.trace(false); // Turn posting on
