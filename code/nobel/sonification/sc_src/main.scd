(
~now = { Date.localtime.rawSeconds };

s.waitForBoot({
	~startTime = ~now.();
	~s53 = Scale.chromatic('et53');
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
	~rev = Synth(\medium_reverb, [\in, ~revBus, \out, 0, \mix, 0.15, \rt, 2.0]);

	~decoder = Synth(\decoder, [\in, ~decodeBus, \out, ~revBus]);

	~noiseBuf = Buffer.alloc(s, s.sampleRate * 4, 1);

	s.sync();

	~capacitors = List[];
	"capacitor.scd".loadRelative;

	~allPackets = List[];

	~glitchMinFreq = 2;
	~glitchMaxFreq = 10000;
	~glitchRangeCurve = 80;

	"receive_osc.scd".loadRelative;

	"gestures.scd".loadRelative;
	"gliss_movement.scd".loadRelative;
	"speed_processes.scd".loadRelative;

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

});
)

~glitchSynth = Synth(\loop_buffer, [\bufnum, ~noiseBuf, \out, ~revBus, \amp, 0.7]);
~glitchSynth.set(\amp, 0.2);

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

// ===============================================================
// ===============================================================
// The whole score

// This should mirror the score that controls the graphics
(
{
	~glitchSynth = Synth(\loop_buffer, [\bufnum, ~noiseBuf, \out, ~revBus, \amp, 0.00]);
	~glitchSynth.set(\ampLag, 2.0, \lpfLag, 2.0);
	s.sync();
	~glitchSynth.set(\amp, 0.7, \lpfCutoff, 500);
	2.0.wait;
	~glitchSynth.set(\ampLag, 5, \lpfLag, 6.0);
	s.sync();
	~glitchSynth.set(\amp, 0.04, \lpfCutoff, 5000);
	2.5.wait;
	// ======================================= WORLD
	~startGlissMovementDuringWorld.(); // This will wait internally

	~glitchSynth.set(\ampLag, 3);
	s.sync();
	~glitchSynth.set(\amp, 1.0);
	3.wait;
	~glitchSynth.set(\ampLag, 1.0);
	s.sync();
	~glitchSynth.set(\amp, 0.01);
	1.0.wait;
	// ======================================= NUMBERS
	// TODO: Suddenly stop for a bar between sections
	~startSpeedProcesses.();
	20.wait;
	~startSpeedProcess1.();
	20.wait;
	// ~stopSpeedProceses.();
	~startSpeedDecimatorNoise.(\speedNoiseSwitchMono, 40);
	5.wait;
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
	9.wait;
	~stopSpeedDecimatorNoise.();
	29.5.wait;
	2.wait;
}.fork;
)

