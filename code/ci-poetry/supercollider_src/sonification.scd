
~newPoem = false; // if there is a new version of the poem sonification that should be played through

// Convertion 53-EDO -> frequency
~ratio53 = pow(2, 1/53);
// Function to convert a degree in 53-EDO to a frequency
~degree53_to_freq =  { |degree, rootFreq|
    var freq = rootFreq*pow(~ratio53, degree);
    freq
};
~intervals = [31, 22, 17, 14, 9, 5];
~rootFreq = 0.midicps;

~padSynths = [];
~chordSequence = List[[0, 31, 53, 70]];
~chordLengths = List[1];
~chord = [ 0, 31, 53, 70 ];
~launchChord = { | length, amp = 1, lowpass = 19000 |
	~padSynths = ~chord.collect{ |degree|
		Synth(\osc, [
			\freq, ~degree53_to_freq.value(degree + (53*4), ~rootFreq),
			\atk, exprand(1, 2),
			\sus, 0,
			\rel, length + exprand(0.1, 1),
			\c0, exprand(1, 2),
			\c1, exprand(3, 6).neg,
			\detune, rrand(0.03, 0.1),
			\lowpass, lowpass,
			\buf, ~wt_buf[0..2].choose,
			\amp, 0.05 * amp,
			\pan, rrand(-0.5, 0.5),
			\out, 0,
			\rout, ~rbus,
			\rsend, -10,
		]);
	};
};
~initSonification = { var winenv;
	// start the festival server choosing a voice
	"festival -b '(voice_cmu_us_slt_arctic_hts)' --server".unixCmd;
	winenv = Env([0, 1, 0], [0.5, 0.5], [8, -8]);
	z = Buffer.sendCollection(s, winenv.discretize, 1);

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
	SynthDef(\sineperc, { var freq = \freq.kr(100), sig, env;
		env = EnvGen.kr(Env.perc(\atk.kr(0.01), \rel.kr(1), 1.0, [\c0.kr(4), \c1.kr(-4)]), doneAction: 2);
		freq = XLine.ar(Rand(4000, 6000), freq, 0.006);
		sig = SinOsc.ar(freq) * 0.5 * \amp.kr(1);
		sig = sig * env;
		sig = Pan2.ar(sig, \pan.kr(0));
		Out.ar(0, sig);
	}).add;
	//fm synth
	SynthDef(\osc, {
		arg buf=0, freq=200, detune=0.2,
		amp=0.2, pan=0, out=0, rout=0, rsend=(-20),
		atk=0.01, sus=1, rel=0.01, c0=1, c1=(-1), lowpass = 19000;
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
		sig = LPF.ar(sig, lowpass);
		sig = sig * env;
		Out.ar(out, sig);
		Out.ar(rout, sig * rsend.dbamp); //"post-fader" send to reverb
	}).add;
	//fm synth
	SynthDef(\fm, {
		arg freq=500, mRatio=1, cRatio=1,
		index=1, iScale=5, cAtk=4, cRel=(-4),
		amp=0.2, atk=0.01, rel=3, pan=0,
		out=0, fx=0, fxsend=(-25);
		var car, mod, env, iEnv;

		//index of modulation
		iEnv = EnvGen.kr(
			Env(
				[index, index*iScale, index],
				[atk, rel],
				[cAtk, cRel]
			)
		);

		//amplitude envelope
		env = EnvGen.kr(Env.perc(atk,rel,curve:[cAtk,cRel]),doneAction:2);

		//modulator/carrier
		mod = SinOsc.ar(freq * mRatio, mul:freq * mRatio * iEnv);
		car = SinOsc.ar(freq * cRatio + mod) * env * amp;

		car = Pan2.ar(car, pan);
		car = (car * 2).tanh * 0.5;

		//direct out/reverb send
		Out.ar(out, car);
		Out.ar(fx, car * fxsend.dbamp);
	}).add;

	SynthDef(\bell, {
		|fs=1, t60=1, pitchy=1, amp=0.25|
		var sig, exciter, env;

		env = EnvGen.ar(
			Env.linen(\atk.kr(0.5), 0.0, t60, curve: 4),
			doneAction:2
		);

		exciter = WhiteNoise.ar() * EnvGen.ar(Env.perc(0.001, 0.05)) * 0.25;
		sig = Klank.ar(
			`[
				[1, 2, 2.803, 3.871, 5.074, 7.81, 10.948, 14.421],   // freqs
				[1, 0.044, 0.391, 0.0891, 0.794, 0.1, 0.281, 0.079], // amplitudes
				[1, 0.205, 0.2, 0.196, 0.209, 0.047, 0.058, 0.047]*t60     // ring times
			],
			exciter,
			freqscale:fs*pitchy);
		sig = FreeVerb.ar(sig, 0.05) * amp * env;
		sig = Pan2.ar(sig, Rand(-1.0, 1.0));
		Out.ar(0, sig);
	}).add;

	// Receive OSC for when tts is finished playing
	o = OSCFunc({ arg msg, time;
		"TTS playback finished".postln;
		~newPoem = false;
	},'/tr', s.addr);
};
~sonifySuccess = {
	{
		var  sig, mod, freq = ~degree53_to_freq.(~chord.choose%53 + (53*5), ~rootFreq), env;
		env = Env.perc(0.001, 0.7, 1.0, [0, -2]).kr(2);
		mod = SinOsc.ar(freq*(8/LFNoise0.kr(16).range(1, 16))) * freq;
		sig = SinOsc.ar(freq + mod);
		sig = Pan2.ar(sig, rrand(-1.0, 1.0)) * env * 0.1;
		Out.ar(0, sig);
	}.play;
};
~sonifyFailed = {};
~sonifyTouch = { | i |

	switch(i,
		0, {
			{
				var  sig, mod, freq = ~degree53_to_freq.(~chord.choose%53 + (53*8), ~rootFreq), env;
				env = Env.perc(0.3, 0.7, 1.0, [0, -2]).kr(2);
				mod = SinOsc.ar(freq*(8/LFNoise0.kr(6).range(1, 4))) * freq;
				sig = SinOsc.ar(freq + mod);
				sig = Pan2.ar(sig, rrand(-1.0, 1.0)) * env * 0.1;
				Out.ar(0, sig);
			}.play;
		},
		1, {
			{
				var sig, env, freq = ~degree53_to_freq.(~chord.choose%53 + (53*6), ~rootFreq), mod;

				freq = freq * Demand.kr(Impulse.kr(8), 0, Dseq([1, 2], inf)).lag(0.03);
				mod = SinOsc.ar(freq * Rand(0.5, 8.0)) * freq * Rand(0.5, 3.0);
				sig = LFTri.ar(min(max(freq + mod, 20), 20000)) * 0.07;
				sig = sig * Env.perc(0.1, 1.0).kr(2);
				sig = Pan2.ar(sig, Rand(-1.0, 1.0));
				Out.ar(0, sig);
			}.play;
		},
		2, {
			{
				var  sig, mod, freq = ~degree53_to_freq.(~chord.choose%53 + (53*8), ~rootFreq), env;
				env = Env.perc(0.5, Rand(0.7, 1.4), 0.4, [3, -6]).kr(2);
				freq = XLine.kr(500, Rand(1200, 6000), 1.7);
				freq = Latch.kr(freq, Impulse.kr(10));
				mod = SinOsc.ar(freq*(8/floor(LFNoise0.kr(15).range(4, 8)))) * freq * LFNoise0.kr(20).range(0.5, 2);
				sig = SinOsc.ar(freq + mod);
				sig = RLPFD.ar(PinkNoise.ar()*3, freq*4, 0.5, 0.4) * Decay.ar(Impulse.ar(10), 0.2) * sig;
				sig = Pan2.ar(sig, rrand(-1.0, 1.0)) * env * 4.5;
				Out.ar(0, sig);
			}.play;
		},
		3, {
			{
				var sig, env, freq, clap, popEnv, centerFreq = Rand(1000, 1700), length = Rand(0.5, 1);
				env = EnvGen.ar(
					Env(
						levels: [0, 1, 0],
						times: [length, 1.5],
						curve: [4, -6]
					),
					doneAction:2
				);

				freq = [
					EnvGen.ar(Env([centerFreq*Rand(0.1, 0.3), centerFreq], [length], [Rand(4, 7)])),
					EnvGen.ar(Env([centerFreq*Rand(0.2, 0.4), centerFreq], [length], [Rand(2, 8)]))];
				sig = Resonz.ar(WhiteNoise.ar(), freq, Line.kr(0.3, 0.03, 1.0))*3;
				sig = Mix(sig);
				sig = Pan2.ar(sig, rrand(-1.0, 1.0));
				sig = sig * env * 0.25;
				Out.ar(\out.kr(0), sig);
			}.play;
		},
		4, {
			Synth(\bell, [\fs, ~degree53_to_freq.(~chord.choose%53 + (53*5), ~rootFreq), \t60, 4, \pitchy, 6, \amp, 0.08, \atk, 0.01]);
		},
		5, {
			{
				var trig, sig, pan;
				trig = Impulse.ar(Line.ar(Rand(8, 11), Rand(15, 40), 2));
				sig = Saw.ar([270, 2000, Rand(2000, 3400), Rand(3500, 4000)]) * 0.3 * Decay.ar(trig, Line.kr(0.03, 0.005, 2));
				sig = Mix(sig);
				sig = sig * Env.perc(0.01, 2).kr(2);
				pan = Demand.ar(trig + Impulse.ar(0), 0, Dseq([-1, 1], inf));
				sig = Pan2.ar(sig, pan);
				Out.ar(0, sig);
			}.play;
		},
		6, {
			{
				var sig, env, freq = [50, 2000, 500, 4000, 5030] , mod;

				freq = freq * Demand.ar(Impulse.ar(LFNoise0.kr(20).range(3, 22)), 0, Dseq([1, 1.7], inf)).lag(0.001);

				sig = Resonz.ar(WhiteNoise.ar(), freq, 0.05);
				sig = Mix(sig);
				sig = sig * EnvGen.kr(Env(
					levels: [0, Rand(0.1, 1.0), Rand(0.1, 1.0), Rand(0.1, 1.0), 0],
					times: [Rand(0.05, 0.6), Rand(0.05, 0.3), Rand(0.05, 0.3), Rand(0.1, 0.7)]),
				doneAction: 2);
				sig = (sig*0.1) + (sig * (Demand.kr(Dust.kr(LFNoise1.kr(1/2).range(10, 40)) + Impulse.kr(0), 0, Dseq([1, 0], inf))) * 0.9);
				sig = Pan2.ar(sig, Rand(-1.0, 1.0));
				Out.ar(0, sig);
			}.play;
		},
		7, {
			{
				var trig, sig, pan;
				trig = Impulse.ar(Line.ar(Rand(15, 40), Rand(3, 6), 2));
				sig = LFTri.ar([Rand(100, 270), 2000, Rand(2000, 3400), Rand(3500, 4000)]) * 0.3 * Decay.ar(trig, Line.kr(0.05, 0.005, 2)).lag(0.01);
				sig = Mix(sig);
				sig = sig * Env.perc(0.01, 2).kr(2);
				pan = Demand.ar(trig + Impulse.ar(0), 0, Dseq([-1, 1], inf));
				sig = Pan2.ar(sig, pan) * 0.5;
				Out.ar(0, sig);
			}.play;
		},
		8, {
			{
				var sig, env, freq = ~degree53_to_freq.(~chord.choose%53 + (53*5), ~rootFreq), mod;

				freq = freq * (Line.kr(0, 30, 2).floor + 1);
				mod = SinOsc.ar(freq * Rand(0.5, 8.0)) * freq * Rand(0.5, 3.0);
				sig = Pulse.ar(min(max(freq + mod, 20), 20000)) * 0.12;
				sig = sig * Env.perc(0.1, 1.0).kr(2);
				sig = Pan2.ar(sig, Rand(-1.0, 1.0));
				Out.ar(0, sig);
			}.play;
		},
		9, {
			{
				var  sig, mod, freq = ~degree53_to_freq.(~chord.choose%53 + (53*8), ~rootFreq), env;
				env = Env.perc(0.001, Rand(0.7, 1.2), 0.4, [0, -2]).kr(2);
				mod = SinOsc.ar(freq*(8/floor(LFNoise0.kr(6).range(4, 8)))) * freq * LFNoise0.kr(12).range(0.5, 2);
				sig = SinOsc.ar(freq + mod);
				sig = Pan2.ar(sig, rrand(-1.0, 1.0)) * env * 0.15;
				Out.ar(0, sig);
			}.play;
		},
		10, {
			{
				var sig, env, freq = ~degree53_to_freq.(~chord.choose%53 + (53*3), ~rootFreq);

				freq = freq * (Line.kr(0, 30, 2).floor + 1);
				sig = Pulse.ar(freq) * 0.05;
				sig = sig * Env.perc(1.0, 1.0).kr(2);
				sig = Pan2.ar(sig, Rand(-1.0, 1.0));
				Out.ar(0, sig);
			}.play;
		},
		11, {
			{
				var sig, env, freq = ~degree53_to_freq.(~chord.choose%53 + (53*8), ~rootFreq);

				sig = SinOsc.ar([freq, freq*1.005, freq*1.01, freq*2.05, freq*3.1]) * Decay.ar(Impulse.ar(0) + DelayN.ar(Impulse.ar(0), 0.1, 0.1), Rand(0.4, 1)).lag(Rand(0.01, 0.1)) * 0.05;
				sig = Mix(sig);
				sig = Pan2.ar(sig, Rand(-1.0, 1.0)) * 0.5;
				Line.kr(0, 1, 2, doneAction: 2);
				Out.ar(0, sig);
			}.play;
		},
	);
};

~poemTTSPath = "sonified/poem.wav".resolveRelative;
~sonifyPoem = {

	// play chords in a sequence
	{ var sequenceIndex = 0, backgroundOctave = 0, demoArpeggio = false, lowpass = 19000;
		loop { var time, amp = 1;
			time = ~chordLengths[sequenceIndex];
			~chord = ~chordSequence[sequenceIndex];
			if(~newPoem == false, {
				amp = 0.5;
				time = time * 2;
				~chord = ~chord + (53 * backgroundOctave);
				if(rrand(0.0, 1.0) > 0.9) {
					backgroundOctave = [0, -1, -2].choose;
				};
				// bring lowpass down slowly
				lowpass = lowpass * 0.95;
				if(lowpass < 1000) {lowpass = 1000; };
				lowpass.postln;

				if(demoArpeggio && (rrand(0.0, 1.0) > 0.3)) {
					{
						var notes = ~chord.collect{|degree| ~degree53_to_freq.(degree, ~rootFreq) }, speed = [1/4, 1/6, 1/8, 1/7].choose;
						notes = notes.sort;
						Pbind(\instrument, \sineperc,
							\freq, Pseq(notes) * 32,
							\dur, Pseq([speed], inf),
							\atk, 0.2,
							\rel, 2,
							\amp, Pgeom(0.2, 0.6),
						).play
					}.fork;
				};
			}, {
				~chord = ~chord - 53;
				time = time * 1.5;
				lowpass = 19000;
			});
			~launchChord.(time, amp, lowpass);
			time.wait;
			sequenceIndex = sequenceIndex + 1;
			if(sequenceIndex >= ~chordSequence.size) {
				sequenceIndex = 0;
				demoArpeggio = demoArpeggio.not;
			};
		}
	}.fork;
};

~updatePoemSonification = {
	var cmd, outputPath = ~poemTTSPath;
	~sonifySuccess.();

	if(~newPoem == false) { // ~newPoem is set to false when the last TTS is finished playing
		~newPoem = true;
		fork {
			// Remove the old file
			File.delete(outputPath);

			// TTS generation of .wav file
			// this requires the festival server to be started by running 'festival --server' in a terminal
			cmd = "festival_client " ++ ~masterPoemPath ++ " --ttw --output "++ outputPath;
			cmd.unixCmd; // asynchronous

			// wait for the file to finish rendering
			while({File.exists(outputPath) == false }, {
				0.1.wait;
			});

			// read the TTS poem
			~ttsBuffer = Buffer.read(s, ~poemTTSPath, 0, -1);
			s.sync();
			{ var sig, bufnum = ~ttsBuffer, envbuf = z, pan = 0, pos, cutfreq = [350, 1000, 100];
				/*sig = PlayBuf.ar(1, bufnum, BufRateScale.kr(bufnum));
				sig = PitchShift.ar(sig, 0.2, 1.5);*/
				pos = Line.kr(0, 1, BufSamples.kr(bufnum)/BufSampleRate.kr(bufnum) * 0.9, doneAction: 2);
				sig = GrainBuf.ar(1, Impulse.kr(LFNoise1.kr(2).range(30, 60)), LFNoise1.kr(3).range(0.15, 0.4), bufnum, LFNoise1.kr(1).range(0.9, 1.1),
					pos, 2, pan, envbuf);
				//sig = PlayBuf.ar(1, bufnum, BufRateScale.ir(bufnum));
				sig = LPF.ar(sig, 4000);
				sig = HPF.ar(sig, 100);
				sig = BPeakEQ.ar(sig, 1500, 0.2, 10);
				cutfreq.do{|cut|
					sig = BPeakEQ.ar(sig, cut, 0.8, -10);
				};
				sig = (sig * 0.5) + (FreeVerb.ar(sig, 0.2) * 0.5);
				sig = (sig*0.5) + (sig * (Demand.kr(Dust.kr(LFNoise1.kr(1/2).range(5, 20)) + Impulse.kr(0), 0, Dseq([1, 0], inf))) * 0.5);
				sig = sig * LFNoise2.kr(1).range(0.1, 1.0) * XLine.kr(0.5, 1.0, 1);
				sig = Pan2.ar(sig * 3);

				SendTrig.kr(pos > 0.99, 1);
				Out.ar(0, sig);
			}.play;
		};
	};

	~generateChordSequence.value(~masterPoemText);
};

~generateChordSequence = { | text |
	var lines, startingChord, newSequence = List[], newLengths = List[], intervals = [0, 17, 31];
	lines = text.split($\n);
	lines.do{|line|
		var totalValue = 0, lineChord, lineOffset, numSpace = 0, length;
		lineChord = Set[];
		line.do{|letter|
			totalValue = totalValue + letter.ascii;
			if(letter.isSpace) { numSpace = numSpace + 1; };
			lineChord.add(intervals[letter.ascii % intervals.size] + (53 * (letter.ascii % 4)));
		};
		lineChord = lineChord.asList;

		lineOffset = (numSpace*9) % 53;
		lineChord = lineChord + lineOffset;
		if(numSpace == line.size) {
			lineChord = numSpace.collect{ 53*rrand(0,4) };
			if(line.size == 0) {
				lineChord = [0];
			};
		};
		length = 10;
		length = (length * pow(0.93, line.size)) + numSpace*0.2;
		newSequence.add(lineChord);
		newLengths.add(length);
	};
	~chordSequence = newSequence;
	~chordLengths = newLengths;
};

~initSonification.();
~sonifyPoem.();
~launchChord.(10, 1, 19000)

~chord = [ 0, 31, 53 ]+(53*2);

// (
// Pbind(
// 	\instrument, \fm,
// 	\dur, 1/4,
// 	\freq,
// 	Pfunc({ var return;
// 		if(~chord[0] == nil, {
// 			return = Rest();
// 			}, {
// 				return = ~degree53_to_freq.(~chord[0] + (53*3), ~rootFreq);
// 		});
// 		return;
// 	}) * Pwrand([1,2],[0.9,0.1],inf),
// 	\mRatio, 2,
// 	\index, 0.5,
// 	\iScale, Pseq([3,2.5,2,1],inf),
// 	\atk, 0,
// 	\rel, Pexprand(0.2,0.4,inf),
// 	\amp, Pseq([Pgeom(0.1,-3.dbamp,4)],inf),
// 	\pan, Pseq([-0.25,0.25],inf),
// 	\out, 0,
// 	\fx, 0,
// 	\fxsend, -10,
// ).play();
// )
//
//
// Synth(\sineperc, [\freq, 500, \atk, 0.01, \c0, 6, \c1, -8, \rel, 1]);
//
// (
// Pbind(\instrument, \sineperc,
// 	\dur, Pseq([1/8], inf),
// 	\degree, Pseq([0, 2, 4, 1, 5, 6, 3, 8], inf),
// 	\octave, 7,
// 	\scale, Scale.minor,
// ).play
// )
