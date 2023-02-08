~glitches = (
	bleepbloop: {
		Ndef(\glitch,{
			var length = 48000*1.0, seq = Demand.ar(Impulse.ar(0.05), 0, Dseq([[0, length, 100], [length, 0, 2000]], inf)), read_phase, reader, reader2, buffer,
			freq = LFNoise0.ar(2).range(500, 5000), sig;
			buffer=LocalBuf(length,2).clear;
			read_phase = LFNoise1.ar(20.5).range(0, length);
			// read_phase = Phasor.ar(Dust.ar(2), 1.0, 0.0, length, LFNoise1.kr(3).range(0, length));

			reader=BufRd.ar(2, buffer, read_phase)*0.7;
			reader2=BufRd.ar(2, buffer, length-read_phase-1)*0.7;

			r=LFNoise0.ar(0.01).unipolar;
			BufWr.ar(
				SinOsc.ar(freq, 0, Decay.ar(Impulse.ar(0.125), 1, 0.5))+((reader + reader2)*0.7),
				buffer,
				(LFNoise1.ar(0.5+LFPulse.ar([0.0125, 0.013], 0, 0.9, 0.01))+1)*(length/2)
			);
			BufWr.ar(
				SinOsc.ar(LFNoise1.ar(0.2).range(500, 5000), 0, Decay.ar(Impulse.ar(0.125), 2, 0.5)),
				buffer,
				(LFNoise1.ar(0.4+LFPulse.ar([0.0125, 0.013], 0, 0.9, 0.01))+1)*(length/2)
			);
			sig = (reader).tanh;
			sig
		});
	},
	mechabirds: {
		Ndef(\glitch,{
			var length = 48000*3.0, seq = Demand.ar(Impulse.ar(0.05), 0, Dseq([[0, length, 100], [length, 0, 2000]], inf)), read_phase, reader, reader2, buffer,
			freq = LFNoise1.ar(2).range(500, 5000), sig;
			buffer=LocalBuf(length,2).clear;
			read_phase = LFNoise1.ar(2.5).range(0, length);
			// read_phase = Phasor.ar(Dust.ar(2), 1.0, 0.0, length, LFNoise1.kr(3).range(0, length));

			reader=BufRd.ar(2, buffer, read_phase)*0.7;
			reader2=BufRd.ar(2, buffer, length-read_phase-1)*0.7;

			r=LFNoise0.ar(0.01).unipolar;
			BufWr.ar(
				SinOsc.ar(freq, 0, Decay.ar(Impulse.ar(0.125), 1, 0.5))+((reader + reader2)*0.7),
				buffer,
				(LFNoise1.ar(0.5+LFPulse.ar([0.0125, 0.013], 0, 0.9, 0.01))+1)*(length/2)
			);
			BufWr.ar(
				SinOsc.ar(LFNoise1.ar(0.2).range(500, 5000), 0, Decay.ar(Impulse.ar(0.125), 2, 0.5)),
				buffer,
				(LFNoise1.ar(0.4+LFPulse.ar([0.0125, 0.013], 0, 0.9, 0.01))+1)*(length/2)
			);
			sig = (reader).tanh;
			sig
		});
	},
	rain: {
		Ndef(\glitch,{
			var length = 48000*1.0, seq = Demand.ar(Impulse.ar(0.05), 0, Dseq([[0, length, 100], [length, 0, 2000]], inf)), read_phase, reader, reader2, buffer,
			freq = LFNoise0.ar(2).range(500, 5000), sig;
			buffer=LocalBuf(length,2).clear;
			read_phase = LFNoise1.ar(200.5).range(0, length);
			// read_phase = Phasor.ar(Dust.ar(2), 1.0, 0.0, length, LFNoise1.kr(3).range(0, length));

			reader=BufRd.ar(2, buffer, read_phase)*0.7;
			reader2=BufRd.ar(2, buffer, length-read_phase-1)*0.7;

			r=LFNoise0.ar(0.01).unipolar;
			BufWr.ar(
				SinOsc.ar(freq, 0, Decay.ar(Impulse.ar(0.125), 1, 0.5))+((reader + reader2)*0.7),
				buffer,
				(LFNoise1.ar(0.5+LFPulse.ar([0.0125, 0.013], 0, 0.9, 0.01))+1)*(length/2)
			);
			BufWr.ar(
				SinOsc.ar(LFNoise1.ar(0.2).range(500, 5000), 0, Decay.ar(Impulse.ar(0.125), 2, 0.5)),
				buffer,
				(LFNoise1.ar(0.4+LFPulse.ar([0.0125, 0.013], 0, 0.9, 0.01))+1)*(length/2)
			);
			sig = (reader).tanh;
			sig
		});
	},
	rain2: {
		Ndef(\glitch,{
			var length = 48000*1.0, seq = Demand.ar(Impulse.ar(0.05), 0, Dseq([[0, length, 100], [length, 0, 2000]], inf)), read_phase, reader, reader2, buffer,
			freq = LFNoise0.ar(2).range(500, 5000), sig;
			buffer=LocalBuf(length,2).clear;
			read_phase = LFNoise1.ar(200.5).range(0, length);
			// read_phase = Phasor.ar(Dust.ar(2), 1.0, 0.0, length, LFNoise1.kr(3).range(0, length));

			reader=BufRd.ar(2, buffer, read_phase)*0.7;
			reader2=BufRd.ar(2, buffer, length-read_phase-1)*0.7;

			r=LFNoise0.ar(0.01).unipolar;
			BufWr.ar(
				SinOsc.ar(freq, 0, Decay.ar(Impulse.ar(0.125), 1, 0.5))+((reader + reader2)*0.7),
				buffer,
				(LFNoise1.ar(0.5+LFPulse.ar([0.0125, 0.013], 0, 0.9, 0.01))+1)*(length/2)
			);
			BufWr.ar(
				SinOsc.ar(LFNoise1.ar(0.2).range(500, 5000), 0, Decay.ar(Impulse.ar(0.125), 2, 0.5)),
				buffer,
				(LFNoise1.ar(0.4+LFPulse.ar([0.0125, 0.013], 0, 0.9, 0.01))+1)*(length/2)
			);
			sig = (reader).tanh;
			sig
		});
	}
);
~glitches.rain2.();
Ndef(\glitch_out, {
	var out = 0, delayTime = 0.1, amp = 1, mix = 0.4, rt = 3.0, feedback = 0.3, size = 0.7, damp = 0.65, diff = 0.6,
	sig, wet;

	sig = Ndef(\glitch).ar() * LFNoise1.kr(LFNoise1.kr(1).range(0.03, 1)).range(0.2, 1.0);
	/*wet = JPverb.ar(sig, rt, 0.9, 4.0, 0.8);
	wet = GVerb.ar(sig, 300, 3, 0.43, 0.51, 15, -5.dbamp, -26.dbamp, -20.dbamp);*/
	wet = Greyhole.ar(sig, delayTime, damp, size, diff, feedback);

	sig = (sig * (1-mix)) + (wet*mix);
	sig = Limiter.ar(sig, 0.95) * 0.30;
	sig = LeakDC.ar(sig);
	sig
}).play(out: ~mainBus.index, group: ~glitchGroup);