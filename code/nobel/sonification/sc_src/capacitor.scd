~makeCapacitor = { | charge = 50, trigFunc|
	// A Capacitor here is something that is filled up to a certain
	// level before triggering a function.
	(
		charge: 0,
		maxCharge: charge,
		exhaust: true,
		trigFunc: trigFunc,
		filter: nil,
		filterValue: nil,
		registerPacket: { | self, country, continent, port1, port2 |
			var doRegisterPacket = false;
			if(self.filter == nil, {
				doRegisterPacket = true;
			}, {
				switch(self.filter,
					\country, {
						if(country == self.filterValue) {
							doRegisterPacket = true;
						};
					},
					\continent, {
						if(continent == self.filterValue) {
							doRegisterPacket = true;
						};
					},
					\port, {
						if(port1 == self.filterValue
							|| (port2 == self.filterValue)
						) {
							doRegisterPacket = true;
						};
					},
				);
			});
			if(doRegisterPacket == true, {
				self.charge = self.charge + 1;
				if(self.charge >= self.maxCharge) {
					if(self.exhaust == true) {
						self.maxCharge = self.maxCharge * 1.03;
					};
					self.charge = self.charge - self.maxCharge;
					self.trigFunc.value();
					// ("capacitor fired, new maxCharge: " + self.maxCharge).postln;
				};
			});
		},
		setFilter: { | self, filterType, filterValue |
			self.filter = filterType;
			self.filterValue = filterValue;
		},
	)
};

~clearCapacitors = { | type = \default |
	if(type == \default, {
		~capacitors = Environment.new(know: true);
		~capacitors.dict = Dictionary[];
		~capacitors.addToDict = { | self, capacitor, key = \default |
			var list = self.dict.at(key);
			if(list == nil, {
				list = List[];
				list.add(capacitor);
				self.dict.put(key, list);
			}, {
				list.add(capacitor);
			});
		};
	}, {
		~capacitors.dict.put(type, List[]);
	});

};

~addTestCapacitors = {
	// Create capacitors
	~capacitors.addToDict(~makeCapacitor.(500, {
		Synth(\thump, [\freq, [200, 400, 300, 500, 600, 700].choose, \out, ~revBus]);
	}));
	~capacitors.addToDict(~makeCapacitor.(1000, {
		Synth(\softy, [\freq, [200, 400, 300, 500, 600, 700].choose, \rel, rrand(2, 5), \out, ~revBus]);
	}));

	~capacitors.addToDict(~makeCapacitor.(100, {
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
	~capacitors.addToDict(~makeCapacitor.(50, {
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
	~capacitors.addToDict(~makeCapacitor.(200, {
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
};