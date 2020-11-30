~makeCapacitor = { | charge = 50, trigFunc = {} |
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
				self.frigFunc.value();
			};
		},
	)
};