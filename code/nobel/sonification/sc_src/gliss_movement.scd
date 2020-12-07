
~glissMovement = { | region, totalDuration, out = true |
	var capacitor;
	~glissStartTime = ~now.();
	~glissChordIndex = 0;
	capacitor = ~makeCapacitor.(40, {
		var timeSinceStart = ~now.() - ~glissStartTime,
		duration = totalDuration - timeSinceStart - ~glissFadeOutTime;
		if(duration > 1.0) {
			~glissGesture.(duration * rrand(0.5, 1.0), out);
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
			capacitor.exhaust = true;
		},
		\Africa, {
			~activeChord = ~chordAfrica;
			capacitor.setFilter(\continent, \Africa);
			capacitor.maxCharge = 1;
			capacitor.exhaust = true;
		},
		\Asia, {
			~activeChord = ~chordAsia;
			capacitor.setFilter(\continent, \Asia);
			capacitor.maxCharge = 10;
		},
	);
	~activeChord = ~activeChord.scramble;
	~capacitors.add(capacitor);
	("Started gliss for region " ++ region).postln;
	totalDuration.wait;
	~clearCapacitors.();
};
~startGlissMovementDuringWorld = {
	~glissFadeOutTime = 1.0;
	~glissMovement.(\Sweden, 8, false);
	~glissMovement.(\Europe, 18, false);
	~glissMovement.(\Americas, 15, false);
	~glissMovement.(\Asia, 15, false);
	~glissMovement.(\Oceania, 7, false);
	~glissMovement.(\Africa, 7, false);

	~glissMovement.(\Sweden, 12);
	~glissMovement.(\Europe, 18);
	~glissMovement.(\Americas, 15);
	~glissMovement.(\Asia, 12);
	~glissMovement.(\Oceania, 7);
	~glissMovement.(\Africa, 7);
};
