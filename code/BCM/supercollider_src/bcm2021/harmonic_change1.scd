// The ~updateHarmony() function is called every tick
// The harmony used by sonification functions is the pitches stored in `~chord`

~initHarmony1 = {
	// Rich chord with harmonic 7
	~ch1 = [120, 43, 0, 31, 57, 137];
	~ch2 = [88, 74, 17, 39, 53, 137];
	~ch3 = [106, 151, 31, 88, 163, 120];
	~ch4 = [57, 163, 43, 74, 106, 180];
	// suspended quality chord
	~ch1 = [22, 93, 0, 9, 71, 53];
	~ch2 = [40, 71, 9, 31, 62, 102];
	~ch3 = [62, 102, 22, 40, 84, 124];
	~ch4 = [84, 124, 31, 53, 93, 115];
	~currentChord = 0;
	~numChords = 2;
	~changeChord = { | num = -1 |
		// if num is -1 then
		if(num == -1, {
			~currentChord = (~currentChord + 1) % ~numChords;
		}, {
			~currentChord = num % ~numChords;
		});

		switch(~currentChord,
			0, {
				~ch1 = [22, 93, 0, 9, 71, 53];
				~ch2 = [40, 71, 9, 31, 62, 102];
				~ch3 = [62, 102, 22, 40, 84, 124];
				~ch4 = [84, 124, 31, 53, 93, 115];
			},
			1, {
				// Rich chord with harmonic 7
				~ch1 = [120, 43, 0, 31, 57, 137];
				~ch2 = [88, 74, 17, 39, 53, 137];
				~ch3 = [106, 151, 31, 88, 163, 120];
				~ch4 = [57, 163, 43, 74, 106, 180];
			}
		);
	};
	~chord = ~ch1 ++ ~ch2 ++ ~ch3 ++ ~ch4;
};

~updateHarmony1 = { |overallActivity|
	var numPitchesPerChord;
	// Update chord
	if(overallActivity > (~maxActivity * 0.5)) {
		if(rrand(0.0, 1.0) > 0.98) {
			~root = ~root + [-8, 0, 9, 17, -22].choose;
			~root = ((~root + 22 - ~baseRoot) % 53) - 22 + ~baseRoot; // bring it back into the range -22 - 31
			~root = ~root;
		};
	};
	if(overallActivity > (~maxActivity * 0.2)) {
		if(rrand(0.0, 1.0) > 0.99) {
			// TODO: Maybe change chord depending on activity instead of cycling through?
			~changeChord.();
		};
	};

	numPitchesPerChord = (overallActivity.linexp(0, ~maxActivity, 3.0, ~ch1.size+2.99)-3.0).asInteger;
	// ("nump: " + numPitchesPerChord).postln;
	~chord = ~ch1[0..numPitchesPerChord] ++ ~ch2[0..numPitchesPerChord] ++ ~ch3[0..numPitchesPerChord] ++ ~ch4[0..numPitchesPerChord];
	~chord = ~chord + ~root;

};