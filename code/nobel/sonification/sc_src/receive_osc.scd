
f = File.new("osc_log.txt".resolveRelative, "w");
o = OSCFunc({ arg msg, time, addr, recvPort;
	var len = msg[1].asInteger,
	out = msg[2] == 1,
	local_port = msg[3],
	remote_port = msg[4],
	country = msg[5],
	continent = msg[6];
	~allPackets.add(msg);
	// [msg, time, addr, recvPort].postln;
	// f.write("len: " + len + "out: " + out + " country: " + country + "continent: " + continent + "\n");
	/*Synth(\tick2,
		[
			\freq, rrand(10000, 11000),
			\rq, exprand(0.001, 0.1),
			\out, 0,
			\amp, exprand(0.015, 0.05) * 0.2,
			\atk, 0.001,
			\rel, 0.01, //0.01,
			\pan, rrand(-0.5, 0.5),
		]
	);*/
	~capacitors.do{|cap|
		cap.registerPacket();
	};
	// Synth(\write_noise, [\bufnum, ~noiseBuf, \len, len, \time, ~now.() - ~startTime]);
	Synth(\write_noise2, [\bufnum, ~noiseBuf, \len, len, \time, ~now.() - ~startTime, \minFreq, ~glitchMinFreq, \maxFreq, ~glitchMaxFreq, \rangeCurve, ~glitchRangeCurve]);
}, '/data');
