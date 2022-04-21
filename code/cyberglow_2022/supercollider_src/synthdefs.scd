// ftrace sonification SynthDefs
SynthDef(\windy, { |gate = 1, amp = 1, ampLagTime = 0.1 freq = 200, freqLagTime = 0.1 |
	var osc = BrownNoise.ar(0.5), env, focus, outs, freqs;
	freq = Lag3.kr(freq, freqLagTime);
	amp = amp.lag(ampLagTime);
	env = EnvGen.kr(Env(
		levels: [0, 1, 0],
		times: [\atk.kr(1), \rel.kr(1)],
		curve: [\curve_atk.kr(0), \curve_rel.kr(0)],
		releaseNode: 1),
	gate: gate,
	doneAction: 2);

	freqs = [freq * [2, 2.2], freq * [1.0, 1.02], freq * 5, freq * 3 + 10];
	focus = [LFNoise1.kr(4).range(0.001, 0.001), LFNoise2.kr(1.1).range(0.0001, 0.01), LFNoise2.kr(0.2).range(0.001, 0.05)];
	outs = Resonz.ar(osc, freqs, focus);
	outs = Mix.ar(outs);

	outs = (outs*100).tanh * 0.1;

	Out.ar(\out.kr(0), Pan2.ar(outs*env*amp));
}).add;
SynthDef(\softy, {
	var sig, env, freq = \freq.kr(220), rel = \rel.kr(2);
	env = Env.perc(\atk.kr(0.1), rel, curve: [\c0.kr(\cub), \c1.kr(\cub)]).kr(2);
	sig = Resonz.ar(PinkNoise.ar(mul: env), freq, 0.007, mul: 20);
	sig = LPF.ar(sig, Line.ar(100, 4000, rel/2));
	sig = sig * \amp.kr(0.5) * AmpCompA.kr(freq, 20);
	sig = Pan2.ar(sig, \pan.kr(0));
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\tick3, {
	var sig, env, rq = \rq.kr(0.3);
	env = Env.perc(\atk.kr(0), \rel.kr(0.5), curve: [\c0.kr(-4), \c1.kr(-4)]).ar(2);
	sig = Impulse.ar(0);
	sig = sig * 0.5;
	// high freq and rq values causes the filter to blow up violently
	sig = RHPF.ar(sig, \freq.kr(1000).min(18000).max(20), rq.min(5)) * env;
	sig = Pan2.ar(sig, \pan.kr(0)) * \amp.kr(1.0) * 10;
	sig = (sig*7).tanh;
	sig = AnalogTape.ar(sig, 0.0, 0.4, 0.1, oversample: 3);
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\low_rumble_filter, {
	var in = In.ar(\in.kr(10), 2), sig;
	sig = in;

	sig = AnalogTape.ar(sig, 0.8, 0.7, 0.5, oversample: 3);
	sig = AnalogVintageDistortion.ar(
        sig,
        drivegain: 0.5,
        bias: 0.1,
        lowgain: -3.dbamp,
        highgain: -9.dbamp,
        shelvingfreq: 600,
        oversample: 2,
    );
	sig = LPF.ar(sig, \lpf.kr(500)) * \amp.kr(0.5);

	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\sine, {
	var sig, env;
	env = Env.linen(\atk.kr(0.01), \sus.kr(0.5), \rel.kr(0.2)).ar(2);
	sig = SinOsc.ar(\freq.kr(220), mul: \amp.kr(0.5)) * env;
	sig = Pan2.ar(sig, \pan.kr(0));
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\sine_sweep, {
	var sig, env, freq, length = \length.kr(20), atk = \atk.kr(0.1), rel = \rel.kr(0.5);
	freq = Env(levels: [\start_freq.kr(100), \end_freq.kr(20)], times: [length], curve: \curve.kr(-4)).ar(0);
	env = Env.linen(atk, length - atk - rel, rel).kr(2);
	sig = SinOsc.ar(freq) * env * \amp.kr(0.5);
	sig = Pan2.ar(sig);
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\dist_saw, {
	var sig, env, freq = \freq.kr(220);
	env = Env.linen(\atk.kr(0.01), \sus.kr(0.5), \rel.kr(0.2)).ar(2);
	sig = DPW3Tri.ar(freq);
	sig = Pan2.ar(sig * \amp.kr(0.5) * env * AmpCompA.kr(freq, 20), \pan.kr(0));
	Out.ar(\out.kr(0), sig);
}).add;
SynthDef(\dist_sine, {
	var sig, env, freq = \freq.kr(220);
	env = Env.linen(\atk.kr(0.01), \sus.kr(0.5), \rel.kr(0.2)).ar(2);
	sig = SinOsc.ar(freq);
	sig = Pan2.ar(sig * \amp.kr(0.5) * env * AmpCompA.kr(freq, 20), \pan.kr(0));
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\dist_tri, {
	var sig, env, freq = \freq.kr(220);
	env = Env.linen(\atk.kr(0.01), \sus.kr(0.5), \rel.kr(0.2)).ar(2);
	sig = DPW3Tri.ar(freq);

	sig = Pan2.ar(sig * \amp.kr(0.5) * env * AmpCompA.kr(freq, 20), \pan.kr(0));
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\tape_dist, {
	var sig = In.ar(\in.kr(10), 2);
	sig = AnalogTape.ar(sig, 0.0, 0.1, 0.2, oversample: 3);
	/*sig = AnalogVintageDistortion.ar(
		sig,
		drivegain: 0.05,
		bias: 0.0,
		lowgain: 0.05,
		highgain: 0.05,
		shelvingfreq: 600,
		oversample: 2,
	);*/
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\dist_noise, {
	var sig, env, trig = Dust.ar(700);
	sig = PinkNoise.ar() * Decay2.ar(trig, 0.0001, 0.1);
	sig = HPF.ar(sig, 1000);
	sig = Resonz.ar(sig, \freq.kr(12500), 0.003) * 100;
	/*sig = Klank.ar(`[
	[8500, 9000, 9500],         // frequencies
	nil,                             // amplitudes (default to 1.0)
	Array.rand(5, 0.1, 2)                // ring times
	],
	sig) * 0.3;*/
	sig = sig + (DPW3Tri.ar(9050, mul: 0.1) * Env.perc(0.5, 0.6, curve: 3).ar(0));
	sig = (sig * 7).tanh * 0.5;
	sig = AnalogVintageDistortion.ar(sig,0,0, highgain: 0.2, oversample:3);
	sig = LeakDC.ar(sig);
	sig = sig * \amp.kr(0.5);
	sig = LPF.ar(sig, \lpf.kr(7000));
	sig = Pan2.ar(sig);
	Env.linen(0.01, 0.03, \rel.kr(0.05)).kr(2);
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\delay_fx, { | out = 0, amp = 1, mix = 0.3  |
	var sig, wet, in;

	sig = In.ar(\in.kr(10), ~mixerChannelOutputs);
	sig = Select.ar(\enable_delay.kr(0), [sig, sig * (1.0-mix) + (AllpassC.ar(sig, 0.5, LFNoise1.kr(0.1).range(0.2, 0.5), 4.0, mix))]);
	Out.ar(out, sig);
}).add;


SynthDef(\medium_reverb, { | out = 0, amp = 1, mix = 0.3  |
	var sig, wet, in;

	switch(~encoderType,
		\quad, {
			in = In.ar(\in.kr(10), 4);
			sig = [in[0] + in[2], in[1] + in[3]];
		},
		\stereo, {
			in = In.ar(\in.kr(10), 2);
			sig = in;
		}
	);
	mix = mix.lag(\mixLag.kr(10));

	sig = HPF.ar(sig, 120);
	sig = LPF.ar(sig, 7000);



	wet = JPverb.ar(sig, 3.0, 0.9, 4.0, 0.8);
	// wet = GVerb.ar(sig, 300, 103, 0.43, 0.51, 15, -5.dbamp, -26.dbamp, -20.dbamp);
	// wet = Greyhole.ar(sig, \delayTime.kr(0.1), \damp.kr(0.7), \size.kr(1.0), \diff.kr(0.8), \feedback.kr(0.9));

	wet = HPF.ar(wet, 60);

	switch(~encoderType,
		\quad, {
			// expand the reverb to all four channels
			sig = (in * (1-mix)) + ([wet[0], wet[1], wet[0], wet[1]]*mix);
		},
		\stereo, {
			sig = (in * (1-mix)) + (wet*mix);
		}
	);
	sig = (in * (1-mix)) + (wet*mix);
	sig = Limiter.ar(sig, 0.95);
	Out.ar(out, sig);
}).add;

SynthDef(\ambient_reverb, { | out = 0, amp = 0.5, mix = 0.5  |
	var sig, wet, in, env;

	env = EnvGen.kr(Env([0, 1, 0], [4, 4], releaseNode: 1), gate: \gate.kr(1), doneAction: 2);

	in = In.ar(\in.kr(10), 2);
	mix = mix.lag(\mixLag.kr(10));

	sig = HPF.ar(HPF.ar(in, 120), 50);
	sig = BPeakEQ.ar(sig, \bpeak_freq.kr(250), \bpeak_rq.kr(2.0), \bpeak_db.kr(-10));

	/*wet = JPverb.ar(sig, 3.0, 0.9, 4.0, 0.8);
	wet = GVerb.ar(sig, 300, 103, 0.43, 0.51, 15, -5.dbamp, -26.dbamp, -20.dbamp);*/
	wet = Greyhole.ar(sig, \delayTime.kr(0.4), \damp.kr(0.7), \size.kr(1.0), \diff.kr(0.8), \feedback.kr(0.7));

	wet = HPF.ar(wet, 60);

	sig = (in * (1-mix)) + (wet*mix);
	sig = Limiter.ar(sig, 0.95);
	Out.ar(out, sig * env * amp);
}).add;

SynthDef(\server_channel, {
	var sig = In.ar(\in.kr(0), 2) * \amp.kr(1), mix = \mix.kr(0.4);
	sig = HPF.ar(sig, 500);
	sig = LPF.ar(sig, 5000);
	sig = BPeakEQ.ar(sig, \bpeak_freq.kr(3800), \bpeak_rq.kr(2.0), \bpeak_db.kr(-10));
	sig = Select.ar(\enable_delay.kr(0), [sig, sig * (1.0-mix) + (AllpassC.ar(sig, 0.5, LFNoise1.kr(0.1).range(0.2, 0.5), 4.0, mix))]);
	Out.ar(\out.kr(0), sig);

}).add;

SynthDef(\mixer_channel, {
	var sig = In.ar(\in.kr(0), 2), lag_time = \lag_time.kr(5.1);
	sig = Select.ar(\enable_lpf.kr(0), [sig, LPF.ar(sig, Lag2.kr(\lpf_freq.kr(5000), lag_time))]);
	Out.ar(\out.kr(0), sig * Lag.kr(\amp.kr(1.0), lag_time));
}).add;
SynthDef(\tick2, {
	var sig, env, rq = \rq.kr(0.1);
	env = Env.perc(\atk.kr(0), \rel.kr(0.05), curve: [\c0.kr(-4), \c1.kr(-4)]).ar(2);
	sig = Impulse.ar(0);
	sig = sig * 0.5;
	// high freq and rq values causes the filter to blow up violently
	sig = RHPF.ar(sig, \freq.kr(1000).min(18000).max(20), rq.min(5)) * env;
	sig = Pan2.ar(sig, \pan.kr(0)) * \amp.kr(1.0) * 10;
	sig = sig.tanh; // Should never happen, but better to soft clip
	// sig = AnalogTape.ar(sig, 0.0, 0.4, 0.1, oversample: 3);
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\tick_softener, {
	var sig = In.ar(\in.kr(0), 2), lag_time = \lag_time.kr(2);
	sig = PitchShift.ar(sig, 0.2, Ramp.kr(\pitch_shift_ratio.kr(1.0), lag_time), VarLag.kr(\pitch_dispersion.kr(0.005), lag_time, 5), \time_dispersion.kr(0.0001, lag_time));
	sig = sig + DelayC.ar([sig[1], sig[0]], 0.2, {LFNoise1.ar(2).range(0.001, 0.01)}!2);
	sig = LPF.ar(sig, 9000);
	Out.ar(\out.kr(0), sig * 0.5);
}).add;

SynthDef(\service_voice, {
	var buf = \buf.kr(0), sig, trig, pos, env, atk = ExpRand(0.01, BufDur.kr(buf)/2), rel = ExpRand(0.01, BufDur.kr(buf) - atk);
	// sig = PlayBuf.ar(1, buf, BufRateScale.kr(buf) * Rand(0.8, 1.2), doneAction: 2);
	env = EnvGen.kr(Env(
		levels: [0, 1, 1, 0],
		times: [atk, BufDur.kr(buf) - atk - rel, rel]
	));
	trig = Dust.kr(Rand(15, 45));
	pos = Line.ar(0, 1, BufDur.kr(buf) * Rand(0.6, 1.5));
	sig = GrainBuf.ar(1, trig, Rand(0.07, 0.3), buf, Rand(0.85, 1.2), pos);
	sig = sig * 0.05 * \amp.kr(0.5) * env;
	sig = [DelayL.ar(sig, 0.1, Rand(0.0001, 0.03)), DelayL.ar(sig, 0.1, Rand(0.0001, 0.03))];
	// sig = Pan2.ar(sig, Rand(-0.7, 0.7));
	Out.ar(\out.kr(0), sig);
	FreeSelf.kr(pos >= 1);
}).add;

// Create different synthdefs for mixer_channels (incl. the encoder) and the decoder depending on the settings above.
if(~useAmbisonicsDecoder, {
	SynthDef(\decoder, { | in = 10, out = 0 |
		var sig;
		sig = In.ar(in, ~mixerChannelOutputs.asInteger);
		if(~ambisonicsOrder == 1, {
			sig = KMHLSDome1h1pNormal6.ar(sig[0], sig[1], sig[2], sig[3], gain:0);
		});
		if(~ambisonicsOrder == 3, {
			sig = KMHLSDome3h3pNormal6.ar(sig[0], sig[1], sig[2], sig[3], sig[4], sig[5], sig[6], sig[7],
				sig[8], sig[9], sig[10], sig[11], sig[12], sig[13], sig[14], sig[15], gain:0);
		});
		if(~ambisonicsOrder == 5, {
			sig = KMHLSDome5h5pNormal6.ar(sig[0], sig[1], sig[2], sig[3], sig[4], sig[5], sig[6], sig[7],
				sig[8], sig[9], sig[10], sig[11], sig[12], sig[13], sig[14], sig[15],
				sig[16], sig[17], sig[18], sig[19], sig[20], sig[21], sig[22], sig[23],
				sig[24], sig[25], sig[26], sig[27], sig[28], sig[29], sig[30], sig[31],
				sig[32], sig[33], sig[34], sig[35], gain:0);
		});
		Out.ar(out, sig);
	}).add;
}, {
	// no ambisonics, just straight through as stereo
	SynthDef(\decoder, { |in = 10, out = 0 |
		var sig = In.ar(in, ~mixerChannelOutputs.asInteger);
		sig = Compander.ar(sig, sig, 0.5, 0.9, 1/2, 0.1, 0.3);
		sig = Limiter.ar(sig, 0.95);
		Out.ar(out, sig);
	}).add;
});
switch(~encoderType,
	\ambisonic, {
	SynthDef(\mixer_channel, { | in = 10, out = 0 |
		var sig = In.ar(in, 2),
		// For the HOAEncoder* set of UGens, the azimuth is at the very left at pi/2 and the very right at -pi/2.
		// Going further moves us behind the origin.
		radius = \radius.kr(0.0), azimuth = \azimuth.kr(0.0), elevation = \elevation.kr(0), yes = \use_radius.kr(1.0);
		// radius = MouseY.kr(0.0, 1.0);
		if(~controlPositionWithMouse) {
			azimuth = azimuth + MouseX.kr(pi * 1, -pi * 1);
			elevation = elevation + MouseY.kr(pi * -0.5, 0);
		};
			elevation = elevation - (pi/3);
			sig = Mix(sig) * \amp.kr(0.5);
			sig = Compander.ar(sig, sig, 0.5, 0.9, 1/2, 0.1, 0.3);
			sig = Limiter.ar(sig, 0.95);
			if(~ambisonicsOrder == 1, {
				sig = HOAEncoder1.ar(
					sig,
					1.0,
					radius,
					azimuth,
					elevation,
					yes
				);
			});
			if(~ambisonicsOrder == 3, {
				sig = HOAEncoder3.ar(
					sig,
					1.0,
					radius,
					azimuth,
					elevation,
					yes
				);
			});
			if(~ambisonicsOrder == 5, {
				sig = HOAEncoder5.ar(
					sig,
					1.0,
					radius,
					azimuth,
					elevation,
					yes
				);
			});

			Out.ar(out, sig);
			if(~sendBformat, {
				Out.ar(~bFormatChannel, sig);
			});
		}).add;
	},
	\stereo, {
		SynthDef(\mixer_channel, { | in = 10, out = 0, send = 12, send_amp = 0, pan = 0, activity = 0 |
			var sig = In.ar(in, 2);
			sig = sig * \amp.kr(0.8);
			sig = Balance2.ar(sig[0], sig[1], pan);
			// sig = Decimator.ar(sig, SampleRate.ir, activity.linlin(0, 1, 16, 8));
			Out.ar(out, sig);
			Out.ar(send, sig * send_amp);
		}).add;
	},
	\quad, {
		SynthDef(\mixer_channel, { | in = 10, out = 0, send = 12, send_amp = 0, pan = 0, activity = 0 |
			var sig = In.ar(in, 2);
			sig = sig * \amp.kr(0.8);
			sig = Balance2.ar(sig[0], sig[1], pan);
			// sig = Decimator.ar(sig, SampleRate.ir, activity.linlin(0, 1, 16, 8));
			Out.ar(out, sig);
			Out.ar(send, sig * send_amp);
		}).add;
	},
	\separate, {
		SynthDef(\mixer_channel, { | in = 10, out = 0, send = 12, send_amp = 0, pan = 0, activity = 0 |
			var sig;
			if(~mixerChannelOutputs == 2, {
			sig = In.ar(in, 2);
			sig = sig * \amp.kr(0.8);
			sig = Balance2.ar(sig[0], sig[1], pan);
			});
			if(~mixerChannelOutputs == 1, {
				sig = In.ar(in, 1);
				sig = sig * \amp.kr(0.8);
			});
			// sig = Decimator.ar(sig, SampleRate.ir, activity.linlin(0, 1, 16, 8));
			Out.ar(out, sig);
			Out.ar(send, sig * send_amp);
		}).add;
	},
);

SynthDef(\main_out_glitch, {
	var sig, lag_time = \lag_time.kr(3);

	switch(~encoderType,
		\quad, {
			sig = In.ar(\in.kr(10), 4);
		},
		\stereo, {
			sig = In.ar(\in.kr(10), 2);
		}
	);

	sig = SelectX.ar(\enable_pitch_shift.kr(0, lag_time), [sig, PitchShift.ar(sig, 0.2, Ramp.kr(\pitch_shift_ratio.kr(1.0), lag_time), VarLag.kr(\pitch_dispersion.kr(0.00), lag_time, 20), \time_dispersion.kr(0.01, lag_time))]);
	sig = SelectX.ar(\enable_bit_crush.kr(0, lag_time), [sig, Decimator.ar(sig, \sample_rate.kr(44100, lag_time), \bits.kr(24, lag_time))]);
	sig = LPF.ar(sig, \lpf_freq.kr(14000, lag_time));

	Out.ar(\out.kr(0), sig);
}).add;