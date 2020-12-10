~startSpeedProcesses = {
	Pdef(\tick1, Pbind(
		\instrument, \tick2,
		\out, ~tickBus,
		\freq, Pwhite(80, 90),
		\rq, 0.00005,
		\atk, 0.01,
		\rel, 0.2,
		\amp, 0.5,
		\dur, Pseq([2, {1/16}!4].flatten, inf),
	));

	Pdef(\tick2, Pbind(
		\instrument, \tick2,
		\out, ~tickBus,
		\freq, Pwhite(1500, 2000),
		\rq, 0.8,
		\amp, 0.25,
		\dur, Pseq([1/2], inf),
	)).play;

	Pdef(\tick3, Pbind(
		\instrument, \tick2,
		\out, ~tickBus,
		\freq, Pwhite(9000, 11000),
		\amp, 0.125,
		\dur, Pseq([1/4], inf),
	)).play;

	Pdef(\tick4, Pbind(
		\instrument, \tick2,
		\out, ~tickBus,
		\freq, Pwhite(4000, 11000),
		\amp, 0.125,
		\dur, Pseq([1/8], inf),
	)).play;
	Pdef(\tick5, Pbind(
		\instrument, \tick2,
		\out, ~tickBus,
		\freq, Pwhite(2000, 4000),
		\amp, 0.125,
		\dur, Pseq([1/12], inf),
	)).play;
	Pdef(\tick6, Pbind(
		\instrument, \tick2,
		\out, ~tickBus,
		\freq, Pwhite(1000, 2000),
		\amp, 0.125,
		\dur, Pseq([1/16], inf),
	)).play;
	Pdef(\tick7, Pbind(
		\instrument, \tick2,
		\out, ~tickBus,
		\freq, Pwhite(7000, 8000),
		\rel, 0.8,
		\rq, 0.01,
		\amp, 0.125,
		\dur, Pseq([1/5], inf),
	)).play;
	~speedProcessUpdateLoop = Routine({
		loop {
			var activity = (~metrics.numPacketsNow * 0.007).clip(0.0, 1.0), tickAmp = 0.25;
			Pbindef(\tick1, \amp, activity * tickAmp * 16.0 * 4.0);
			Pbindef(\tick2, \amp, activity.pow(1.5) * tickAmp, \atk, activity.pow(1.5) * 0.01);
			Pbindef(\tick3, \amp, activity.pow(2.0) * tickAmp);
			Pbindef(\tick4, \amp, activity.pow(3.0) * tickAmp);
			Pbindef(\tick5, \amp, activity.pow(4.0) * tickAmp);
			Pbindef(\tick6, \amp, activity.pow(5.0) * tickAmp);
			Pbindef(\tick7, \amp, activity.pow(6.0) * tickAmp);
			0.01.wait;
		}
	}).play;
};

~beepOutBus = 0;
~beepAmp = 0.5;
~playBeeps = {
	var cap;
	~highBeeps = 0;
	~lowBeeps = 0;
	~beepUpdateProcess = Routine({
		loop {
			("beep loop " + ~highBeeps + ", " + ~lowBeeps).postln;
			if(~highBeeps > 8, {
				Synth(\beep, [\freq, 10000, \length, 0.4, \out, ~beepOutBus, \amp, ~beepAmp]);
				~highBeeps = ~highBeeps - 32;
			}, {
				if(~highBeeps > 2, {
					Synth(\beep, [\freq, 10000, \out, ~beepOutBus, \amp, ~beepAmp]);
					~highBeeps = ~highBeeps - 4;
				});
			});

			if(~lowBeeps > 1, {
				Synth(\beep, [\freq, 3000, \out, ~beepOutBus, \amp, ~beepAmp]);
				~lowBeeps = ~lowBeeps - 1;
			}, {
			});
			0.125.wait;
		};
	}).play;

	// Add capacitors that update the beeps
	cap = ~makeCapacitor.(2, {
		~lowBeeps = ~lowBeeps + 1;
	});
	cap.setFilter(\port, 23);
	~capacitors.addToDict(cap, \beep);
	cap = ~makeCapacitor.(2, {
		~highBeeps = ~highBeeps + 1;
	});
	cap.setFilter(\port, 53);
	~capacitors.addToDict(cap, \beep);
};

