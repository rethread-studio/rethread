// Drone test


/*
What will the drone reflect?
- number of occurrences of a certain type (image, script, sub_frame, font, stylesheet)
- the prevalence of certain locations(countries)
- the number of different ip addresses contacted in a single frame

Time spans of droney sounds:
1. One full page request (combined data)
2. Average of several page requests i.e. slowly (over several minutes) moving towards the current value

*/

~makeFrame = {
	var frame;
	frame = Environment(know: true);
	frame.locations = Dictionary[];
	frame.ip_addresses = Dictionary[];
	frame.types = Dictionary[];
	frame.numRequests = 0;
	frame.frameSize = 0;
	frame.sameHost = 0;
	frame.differentHost = 0;
	frame.originRatio = 1;
};

~overallStats = Environment(know: true);
~overallStats.currentFrame = ~makeFrame.();
~overallStats.overTime = ~makeFrame.();
~overallStats.overTime.numIPaddresses = 0;


~registerOverallStats = { | ip, location, type, size, hostname |
	var frame_ip = ~overallStats.currentFrame.ip_addresses[ip],
	frame_location = ~overallStats.currentFrame.locations[location],
	frame_type = ~overallStats.currentFrame.types[type];
	if(frame_ip == nil, {
		~overallStats.currentFrame.ip_addresses.add(ip -> 1);
	}, {
		~overallStats.currentFrame.ip_addresses[ip] = frame_ip + 1;
	});

	if(frame_location == nil, {
		~overallStats.currentFrame.locations.add(location -> 1);
	}, {
		~overallStats.currentFrame.locations[location] = frame_location + 1;
	});

	if(frame_type == nil, {
		~overallStats.currentFrame.types.add(type -> 1);
	}, {
		~overallStats.currentFrame.types[type] = frame_type + 1;
	});

	if(hostname == ~overallStats.currentFrame.hostname, {
		~overallStats.currentFrame.sameHost = ~overallStats.currentFrame.sameHost + 1;
		// ("same as hostname, num: " + ~overallStats.currentFrame.sameHost).postln;
	}, {
		~overallStats.currentFrame.differentHost = ~overallStats.currentFrame.differentHost + 1;
		// ("different from hostname: " + hostname + " num: " + ~overallStats.currentFrame.differentHost).postln;
	});

	~overallStats.currentFrame.numRequests = ~overallStats.currentFrame.numRequests + 1;
	~overallStats.currentFrame.originRatio = ~overallStats.currentFrame.sameHost / ~overallStats.currentFrame.numRequests;
	~overallStats.currentFrame.frameSize = ~overallStats.currentFrame.frameSize + size;
};

~updateOverallStatsTick = { | coeff = 0.9999 |
	// Bring the overTime stats closer to the currentFrame
	~mixDictionaries.(~overallStats.currentFrame.ip_addresses, ~overallStats.overTime.ip_addresses, coeff);
	~mixDictionaries.(~overallStats.currentFrame.locations, ~overallStats.overTime.locations, coeff);
	~mixDictionaries.(~overallStats.currentFrame.types, ~overallStats.overTime.types, coeff);

	~overallStats.overTime.numIPaddresses =
	(~overallStats.overTime.numIPaddresses * coeff) + (~overallStats.currentFrame.ip_addresses.size * (1-coeff));
	~overallStats.overTime.numRequests =
	(~overallStats.overTime.numRequests * coeff) + (~overallStats.currentFrame.numRequests * (1-coeff));
	~overallStats.overTime.frameSize =
	(~overallStats.overTime.frameSize * coeff) + (~overallStats.currentFrame.frameSize * (1-coeff));
	~overallStats.overTime.differentHost =
	(~overallStats.overTime.differentHost * coeff) + (~overallStats.currentFrame.differentHost * (1-coeff));
	~overallStats.overTime.sameHost =
	(~overallStats.overTime.sameHost * coeff) + (~overallStats.currentFrame.sameHost * (1-coeff));
};

~mixDictionaries = { | origin, destination, coeff |
	// mix with the origin for the keys that exist in the origin
	origin.keysValuesDo { |key, value|
		var destValue = destination[key];
		if(destValue == nil) { destValue = 0; };
		destination.put(key, (destValue * coeff) + (value * (1-coeff)));
	};
	// simply decrease the values for keys that don't exist in origin (since they would be 0)
	destination.keysValuesChange { |key, value|
		var newValue = value;
		if(origin[key] == nil, {
			newValue = newValue * coeff;
		});
		newValue // the value in the Dictionary gets replaced by the return value
	};
};

~resetCurrentFrame = {
	~overallStats.currentFrame = ~makeFrame.();
};

//////////////////////////////////////////////////////
/////// DRONE
/////////////////////////////////////////////////////

