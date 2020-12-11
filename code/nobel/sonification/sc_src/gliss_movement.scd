
// TODO: Bass dynamics movement
~glissMovement = { | region, totalDuration, ampMod = 0.7, out = true, doWait = true |
	var capacitor;
	~glissStartTime = ~now.();
	~glissChordIndex = 0;
	capacitor = ~makeCapacitor.(40, {
		var timeSinceStart = ~now.() - ~glissStartTime,
		duration = totalDuration - timeSinceStart - ~glissFadeOutTime;
		if(duration > 1.5 && ((duration/totalDuration) > 0.7)) {
			~glissGesture.(duration * rrand(0.8, 1.0), out, ampMod);
		};
	});
	switch(region,
		\Sweden, {
			~activeChord = ~chordSweden;
			capacitor.setFilter(\country, \Sweden);
		},
		\Europe, {
			~activeChord = ~chordEurope;
			capacitor.setFilter(\continent, \Europe);
		},
		\Americas, {
			~activeChord = ~chordAmericas;
			capacitor.setFilter(\continent, \Americas);
		},
		\Oceania, {
			~activeChord = ~chordOceania;
			capacitor.setFilter(\continent, \Oceania);
			capacitor.maxCharge = 1;
			capacitor.exhaust = false;
		},
		\Africa, {
			~activeChord = ~chordAfrica;
			capacitor.setFilter(\continent, \Africa);
			capacitor.maxCharge = 1;
			capacitor.exhaust = false;
		},
		\Asia, {
			~activeChord = ~chordAsia;
			capacitor.setFilter(\continent, \Asia);
			capacitor.maxCharge = 10;
		},
	);
	~activeChord = ~activeChord.scramble;
	~capacitors.addToDict(capacitor, \gliss);
	("Started gliss for region " ++ region).postln;
	if(doWait, {
		totalDuration.wait;
		~clearCapacitors.(\gliss);
	}, {
		{
			totalDuration.wait;
			~clearCapacitors.(\gliss);
		}.fork;
	});
};
~startGlissMovementDuringWorld = {
	{
		~glissFadeOutTime = 1.0;
		~glissMovement.(\Sweden, 8, 0.5, false);
		~glissMovement.(\Europe, 18, 0.6, false);
		~glissMovement.(\Americas, 15, 0.8, false);
		~glissMovement.(\Asia, 15, 0.5, false);
		~glissMovement.(\Oceania, 7, 0.9, false);
		~glissMovement.(\Africa, 7, 0.6, false);

		~root = ~root - 8;
		~setBassNote.(~root);
		~glissMovement.(\Sweden, 12, 0.4);
		~glissMovement.(\Europe, 18, 0.6);
		~root = ~root + 17;
		~setBassNote.(~root);
		~glissMovement.(\Americas, 15, 0.5);
		~root = ~root - 3;
		~setBassNote.(~root);
		~glissMovement.(\Asia, 12, 0.8);
		~root = ~root - 5;
		~setBassNote.(~root);
		~glissMovement.(\Oceania, 7, 0.9);
		~glissMovement.(\Africa, 7, 0.6);
	}.fork;
};