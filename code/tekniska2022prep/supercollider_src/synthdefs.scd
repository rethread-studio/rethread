

// https://sccode.org/1-5ay (by nicolaariutti)
SynthDef(\bell, {
	|fs=1, t60=1, pitchy=1, amp=0.25, gate=1|
	var sig, exciter;
	//exciter = Impulse.ar(0);
	exciter = WhiteNoise.ar() * EnvGen.ar(Env.perc(0.001, 0.05), gate) * 0.25;
	sig = Klank.ar(
		`[
			[1, 2, 2.803, 3.871, 5.074, 7.81, 10.948, 14.421],   // freqs
			[1, 0.044, 0.891, 0.0891, 0.794, 0.1, 0.281, 0.079], // amplitudes
			[1, 0.205, 1, 0.196, 0.339, 0.047, 0.058, 0.047]*t60     // ring times
		],
		exciter,
		freqscale:fs*pitchy);
	sig = FreeVerb.ar(sig) * amp;
	DetectSilence.ar(sig, 0.001, 0.5, doneAction:2);
	Out.ar(0, sig!2);
}).add;

SynthDef(\sine, {
	var sig, env;
	env = Env.linen(\atk.kr(0.01), \sus.kr(0.5), \rel.kr(0.2)).ar(2);
	sig = SinOsc.ar(\freq.kr(220), mul: \amp.kr(0.5)) * env;
	sig = Pan2.ar(sig, \pan.kr(0));
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\medium_reverb, { | out = 0, amp = 1, mix = 0.3  |
	var sig, wet, in;

	in = In.ar(\in.kr(10), 2);
	mix = Lag2.kr(mix, \mixLag.kr(10));

	sig = HPF.ar(in, 120);
	sig = LPF.ar(sig, 7000);

	wet = JPverb.ar(sig, 3.0, 0.9, 4.0, 0.8);
	// wet = GVerb.ar(sig, 300, 103, 0.43, 0.51, 15, -5.dbamp, -26.dbamp, -20.dbamp);
	// wet = Greyhole.ar(sig, \delayTime.kr(0.1), \damp.kr(0.7), \size.kr(1.0), \diff.kr(0.8), \feedback.kr(0.9));

	wet = HPF.ar(wet, 60);

	sig = (in * (1-mix)) + (wet*mix);
	sig = Limiter.ar(sig, 0.95);
	Out.ar(out, sig);
}).add;

SynthDef(\main_out_glitch, {
	var sig = In.ar(\in.kr(10), 2), lag_time = \lag_time.kr(3);

	sig = SelectX.ar(\enable_pitch_shift.kr(0, lag_time), [sig, PitchShift.ar(sig, 0.2, Ramp.kr(\pitch_shift_ratio.kr(1.0), lag_time), VarLag.kr(\pitch_dispersion.kr(0.00), lag_time, 20), \time_dispersion.kr(0.01, lag_time))]);
	sig = SelectX.ar(\enable_bit_crush.kr(0, lag_time), [sig, Decimator.ar(sig, \sample_rate.kr(44100, lag_time), \bits.kr(24, lag_time))]);

	Out.ar(\out.kr(0), sig);
}).add;