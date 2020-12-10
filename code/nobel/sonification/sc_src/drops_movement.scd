~sonificationFunctions = List[];
~addSonificationFunction = { | region = \none, outTest = true |
	~sonificationFunctions.add({ | len, out, local_port, remote_port, country, continent |
		var doPlay = true;
		if(out != outTest) {doPlay = false };
		switch(region,
			\Sweden, { if(country != \Sweden, { doPlay = false }); },
			\Europe, { if(continent != \Europe, { doPlay = false }); },
		);
		if(doPlay) {
			var degree = ~activeChord[~chordIndex] + ~root, freq = ~s53.degreeToFreq(degree, 0.midicps, ~octave);
			if(len > 100 && (len < 1000), {
				Synth(\tick2, [\freq, freq*2, \out, ~revBus, \rq, 0.1, \atk, 0.005, \amp, len/5000, \pan, rrand(-1, 1)]);
			}, {
				if(len < 1000, {
					Synth(\tick2, [\freq, freq*2, \out, ~tapeBus, \rq, 0.001, \atk, 0.01, \amp, len/200000, \pan, rrand(-1, 1)]);
				}, {
					if(len < 100000, {
						Synth(\thump, [\freq, freq, \out, ~tapeBus, \rel, 2, \amp, rrand(0.02, 0.035),\pan, rrand(-1.0, 1.0)]);
					}, {
						if(len < 250000, {
							Synth(\softy, [\freq, freq, \out, ~revBus, \rel, len/100000, \pan, rrand(-0.3, 0.3)]);
						}, {
							var pan = rrand(0.7, 1.0) * [1, -1].choose;
							Synth(\long_sine, [\freq, freq, \out, ~tapeBus, \amp, 1.0, \pan, pan]);
						});
					});
				});
			});
			~incrementChordIndex.();
		};
	});
};
~incrementChordIndex = {
	~chordIndex = ~chordIndex + 1;
	if(~chordIndex >= ~activeChord.size) {
		~chordIndex = 0;
		~activeChord = ~activeChord.scramble;
	};
};
~setChord = { | chord |
	~activeChord = chord.scramble;
	~chordIndex = 0;
};

/*~addSonificationFunction.()
~sonificationFunctions.clear()
~activeChord = ~chordEurope
~activeChord = ~chordAsia
~activeChord = ~chordAmericas
~activeChord = ~chordOceania
~activeChord = ~chordAfrica*/


~startDropsMovement = {
	~root = (~root + 31) % 53;
	~setBassNote.(~root);
	~switchBassSource.(\saw);
	~setChord.(~chordSweden);
	~addSonificationFunction.(\Sweden);
	10.wait;
	~sonificationFunctions.clear();
	~startBassNote.(0.01, 1.0);
	2.wait;
	~startBassNote.(0.1, 10.0);
	~setChord.(~chordEurope);
	~addSonificationFunction.(\Europe);
	14.wait;
	~sonificationFunctions.clear();
	~startBassNote.(0.01, 1.0);
	2.wait;
	~startBassNote.(0.4, 12.0);
	~addSonificationFunction.(\none);
	~setChord.(~chordAsia);
	12.wait;
	~startBassNote.(0.01, 9.0);
	4.wait;
	~sonificationFunctions.clear();
	4.wait;

	~root = (~root + 43) % 53;
	~setBassNote.(~root);

	~startBassNote.(0.2, 3.0);
	~setChord.(~chordSweden);
	~addSonificationFunction.(\Sweden);
	2.wait;
	~startBassNote.(0.1, 1.0);
	3.wait;
	~root = (~root + 43) % 53;
	~setBassNote.(~root);
	5.wait;
	~startBassNote.(0.01, 2.0);
	~sonificationFunctions.clear();
	2.wait;
	~startBassNote.(0.5, 8.0);
	~setChord.(~chordEurope);
	~addSonificationFunction.(\Europe);
	8.wait;
	~startBassNote.(0.01, 8.0);
	6.wait;
	~sonificationFunctions.clear();

	2.wait;
	~startBassNote.(0.3, 15.0);
	~addSonificationFunction.(\none);
	~setChord.(~chordAmericas);
	9.wait;
	~root = (~root + 31) % 53;
	~setBassNote.(~root);
	~startBassNote.(0.0, 10.0);
	10.wait;
	~sonificationFunctions.clear();
	~root = (~root + 31) % 53;
	~setBassNote.(~root);
	3.wait;
}


/*(
{
~startDropsMovement.();
}.fork;
)
~startBassNote.(0.01, 3.0)
*/