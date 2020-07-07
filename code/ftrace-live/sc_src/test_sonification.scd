NetAddr.langPort;

(
SynthDef(\tick2, {
	var sig, env, rq = \rq.kr(0.1);
	env = Env.perc(\atk.kr(0), \rel.kr(0.05)).ar(2);
	sig = Impulse.ar(0);
	sig = sig * 0.5;
	sig = RHPF.ar(sig, \freq.kr(1000), rq) * env;
	sig = Pan2.ar(sig, \pan.kr(0)) * \amp.kr(1.0);
	Out.ar(\out.kr(0), sig);
}).add;
o = OSCFunc({ arg msg, time, addr, recvPort;
	// [msg, time, addr, recvPort].postln;
	var timestamp = msg[1],
	event = msg[2],
	freq = ((event.asString.size * 1157) % 10000) + 100;

	Synth(\tick2, [\freq, freq, \rq, 0.001, \amp, 0.1, \rel, 2]);

}, '/ftrace', n);
)
o.free;


OSCFunc.trace(true); // Turn posting on
OSCFunc.trace(false); // Turn posting off





b = NetAddr.new("127.0.0.1", 7771);    // create the NetAddr
b.sendMsg("/hello", "there");    // send the application the message "hello" with the parameter "there"