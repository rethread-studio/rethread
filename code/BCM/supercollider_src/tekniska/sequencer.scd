//////////////////////////////////////////////////////
/////// SEQUENCER
/////////////////////////////////////////////////////

/*
The sequencer holds functions (closures/lambdas) that start sounds. Each step is a list of functions.
*/

~newSequencer = { | numSteps |
	var sequencer = Environment(know: true);
	sequencer.numSteps = numSteps;
	sequencer.steps = {Dictionary[]}!sequencer.numSteps;
	sequencer.levels = {Dictionary[]}!sequencer.numSteps;
	sequencer.currentStep = 0;
	sequencer
};

~addToSequencer = { | sequencer, step, key, function |
	var index = step % sequencer.numSteps;
	sequencer.steps[index] = sequencer.steps[index].put(key, function);
};

~playSequencer = { | sequencer |
	var step = sequencer.currentStep;
	sequencer.steps[step].keysValuesDo { | key, func |
		func.();
	};
	sequencer.currentStep = (sequencer.currentStep + 1) % sequencer.numSteps;
};

// Run this to init a sequencer or replace the current one with a new one/reset the sequencer
~sequencer = ~newSequencer.(32);

~addPercussiveToSequencer = {
	var stepIndex = rrand(0, ~sequencer.numSteps-1).floor, level, newLevel, step, newFunc;
	level = ~sequencer.levels[stepIndex][\percussive];
	if(level == nil) {level = 0 };
	newLevel = level + 1;
	~sequencer.levels[stepIndex].put(\percussive, newLevel);
	newFunc = switch(newLevel,
		1, {{
			Synth(\tick2, [
				\freq, rrand(1000, 1500),
				\rq, exprand(0.001, 0.1),
				\out, 0,
				\amp, exprand(0.015, 0.05) * 0.1,
				\atk, 0.001, \rel, 0.01, \pan, rrand(-0.5, 0.5),
			]);
		}},
		2, {{
			Synth(\tick2, [
				\freq, rrand(2000, 2500),
				\rq, exprand(0.001, 0.1),
				\out, 0,
				\amp, exprand(0.015, 0.05) * 0.1,
				\atk, 0.001, \rel, 0.01, \pan, rrand(-0.5, 0.5),
			]);
		}},
		3, {{
			Synth(\tick2, [
				\freq, rrand(2500, 3000),
				\rq, exprand(0.001, 0.1),
				\out, 0,
				\amp, exprand(0.015, 0.05) * 0.1,
				\atk, 0.001, \rel, 0.01, \pan, rrand(-0.5, 0.5),
			]);
		}},
		4, {{
			Synth(\tick2, [
				\freq, rrand(4000, 6000),
				\rq, exprand(0.001, 0.1),
				\out, 0,
				\amp, exprand(0.015, 0.05) * 0.2,
				\atk, 0.001, \rel, 0.01, \pan, rrand(-0.5, 0.5),
			]);
		}},
		5, {{
			Synth(\tick2, [
				\freq, rrand(8000, 10000),
				\rq, exprand(0.001, 0.1),
				\out, 0,
				\amp, exprand(0.015, 0.05) * 0.4,
				\atk, 0.001, \rel, 0.01, \pan, rrand(-0.5, 0.5),
			]);
		}},
		6, {{
			Synth(\tick2, [
				\freq, rrand(200, 300),
				\rq, exprand(0.001, 0.1),
				\out, 0,
				\amp, exprand(0.015, 0.05) * 0.7,
				\atk, 0.001, \rel, 0.01, \pan, rrand(-0.5, 0.5),
			]);
		}},
		7, {{
			Synth(\fm, [\freq, 2000, \mRatio, 1, \cRatio, rrand(2, 16), \index, 2.4, \iScale, rrand(1, 10), \atk, 0.01, \rel, 0.01, \amp, rrand(0.02, 0.04)])
		}},
		8, {{
			Synth(\fm, [\freq, 2000, \mRatio, rrand(1, 3), \cRatio, rrand(2, 16), \index, 2.4, \iScale, rrand(1, 10), \atk, rrand(0.02, 0.2), \rel, 0.01, \amp, rrand(0.01, 0.03)])
		}},
		9, {{
			Synth(\fm, [\freq, 2000, \mRatio, rrand(1, 3), \cRatio, rrand(2, 16), \index, rrand(4, 8), \iScale, rrand(1, 10), \atk, rrand(0.02, 0.3), \rel, 0.01, \amp, rrand(0.01, 0.03)])
		}},
		10, {{
			Synth(\kick, [\att, rrand(0.001, 0.01),\rel, 0.22,\sinfreq, rrand(50, 60),\glissf, 0.9,\amp, rrand(0.08, 0.15)]);
		}},
		11, {{
			Synth(\kick, [\att, rrand(0.001, 0.01),\rel, rrand(0.22, 0.3), \sinfreq, rrand(30, 40),\glissf, 0.9,\amp, rrand(0.12, 0.25)]);
		}},
		// default
		{{
			Synth(\tick2, [
				\freq, rrand(10000, 11000),
				\rq, exprand(0.001, 0.1),
				\out, 0,
				\amp, exprand(0.015, 0.05) * 0.5,
				\atk, 0.001, \rel, 0.01, \pan, rrand(-0.5, 0.5),
			]);
		}},
	);
	~sequencer.steps[stepIndex].put(\percussive, newFunc);
};

