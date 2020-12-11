(
~now = { Date.localtime.rawSeconds };

s.waitForBoot({
	var stereoBuffer1L = Buffer.alloc(s, s.sampleRate*3, 1);
	var stereoBuffer1R = Buffer.alloc(s, s.sampleRate*3, 1);

	~startTime = ~now.();
	~s53 = Scale.chromatic('et53');
	~root = 12;
	~metrics = (
		numPackets: 0,
		numPacketsIn: 0,
		numPacketsOut: 0,
		countries: Dictionary[],
		continents: Dictionary[],
		numPacketsNow: 0,
		decayCoeff: (0.001).pow(1.0/100), // decay 60db in 100 iterations
		registerMetric: { | self, out, country, continent |
			var oldCountryVal, oldContinentVal;
			self.numPackets = self.numPackets + 1;
			self.numPacketsNow = self.numPacketsNow + 1;
			if(out, {
				self.numPacketsOut = self.numPacketsOut + 1;
			}, {
				self.numPacketsIn = self.numPacketsIn + 1;
			});

			oldCountryVal = self.countries.at(country);
			if(oldCountryVal == nil, {
				oldCountryVal = 0;
			});
			self.countries.put(country, oldCountryVal + 1);

			oldContinentVal = self.countries.at(continent);
			if(oldContinentVal == nil, {
				oldContinentVal = 0;
			});
			self.countries.put(continent, oldContinentVal + 1);
		},
		updateValues: { | self |
			self.numPacketsNow = self.numPacketsNow * self.decayCoeff;
		},
	);
	{
		loop {
			~metrics.updateValues();
			0.01.wait;
		};
	}.fork;

	// Load ambisonics stuff
	~foaDecoder = FoaDecoderKernel.newUHJ;
	~decodeBus = Bus.audio(s, 4);
	~foaEncoder = FoaEncoderMatrix.newOmni;

	s.sync;

	"synthdefs.scd".loadRelative;

	s.sync;

	~revBus = Bus.audio(s, 2);
	~tickBus = Bus.audio(s, 2);
	~tapeBus = Bus.audio(s, 2);



	~tapeDelay = Synth(\StereoModDelay, [\in, ~tapeBus, \time, 0.5, \fb, 0.3]);
	~decoder = Synth(\decoder, [\in, ~decodeBus, \out, ~tapeBus]);

	~tickChannel = Synth(\tickChannel, [\in, ~tickBus, \out, ~revBus, \revOut, ~tapeBus, \revSend, 0.0, \lpfCutoff, 6000]);

	stereoBuffer1L.zero;
	stereoBuffer1R.zero;
	~tapeDelay.set(\bufferL, stereoBuffer1L);
	~tapeDelay.set(\bufferR, stereoBuffer1R);

	~noiseBuf = Buffer.alloc(s, s.sampleRate * 4, 1);

	s.sync();

	"capacitor.scd".loadRelative;
	~clearCapacitors.(); // Create a standard ~capacitors environment proto-object

	~sonificationFunctionclearCapacitorss = List[];

	~allPackets = List[];

	~glitchMinFreq = 2;
	~glitchMaxFreq = 10000;
	~glitchRangeCurve = 80;

	"receive_osc.scd".loadRelative;

	"gestures.scd".loadRelative;
	"gliss_movement.scd".loadRelative;
	"speed_processes.scd".loadRelative;
	"bass_note.scd".loadRelative;
	"drops_movement.scd".loadRelative;

	/*{
		loop {
			~pingGesture.();
			rrand(1, 8).floor.wait;
		};
	}.fork;*/

	{ // Change glitch parameters randomly
		loop {
			~glitchMinFreq = exprand(2, 100);
			~glitchMaxFreq = rrand(2000, 10000);
			~glitchRangeCurve = rrand(0.0, 1.0).lincurve(0.0, 1.0, 2, 80, -6);
			rrand(0.5, 2.0).wait;
		};
	}.fork;

	// Play from the buffer that contains the glitch content of all the packets coming in
	// Synth(\loop_buffer, [\bufnum, ~noiseBuf, \out, ~revBus, \amp, 0.25]);

	// =========================================================== START BASS
	~setBassNote.(~root);
	~setBassFilterMax.(0.0);
	~startBassNote.(0.0, 0.1);

	~setSpeedDecimator.(0.15, ~revBus);

	~rev = Synth(\medium_reverb, [\in, ~revBus, \out, 0, \mix, 0.25, \rt, 2.5], addAction: 'addToTail');
});
)

~glitchSynth = Synth(\loop_buffer, [\bufnum, ~noiseBuf, \out, ~revBus, \amp, 0.7, \lpfCutoff, 3000]);
~glitchSynth.set(\amp, 0.1);
~glitchSynth.set(\lpfCutoff, 3000);

