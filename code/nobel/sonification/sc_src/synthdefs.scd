SynthDef(\long_sine, {
	var sig, env, freq = \freq.kr(220), length = \length.kr(5), pan = \pan.kr(0);

	env = Env.sine(length).kr(2);
	sig = SinOsc.ar(freq) * \amp.kr(0.2) * env * 0.1;
	sig = Pan2.ar(sig, Line.kr(pan, pan.neg, length));

	Out.ar(\out.kr(0), sig);
}).add;
SynthDef(\tick2, {
	var sig, env, rq = \rq.kr(0.05);
	env = Env.perc(\atk.kr(0), \rel.kr(0.05), curve: [\c0.kr(-4), \c1.kr(-4)]).ar(2);
	sig = Impulse.ar(0);
	sig = sig * 0.5;
	// high freq and rq values causes the filter to blow up violently
	sig = RHPF.ar(sig, \freq.kr(1000).min(18000).max(20), rq.min(5)) * env;
	sig = Pan2.ar(sig, \pan.kr(0)) * \amp.kr(1.0) * 10;
	sig = sig.tanh; // Should never happen, but better to soft clip
	Out.ar(\out.kr(0), sig);
}).add;
SynthDef(\gust, {
	var sig, env, rq = \rq.kr(0.1), atk = \atk.kr(0.5), rel = \rel.kr(1.5), freq = \freq.kr(1400).min(18000).max(100);
	env = Env.perc(atk, rel, curve: [\c0.kr(4), \c1.kr(-4)]).ar(2);
	sig = WhiteNoise.ar(0.005);
	// high freq and rq values causes the filter to blow up violently
	sig = RHPF.ar(sig, freq, rq.min(5)) * env * 10 * \amp.kr(1.0);
	sig = LPF.ar(sig, Rand(freq * 0.5, 20000));
	sig = Pan2.ar(sig, Line.kr(\pan1.kr(0), \pan2.kr(0), atk + rel));
	sig = sig.tanh; // Should never happen, but better to soft clip

	Out.ar(\out.kr(0), sig);
}).add;