// SEQUENCER UPDATE FUNCTION

// Play a certain sound based on a number of parameters
~updateSequencer = { | type, inout, packets, channel |
	var activity = \none, chord = [~ch1, ~ch2, ~ch3, ~ch4].choose;
	if(packets > ~highActivityThreshold, {
		activity = \high;
		chord = chord;
	}, {
		if(packets > ~mediumActivityThreshold, {
			activity = \medium;
			chord = chord[0..(chord.size()*2/3 - 1).asInteger]
		}, {
			if(packets > ~lowActivityThreshold, {
				activity = \low;
				chord = chord[0..(chord.size()/3 - 1).asInteger]
			});
		});
	});
	if(activity != \none) {
		// type.postln;
		switch(type,
			\standard1, {
				var freq = ~s53.degreeToFreq(~chord.choose, 0.midicps, ~octave),
				amp = 0.5,
				release_coeff = 1.0,
				thump_atk = rrand(0.18, 0.21);

				if(~positionThroughService) {
					channel = ~channels.default_channel;
				};

			},
			\standard2, {
				var freq = ~s53.degreeToFreq(~chord.choose, 0.midicps, ~octave),
				amp = 0.5,
				release_coeff = 1.0,
				thump_atk = rrand(0.18, 0.21);

				if(~positionThroughService) {
					channel = ~channels.default_channel;
				};
				switch(activity,
					\low, {
						amp = amp * rrand(0.3, 0.7);
					},
					\medium, {
						amp = amp * rrand(0.7, 1.2);
						thump_atk = rrand(1, 2);
					},
					\high, {
						amp = amp * rrand(1.2, 2.0);
						freq = freq * (2.pow(rrand(-1, 1.0).round));
						release_coeff = rrand(0.3, 0.5);
						thump_atk = rrand(2, 3);
					}
				);
			},
			\standard3, {
				var freq = ~s53.degreeToFreq(~chord.choose, 0.midicps, ~octave + 1),
				amp = 0.5,
				release_coeff = 1.0,
				thump_atk = rrand(0.18, 0.21);

				if(rrand(0.0, 1.0) > 0.5) {
					while({freq < 150}, {freq = freq * 2});
				};

				if(~positionThroughService) {
					channel = ~channels.default_channel;
				};

			},
			\Google, {
				var freq = ~s53.degreeToFreq(~chord.choose, 0.midicps, ~octave + 1),
				amp = 0.5,
				release_coeff = 1.0;

				if(~positionThroughService) {
					channel = ~channels.google_channel;
				};

				if(~sequencer.google != true) {
					// Add to sequencer
					~addToSequencer.(~sequencer, rrand(0, ~sequencer.numSteps).floor, \Google,
						{
							channel.play_on(\service_voice, [\buf, ~voiceServices.google]);
							Synth(\tick2,
								[
									\freq, ~s53.degreeToFreq(~chord.choose + 159, 0.midicps, 5).min(15000),
									\rq, exprand(0.0001, 0.1),
									\out, 0,
									\amp, rrand(0.001, 0.02),
									\atk, 0.000,
									\rel, rrand(0.01, 0.05), //0.01,
									\c1, -12,
									\pan, rrand(-1, 1),
								]
							);
					});
					~sequencer.google = true;
				};
			},
			\Amazon, {
				var freq = ~s53.degreeToFreq(~chord.choose, 0.midicps, ~octave),
				amp = 0.5,
				release_coeff = 1.0;

				if(~positionThroughService) {
					channel = ~channels.amazon_channel;
				};
				switch(activity,
					\low, {
						amp = amp * rrand(0.3, 0.7);
					},
					\medium, {
						amp = amp * rrand(0.7, 1.2);
					},
					\high, {
						amp = amp * rrand(1.2, 2.0);
						freq = freq * (2.pow(rrand(-1, 1.0).round));
						release_coeff = rrand(0.3, 0.5);
					}
				);
				if(~sequencer.amazon != true) {
					var startStep = rrand(0, ~sequencer.numSteps-1).floor;
					// Add to sequencer
					~addToSequencer.(~sequencer, startStep, \Amazon,
						{
							var freq = ~s53.degreeToFreq(~ch3[2], 0.midicps, ~octave + 1), thump_atk = rrand(0.18, 0.21);
							channel.play_on(\service_voice, [\buf, ~voiceServices.amazon]);
							channel.play_on(\thump, [
								\freq, freq,
								\atk, thump_atk,
								\rel, 2,
								\c0, -3,
								\c1, \sine,
								\pan, rrand(-0.7, 0.7),
								\amp, 0.05 * amp,
								\out, channel.bus]);
					});
					startStep = (startStep+3) % ~sequencer.numSteps;
					~addToSequencer.(~sequencer, startStep, \Amazon, {
							var freq = ~s53.degreeToFreq(~ch3[3], 0.midicps, ~octave+1), thump_atk = rrand(0.18, 0.21);
							channel.play_on(\thump, [\freq, freq,\atk, thump_atk, \rel, rrand(0.5, 2), \c0, -3, \c1, \sine,
								\pan, rrand(-0.7, 0.7), \amp, 0.05 * amp, \out, channel.bus]);
					});
					startStep = (startStep+3) % ~sequencer.numSteps;
					~addToSequencer.(~sequencer, startStep, \Amazon, {
							var freq = ~s53.degreeToFreq(~ch3[2], 0.midicps, ~octave+1), thump_atk = rrand(0.18, 0.21);
							channel.play_on(\thump, [\freq, freq,\atk, thump_atk, \rel, rrand(0.5, 2), \c0, -3, \c1, \sine,
								\pan, rrand(-0.7, 0.7), \amp, 0.05 * amp, \out, channel.bus]);
					});
					~sequencer.amazon = true;
				};
			},
			\Cloudflare, {
				var freq = ~s53.degreeToFreq(~chord.choose, 0.midicps, ~octave),
				amp = 0.5,
				release_coeff = 1.0;

				if(~positionThroughService) {
					channel = ~channels.cloudflare_channel;
				};

			},
			\Microsoft, {
				var freq = ~s53.degreeToFreq(~chord.choose, 0.midicps, ~octave),
				amp = 0.5,
				release_coeff = 1.0;

				if(~positionThroughService) {
					channel = ~channels.microsoft_channel;
				};

				channel.play_on(\service_voice, [\buf, ~voiceServices.microsoft]);

			},
			\YouTube, {
				var freq = ~s53.degreeToFreq(~chord.choose, 0.midicps, ~octave),
				amp = 0.5,
				release_coeff = 1.0,
				thump_atk = rrand(0.18, 0.21);

				if(~positionThroughService) {
					channel = ~channels.youtube_channel;
				};
				switch(activity,
					\low, {
						amp = amp * rrand(0.3, 0.7);
					},
					\medium, {
						amp = amp * rrand(0.7, 1.2);
						release_coeff = rrand(1.0, 1.5);
					},
					\high, {
						amp = amp * rrand(1.2, 2.0);
						freq = freq * (2.pow(rrand(-1, 1.0).round));
						release_coeff = rrand(1.5, 2.5);
					}
				);
				if(~sequencer.youtube != true) {
					var startStep = rrand(0, ~sequencer.numSteps-1).floor;
					// Add to sequencer
					~addToSequencer.(~sequencer, startStep,
						{
							var freq = ~s53.degreeToFreq(~ch2[0], 0.midicps, ~octave+1);
							channel.play_on(\service_voice, [\buf, ~voiceServices.youtube]);
							channel.play_on(\thump, [
								\freq, freq,
								\atk, thump_atk,
								\rel, rrand(0.5, 2),
								\c0, -3,
								\c1, \sine,
								\pan, rrand(-0.7, 0.7),
								\amp, 0.05 * amp,
								\out, channel.bus]);
					});
					startStep = (startStep+1) % ~sequencer.numSteps;
					~addToSequencer.(~sequencer, startStep, \youtube, {
							var freq = ~s53.degreeToFreq(~ch2[1], 0.midicps, ~octave+1);
							channel.play_on(\thump, [\freq, freq,\atk, thump_atk, \rel, rrand(0.5, 2), \c0, -3, \c1, \sine,
								\pan, rrand(-0.7, 0.7), \amp, 0.05 * amp, \out, channel.bus]);
					});
					startStep = (startStep+1) % ~sequencer.numSteps;
					~addToSequencer.(~sequencer, startStep, \youtube, {
							var freq = ~s53.degreeToFreq(~ch2[2], 0.midicps, ~octave+1);
							channel.play_on(\thump, [\freq, freq,\atk, thump_atk, \rel, rrand(0.5, 2), \c0, -3, \c1, \sine,
								\pan, rrand(-0.7, 0.7), \amp, 0.05 * amp, \out, channel.bus]);
					});
					startStep = (startStep+1) % ~sequencer.numSteps;
					~addToSequencer.(~sequencer, startStep, \youtube, {
							var freq = ~s53.degreeToFreq(~ch2[3], 0.midicps, ~octave+1);
							channel.play_on(\thump, [\freq, freq,\atk, thump_atk, \rel, rrand(0.5, 2), \c0, -3, \c1, \sine,
								\pan, rrand(-0.7, 0.7), \amp, 0.05 * amp, \out, channel.bus]);
					});
					~sequencer.youtube = true;
				};
			},
			\Facebook, {
				var freq = ~s53.degreeToFreq(~chord.choose, 0.midicps, ~octave-1),
				amp = 0.5,
				release_coeff = 1.0,
				thump_atk = rrand(0.18, 0.21);

				if(rrand(0.0, 1.0) > 0.5) {
					while({freq < 100}, {freq = freq * 2});
				};

				if(~positionThroughService) {
					channel = ~channels.facebook_channel;
				};

				if(~sequencer.facebook != true) {
					var startStep = rrand(0, ~sequencer.numSteps).floor;
					// Add to sequencer
					~addToSequencer.(~sequencer, startStep, \facebook,
						{
							var freq = ~s53.degreeToFreq(~ch1[0], 0.midicps, ~octave);
							channel.play_on(\service_voice, [\buf, ~voiceServices.facebook]);
							channel.play_on(\thump, [
								\freq, freq,
								\atk, thump_atk,
								\rel, rrand(0.5, 2),
								\c0, -3,
								\c1, \sine,
								\pan, rrand(-0.7, 0.7),
								\amp, 0.05 * amp,
								\out, channel.bus]);
					});
					startStep = (startStep+2) % ~sequencer.numSteps;
					~addToSequencer.(~sequencer, startStep, \facebook,
						{
							var freq = ~s53.degreeToFreq(~ch1[1], 0.midicps, ~octave);
							channel.play_on(\thump, [
								\freq, freq,
								\atk, thump_atk,
								\rel, rrand(0.5, 2),
								\c0, -3,
								\c1, \sine,
								\pan, rrand(-0.7, 0.7),
								\amp, 0.05 * amp,
								\out, channel.bus]);
					});
					startStep = (startStep+2) % ~sequencer.numSteps;
					~addToSequencer.(~sequencer, startStep, \facebook,
						{
							var freq = ~s53.degreeToFreq(~ch1[2], 0.midicps, ~octave+1);
							channel.play_on(\thump, [
								\freq, freq,
								\atk, thump_atk,
								\rel, rrand(0.5, 2),
								\c0, -3,
								\c1, \sine,
								\pan, rrand(-0.7, 0.7),
								\amp, 0.05 * amp,
								\out, channel.bus]);
					});
					~sequencer.facebook = true;
				};
			}
		);

	};
};