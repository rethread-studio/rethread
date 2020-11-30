~makeCapacitor = { | charge = 50, trigFunc|
	// A Capacitor here is something that is filled up to a certain
	// level before triggering a function.
	(
		charge: 0,
		maxCharge: charge,
		trigFunc: trigFunc,
		registerPacket: { | self |
			self.charge = self.charge + 1;
			if(self.charge >= self.maxCharge) {
				self.charge = self.charge - self.maxCharge;
				self.trigFunc.value();
			};
		},
	)
};

// Create capacitors
~capacitors.add(~makeCapacitor.(500, {
	Synth(\thump, [\freq, [200, 400, 300, 500, 600, 700].choose, \out, ~revBus]);
}));
~capacitors.add(~makeCapacitor.(1000, {
	Synth(\softy, [\freq, [200, 400, 300, 500, 600, 700].choose, \rel, rrand(2, 5), \out, ~revBus]);
}));

~capacitors.add(~makeCapacitor.(100, {
	Synth(\tick2,
		[
			\freq, rrand(5000, 6000),
			\rq, exprand(0.001, 0.1),
			\out, ~revBus,
			\amp, exprand(0.015, 0.05) * 0.2,
			\atk, 0.001,
			\rel, 0.01, //0.01,
			\pan, rrand(-0.5, 0.5),
		]
	);
}));
~capacitors.add(~makeCapacitor.(50, {
	Synth(\tick2,
		[
			\freq, rrand(2500, 3500),
			\rq, exprand(0.001, 0.1),
			\out, ~revBus,
			\amp, exprand(0.015, 0.05) * 0.2,
			\atk, 0.001,
			\rel, 0.01, //0.01,
			\pan, rrand(-0.5, 0.5),
		]
	);
}));
~capacitors.add(~makeCapacitor.(200, {
	Synth(\tick2,
		[
			\freq, rrand(10000, 11000),
			\rq, exprand(0.001, 0.1),
			\out, ~revBus,
			\amp, exprand(0.015, 0.05) * 0.2,
			\atk, 0.001,
			\rel, 0.01, //0.01,
			\pan, rrand(-0.5, 0.5),
		]
	);
}));