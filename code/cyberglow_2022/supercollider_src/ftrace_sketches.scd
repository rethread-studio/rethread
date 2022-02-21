Synth(\tick2, [\freq, 11000, \rq, 0.01, \atk, 0.00, \rel, 0.01])
Synth(\tick3, [\freq, 11000, \rq, 0.01, \atk, 0.00, \rel, 0.01])
Synth(\dist_noise, [\freq, 12500, \rel, 0.25, \lpf, 8000])
Synth(\dist_noise, [\freq, 3000, \rel, 0.25, \lpf, 8000])
Synth(\kick, [\freq, 55, \glissf, 0.7, \clickAdd, 100])

~outBus = 0;

(
// with reverb
~outBus = Bus.audio(s, 2);
~rev = Synth(\medium_reverb, [\in, ~outBus, \mix, 0.1]);

)

(

Pdef(\t2_1, Pbind(\instrument, \tick2,
	\freq, Pwhite(10000, 12000),
	\rq, 0.01,
	\dur, Prand([0.125, 0.25, 0.5, Pseq([0.33, 0.33, 0.33]*0.125)], inf),
	\out, ~outBus
)).play;


Pdef(\t3_1, Pbind(\instrument, \tick3,
	\freq, Pwrand([Pwhite(9000, 12000, 1), Pwhite(7000, 10000, 1)], [10, 1], inf),
	\rq, 0.01,
	\dur, Pseq([0.125*0.9, Prand([0.25, 0.5], inf)]),
	\pan, Prand([-1, 1], inf),
	\out, ~outBus
)).play;

Pdef(\t3_2, Pbind(\instrument, \tick3,
	\freq, Pwrand([Pwhite(5000, 5500, 1), Pwhite(14000, 15000, 1)], [10, 1], inf),
	\rq, 0.01,
	\dur, Pseq([0.25*0.97, Prand([0.25, 0.5], inf)]),
	\pan, Prand([-1, 1], inf),
	\out, ~outBus
)).play;

)
Pdef(\t2_1).stop
Pdef(\t3_1).stop
Pdef(\t3_2).stop

(

Pdef(\dn1, Pbind(\instrument, \dist_noise,
	\freq, Pwhite(12000, 12500),
	\dur, Prand([0.5, 1, 1.25, 3, 4], inf),
	\rel, Pwhite(0.05, 0.25),
	\out, ~outBus
)).play;

Pdef(\dn2, Pbind(\instrument, \dist_noise,
	\freq, Pwhite(9000, 10000),
	\dur, Prand([0.5, 1, 1.25, 3, Pseq([0.33, 0.33, 0.33]), Pseq([0.25, 0.5, 0.25]), Pseq([0.25, 0.25, 0.125, 0.375])], inf),
	\rel, Pwhite(0.01, 0.03),
	\out, ~outBus
)).play;

Pdef(\dn3, Pbind(\instrument, \dist_noise,
	\freq, Pwhite(5000, 5100),
	\dur, Prand([0.5, 1, 1.25, 3, Pseq([0.33, 0.33, 0.33]*0.25)], inf),
	\rel, Pwhite(0.02, 0.05),
	\amp, 0.1,
	\out, ~outBus
)).play;

)
(
Pdef(\kick, Pbind(\instrument, \kick,
	\freq, 40,
	\glissf, 0.8,
	\dur, Prand([0.25, 0.5, 1], inf),
	\rel, 0.5,
	\amp, 1.0,
	\out, 0
)).play;
)
(
Pdef(\kick, Pbind(\instrument, \kick,
	\sinfreq, 120,
	\glissf, Pwhite(0.3,0.4),
	\dur, Prand([0.25, 0.5, 1], inf),
	\atk, 0.001,
	\att, 0.01,
	\rel, 0.3,
	\amp, 0.1,
	\out, ~outBus,
)).play;
)
Pdef(\kick).stop
(
Pdef(\dn4, Pbind(\instrument, \dist_noise,
	\freq, Pwhite(14000, 15000),
	\dur, Prand([1, 1.25, 3, 2.5], inf),
	\rel, Pwhite(0.3, 1.0),
	\amp, 0.1,
	\out, ~outBus
)).play;
)
(
Pdef(\dn4, Pbind(\instrument, \dist_noise,
	\freq, Pwhite(19000, 19100),
	\dur, Prand([3, 2.5, 5, 6, 7], inf),
	\rel, Pwhite(1.0, 3.0),
	\amp, 0.1,
	\out, ~outBus
)).play;
)