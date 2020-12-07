// =======================================================
// Noise decimated at different sample rates
(
Ndef(\speedNosieDev, {
	var sig, sr = [18, 130, 199, 1000, 1583, 1900, 12500];
	sr = Demand.kr(Dust.kr(0.5), 0, Dxrand(sr, inf));
	sig = Decimator.ar({PinkNoise.ar()}!1, sr, 3);
	sig!2
}).play;
)
Ndef(\speedNosieDev).fadeTime = 2;

(
SynthDef(\speedNoiseSwitchMono, {
	var sig, sr = [18, 130, 199, 1000, 1583, 1900, 12500];
	sr = Demand.kr(\t_switch.kr(0) + Impulse.kr(0), 0, Dxrand(sr, inf));
	sig = Decimator.ar(PinkNoise.ar(), sr, 3);
	sig = sig!2;
	Out.ar(\out.kr(0), sig);
}).add;
SynthDef(\speedNoiseSwitchStereo, {
	var sig, sr = [18, 130, 199, 1000, 1583, 1900, 12500];
	sr = Demand.kr(\t_switch.kr(0) + Impulse.kr(0), 0, Dxrand(sr, inf));
	sig = Decimator.ar({PinkNoise.ar()}!2, sr, 3);
	Out.ar(\out.kr(0), sig);
}).add;
)
a = Synth(\speedNoiseSwitchMono)
a = Synth(\speedNoiseSwitchStereo)
a.set(\t_switch, 1);