o = OSCFunc({ arg msg, time, addr, recvPort;
	var len = msg[1].asInteger, out = msg[2] == 1, country = msg[3], continent = msg[4];
	// [msg, time, addr, recvPort].postln;
	// ("len: " + len + "out: " + out + " country: " + country + "continent: " + continent).postln;
	Synth(\tick2,
		[
			\freq, rrand(10000, 11000),
			\rq, exprand(0.001, 0.1),
			\out, 0,
			\amp, exprand(0.015, 0.05),
			\atk, 0.001,
			\rel, 0.01, //0.01,
			\pan, rrand(-0.5, 0.5),
		]
	);
}, '/data');