~addAdditionalBeepCapacitors = {
	var cap;
	cap = ~makeCapacitor.(5, {
		~lowBeeps = ~lowBeeps + 1;
	});
	cap.setFilter(\port, 22);
	~capacitors.addToDict(cap, \beep);
	cap = ~makeCapacitor.(5, {
		~lowBeeps = ~lowBeeps + 1;
	});
	cap.setFilter(\port, 6881);
	~capacitors.addToDict(cap, \beep);


	cap = ~makeCapacitor.(10, {
		~highBeeps = ~highBeeps + 1;
	});
	cap.setFilter(\port, 3478);
	~capacitors.addToDict(cap, \beep);
};

~addWebBeepCapacitors = {
	var cap;
	cap = ~makeCapacitor.(7, {
		~lowBeeps = ~lowBeeps + 1;
	});
	cap.setFilter(\port, 80);
	~capacitors.addToDict(cap, \beep);
	cap = ~makeCapacitor.(10, {
		~highBeeps = ~highBeeps + 1;
	});
	cap.setFilter(\port, 443);
	~capacitors.addToDict(cap, \beep);
};

~stopBeeps = {
	~beepUpdateProcess.stop();
	~clearCapacitors.(\beep);
};

~startSpeedProcess1 = {
	Pdef(\tick1).play;
};

~stopSpeedProceses = {
	~speedProcessUpdateLoop.stop();
	Pdef(\tick1).stop;
	Pdef(\tick2).stop;
	Pdef(\tick3).stop;
	Pdef(\tick4).stop;
	Pdef(\tick5).stop;
	Pdef(\tick6).stop;
	Pdef(\tick7).stop;
};

~startSpeedDecimatorNoise = { | variant = \speedNoiseSwitchMono, limit = 90 |
	~speedDecimatorOn = false;
	if(~speedDecimatorNoiseUpdateLoop != nil) {
		~speedDecimatorNoiseUpdateLoop.stop();
	};
	~speedDecimatorNoiseUpdateLoop = Routine({
		loop {
			if(~metrics.numPacketsNow > limit, {
				if(~speedDecimatorOn == false) {
					~speedDecimatorOn = true;
					if(~speedDecimatorSynth != nil) {
						~speedDecimatorSynth.free;
					};
					~speedDecimatorSynth = Synth(variant, [\amp, 0.2]);
					~decimatorNoiseModulator = Routine({
						var activity = ((~metrics.numPacketsNow - limit) / 40).clip(0, 1);
						~speedDecimatorSynth.set(\t_switch, 1);
						activity.linlin(0, 1, 0.3, 0.05).wait;

					}).play;
				};
			}, {
				if(~speedDecimatorOn == true) {
					~speedDecimatorOn = false;
					~decimatorNoiseModulator.stop(); ~decimatorNoiseModulator.reset();
					~speedDecimatorSynth.free;
				};
			});
			0.01.wait;
		}
	}).play;
};

~stopSpeedDecimatorNoise = {
	if(~speedDecimatorSynth != nil) {
		~speedDecimatorSynth.free;
	};
	~speedDecimatorNoiseUpdateLoop.stop();
	~decimatorNoiseModulator.stop();
};

~startSpeedRandomCutoff = {
	~speedRandomCutoffRoutine = Routine({
		loop {
			~tickChannel.set(\lpfCutoff, rrand(3000, 12000));
			rrand(0.1, 0.25).wait;
		}
	}).play;
};
~stopSpeedRandomCutoff = {
	~speedRandomCutoffRoutine.stop();
};

/*
~playBeeps.()
~stopBeeps.()
~addAdditionalBeepCapacitors.()
~addWebBeepCapacitors.()
*/