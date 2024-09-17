// import: thisProcess.interpreter.compileFile(path).()

(
~viskningar = "/home/erik/code/kth/loam/repo_data_manip/wav_files/mimic3/*.wav".resolveRelative.pathMatch.collect( { |file|
	Buffer.readChannel(s, file, channels: [0]);});
)
(
~viskningar = "/home/erik/code/kth/loam/repo_data_manip/wav_files/repos/git/glitchy/*.wav".resolveRelative.pathMatch.collect( { |file|
	Buffer.readChannel(s, file, channels: [0]);});
)
"a"+"b"
(
var repo = { | name, is_redacted = false, num_contributors = nil |
	(
		name: name,
		num_contributors: num_contributors,
		is_redacted: is_redacted,
		english: nil,
		non_english: nil,
		glitchy: nil,
		main_voice: nil,
		load: {|self|
			if(self.is_redacted == false, {
				self.glitchy = ("/home/erik/code/kth/loam/repo_data_manip/wav_files/repos/" ++ self.name ++ "/glitchy/*.wav").resolveRelative.pathMatch.collect( { |file|
					Buffer.readChannel(s, file, channels: [0]);});
				self.english = ("/home/erik/code/kth/loam/repo_data_manip/wav_files/repos/" ++ self.name ++ "/english/*.wav").resolveRelative.pathMatch.collect( { |file|
					Buffer.readChannel(s, file, channels: [0]);
				});
				self.non_english = ("/home/erik/code/kth/loam/repo_data_manip/wav_files/repos/" ++ self.name ++ "/non_english/*.wav").resolveRelative.pathMatch.collect( { |file|
					Buffer.readChannel(s, file, channels: [0]);});
				self.main_voice = [self.english, self.non_english].wchoose([1, 3].normalizeSum).choose;
			}, {
				self.glitchy = ("/home/erik/code/kth/loam/repo_data_manip/wav_files/repos/PROPRIETARY/*.wav").resolveRelative.pathMatch.collect( { |file|
					Buffer.readChannel(s, file, channels: [0]);});
				self.main_voice = self.glitchy.choose;
			}
			);
		},
	)
},
anchor = { | repos |
	(
		repos: repos,
		current_repo: 0,
		next_repo: { |self| self.current_repo = (self.current_repo + 1) % self.repos.size; },
	)
};
~anchors = [ anchor.([repo.("linux", true, 100000), repo.("llvm#llvm-project")], repo.("Windows", true, 40000), repo.("apache#maven")),
	anchor.([repo.("git#git"), repo.("llvm#llvm-project"), repo.("arduino#arduino-ide"), repo.("gcc-mirror#gcc"), repo.("rust-lang#cargo"), repo.("rust-lang#rust")]),
	anchor.([repo.("openframeworks#openFrameworks"), repo.("bevyengine#bevy"), repo.("KhronosGroup#GLSL"), repo.("KhronosGroup#glslang"), repo.("KhronosGroup#glslang"), ]),
	anchor.([repo.("processing#processing"), repo.("processing#p5.js"), repo.("nannou-org#nannou"), repo.("KhronosGroup#glslang") ]),
	anchor.([repo.("Adobe", true, 1000), repo.("GNOME#gimp"), repo.("scribusproject#scribus"), repo.("popcornmix#omxplayer")]),
	anchor.([repo.("BelaPlatform#Bela"), repo.("audacity#audacity"),  repo.("pure-data#pure-data"), repo.("supercollider#supercollider"), repo.("Max", true, 100000), repo.("WebAudio#web-audio-api"), repo.("WebAudio#web-midi-api")]),
	anchor.([repo.("hobbyquaker#artnet"), repo.("klingtnet#rosc"), repo.("npm#npm"), repo.("openjdk#jdk")])
];
a = ~anchors[0];
a.repos.do{|repo| repo.load()};
)
~anchors[0].repos[1].load.();
~anchors[0].repos[1].english;
"/home/erik/code/kth/loam/repo_data_manip/wav_files/repos/git#git/english/*.wav".resolveRelative.pathMatch.collect( { |file| file.postln; Buffer.readChannel(s, file, channels: [0]);});
(
var winenv;

// a custom envelope
winenv = Env([0, 1, 0], [0.5, 0.5], [4, -4]);
z = Buffer.sendCollection(s, winenv.discretize, 1);

SynthDef(\granulizer, { | out = 0, in = 10, depth = 0.5, mix = 0.5 |
	var sig, org, density, decay;

	org = In.ar(in, 2);

	density = depth.linexp(0, 1, 80, 5);
	decay = depth.linlin(0, 1, 0.02, 0.3);
	//sig = org * Decay.kr(Dust.kr(density), decay);
	sig = org * ({Demand.kr(Dust.kr(density) + Impulse.kr(0), 0, Dseq([1, 0], inf))}!2);

	sig = sig*mix + (org * (1-mix));

	Out.ar(out, sig);

}).add;

SynthDef(\playbuf, {arg amp = 0.2, sndbuf,
	rate = 1, out = 0, grainsize = 0.5, hold = 1, noiseAmp = 0.0;
	var pan = \pan.kr(0.0, 0.1), env, sig;

	sig = Pan2.ar(PlayBuf.ar(1, sndbuf, BufRateScale.kr(sndbuf)) * 0.5, pan);

	// noiseAmp = noiseAmp.lag(0.02);
	// sig = sig + PinkNoise.ar(noiseAmp*0.1);
	// sig = Resonz.ar(sig, \freq.kr(440), bwr)*(1.0/bwr);
	Out.ar(out, sig * amp)
}).add;

SynthDef(\playbuf_pan_away, {arg amp = 0.2, sndbuf,
	rate = 1, out = 0, grainsize = 0.5, hold = 1, noiseAmp = 0.0;
	var pan = \destination_pan.kr(1.0, 0.1), fade_time = \fade_time.kr(10), env, sig, verb_mix = Line.kr(0.05, 1.0, fade_time), start_offset = \start_offset.kr(0.0),
	amp_fade = EnvGen.kr(Env(levels: [0, 1, 1, 0.5, 0], times: [fade_time * 0.2, fade_time * 0.3, fade_time * 0.3, fade_time * 0.2 - 0.1], curve: [-4, \lin, \lin, -6]), doneAction: 2);
	amp = amp * amp_fade;

	sig = PlayBuf.ar(1, sndbuf, BufRateScale.kr(sndbuf), startPos: start_offset * BufFrames.kr(sndbuf), loop: 1.0);
	sig = Pan2.ar(sig, Line.kr(0.0, pan, fade_time));

	// noiseAmp = noiseAmp.lag(0.02);
	// sig = sig + PinkNoise.ar(noiseAmp*0.1);
	// sig = Resonz.ar(sig, \freq.kr(440), bwr)*(1.0/bwr);
	Out.ar(out, sig * amp * (1.0-verb_mix));
	Out.ar(\out_verb.kr(10), sig * amp * verb_mix);
}).add;

SynthDef(\grain_phaser, {arg gate = 1, amp = 0.2, preamp = 0.25, sndbuf, envbuf = -1, posrate = 1,
	modtime = 60, rate = 1, out = 0, grainsize = 0.5, hold = 1, noiseAmp = 0.0;
	var pan, env, freqdev, posmod, grainmod, grainsizemod, trigmod, trigger, sig, bwr = \bwr.kr(0.01), start_offset = \start_offset.kr(0.0), grain_mix = \grain_mix.kr(0.5, 1.0), pan_variation = \pan_variation.kr(0.5);
	pan = LFNoise1.kr(pan_variation).range((-1*pan_variation).max(-1.0), pan_variation.min(1.0));
	env = EnvGen.kr(
		Env([0, 1, 0], [0.1, 1], \sin, 1),
		gate,
		doneAction: 2);

	amp = amp * LFNoise1.kr(LFNoise1.kr(0.5).range(1.0/10.0, 3.0)).range(1.0, \amp_range.kr(1.0));

	trigger = Dust.kr(LFNoise1.kr(1).range(1/10, 1/2));

	//posmod = LFNoise2.kr(posrate).range(0.05, 0.95);
	//posmod = Line.kr(0.05, 0.95, posrate);
	posmod = Phasor.ar(0.0, (1.0/BufSamples.kr(sndbuf)) * BufRateScale.kr(sndbuf) * \playback_speed.kr(1.0), start: start_offset) + LFNoise1.kr(LFNoise1.kr(2).range(0.3, 1.0)).range(0.0, (1.0/BufSamples.kr(sndbuf)) * 1000 * \phase_amount.kr(1.0, 0.5));
	/*posmod = Phasor.kr(trig: trigger,
	//rate: 0.00001*(posrate/5),
	rate: 1/ SampleRate.ir,
	start: 0.05,
	end: 0.955,
	resetPos: TRand.kr(0.05, 0.955, trigger)
	);*/
	/*posmod = Ramp.kr(posmod, 0.01);*/

	grainmod = Dust.kr(SinOsc.kr(1/5).range(10, 15));
	//grainmod = Dust.kr(15);

	grainsizemod = LFNoise1.kr(3).range(0.05, 0.5);
	//grainsizemod = max(Line.kr(0.05, 0.8, modtime), TExpRand.kr(0.01, 2, trigger));

	sig = GrainBuf.ar(2, grainmod, grainsizemod, sndbuf, rate,
		posmod, 4, pan, envbuf) * preamp;

	sig = (sig * grain_mix) + (Pan2.ar(PlayBuf.ar(1, sndbuf, BufRateScale.kr(sndbuf), startPos: start_offset * BufFrames.kr(sndbuf), loop: 1) * 0.5, pan) * (1.0 - grain_mix));

	// noiseAmp = noiseAmp.lag(0.02);
	// sig = sig + PinkNoise.ar(noiseAmp*0.1);
	// sig = Resonz.ar(sig, \freq.kr(440), bwr)*(1.0/bwr);
	Out.ar(out, sig * env * amp)
}).add;

SynthDef(\buf_grain_filter, {arg gate = 1, amp = 0.2, preamp = 1, sndbuf, envbuf = -1, posrate = 1,
	modtime = 60, rate = 1, out = 0, grainsize = 0.5, hold = 1, noiseAmp = 0.0;
	var pan, env, freqdev, posmod, grainmod, grainsizemod, trigmod, trigger, sig, bwr = \bwr.kr(0.01);
	pan = LFNoise1.kr(1/2);
	env = EnvGen.kr(
		Env([0, 1, 0], [0.1, 1], \sin, 1),
		gate,
		doneAction: 2);

	trigger = Dust.kr(LFNoise1.kr(1).range(1/10, 1/2));

	//posmod = LFNoise2.kr(posrate).range(0.05, 0.95);
	//posmod = Line.kr(0.05, 0.95, posrate);
	posmod = Phasor.kr(trig: trigger,
		//rate: 0.00001*(posrate/5),
		rate: 1/ SampleRate.ir,
		start: 0.05,
		end: 0.955,
		resetPos: TRand.kr(0.05, 0.955, trigger)
	);
	posmod = Ramp.kr(posmod, 0.01);

	grainmod = Dust.kr(SinOsc.kr(1/5).range(10, 15));
	//grainmod = Dust.kr(15);

	//grainsizemod = LFNoise1.kr(1/5).range(0.05, 0.5);
	//grainsizemod = max(Line.kr(0.05, 0.8, modtime), TExpRand.kr(0.01, 2, trigger));

	sig = GrainBuf.ar(2, grainmod, grainsize, sndbuf, rate,
		posmod, 4, pan, envbuf) * preamp;

	noiseAmp = noiseAmp.lag(0.02);
	sig = sig + PinkNoise.ar(noiseAmp*0.1);
	sig = Resonz.ar(sig, \freq.kr(440), bwr)*(1.0/bwr);
	Out.ar(out, sig * env * amp)
}).add;

SynthDef(\verb, {
	var snd, wet;
	snd = In.ar(\in.kr(0), 2);
	wet = snd + (PitchShift.ar(snd, 0.2, 2)*0.1);
	wet = DelayN.ar(wet, 0.25, 0.25);
	// wet = GVerb.ar(wet * \wetness.kr(0.1), 200, 2);
	wet = JPverb.ar(wet * \wetness.kr(0.1), 2.0, 0.5, 1.0, 0.707, 0.1, 2.5, 1.0);
	wet = HPF.ar(wet, 100) * -3.dbamp;
	wet = LPF.ar(wet, 7000);
	snd = snd + wet;
	// Add a little bit of tape flutter
	snd = DelayC.ar(snd, 0.2, LFNoise2.kr(1).range(0, 0.005));

	//snd = (snd * Demand.kr(Dust.kr(5), 1, Dseq([1, 0], inf))) + (snd*0.5);

	Out.ar(\out.kr(0), snd);
}).add;

SynthDef(\wild_noise, {
	var value = \value.kr(0.0), sig, amp = \amp.kr(0.5), freq, pan = \pan.kr(0.0), am, random, random2, freq2, offset = \offset.kr(1), noiseAmp;

	freq = value.linexp(0, 1.0, 40, 300);
	random = frac(sin(value*30+offset)*307.93);
	random2 = frac(sin(value*40+offset)*507.3);
	freq2 = random.linlin(0, 1.0, 50, 1000);

	am = Pulse.ar(value.mod(value/3.0).linexp(0, 0.5, 100, 1000), 0.5, 0.5);

	//sig = Pulse.ar(freq, value)*am;
	//sig = Pulse.ar(freq + (am*100), value);
	noiseAmp = (value.pow(4)*2);
	sig = Resonz.ar(PinkNoise.ar()*am*noiseAmp, freq2, random*random);
	sig = sig + Pulse.ar(freq, value)*am*(value*value*value);
	sig = Decimator.ar(sig, 44100, random2*10);

	sig = Pan2.ar(sig, pan)*value*amp*0.2;

	Out.ar(\out.kr(0), sig);
	Out.ar(\out2.kr(0), sig*\amp2.kr(0));

}).add;

SynthDef(\distortion, { | in = 10, out = 0, mix = 0.3|
	var inSig, sig, amp;
	inSig = In.ar(in, 2);
	sig = (inSig*50).tanh;
	sig = LPF.ar(sig, 7000);
	//sig = sig * amp;
	sig = sig * 0.5;
	// sig = Decimator.ar(sig, s.sampleRate, 24);
	sig = Mix([sig * mix, inSig * (1-mix)]);

	Out.ar(out, sig);
}).add;

SynthDef(\chorus, { | out = 0, inBus, revBus, revAmp = 0.5, amp = 1 |
	var sig, in, lo, hi, predelay = 0.05, speed = 0.1, depth = 0.02, ph_diff = 0.5pi, crossover = 200, xfade = 0.5, numChan=2;

	in = In.ar(inBus, numChan);
	lo = LPF.ar(in, crossover);
	hi = HPF.ar(in, crossover);
	lo = DelayL.ar(lo, 0.1, SinOsc.kr(speed, ph_diff, depth, predelay));
	hi = Array.fill(numChan, { |i|
		predelay = predelay + depth;
		DelayL.ar(hi, 0.5, SinOsc.kr(speed, ph_diff * i, depth, predelay));
	}).scramble;
	lo = lo + hi;
	sig = lo;
	Out.ar(out, sig*amp);
	Out.ar(revBus, sig*revAmp);
}).add;

SynthDef(\lastLayer, {
	var sig, mix = \mix.kr(0, 0.02), tones;
	sig = In.ar(\in.kr(12), 2);

	//tones = {Pan2.ar(SinOsc.ar([8000 + LFNoise1.kr(1.2, 30), 325 + LFNoise1.kr(2.2, 10)])*0.1, LFNoise1.kr(0.5))}!3;

	// sig = (sig*(1-mix).pow(5)) + (tones*mix);

	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\fft_extract, {
	var sig, chain;
	sig = In.ar(\in.kr(2), 2);
	chain = FFT(Array.fill(2, { LocalBuf(2048, 1) }), sig);
	// chain = PV_RandComb(chain, MouseY.kr, Impulse.kr(0.4)); // process
	// chain = PV_BinScramble(chain, MouseX.kr, MouseY.kr, Impulse.kr(2));
	// chain = PV_MagSmear(chain, MouseX.kr(0, 128));
	sig = IFFT(chain); // inverse FF
	Out.ar(\out.kr(0), sig);
}).add;

)

n = NdefMixer(s);
n.parent.alwaysOnTop_(true); // show mixer in front of IDE

(
var start_fx;
~events = [\pan_away, \granular_swell, \glitch_interruption];

~fxGroup = Group(s, addAction: \addToTail);
~ndefGroup = Group(~fxGroup, addAction: \addBefore);

~distBus = Bus.audio(s, 2);
~verbBus = Bus.audio(s, 2);
~granBus = Bus.audio(s, 2);
~chorusBus = Bus.audio(s, 2);
~masterBus = Bus.audio(s, 2);
~fftBus = Bus.audio(s, 2);

start_fx = { var fxGroup;
/*	if(~master!=nil, {~master.free;});
	if(~verb!=nil, {~verb.free;});
	if(~dist!=nil, {~dist.free;});
	if(~granulizer!=nil, {~granulizer.free;});
	if(~chorus!=nil, {~chorus.free;});
	if(~fftExtract!=nil, {~fftExtract.free;});*/
	fxGroup = Group(s, addAction: \addToTail);
	fxGroup.postln;
	s.sync;
	~master = Synth(\lastLayer, [\in, ~masterBus], target: fxGroup);
	~verb = Synth(\verb, [\in, ~verbBus, \wetness, 0.5, \out, ~masterBus], target: ~master, addAction: \addBefore);
	~dist = Synth(\distortion, [\in, ~distBus, \out, ~verbBus], target: ~verb, addAction: \addBefore);
	~granulizer = Synth(\granulizer, [\in, ~granBus, \out, ~verbBus], target: ~verb, addAction: \addBefore);
	~chorus = Synth(\chorus, [\out, ~masterBus, \revBus, ~verbBus, \inBus, ~chorusBus, \revAmp, 0.3, \amp, 1], target: ~verb, addAction: \addBefore);
	~fftExtract = Synth(\fft_extract, [\in, ~fftBus, \out, ~chorusBus], target: ~chorus, addAction: \addBefore);
	s.sync;
};

/*~nodeAudio = {
~synths.add(Synth(\buf_grain_filter, [\sndbuf, ~viskningar.choose, \amp, 1.0, \preamp, 0.5, \bwr, 0.5, \out, ~verbBus]));
};
~setFreq = { |freq|
	~synths.do{|s| s.set(\freq, freq); };
};
~setBwr = { |bwr|
	~synths.do{|s| s.set(\bwr, bwr); };
};*/
// n = ~nodeSpawner.value();
// ~nodes = [];
// ~synths = List[];
// ~synths.add(Synth(\buf_grain_filter, [\sndbuf, ~viskningar.choose, \amp, 0.1, \preamp, 0.5, \noiseAmp, 0.0, \bwr, 0.5, \out, ~verbBus]));
// ~synths.add(Synth(\grain_phaser, [\sndbuf, ~viskningar.choose, \amp, 0.1, \preamp, 0.5, \noiseAmp, 0.0, \bwr, 0.5, \pan, rrand(-0.7, 0.7), \out, ~verbBus]));
// ~main_voice = Synth(\grain_phaser, [\sndbuf, ~viskningar.choose, \amp, 0.1, \phase_amount, 0, \preamp, 0.5, \noiseAmp, 0.0, \bwr, 0.5, \pan_variation, 0.0, \out, ~masterBus]);
// ~main_voice = Synth(\playbuf, [\sndbuf, ~viskningar.choose, \amp, 0.2, \out, ~masterBus]);


{ var anchor = 0;
	start_fx.();
	block { |break| loop {
		var main_r, aux_r, recording_dur = 60*10, aux_synths_to_free = Set[], swich_fx_dur;
		"Freeing buffers".postln;
		Buffer.freeAll;
		a = ~anchors[anchor];
		"Loading buffers...".postln;
		a.repos.do{|repo| repo.load()};

		//s.prepareForRecord("/home/erik/code/kth/loam/anchors/"++anchor++".aif", 2);
		s.record("/home/erik/code/kth/loam/anchors/"++anchor++".aif", duration: recording_dur);

		s.sync;
		main_r = { var voice_lang = \english;
			loop {
				var buf, start_offset = rrand(0.0, 0.9), num_voices = 1;
				~auxilliary_voices = [];
				buf = a.repos[a.current_repo].main_voice;
				if(a.repos[a.current_repo].is_redacted,
					{
						// buf = a.repos[a.current_repo].glitchy.choose;
						num_voices = a.repos[a.current_repo].num_contributors.explin(100, 100000, 1, 5).round.asInteger;
					},
					{ var length = a.repos[a.current_repo].english[0].numFrames/a.repos[a.current_repo].english[0].sampleRate;
						num_voices = length.explin(10, 1000, 1, 5).round.asInteger;
						/*switch(voice_lang,
							\english, { voice_lang = \non_english; buf = a.repos[a.current_repo].english.choose;},
						\non_english, {
						if(rrand(0.0, 1.0) > 0.6, {
						voice_lang = \english;
						});
						buf = a.repos[a.current_repo].non_english.choose;
						},
						\glitchy, { voice_lang = \english; buf = a.repos[a.current_repo].glitchy.choose;}
						);*/
					}
				);

				~main_voice = Synth(\grain_phaser, [\sndbuf, buf, \amp, 0.2, \pan_variation, 0, \start_offset, start_offset, \grain_mix, 0.0, \out, ~masterBus]);
				if(num_voices > 1, {
					~auxilliary_voices = (num_voices-1).collect {|i|
						Synth(\grain_phaser, [\sndbuf, buf, \amp, 0.035, \amp_range, 0.0, \pan_variation, rrand(0.1, 0.8), \rate, rrand(0.85, 1.1), \start_offset, (start_offset * (i+2)).mod(1.0), \grain_mix, 0.0, \out, ~chorusBus]);
					};
				});
				((1.0-rrand(0.0, 1.0).pow(2)) * 20 + 5).wait;
				~main_voice.set(\playback_speed, exprand(0.3, 0.7), \grain_mix, 1.0);
				~auxilliary_voices.do {|syn| syn.set(\playback_speed, exprand(0.05, 2.3), \grain_mix, 1.0); };
				rrand(0.8, 1).wait;
				swich_fx_dur = exprand(1.3, 5.0);
				// windy repo change effect
				3.do{
					{
						var sig, env, freq, clap, popEnv, centerFreq = Rand(300, 700), length = swich_fx_dur;
						env = EnvGen.ar(
							Env(
								levels: [0, 1, 0],
								times: [length * 0.6, length*0.4],
								curve: [4, -6]
							),
							doneAction:2
						);

						freq = [
							EnvGen.ar(Env([centerFreq*Rand(0.1, 0.3), centerFreq], [length], [Rand(4, 7)])),
							EnvGen.ar(Env([centerFreq*Rand(0.1, 0.3), centerFreq], [length], [Rand(2, 8)])),
							EnvGen.ar(Env([centerFreq*Rand(0.1, 1.5), centerFreq], [length], [Rand(2, 8)])),
							EnvGen.ar(Env([centerFreq*Rand(0.4, 1.3), centerFreq], [length], [Rand(2, 8)]))
						];
						sig = Resonz.ar(PinkNoise.ar(), freq, Line.kr(0.03, 0.3, length))*3;
						sig = Mix(sig);
						sig = Pan2.ar(sig, rrand(-0.2, 0.2));
						sig = sig * env * 0.1;
						Out.ar(~chorusBus, sig);
					}.play;
				};
				(swich_fx_dur-0.2).wait;
				~main_voice.release;
				~auxilliary_voices.do {|syn| syn.release; };
				a.next_repo();
				0.1.wait;
			}
		}.fork;
		aux_r = {
			loop {
				rrand(2.0, 30.0).wait;
				switch(~events.choose,
					\pan_away, {
						rrand(2, 5).do {
							var fade_time = rrand(2, 6), amp = exprand(0.01, 0.05), buf0, buf1;
							if(a.repos[a.current_repo].is_redacted,
								{buf0 = a.repos[a.current_repo].glitchy.choose; buf1 = a.repos[a.current_repo].glitchy.choose;},
								{buf0 = a.repos[a.current_repo].non_english.choose; buf1 = a.repos[a.current_repo].non_english.choose;}
							);
							aux_synths_to_free.add(Synth(\playbuf_pan_away, [\sndbuf, buf0, \amp, amp, \destination_pan, 1.0, \fade_time, fade_time, \start_offset, rrand(0.0, 0.99), \out_verb, ~verbBus, \out, ~masterBus]));
							aux_synths_to_free.add(Synth(\playbuf_pan_away, [\sndbuf, buf1, \amp, amp, \destination_pan, -1.0, \fade_time, fade_time, \start_offset, rrand(0.0, 0.99), \out_verb, ~verbBus, \out, ~masterBus]));
							rrand(0.3, 1.5).wait;
						};
					},
					\granular_swell,  {
						rrand(2, 5).do {
							{
								var s, buf;
								if(a.repos[a.current_repo].is_redacted,
									{buf = a.repos[a.current_repo].glitchy.choose;},
									{buf = a.repos[a.current_repo].non_english.choose;}
								);
								s = Synth(\grain_phaser, [\sndbuf, buf, \amp, exprand(0.02, 0.04), \pan_variation, rrand(0.5, 3.0), \start_offset, rrand(0.0, 0.99), \preamp, 0.5, \noiseAmp, 0.0, \bwr, 0.5, \out, ~chorusBus]);
								aux_synths_to_free.add(s);
								2.wait;
								s.release;
								aux_synths_to_free.remove(s);
							}.fork;
							rrand(0.2, 0.5).wait;
						}
					},
					\glitch_interruption, {},
					{
						//default
				});
			}
		}.fork;
		recording_dur.wait;
		main_r.stop;
		~main_voice.release;
		~auxilliary_voices.do{ |syn| syn.release; };
		aux_synths_to_free.do{ |syn| syn.release; };
		aux_r.stop;
		2.wait;
		s.stopRecording();
		s.sync;
		//s.freeAll;
		anchor = anchor + 1;
		if(anchor >= ~anchors.size, {break.value(0)});
	}}
}.fork;

)
~main_voice.set(\phase_amount, 10)
(
~synths.add(Synth(\playbuf_pan_away, [\sndbuf, ~viskningar.choose, \amp, 0.1, \destination_pan, 1.0, \fade_time, 5, \out_verb, ~verbBus, \out, ~masterBus]));
~synths.add(Synth(\playbuf_pan_away, [\sndbuf, ~viskningar.choose, \amp, 0.1, \destination_pan, -1.0, \fade_time, 5, \out_verb, ~verbBus, \out, ~masterBus]));
)
(
{
	var s = Synth(\grain_phaser, [\sndbuf, ~viskningar.choose, \amp, 0.1, \pan_variation, 2, \start_offset, rrand(0.0, 0.9), \preamp, 0.5, \noiseAmp, 0.0, \bwr, 0.5, \out, ~verbBus]);
	2.wait;
	s.release;
}.fork;
)
~verb.set(\wetness, 0.1)
(
Ndef(\fft_test, {
	var sig, chain;
	sig = In.ar(~fftBus, 2);
	chain = FFT(Array.fill(2, { LocalBuf(2048, 1) }), sig);(
{
	var sig, env, freq, clap, popEnv, centerFreq = Rand(400, 700), length = Rand(0.5, 4);
	env = EnvGen.ar(
		Env(
			levels: [0, 1, 0],
			times: [length, 1.5],
			curve: [4, -6]
		),
		doneAction:2
	);

	freq = [
		EnvGen.ar(Env([centerFreq*Rand(0.1, 0.3), centerFreq], [length+1.5], [Rand(4, 7)])),
		EnvGen.ar(Env([centerFreq*Rand(0.2, 0.4), centerFreq], [length+1.5], [Rand(2, 8)]))];
	sig = Resonz.ar(WhiteNoise.ar(), freq, Line.kr(0.03, 0.3, length))*3;
	sig = Mix(sig);
	sig = Pan2.ar(sig, rrand(-1.0, 1.0));
	sig = sig * env * 0.1;
	Out.ar(\out.kr(~verbBus), sig);
}.play;
)
	chain = PV_RandComb(chain, 0.95, Impulse.kr(0.4)); // process
	sig = IFFT(chain); // inverse FF
	Out.ar(~verbBus, sig);
}).play(group: ~ndefGroup);
)
Ndef(\fft_test).clear
Ndef.clear
~nodeAudio.()
~synths.add(Synth(\buf_grain_filter, [\sndbuf, ~viskningar.choose, \amp, 1.0, \preamp, 0.05, \noiseAmp, 0.0, \out, ~verbBus]));
~synths.add(Synth(\buf_grain_filter, [\sndbuf, ~viskningar.choose, \amp, 1.0, \preamp, 0.25, \out, ~chorusBus]));
~setFreq.(1000);
~setBwr.(0.5);
~granulizer.set(\depth, 1.0, \mix, 1.0);
(
{var root = rrand(100, 500);
	[1.0, 5.0/4, 3.0/2.0, 1.5 * 5/4, 1.0 + 9.0/8, 1.0 + 9.0/8 * 5.0/4].scramble.do {|ratio|
		{
			var sig, env, freq = ratio * root;
			env = Env.perc(1.5, 15.0).kr(2);
			freq = freq +[0, SinOsc.kr(Rand(0.5, 4.0)).range(0.0, Rand(0.5, 4.0))];
			sig = DPW3Tri.ar(freq, mul: 0.01);
			Out.ar(~verbBus, Pan2.ar(sig * env, Rand(-1,1)));
		}.play;
		rrand(0.1, 5.3).wait;
	}
}.fork;
)

(
{
	var sig, env, freq, clap, popEnv, centerFreq = Rand(300, 700), length = Rand(0.5, 4);
	env = EnvGen.ar(
		Env(
			levels: [0, 1, 0],
			times: [length, 1.5],
			curve: [4, -6]
		),
		doneAction:2
	);

	freq = [
		EnvGen.ar(Env([centerFreq*Rand(0.1, 0.3), centerFreq], [length+1.5], [Rand(4, 7)])),
		EnvGen.ar(Env([centerFreq*Rand(0.2, 0.4), centerFreq], [length+1.5], [Rand(2, 8)]))];
	sig = Resonz.ar(PinkNoise.ar(), freq, Line.kr(0.03, 0.3, length))*3;
	sig = Mix(sig);
	sig = Pan2.ar(sig, rrand(-1.0, 1.0));
	sig = sig * env * 0.1;
	Out.ar(~chorusBus, sig);
}.play;
)
(
var swich_fx_dur = exprand(1.3, 5.0);
3.do{{
	var sig, env, freq, clap, popEnv, centerFreq = Rand(300, 700), length = swich_fx_dur;
	env = EnvGen.ar(
		Env(
			levels: [0, 1, 0],
			times: [length * 0.6, length*0.4],
			curve: [4, -6]
		),
		doneAction:2
	);

	freq = [
		EnvGen.ar(Env([centerFreq*Rand(0.1, 0.3), centerFreq], [length], [Rand(4, 7)])),
		EnvGen.ar(Env([centerFreq*Rand(0.1, 0.3), centerFreq], [length], [Rand(2, 8)])),
		EnvGen.ar(Env([centerFreq*Rand(0.1, 1.5), centerFreq], [length], [Rand(2, 8)])),
		EnvGen.ar(Env([centerFreq*Rand(0.4, 1.3), centerFreq], [length], [Rand(2, 8)]))
	];
	sig = Resonz.ar(PinkNoise.ar(), freq, Line.kr(0.03, 0.3, length))*3;
	sig = Mix(sig);
	sig = Pan2.ar(sig, rrand(-0.2, 0.2));
	sig = sig * env * 0.1;
	Out.ar(~chorusBus, sig);
}.play;
}
)