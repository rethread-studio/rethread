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

/// Add a new step after each step in the sequencer
~doubleSequencerGrid = { | sequencer |
	// insert new steps from the back
	(sequencer.numSteps..1).do{ |i|
		sequencer.steps = sequencer.steps.insert(i, Dictionary[]);
		sequencer.levels = sequencer.levels.insert(i, Dictionary[]);
	};
	sequencer.numSteps = sequencer.numSteps * 2;
};

// Run this to init a sequencer or replace the current one with a new one/reset the sequencer
~sequencer = ~newSequencer.(32);

// Fill the sequencer with random percussive sounds.
// Each time a step is chosen it is "upgraded" to the next level sound meaning that
// a frame where this function has been called many times will sound different from one where it has been called few times.
~addPercussiveToSequencer = {
	var stepIndex = rrand(0, ~sequencer.numSteps-1).floor, level, newLevel, step, newFunc;
	level = ~sequencer.levels[stepIndex][\percussive];
	if(level == nil) {level = 0 };
	newLevel = level + 1;
	~sequencer.levels[stepIndex].put(\percussive, newLevel);
	newFunc = switch(newLevel,
		1, {{
			~channels.percussion.play_on(\tick2, [
				\freq, rrand(1000, 1500),
				\rq, exprand(0.001, 0.1),
				\out, 0,
				\amp, exprand(0.015, 0.05) * 0.1,
				\atk, 0.001, \rel, 0.01, \pan, rrand(-0.5, 0.5),
				\out, ~channels.percussion.bus,
			]);
		}},
		2, {{
			~channels.percussion.play_on(\tick2, [
				\freq, rrand(2000, 2500),
				\rq, exprand(0.001, 0.1),
				\out, 0,
				\amp, exprand(0.015, 0.05) * 0.1,
				\atk, 0.001, \rel, 0.01, \pan, rrand(-0.5, 0.5),
				\out, ~channels.percussion.bus,
			]);
		}},
		3, {{
			~channels.percussion.play_on(\tick2, [
				\freq, rrand(2500, 3000),
				\rq, exprand(0.001, 0.1),
				\out, 0,
				\amp, exprand(0.015, 0.05) * 0.1,
				\atk, 0.001, \rel, 0.01, \pan, rrand(-0.5, 0.5),
				\out, ~channels.percussion.bus,
			]);
		}},
		4, {{
			~channels.percussion.play_on(\tick2, [
				\freq, rrand(4000, 6000),
				\rq, exprand(0.001, 0.1),
				\out, 0,
				\amp, exprand(0.015, 0.05) * 0.2,
				\atk, 0.001, \rel, 0.01, \pan, rrand(-0.5, 0.5),
				\out, ~channels.percussion.bus,
			]);
		}},
		5, {{
			~channels.percussion.play_on(\tick2, [
				\freq, rrand(8000, 10000),
				\rq, exprand(0.001, 0.1),
				\out, 0,
				\amp, exprand(0.015, 0.05) * 0.4,
				\atk, 0.001, \rel, 0.01, \pan, rrand(-0.5, 0.5),
				\out, ~channels.percussion.bus,
			]);
		}},
		6, {{
			~channels.percussion.play_on(\tick2, [
				\freq, rrand(200, 300),
				\rq, exprand(0.001, 0.1),
				\out, 0,
				\amp, exprand(0.015, 0.05) * 0.7,
				\atk, 0.001, \rel, 0.01, \pan, rrand(-0.5, 0.5),
				\out, ~channels.percussion.bus,
			]);
		}},
		7, {{
			~channels.percussion.play_on(\fm, [\freq, 2000, \mRatio, 1, \cRatio, rrand(2, 16), \index, 2.4, \iScale, rrand(1, 10), \atk, 0.01, \rel, 0.01, \amp, rrand(0.02, 0.04), \out, ~channels.percussion.bus])
		}},
		8, {{
			~channels.percussion.play_on(\fm, [\freq, 2000, \mRatio, rrand(1, 3), \cRatio, rrand(2, 16), \index, 2.4, \iScale, rrand(1, 10), \atk, rrand(0.02, 0.2), \rel, 0.01, \amp, rrand(0.01, 0.03), \out, ~channels.percussion.bus])
		}},
		9, {{
			~channels.percussion.play_on(\fm, [\freq, 2000, \mRatio, rrand(1, 3), \cRatio, rrand(2, 16), \index, rrand(4, 8), \iScale, rrand(1, 10), \atk, rrand(0.02, 0.3), \rel, 0.01, \amp, rrand(0.01, 0.03), \out, ~channels.percussion.bus])
		}},
		10, {{
			~channels.percussion.play_on(\kick, [\att, rrand(0.001, 0.01),\rel, rrand(0.22, 0.5), \sinfreq, rrand(100, 120), \glissf, 0.4, \glisstime, 0.035, \clickAdd, rrand(-700, -400), \amp, rrand(0.12, 0.25), \out, ~channels.percussion.bus]);
		}},
		11, {{
			~channels.percussion.play_on(\kick, [\att, rrand(0.001, 0.01),\rel, rrand(0.22, 1.3), \sinfreq, rrand(230, 300), \glissf, 0.2, \glisstime, 0.035, \clickAdd, rrand(-700, 400), \amp, rrand(0.12, 0.25), \out, ~channels.percussion.bus]);
		}},
		12, {{
			~channels.percussion.play_on(\kick, [\att, rrand(0.001, 0.01),\rel, rrand(1.22, 2.3), \sinfreq, rrand(530, 700), \glissf, 0.1, \glisstime, 0.035, \wobble, 0.5, \clickAdd, rrand(-700, 400), \amp, rrand(0.12, 0.25), \out, ~channels.percussion.bus]);
		}},
		// default
		{{
			~channels.percussion.play_on(\fm_reverse, [\freq, rrand(3000, 7000), \mRatio, rrand(3, 9), \cRatio, rrand(2, 16), \index, rrand(4, 8), \iScale, rrand(2, 5), \atk, rrand(0.01, 0.5), \rel, exprand(0.005, 0.2), \amp, rrand(0.01, 0.03), \out, ~channels.percussion.bus])
		}},
	);
	~sequencer.steps[stepIndex].put(\percussive, newFunc);
};

