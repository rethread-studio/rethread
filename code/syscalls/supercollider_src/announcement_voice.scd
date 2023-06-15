(
SynthDef(\grain_voice_mvt,
	{ | bufnum, envbuf, rate_min = 0.9 | var sig, pan = 0, pos, cutfreq = [350, 1000, 100];
		sig = SoundIn.ar(0);
		sig = PitchShift.ar(sig, 0.2, [1.0, 0.875, 0.75], 0.01, 0.01);
		sig = Mix(sig * [1.0, 0.5, 0.25]);
		//sig = PlayBuf.ar(1, bufnum, BufRateScale.ir(bufnum));
		sig = LPF.ar(sig, 4000);
		sig = HPF.ar(sig, 100);
		sig = BPeakEQ.ar(sig, 1500, 0.2, 10);
		cutfreq.do{|cut|
			sig = BPeakEQ.ar(sig, cut, 0.8, -10);
		};
		sig = (sig * 0.5) + (FreeVerb.ar(sig, 0.2) * 0.5);
		sig = (sig*0.5) + (sig * (Demand.kr(Dust.kr(LFNoise1.kr(1/2).range(5, 20)) + Impulse.kr(0), 0, Dseq([1, 0], inf))) * 0.5);
		// sig = sig * LFNoise2.kr(1).range(0.1, 1.0);
		sig = Pan2.ar(sig * 1);
		sig = (sig!2).flatten;

		Out.ar(0, sig);
}).add;
)