~restartBackgroundDrones = { | numOctaves = 3, minrq = 0.005, maxrq = 0.008, amp = 0.5, brightness = 0, stutterAmount = 0, stutterSpeed = 8, sameness = 0.7 |
	var chord = [~ch1, ~ch2, ~ch3, ~ch4].choose;
	// if(~backgroundDronesStarted == false, {
	~droneBackgroundSynths.do{|syn|
		syn.release
	};
	~droneBackgroundSynths = chord.collect{ |degree|
		var octave = 3 + rrand(numOctaves * -0.5, numOctaves*0.5).round,
		freq = ~s53.degreeToFreq(degree + ~root, 0.midicps, ~octave+octave);
		while({freq > 7000}, {freq = freq * 0.5});
		Synth(\softy_sustained, [
			\freq, freq,
			\atk, rrand(0.6, 2),
			// \rel, rrand(1, 3),
			\rel, 0.1,
			\c0, 2,
			\c1, \sine,
			\minrq, minrq,
			\maxrq, maxrq,
			\brightness, brightness,
			\stutterAmount, stutterAmount,
			\stutterSpeed, stutterSpeed,
			\pan, rrand((1-sameness)*(-1), 1-sameness),
			\amp, 0.2 * amp,
			\out, ~channels.drone.bus]);
	};
	/*}, {
	~droneBackgroundSynths.do{|syn, i|
	var octave = rrand(-1, numOctaves).floor,
	freq = ~s53.degreeToFreq(chord[i] + ~root, 0.midicps, ~octave+octave);
	syn.set(
	\freq, freq,
	\minrq, minrq,
				\maxrq, maxrq,
				\brightness, brightness,
				\stutterAmount, stutterAmount,
				\stutterSpeed, stutterSpeed,
				\pan, rrand(-0.7, 0.7),
				\amp, 0.2 * amp,
			);
		};

	});*/
};

~updateBackgroundDrones = { | minrq = 0.005, maxrq = 0.008, amp = 0.5, brightness = 0, stutterAmount = 0, stutterSpeed = 8, sameness = 0.7 |
	var chord = [~ch1, ~ch2, ~ch3, ~ch4].choose;
	~droneBackgroundSynths.do{|syn|
		syn.set(
			\minrq, minrq,
			\maxrq, maxrq,
			\brightness, brightness,
			\stutterAmount, stutterAmount,
			\stutterSpeed, stutterSpeed,
			\pan, rrand((1-sameness)*(-1), 1-sameness),
			\amp, 0.2 * amp,
		);
	};
};

~backgroundDronesStarted = false;
~lastHarmonicComplexity = 0;
~droneAmpPhase = 1;
~updateDrone = { | timeSinceMainFrame |
	var numOctaves, minrq, maxrq, brightness, stutterAmount, stutterSpeed, amp, numScripts, numXmlHttpRequests, numSubFrames, harmonicComplexity,
	sameness;
	// Sometimes update pitches, sometimes just update other parameters

	// numIPaddresses varies between ~5 and ~150
	// numRequests between ~10 and ~300
	// types[\image] between 1 and ~400, can go much higher on scrolling image sites like pinterest
	// types[\script] between 0 and 90
	// types[\sub_frame] between 0 and 8 (usually 0)
	// types[\xmlhttprequest] between 0 and ~100, (continues up if you scroll or stay on a page)
	// ~overallStats.currentFrame.types[\xmlhttprequest].postln;
	// ~overallStats.currentFrame.frameSize.postln;

	numScripts = ~overallStats.currentFrame.types[\script];
	if(numScripts == nil) { numScripts = 0 };

	numXmlHttpRequests = ~overallStats.overTime.types[\xmlhttprequest];
	if(numXmlHttpRequests == nil) { numXmlHttpRequests = 0 };

	numSubFrames = ~overallStats.currentFrame.types[\sub_frame];
	if(numSubFrames == nil) { numSubFrames = 0 };

	// brightness = numXmlHttpRequests.linlin(1, 100, 0.0, 1.0);
	sameness = 1-(1 - ~overallStats.currentFrame.originRatio).pow(5);
	brightness = sameness.lincurve(0.00, 1, 0.8, 0.0, curve: -6);
	stutterAmount = sameness.linlin(0, 1, 1.0, 0.0);
	stutterSpeed = sameness.lincurve(0.00, 1, 20.0, 2.0, curve: -4);
	// ("brightness: " + brightness + " stutterAmount: " + stutterAmount + " stutterSpeed: " + stutterSpeed).postln;
	numOctaves = ~overallStats.overTime.numIPaddresses.explin(5, 150, 1, 4).round(1);
	numOctaves = 5;
	minrq = numScripts.linlin(0, 90, 0.001, 0.04);
	maxrq = ~overallStats.overTime.numRequests.linlin(10, 300, 0.01, minrq);
	// amp = ~overallStats.currentFrame.frameSize.linlin(0, 10000000, 0.2, 1.0);
	// amp = ((1-timeSinceMainFrame.linlin(0, 15, 0, 1)).pow(4) * pi).sin() * 0.7;
	amp = ((1-~droneAmpPhase).pow(4) * pi).sin() * 0.7;

	// set chord

	harmonicComplexity = numScripts.explin(3, 90, -0.4, ~numChords-0.51).round;
	// ("harmonic complexity: " + harmonicComplexity).postln;
	~changeChord.(harmonicComplexity);

	if(rrand(0.0, 1.0) > 0.92 || (~backgroundDronesStarted == false) || (~lastHarmonicComplexity != harmonicComplexity), {
		~restartBackgroundDrones.(numOctaves, minrq, maxrq, amp, brightness, stutterAmount, stutterSpeed, sameness);
		~backgroundDronesStarted = true;
	}, {
		~updateBackgroundDrones.(minrq, maxrq, amp, brightness, stutterAmount, stutterSpeed, sameness);
	});

	~lastHarmonicComplexity = harmonicComplexity;
};