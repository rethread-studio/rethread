// Simple test/starting point for sonification of web traffic data.
// Use the dashboard to route the traffic to the computer this is running on.
// You might need to forward ports if it is not on the same network as the
// dashboard server.
//
// This is a proof of concept for frequnecy analysis of the events/packets.
// It is very inefficient because it has a few hundred synthdefs running
// simultaneously. This can be made much more efficient since the number
// of frequency bins is limited to 16.

// Catch all the packages and do a simple sonification.
(
~now = { SystemClock.seconds; };
s.waitForBoot({
	// SynthDefs written by Eli Fieldsteel, https://sccode.org/1-5bA
	//fm synth
	SynthDef(\fm, {
		arg freq=500, mRatio=1, cRatio=1,
		index=1, iScale=5, cAtk=4, cRel=(-4),
		amp=0.2, atk=0.01, rel=3, pan=0,
		out=0, fx=0, fxsend=(-25);
		var car, mod, env, iEnv;

		//index of modulation
		iEnv = EnvGen.kr(
			Env(
				[index, index*iScale, index],
				[atk, rel],
				[cAtk, cRel]
			)
		);

		//amplitude envelope
		env = EnvGen.kr(Env.perc(atk,rel,curve:[cAtk,cRel]),doneAction:2);

		//modulator/carrier
		mod = SinOsc.ar(freq * mRatio, mul:freq * mRatio * iEnv);
		car = SinOsc.ar(freq * cRatio + mod) * env * amp;

		car = Pan2.ar(car, pan);

		//direct out/reverb send
		Out.ar(out, car);
		Out.ar(fx, car * fxsend.dbamp);
	}).add;

	//reverb
	SynthDef(\reverb, {
		arg in=0, out=0, dec=4, lpf=1500;
		var sig;
		sig = In.ar(in, 2).sum;
		sig = DelayN.ar(sig, 0.03, 0.03);
		sig = CombN.ar(sig, 0.1, {Rand(0.01,0.099)}!32, dec);
		sig = SplayAz.ar(2, sig);
		sig = LPF.ar(sig, lpf);
		5.do{sig = AllpassN.ar(sig, 0.1, {Rand(0.01,0.099)}!2, 3)};
		sig = LPF.ar(sig, lpf);
		sig = LeakDC.ar(sig);
		Out.ar(out, sig);
	}).add;

	~vbus = Bus.audio(s, 2);
	s.sync;

	Synth(\reverb, [\in, ~vbus]);

	~num_packets = 0;
	~last_reset = ~now.();
	~window_time = 0.025; // size of the window in seconds
	// Receive packages of web traffic data
	o = OSCFunc({ arg msg, time, addr, recvPort;
		var timestamp = msg[1],
		local_ip = msg[2],
		remote_ip = msg[3],
		out = msg[4],
		local_location = msg[5],
		remote_location = msg[6],
		len = msg[7].asFloat,
		protocol = msg[8],
		services = msg[9],
		speaker = msg[10],
		local_mac = msg[11],

		freq, mRatio = 2, iScale = 1, rel = len.linexp(1, 2000, 0.01, 2);

		// count the number of packets received
		~num_packets = ~num_packets + 1;

		// Post all the data for every packet:
		// [msg, time, addr, recvPort].postln;

		// Convert out to a boolean
		if(out == \true, { out = true }, { out = false });

		if(out == true) {
			mRatio = 9;
		};

		// Interpret the IP as a float, convert it to midi note numbers and convert that to frequency.
		freq = remote_ip.asFloat.linexp(0.0, 255.255, 48, 72).floor.midicps;

		if(services == \Google, {
			iScale = 2;
			freq = freq * 2;
		});

	}, '/package'); // create the OSCFunc
});
// frequency analysis of the packets
{
	loop {
		// Collect frequency information by counting events over time
		if(~now.() - ~last_reset > ~window_time) {
			// Convert frequency of events to overtones over 70 Hz
			// var freq = ~num_packets.linlin(0, ~window_time * 500, 1.0, 16.0).floor * 70;

			// Convert to packets/second for this window and use that as pitch.
			// This frequency is always a multiple of 1/~window_time.
			var freq = ~num_packets/~window_time;
			("freq: " + freq).postln;
			// Only play the frequency if it is within the audible range
			if(freq > 20 && (freq < 20000), {
				Synth(\fm, [
					\freq, freq,
					\mRatio, 2.0,
					\index, 1.0,
					\iScale,1.0,
					\atk, 0.9,
					\rel, 5.5,
					\amp, 0.01,
					\pan, rrand(-0.25, 0.25),
					\out, 0,
					\fx, ~vbus,
					\fxsend, -30,
				]);
				// ("num_packets: " + ~num_packets).postln;
			});
			// Reset for the next time window.
			~num_packets = 0;
			~last_reset = ~now.();
		};
		0.01.wait;
	}
}.fork;
)
o.free;    // remove the OSCFunc when you are done.