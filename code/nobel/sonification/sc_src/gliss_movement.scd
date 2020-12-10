
// TODO: Bass dynamics movement
~glissMovement = { | region, totalDuration, out = true |
	var capacitor;
	~glissStartTime = ~now.();
	~glissChordIndex = 0;
	capacitor = ~makeCapacitor.(40, {
		var timeSinceStart = ~now.() - ~glissStartTime,
		duration = totalDuration - timeSinceStart - ~glissFadeOutTime;
		if(duration > 1.5 && ((duration/totalDuration) > 0.7)) {
			~glissGesture.(duration * rrand(0.8, 1.0), out);
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
	totalDuration.wait;
	~clearCapacitors.(\gliss);
};
~startGlissMovementDuringWorld = {
	{
		~glissFadeOutTime = 1.0;
		~glissMovement.(\Sweden, 8, false);
		~glissMovement.(\Europe, 18, false);
		~glissMovement.(\Americas, 15, false);
		~glissMovement.(\Asia, 15, false);
		~glissMovement.(\Oceania, 7, false);
		~glissMovement.(\Africa, 7, false);

		~root = ~root - 8;
		~setBassNote.(~root);
		~glissMovement.(\Sweden, 12);
		~glissMovement.(\Europe, 18);
		~root = ~root + 17;
		~setBassNote.(~root);
		~glissMovement.(\Americas, 15);
		~root = ~root - 3;
		~setBassNote.(~root);
		~glissMovement.(\Asia, 12);
		~root = ~root - 5;
		~setBassNote.(~root);
		~glissMovement.(\Oceania, 7);
		~glissMovement.(\Africa, 7);
	}.fork;
};