// SEQUENCER UPDATE FUNCTION

// Play a certain sound based on a number of parameters
~updateSequencer = { | type, inout, packets, channel |
	var activity = \none, chord = [~ch1, ~ch2, ~ch3, ~ch4].choose;
	if(packets >= ~highActivityThreshold, {
		activity = \high;
		chord = chord;
	}, {
		if(packets >= ~mediumActivityThreshold, {
			activity = \medium;
			chord = chord[0..(chord.size()*2/3 - 1).asInteger]
		}, {
			if(packets >= ~lowActivityThreshold, {
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
			},
			\WhatsApp, {
				if(~sequencer.whatsapp != true) {
					var startStep = rrand(0, ~sequencer.numSteps).floor;
					// Add to sequencer
					~addToSequencer.(~sequencer, startStep, \whatsapp,
						{ channel.play_on(\service_voice, [\buf, ~voiceServices.whatsapp]); });
					~sequencer.whatsapp = true;
				};
			},
			\Slack, {
				if(~sequencer.slack != true) {
					var startStep = rrand(0, ~sequencer.numSteps).floor;
					// Add to sequencer
					~addToSequencer.(~sequencer, startStep, \slack,
						{ channel.play_on(\service_voice, [\buf, ~voiceServices.slack]); });
					~sequencer.slack = true;
				};
			},
			\Signal, {
				if(~sequencer.signal != true) {
					var startStep = rrand(0, ~sequencer.numSteps).floor;
					// Add to sequencer
					~addToSequencer.(~sequencer, startStep, \signal,
						{ channel.play_on(\service_voice, [\buf, ~voiceServices.signal]); });
					~sequencer.signal = true;
				};
			},
			\Instagram, {
				if(~sequencer.instagram != true) {
					var startStep = rrand(0, ~sequencer.numSteps).floor;
					// Add to sequencer
					~addToSequencer.(~sequencer, startStep, \instagram,
						{ channel.play_on(\service_voice, [\buf, ~voiceServices.instagram]); });
					~sequencer.instagram = true;
				};
			},
			\GitHub, {
				if(~sequencer.github != true) {
					var startStep = rrand(0, ~sequencer.numSteps).floor;
					// Add to sequencer
					~addToSequencer.(~sequencer, startStep, \github,
						{ channel.play_on(\service_voice, [\buf, ~voiceServices.github]); });
					~sequencer.github = true;
				};
			}
		);

	};
};