SynthDef(\thump, {
	var sig, env, freq = \freq.kr(220), pan = \pan.kr(0), rel = \rel.kr(29);
	env = Env.perc(\atk.kr(0.1), rel, curve: [\c0.kr(\cub), \c1.kr(\sine)]).kr(2);
	sig = Resonz.ar(PinkNoise.ar(mul: env.pow(100) * 20), freq, 0.007, mul: 20);
	sig = sig * \amp.kr(0.5) * env;
	sig = Pan2.ar(sig, Line.kr(pan, pan.neg, rel));
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\softy, {
	var sig, env, freq = \freq.kr(220);
	env = Env.perc(\atk.kr(0.1), \rel.kr(2), curve: [\c0.kr(\cub), \c1.kr(\sine)]).kr(2);
	sig = Resonz.ar(PinkNoise.ar(mul: env), freq, 0.007, mul: 20);
	sig = sig * \amp.kr(0.5) * env;
	sig = Pan2.ar(sig, \pan.kr(0));
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\medium_reverb, { | out = 0, amp = 1, mix = 0.3, rt = 3.0  |
	var sig, wet;

	sig = In.ar(\in.kr(10), 2);
	mix = mix.lag(\mixLag.kr(10));

	wet = JPverb.ar(sig, rt, 0.9, 4.0, 0.8);
	// wet = GVerb.ar(sig, 300, 3, 0.43, 0.51, 15, -5.dbamp, -26.dbamp, -20.dbamp);
	// wet = Greyhole.ar(sig, \delayTime.kr(0.1), \damp.kr(0.7), \size.kr(1.0), \diff.kr(0.8), \feedback.kr(0.7));

	sig = (sig * (1-mix)) + (wet*mix);
	sig = Limiter.ar(sig, 0.95);
	sig = LeakDC.ar(sig);
	Out.ar(out, sig);
}).add;

SynthDef(\ping, {
	var sig, env, freq = \freq.kr(440), atk = \atk.kr(0.1), rel = \rel.kr(2), panPos, azimPos, angle, elevation = 0;
	// env = Env.perc(atk, rel, curve: [\c0.kr(4), \c1.kr(-4)]).ar(2);
	env = Env( levels: [0, 1, 0.001, 1, 0], times: [atk, rel/2, rel/2, 0.02],
		curve: [2, -2, 1, 0]).ar(2);
	freq = freq * SinOsc.kr(LFNoise1.kr(2).range(2.0, 8.5)).range(0.999, 1.001);
	// Något noisigare än sinusvåg?
	sig = Resonz.ar(PinkNoise.ar(), freq, 0.001) * 100;
	sig = sig + SinOsc.ar(freq, mul: 0.5);
	sig = sig + Pulse.ar(freq, mul: 0.02);
	sig = LPF.ar(sig, 5000);
	// panPos = Line.kr(\startPan.kr(-1), \endPan.kr(1), atk+rel);
	angle = pi/2;
	azimPos = Line.kr(\startPan.kr(-1) * (-pi), \endPan.kr(1) * (-pi), atk+rel);
	// ------------------------------------------------------------
    // encode
	sig = FoaEncode.ar(sig, ~foaEncoder);

    // ------------------------------------------------------------
    // transform
	sig = FoaTransform.ar(sig, 'push', angle, azimPos);
	sig = sig * env * \amp.kr(0.5);
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\morse, {
	var sig, env, freq = \freq.kr(440), atk = \atk.kr(0.01), rel = \rel.kr(0.3);
	// env = Env.perc(atk, rel, curve: [\c0.kr(4), \c1.kr(-4)]).ar(2);
	env = Env.perc(atk, rel, curve: [2, -2]).kr(2);
	freq = freq * SinOsc.kr(LFNoise1.kr(2).range(1.5, 2.5)).range(0.995, 1.005);
	// Något noisigare än sinusvåg?
	// sig = Resonz.ar(PinkNoise.ar(), freq, 0.001) * 100;
	sig = SinOsc.ar(freq, mul: 1.0);
	sig = sig * env * \amp.kr(0.5);
	// sig = Pan2.ar(sig, \pan.kr(0));
	// encode
    sig = FoaEncode.ar(sig, ~foaEncoder);

    // ------------------------------------------------------------
    // transform
	sig = FoaTransform.ar(sig, 'push', pi/2, \pan.kr(0) * pi);
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\glissPing, {
	var sig, env, startFreq = \startFreq.kr(440), endFreq = \endFreq.kr(440), atk = \atk.kr(0.1), rel = \rel.kr(2), panPos, azimPos, angle, elevation = 0, freq, glissTimeRatio = Rand(0.3, 0.7), unison = 4, detune = 1.008;
	// env = Env.perc(atk, rel, curve: [\c0.kr(4), \c1.kr(-4)]).ar(2);
	rel = rel * 0.5; // The envelopes use rel * 2 so this makes it easier to set the rel to the duration of the whole synthdef
	env = Env( levels: [0, 1, 0.04, 0.5, 1, 0], times: [atk, rel*0.7, rel*0.3 - atk, atk, rel],
		curve: [2, -2, 1, -2, -2]).ar(2);
	freq = Env(
		levels: [startFreq, startFreq, endFreq, endFreq],
		times: [atk + (rel*(1.0 - glissTimeRatio)), rel*glissTimeRatio, rel],
		curve: [0, -1, 0]
	).ar();
	freq = freq * ({SinOsc.kr(LFNoise1.kr(2).range(2.0, 8.5)).range(1.0/detune, detune)}!unison);
	// Något noisigare än sinusvåg?
	sig = Resonz.ar(PinkNoise.ar(), freq, 0.001) * 100;
	sig = sig + SinOsc.ar(freq, mul: 0.5);
	// sig = sig + (Pulse.ar(freq, mul: 0.005) * LFNoise1.ar(2).range(0.0, 1.0));
	sig = sig + (Saw.ar(freq, mul: \sawAmp.kr(0.01)) * LFNoise1.ar(2.5).range(0.0, 1.0));
	sig = Mix(sig)/unison;
	sig = LPF.ar(sig, freq * 4);
	// panPos = Line.kr(\startPan.kr(-1), \endPan.kr(1), atk+rel);
	angle = pi/2;
	azimPos = Line.kr(\startPan.kr(-1) * (-pi), \endPan.kr(1) * (-pi), atk+rel+rel);
	// ------------------------------------------------------------
    // encode
	sig = FoaEncode.ar(sig, ~foaEncoder);

    // ------------------------------------------------------------
    // transform
	sig = FoaTransform.ar(sig, 'push', angle, azimPos);
	sig = sig * env * \amp.kr(0.5);
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\write_noise, {
	var sig, len = \len.kr(1), time = \time.kr(0), buf = \bufnum.kr(0),
	freq = (1.0 - (len/1000000).min(1.0)).pow(40.0) * 10000 + 2, pos = (time*SampleRate.ir) % BufFrames.kr(buf),
	duration = (len/400000).min(1.0).max(0.0001),
	oldData;
	sig = Saw.ar(freq, 0.05);
	pos = Line.ar(pos, pos + (duration * SampleRate.ir), duration, doneAction: 2);
	oldData = BufRd.ar(1, buf, pos) * 0.8;
	BufWr.ar(sig + oldData, buf, pos);
}).add;

SynthDef(\write_noise2, {
	var sig, len = \len.kr(1), time = \time.kr(0), buf = \bufnum.kr(0),
	freq = (1.0 - (len/10000000).min(1.0)).pow(\rangeCurve.kr(80)) * \maxFreq.kr(10000) + \minFreq.kr(2), pos = (time*SampleRate.ir) % BufFrames.kr(buf),
	duration = (len/400000).min(1.0).max(0.0001), oldData;
	sig = SinOsc.ar(freq, mul: freq);
	sig = Blip.ar(freq + sig, Rand(1, 300));
	sig = SinOsc.ar(freq + (sig * freq * 2.0), mul: 0.25);
	pos = Line.ar(pos, pos + (duration * SampleRate.ir), duration, doneAction: 2);
	oldData = BufRd.ar(1, buf, pos) * 0.1;
	BufWr.ar(sig + oldData, buf, pos);
}).add;

SynthDef(\decoder, { | in = 10, out = 0 |
	var sig;
	sig = In.ar(in, 4);
	sig = FoaDecode.ar(sig, ~foaDecoder);
	Out.ar(out, sig);
}).add;

SynthDef(\loop_buffer, {
	var sig, buf = \bufnum.kr(0), pos, windspeed, gust, squall, amp;
	pos = Phasor.ar(0, 1.0, 0, BufFrames.kr(buf));
	sig = BufRd.ar(1, buf, pos);
	sig = LeakDC.ar(sig);
	sig = (sig * 2).tanh * 0.5;
	sig = Limiter.ar(sig);

	amp = Lag2.kr(\amp.kr(0.5), \ampLag.kr(0.5));
	amp = amp * 0.7;
	gust = LFNoise1.ar(0.5) * 0.4;
	gust = gust * ((amp + 0.5).pow(2) - 0.125);

	// fig 41.8
	// squall = HPF.ar(LPF.ar(WhiteNoise.ar(), 3), 0) * 20;
	squall = LFNoise1.ar(5) * 0.25;
	squall = squall * ((amp.max(0.2) - 0.2) * 3).pow(2);

	windspeed = gust + squall + amp;
	windspeed = windspeed.clip(0, 1);

	sig = sig * windspeed * amp;

	// sig = sig * LFNoise2.kr(LFNoise1.kr(1).range(0.3, 1.0)).range(0.5, 1.0);
	sig = LPF.ar(sig, Lag2.kr(\lpfCutoff.kr(10000), \lpfLag.kr(5.0)));
	sig = Pan2.ar(sig);
	Out.ar(\out.kr(0), sig);
}).add;

// transcribed from Designing Sound chapter on wind
SynthDef(\wind, {
	var sine, gust, squall, windspeed, noise, freq = \freq.kr(400), pan = \pan.kr(0),
	sweptNoise, bp1, bp2, sig, leaves, delayedWindLeaves, howl, delayedWindHowl;
	// sine = SinOsc.ar(0.1, 0, 0.25, 0.25); // sine between 0 and 0.5
	// sine = LFNoise1.kr(1).range(0.0, 0.5);
	sine = \activity.kr(0.0, \activityLag.kr(0.5));

	// fig 41.7
	// Maybe this would be better represented by something like a LFNoise1 or LFNoise2
	// gust = HPF.ar(LPF.ar(WhiteNoise.ar(), 0.5), 0.0) * 50;
	gust = LFNoise1.ar(0.5) * 0.5;
	gust = gust * ((sine + 0.5).pow(2) - 0.125);

	// fig 41.8
	// squall = HPF.ar(LPF.ar(WhiteNoise.ar(), 3), 0) * 20;
	squall = LFNoise1.ar(3) * 0.5;
	squall = squall * ((sine.max(0.4) - 0.4) * 8).pow(2);

	windspeed = gust + squall + sine;
	windspeed = windspeed.clip(0, 1);


	noise = WhiteNoise.ar();

	// Unsure of whether the pd rzero~ has it's argument *=-1 or not, both sound good but different
	sweptNoise = OneZero.ar(BPF.ar(noise, 800, 1) * windspeed, -1*(windspeed*0.6).clip(0, 0.099));
	sweptNoise = sweptNoise * 0.2;
	sweptNoise = Pan2.ar(sweptNoise);

	bp1 = DelayL.ar(windspeed, 0.5, LFNoise1.kr(0.5).range(0.01, 0.5));
	// 0.016 ~ 1/60 i.e. a q value of 60
	bp1 = BPF.ar(noise, (bp1*(freq*0.1)) + freq, 0.016) * (bp1 + 0.12).pow(2);
	bp1 = Pan2.ar(bp1 * 1.2, -0.4);

	bp2 = DelayL.ar(windspeed, 0.5, LFNoise1.kr(0.5).range(0.01, 0.5));
	// 0.016 ~ 1/60 i.e. a q value of 60
	bp2 = BPF.ar(noise, (bp2*(freq*0.2)) + freq, 0.016) * bp2.pow(2);
	bp2 = Pan2.ar(bp2 * 2, 0.2);

	// tree leaves
	/*delayedWindLeaves = LPF.ar(DelayN.ar(windspeed, 2, 2), 0.1);
	leaves = 1 - (delayedWindLeaves * 0.4 + 0.3);
	leaves = (noise.max(leaves) - leaves) * leaves;
	leaves = LPF.ar(HPF.ar(leaves, 200), 4000);
	leaves = leaves * delayedWindLeaves * 1.2;
	leaves = Pan2.ar(leaves);*/

	// howling wind
	// delayedWindHowl = DelayN.ar(windspeed, 1, 0.1);
	// delayedWindHowl = delayedWindHowl.clip(0.35, 0.6) - 0.35;
	// delayedWindHowl = delayedWindHowl * pi * 2;
	// howl = LPF.ar(delayedWindHowl.sin(), 0.5);
	// howl = BPF.ar(noise, freq, 1/40) * howl * 2 * SinOsc.ar(howl*freq*0.5 + 30);
	// Pan2.ar(howl, 0.8);

	sig = (bp1 + bp2 + sweptNoise);
	sig = LPF.ar(sig, \lpf_cutoff.kr(500, 4));
	sig = Pan2.ar(sig * \amp.kr(1.0), pan);
	// more stereo separation
	sig = [DelayN.ar(sig[0], 0.1, (pan*0.01*(-1)).max(0)), DelayN.ar(sig[0], 0.1, (pan*0.01).max(0))];
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\speedOutput, {
	var sig;
	sig = In.ar(\in.kr(10), 2);
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\speedNoiseSwitchMono, {
	var sig, sr = [18, 130, 199, 1000, 1583, 1900, 12500];
	sr = Demand.kr(\t_switch.kr(0) + Impulse.kr(0), 0, Dxrand(sr, inf));
	sig = Decimator.ar(PinkNoise.ar(), sr, 3);
	sig = sig * \amp.kr(0.5);
	sig = sig!2;
	Out.ar(\out.kr(0), sig);
}).add;
SynthDef(\speedNoiseSwitchStereo, {
	var sig, sr = [18, 130, 199, 1000, 1583, 1900, 12500];
	sr = Demand.kr(\t_switch.kr(0) + Impulse.kr(0), 0, Dxrand(sr, inf));
	sig = Decimator.ar({PinkNoise.ar()}!2, sr, 3);
	sig = sig * \amp.kr(0.5);
	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\tickChannel, {
	var sig = In.ar(\in.kr(10), 2);
	sig = LPF.ar(sig, \lpfCutoff.kr(7000));

	Out.ar(\out.kr(0), sig);
	Out.ar(\revOut.kr(12), sig * \revSend.kr(0.2));
}).add;

// by rwentk from https://sccode.org/1-4Rh
SynthDef(\StereoModDelay, { arg
    //Chorus delay with EQ in the feedback loop
    //for that vintage tape echo mood

	bufferL,
	bufferR,
	time = 1.5,
	fb = 0.8,
	modRate = 5.5,
	modDepth = 0.0005,
	eqFc = 800,
	eqQ = 3;

	var signal, tapPhase, tap, tapPhaseL, tapPhaseR, tapL, tapR;
	var timeMod, eqMod;

	//Drop the input slightly to avoid clicky clipping
	signal = 0.7*In.ar(\in.kr(18), 2);
    signal = signal + LocalIn.ar(2);

    timeMod = LFDNoise3.ar(modRate, modDepth);
    eqMod = LFDNoise3.kr(1, 400);

	tapPhaseL = DelTapWr.ar(bufferL, signal[0]);
	tapL = DelTapRd.ar(bufferL, tapPhaseL, time+LFDNoise3.ar(modRate, modDepth), 2);
	tapL = BBandPass.ar(tapL, eqFc+eqMod, eqQ);

	tapPhaseR = DelTapWr.ar(bufferR, signal[1]);
	tapR = DelTapRd.ar(bufferR, tapPhaseR, time+LFDNoise3.ar(modRate, modDepth), 2);
	tapR = BBandPass.ar(tapR, eqFc+eqMod, eqQ);

	//Restore the output level
	Out.ar(0,[1.2*tapL, 1.2*tapR]);
	LocalOut.ar(fb*[tapR, tapL]);
}).add;

SynthDef(\beep, {
	var freq = \freq.kr(3000),
	env = Env.perc(0, \length.kr(0.1)).ar(2),
	sig = Pulse.ar(freq) * 0.1 * \amp.kr(1.0);
	sig = sig!2;
	Out.ar(\out.kr(0), sig);
}).add;