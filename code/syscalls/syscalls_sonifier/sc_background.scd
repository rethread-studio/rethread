(
{
	var sig;
	sig = Resonz.ar(PinkNoise.ar*3, 1000, LFNoise1.kr(0.25).range(0.0001, 0.01));
	sig = Pan2.ar(sig);
	Out.ar(0, sig);
}.play;
)

( // Rising
{
	var sig;
	sig = Resonz.ar(PinkNoise.ar*3, Line.kr(100, 1000, 20), LFNoise1.kr(0.25).range(0.0001, 0.01));
	sig = Pan2.ar(sig);
	Out.ar(0, sig);
}.play;
)
(
{
	var sig;
	sig = Resonz.ar(PinkNoise.ar*3, 50, LFNoise1.kr(0.5).range(0.001, 0.01));
	sig = Pan2.ar(sig);
	Out.ar(0, sig);
}.play;

)