(
~wind = Synth(\wind, [\activity, 0.1, \out, ~revBus, \amp, 1.5, \lpf_cutoff, 2000]);
{
	loop {
		var activity = ~metrics.numPacketsNow * 0.005;
		~wind.set(\activity, activity.pow(2.0), \lpf_cutoff, activity.pow(3).linlin(0, 1, 500, 4000));
		activity.postln;
		0.01.wait;
	};
}.fork
)
~wind.set(\amp, 3.0)

~startSpeedProcesses.()
~stopSpeedProceses.()

~tickChannel.set(\lpfCutoff, 6000)

// ===============================================================
// ===============================================================
// The whole score

// This should mirror the score that controls the graphics
(
{
	~switchBassSource.(\saw);
	~glitchSynth = Synth(\loop_buffer, [\bufnum, ~noiseBuf, \out, ~tapeBus, \amp, 1.00]);
	~glitchSynth.set(\ampLag, 4.0, \lpfLag, 4.0);
	s.sync();
	~glitchSynth.set(\amp, 0.7, \lpfCutoff, 1000);
	5.0.wait;
	~startBassNote.(0.01, 2.5);
	~glitchSynth.set(\ampLag, 30, \lpfLag, 6.0);
	s.sync();
	~glitchSynth.set(\amp, 0.04, \lpfCutoff, 3000);
	~startBassReverb.(4.0);
	2.5.wait;
	~startBassNote.(0.55, 40.0);
	~switchBassSource.(\saw);
	~startShortBassSineBursts.();
	// ======================================= WORLD
	4.wait;
	~startGlissMovementDuringWorld.(); // This will not wait internally
	135.wait;

	// Fade in a bit early
	~glitchSynth.set(\ampLag, 4);
	s.sync();
	~glitchSynth.set(\amp, 1.0, \lpfCutoff, 1000);
	~startBassNote.(1.0, 6.0);
	3.wait;
	// ====================================== Transition
	~stopShortBassSineBursts.();
	3.5.wait;
	~glitchSynth.set(\ampLag, 15.0);
	s.sync();
	~glitchSynth.set(\amp, 0.01, \lpfCutoff, 3000);
	~startBassReverb.(4.0);
	~startBassNote.(0.0, 6.0);

	1.0.wait;
	~root = ~root + 22;
	~setBassNote.(~root);
	// ======================================= NUMBERS
	// TODO: Suddenly stop for a bar between sections
	~beepOutBus = ~tapeBus;
	~beepAmp = 0.2;
	~playBeeps.();
	7.wait;
	~tickChannel.set(\lpfCutoff, 2000);
	~startSpeedProcesses.();
	8.wait;
	~stopBeeps.();
	~beepOutBus = ~revBus;
	~beepAmp = 0.4;
	11.wait;
	~stopSpeedProceses.();
	1.wait;
	~startSpeedRandomCutoff.();
	~startSpeedProcesses.();
	~startSpeedProcess1.();
	~root = ~root + 22;
	~setBassNote.(~root);
	8.wait;
	~playBeeps.();
	9.wait;
	// ~stopSpeedProceses.();
	~startSpeedDecimatorNoise.(\speedNoiseSwitchMono, 40);
	~root = ~root + 22;
	~setBassNote.(~root);
	~startBassNote.(0.2, 0.5);
	1.wait;
	~startBassNote.(0.0, 0.5);
	~stopSpeedDecimatorNoise.();
	~startSpeedDecimatorNoise.(\speedNoiseSwitchMono, 20);
	6.wait;
	~root = ~root + 22;
	~setBassNote.(~root);
	~stopSpeedDecimatorNoise.();
	2.wait;
	~startSpeedDecimatorNoise.(\speedNoiseSwitchMono, 60);
	1.wait;
	~stopSpeedDecimatorNoise.();
	0.5.wait;
	~startSpeedDecimatorNoise.(\speedNoiseSwitchStereo, 10);
	2.wait;
	~stopSpeedDecimatorNoise.();
	~startSpeedDecimatorNoise.(\speedNoiseSwitchStereo, 90);
	~addAdditionalBeepCapacitors.();
	9.wait;
	~stopSpeedDecimatorNoise.();
	~root = ~root + 22;
	~setBassNote.(~root);
	7.wait;
	~addWebBeepCapacitors.();
	~beepOutBus = ~revBus;
	6.wait;
	~startSpeedDecimatorNoise.(\speedNoiseSwitchStereo, 30);
	6.wait;
	~beepOutBus = ~tapeBus;
	~stopSpeedDecimatorNoise.();
	~setSpeedDecimator.(0.15, ~tapeBus);
	~startSpeedDecimatorNoise.(\speedNoiseSwitchMono, 70);
	2.wait;
	~stopSpeedDecimatorNoise.();
	~startSpeedDecimatorNoise.(\speedNoiseSwitchStereo, 95);
	7.5.wait;

	~stopSpeedDecimatorNoise.();
	~root = ~root + 17;
	~setBassNote.(~root);
	~startBassNote.(0.2, 5.0);
	~startBassReverb.(4.0);
	3.wait;
	~stopSpeedRandomCutoff.();
	~stopSpeedProceses.();

	2.wait;
	// Fade out 10s
	~glitchSynth.set(\ampLag, 5.0);
	s.sync();
	~glitchSynth.set(\amp, 0.8, \lpfCutoff, 300);
	~startBassNote.(0.7, 10.0);
	5.0.wait;
	~glitchSynth.set(\ampLag, 5.0);
	s.sync();
	~glitchSynth.set(\amp, 0.6, \lpfCutoff, 3000);
	5.wait;
	~stopBeeps.();
	// =================================== TRANSITION 3 + 2 s
	~glitchSynth.set(\ampLag, 3.0);
	~setBassFilterMax.(3.0);
	s.sync();
	~glitchSynth.set(\amp, 0.7, \lpfCutoff, 900);
	3.wait;
	~glitchSynth.set(\ampLag, 7.0);
	s.sync();
	~glitchSynth.set(\amp, 0.01, \lpfCutoff, 2000);
	~setBassFilterMax.(0.0);
	2.0.wait;
	// ======================================= DROPS
	~startDropsMovement.();
	~glitchSynth.set(\ampLag, 4.0);
	s.sync();
	~glitchSynth.set(\amp, 0.5);
	4.wait;
	// ======================================= TRANSITION

	~glitchSynth.set(\ampLag, 2.0);
	s.sync();
	~glitchSynth.set(\amp, 0.1);
	2.wait;

	~glitchSynth.set(\ampLag, 2.0);
	s.sync();
	~glitchSynth.set(\amp, 0.5);
	2.wait;

	~glitchSynth.set(\ampLag, 10.0);
	s.sync();
	~glitchSynth.set(\amp, 0.01);
	// ======================================= PORTS 103.5 s

	~setSpeedDecimator.(0.10, ~tapeBus);
	~startSpeedDecimatorNoise.(\speedNoiseSwitchStereo, 100);
	~beepOutBus = ~tapeBus;
	~beepAmp = 0.35;
	~playBeeps.();
	~glitchSynth.set(\ampLag, 15.0);
	s.sync();
	~glitchSynth.set(\amp, 0.4);
	10.wait;
	~stopSpeedDecimatorNoise.();
	~beepAmp = 0.5;
	~addWebBeepCapacitors.();
	10.wait;
	~beepAmp = 0.8;
	5.wait;
	~beepAmp = 0.5;
	~glissMovement.(\Africa, 10, 0.6, true, false);
	5.wait;
	~glissMovement.(\Asia, 10, 0.4, true, false);
	~glitchSynth.set(\ampLag, 35.0);
	s.sync();
	~glitchSynth.set(\amp, 0.6);
	5.wait;
	~glissMovement.(\Europe, 10, 0.5, true, false);
	5.wait;
	~setBassFilterMax.(0.0);
	~startBassNote.(0.3, 1.0);
	~startSpeedDecimatorNoise.(\speedNoiseSwitchStereo, 30);
	5.wait;
	~stopSpeedDecimatorNoise.();
	8.do({
		~root = (~root + 3) % 53;
		~setBassNote.(~root);
		0.5.wait;
	});
	1.wait;
	~beepAmp = 0.7;
	~setBassFilterMax.(7.0);
	~startBassNote.(0.5, 3.0);
	5.wait;
	~beepAmp = 0.5;
	~setBassFilterMax.(2.0);
	5.wait;
	~root = (~root + 3) % 53;
	~setBassNote.(~root);
	~glissMovement.(\Oceania, 20, 0.8, true, false);
	~startSpeedDecimatorNoise.(\speedNoiseSwitchStereo, 60);
	2.wait;
	~stopSpeedDecimatorNoise.();
	~setBassFilterMax.(4.0);
	8.do({
		~root = (~root + 3) % 53;
		~setBassNote.(~root);
		0.5.wait;
	});
	7.wait;
	~glissMovement.(\Americas, 9, 0.5, true, false);
	7.wait;
	~glissMovement.(\Sweden, 7, 0.3, true, false);
	~setBassFilterMax.(10.0);
	10.wait;
	~glissMovement.(\Sweden, 10, 0.2, true, false);
	~glitchSynth.set(\amp, 0.8);
	8.5.wait;

	~startBassNote.(0.0, 10.0);
	~glitchSynth.set(\ampLag, 10.0);
	s.sync();
	~glitchSynth.set(\amp, 0.00, \lpfCutoff, 3000);
	5.wait;
	~stopBeeps.();
}.fork;
)

~tickChannel.set(\lpfCutoff, 600);