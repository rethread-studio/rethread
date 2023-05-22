~s = Scale.chromatic('et53')
~rootFreq = 110;
~s.degreeToFreq(0, ~rootFreq, 0);

(
~htop = [0, 22, 44, 44+22-52, 44+44-52, 44+44+22-52,  [0, 22, 44]+22+22, [9, 22, 44]+22+22+22].flatten+31;
~konqueror = [-53, -22, 17, 48, 62, 53 + 26, 53+31, 26+53, 17 + 53, 53,  62, 40+53, 48 + 53, 17+106];
~gedit = [0, 14, 31, 45, 53, 14, 22, 9, 14, -53, -53-31]+31;
~thunderbird = [0, 22, 31, 53, 62, 22+53, 31+53, 53, 62]+9;

)
[0, 14, 31, 45]+17

(
{ var offset = [0, 5], i = 0;
	loop{
		var synths = List[];
		~htop.do {|degree|
			var freq = ~s.degreeToFreq(degree + offset[i%offset.size], ~rootFreq, 2);
			synths.add({ var trig = Dust.ar(2), sig;
				sig = SinOsc.ar(freq * [1, 1.001]) * 0.05 * Lag.ar(Decay.ar(trig, 1.5), 0.01);
				Out.ar(0, Pan2.ar(sig));
			}.play);
		};
		synths.postln;
		rrand(4, 10).wait;
		synths.do{|syn|syn.release(1)};
		synths = List[];
		i = i + 1;
	}
}.fork;
)


(
{
	{
		~konqueror.do {|degree|
			var freq = ~s.degreeToFreq(degree, ~rootFreq, 1);
			{ var trig = Impulse.ar(0), sig;
				sig = SinOsc.ar(freq * [1, 1.001]) * 0.05 * Lag.ar(Decay.ar(trig, 1.5), 0.01);
				Out.ar(0, Pan2.ar(sig));
			}.play;
			rrand(0.1, 0.5).wait;
		};
	}.loop;
}.fork;
)

(
~gedit.do {|degree|
	var freq = ~s.degreeToFreq(degree, ~rootFreq, 1);
	{ var trig = Dust.ar(2), sig;
		sig = SinOsc.ar(freq * [1, 1.001]) * 0.05 * Lag.ar(Decay.ar(trig, 1.5), 0.01);
		Out.ar(0, Pan2.ar(sig));
	}.play;
};
)

(
~thunderbird.do {|degree|
	var freq = ~s.degreeToFreq(degree, ~rootFreq, 3);
	{ var trig = Dust.ar(2), sig;
		sig = SinOsc.ar(freq * [1, 1.001]) * 0.05 * Lag.ar(Decay.ar(trig, 1.5), 0.01);
		Out.ar(0, Pan2.ar(sig));
	}.play;
};
)




(
{
	{
		~htop.do {|degree|
			var freq = ~s.degreeToFreq(degree, ~rootFreq, 1);
			{ var sig;
				sig = DPW3Tri.ar(freq * [1, 1.001]) * 0.05 * Env.perc(0.01, 1.0).kr(2);
				Out.ar(0, Pan2.ar(sig));
			}.play;
			0.1.wait;
		};
	}.loop;
}.fork;

{
	{
		~konqueror.do {|degree|
			var freq = ~s.degreeToFreq(degree, ~rootFreq, 1);
			{ var trig = Impulse.ar(0), sig;
				sig = Resonz.ar(PinkNoise.ar, freq, 0.005, 50.0*4) * 0.05 * Env.linen(0.2, 0.1, 1.0).kr(2);
				Out.ar(0, Pan2.ar(sig));
			}.play;
			// rrand(0.1, 0.5).wait;
			0.1.wait;
		};
	}.loop;
}.fork;


{
	{
		~gedit.do {|degree|
			var freq = ~s.degreeToFreq(degree, ~rootFreq, 1);
			{ var trig = Impulse.ar(0), sig;
				sig = SinOsc.ar(freq * [1, 1.001]) * 0.05 * Lag.ar(Decay.ar(trig, 1.5), 0.01);
				Out.ar(0, Pan2.ar(sig));
			}.play;
			// rrand(0.1, 0.5).wait;
			0.1.wait;
		};
	}.loop;
}.fork;


{
	{
		~thunderbird.do {|degree|
			var freq = ~s.degreeToFreq(degree, ~rootFreq, 1);
			{ var trig = Impulse.ar(0), sig;
				sig = SinOsc.ar(freq * [1, 1.001]) * 0.05 * Lag.ar(Decay.ar(trig, 1.5), 0.01);
				Out.ar(0, Pan2.ar(sig));
			}.play;
			// rrand(0.1, 0.5).wait;
			0.1.wait;
		};
	}.loop;
}.fork;
)