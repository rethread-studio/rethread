
s.waitForBoot({
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
		wet = DelayN.ar(wet, 0.25, \predelay.kr(0.25));
		wet = GVerb.ar(wet, 200, \rt.kr(2));
		wet = HPF.ar(wet, \hpf_freq.kr(100)) * -3.dbamp;
		wet = LPF.ar(wet, \lpf_freq.kr(7000));
		snd = snd + (wet * \wetness.kr(0.1, 0.5));
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
		detuneCtrl = LFNoise1.kr(0.1!4).bipolar(detune).midiratio;
		sig = Osc.ar(buf, freq * detuneCtrl, {Rand(0,2pi)}!4);

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


	~from_53 = { | degrees |
		var s = Scale.chromatic('et53'), list = List[];
		degrees.do{|degree| list.add(s.degreeToFreq(degree, 0.midicps, 0))};
		list

	};
	~revBus = Bus.audio(s, 2);
	~rev3Bus = Bus.audio(s, 2);
	s.sync;
	~rev = Synth(\long_reverb, [\in, ~revBus, \out, 0, \wetness, 0.1, \lpf_freq, 10000, \predelay, 0.05, \rt, 1.0, \wetness, 0.05]);
	~rev3 = Synth(\medium_reverb, [\in, ~rev3Bus, \mix, 0.4, \feedback, 0.95, \size, 0.9, \damp, 0.65, \diff, 0.6]);

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
	~section.pitch_index_offset = 0;

	~call_sus = 0.01;
	~rbps = 0.1;

	~last_min = 0;
	~last_max = 0;
	~now = {Date.localtime.rawSeconds};

	~chord = ~from_53.([0, 14, 31, 36, 48, 53] + 159);
	~updateChord = {
		if(~section.supplier_dist_evenness < 0.2 || (~section.dependency_dist_evenness < 0.2), {
			~chord = ~from_53.([0, 14, 31, 36, 48, 53] + 159);
		}, {
			if(~section.diversity > 2.5, {
				~chord = ~from_53.([0, 12, 13, 14, 15, 16, 17, 31, 39, 43] + 212);
			}, {
				~chord = ~from_53.([0, 17, 31, 39, 48] + 53);
			});
		});
		~call_sus = 0.1/~section.diversity;
		if((~section.average - ~section.min_depth) > 30.0, {
			~call_sus = 0.01;
		});
	};
	"glitches.scd".loadRelative;
	"osc.scd".loadRelative;
});

/*

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
*/
/*

// NOISE
n = NdefMixer(s);
n.parent.alwaysOnTop_(true); // show mixer in front of IDE
if (\ProxyMeter.asClass.notNil) { ProxyMeter.addMixer(n); };

*/

