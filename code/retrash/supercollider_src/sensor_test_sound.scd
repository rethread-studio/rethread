(
SynthDef(\testSound, { | freq = 300 |
	var sig, env;
	env = EnvGen.kr(Env.perc(0.1, 2));
	sig = SinOsc.ar(XLine.ar(6000, freq, 0.05))* 0.5 * env;
	Out.ar(0, sig!2);

}).add;
~sensorStates = false!12;
o = OSCFunc({
	arg msg, time, addr, recvPort;
	if(msg[1] == 0) {
		[msg[1], msg].postln;
	};

	if(msg[2] < 200, {
		if(~sensorStates[msg[1]] == false) {
			Synth(\testSound, [\freq, 300 + ((msg[1]+1)*30)]);
			[msg[1], msg].postln;
		};
		~sensorStates[msg[1]] = true;
	}, {
		~sensorStates[msg[1]] = false;
	});

}, '/touched', nil, 7771);
)
