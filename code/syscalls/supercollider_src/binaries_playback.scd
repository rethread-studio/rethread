(
// Load sound files
var path = PathName("/home/erik/Musik/syscalls_binaries");
~binaries = Dictionary.new;
path.files.do{|path| path.fileName.postln;
	path.extension.postln;
	if(path.extension == "wav", {
	~binaries.add(path.fileName.asSymbol ->
			Buffer.readChannel(s, path.fullPath, channels: [0]));
	});
};

SynthDef(\binary_playbuf, {
	var sig, env;
	env = EnvGen.kr(Env([0, 1, 1, 0], [0.05, \length.kr(0.1), 0.05]), doneAction: 2);
	sig = PlayBuf.ar(1, \buf.kr(0), doneAction: 2)*env;
	Out.ar(\out.kr(0), Pan2.ar(sig));
}).add;
)
/*(
~binaries.values[0].play
)*/
~binaries["thunderbird_8bit.wav".asSymbol].play

(
OSCdef(\play_peak_binary, { arg msg, time, addr, recvPort;
	var length = msg[1].asFloat,
	// file = ~binaries.values.choose;
	file = ~binaries["thunderbird_8bit.wav".asSymbol];
	Synth(\binary_playbuf, [\buf, file, \length, length]);

}, '/peak_binary', nil);
)


