/*


// Clarendon: adds light to lighter areas and dark to darker areas
module.exports.clarendon = (pixels) => {
pixels = filters.brightness.apply(this, [pixels, 0.1]);
pixels = filters.contrast.apply(this, [pixels, 0.1]);
pixels = filters.saturation.apply(this, [pixels, 0.15]);
return pixels;
};



/* adj should be -1 (darker) to 1 (lighter). 0 is unchanged. */
module.exports.brightness = (pixels, adj) => {
let d = pixels.data;
adj = (adj > 1) ? 1 : adj;
adj = (adj < -1) ? -1 : adj;
adj = ~~(255 * adj);
for (let i = 0; i < d.length; i += 4) {
d[i] += adj;
d[i + 1] += adj;
d[i + 2] += adj;
}
return pixels;
};


// Contrast - the adj value should be -1 to 1
module.exports.contrast = (pixels, adj) => {
adj *= 255;
let d = pixels.data;
let factor = (259 * (adj + 255)) / (255 * (259 - adj));
for (let i = 0; i < d.length; i += 4) {
d[i] = factor * (d[i] - 128) + 128;
d[i + 1] = factor * (d[i + 1] - 128) + 128;
d[i + 2] = factor * (d[i + 2] - 128) + 128;
}
return pixels;
};


// perceived saturation (faster) - adj should be -1 (desaturated) to positive number. 0 is unchanged
module.exports.saturation = (pixels, adj) => {
let d = pixels.data;
adj = (adj < -1) ? -1 : adj;
for (let i = 0; i < d.length; i += 4) {
let r = d[i], g = d[i + 1], b = d[i + 2];
let gray = 0.2989*r + 0.5870*g + 0.1140*b; //weights from CCIR 601 spec
d[i] = -gray * adj + d[i] * (1 + adj);
d[i + 1] = -gray * adj + d[i + 1] * (1 + adj);
d[i + 2] = -gray * adj + d[i + 2] * (1 + adj);
}
return pixels;
};

*/

(
~brightness = { | tick_time, pixels |
	/*
	/* adj should be -1 (darker) to 1 (lighter). 0 is unchanged. */
	module.exports.brightness = (pixels, adj) => {
	let d = pixels.data;
	adj = (adj > 1) ? 1 : adj;
	adj = (adj < -1) ? -1 : adj;
	adj = ~~(255 * adj);
	for (let i = 0; i < d.length; i += 4) {
	d[i] += adj;
	d[i + 1] += adj;
	d[i + 2] += adj;
	}
	return pixels;
	};
	*/

	// clamp `adj` to -1 =.= 1 and convert to +- 255 as an integer.
	~sounds.clamp.();
	tick_time.wait;
	pixels.do{ | i |
		// add the `adj` value to each pixel
		~sounds.adding.();
		tick_time.wait;
		~sounds.adding.();
		tick_time.wait;
		~sounds.adding.();
		tick_time.wait
	};
};

~contrast = { | tick_time, pixels |
	var third_tick = tick_time/3;
	/*
	// Contrast - the adj value should be -1 to 1
	module.exports.contrast = (pixels, adj) => {
	adj *= 255;
	let d = pixels.data;
	let factor = (259 * (adj + 255)) / (255 * (259 - adj));
	for (let i = 0; i < d.length; i += 4) {
	d[i] = factor * (d[i] - 128) + 128;
	d[i + 1] = factor * (d[i + 1] - 128) + 128;
	d[i + 2] = factor * (d[i + 2] - 128) + 128;
	}
	return pixels;
	};
	*/

	~sounds.multiply.();
	tick_time.wait;
	// map -1 <-> 1 to ~0.9922 <-> ~1.0078
	~sounds.multiply.(); ~sounds.multiply.(); ~sounds.adding.(); ~sounds.subtract.(); ~sounds.divide.();
	pixels.do{ | i |
		~sounds.subtract.(); third_tick.wait; ~sounds.multiply.(); third_tick.wait; ~sounds.adding.(); third_tick.wait;
		~sounds.subtract.(); third_tick.wait; ~sounds.multiply.(); third_tick.wait; ~sounds.adding.(); third_tick.wait;
		~sounds.subtract.(); third_tick.wait; ~sounds.multiply.(); third_tick.wait; ~sounds.adding.(); third_tick.wait;
	};
};

~saturation = { | tick_time, pixels |
	var fourth_tick = tick_time/4;
	/*
	// perceived saturation (faster) - adj should be -1 (desaturated) to positive number. 0 is unchanged
	module.exports.saturation = (pixels, adj) => {
	let d = pixels.data;
	adj = (adj < -1) ? -1 : adj;
	for (let i = 0; i < d.length; i += 4) {
	let r = d[i], g = d[i + 1], b = d[i + 2];
	let gray = 0.2989*r + 0.5870*g + 0.1140*b; //weights from CCIR 601 spec
	d[i] = -gray * adj + d[i] * (1 + adj);
	d[i + 1] = -gray * adj + d[i + 1] * (1 + adj);
	d[i + 2] = -gray * adj + d[i + 2] * (1 + adj);
	}
	return pixels;
	};
	*/

	~sounds.clamp.();
	tick_time.wait;
	pixels.do{ | i |
		// calculate the grey value
		~sounds.multiply.(); tick_time.wait; ~sounds.multiply.(); tick_time.wait; ~sounds.multiply.(); tick_time.wait;
		~sounds.adding.(); tick_time.wait; ~sounds.adding.(); tick_time.wait;

		// apply the saturation
		~sounds.adding.(); fourth_tick.wait; ~sounds.multiply.(); fourth_tick.wait; ~sounds.multiply.(); fourth_tick.wait; ~sounds.adding.(); fourth_tick.wait;
		~sounds.adding.(); fourth_tick.wait; ~sounds.multiply.(); fourth_tick.wait; ~sounds.multiply.(); fourth_tick.wait; ~sounds.adding.(); fourth_tick.wait;
		~sounds.adding.(); fourth_tick.wait; ~sounds.multiply.(); fourth_tick.wait; ~sounds.multiply.(); fourth_tick.wait; ~sounds.adding.(); fourth_tick.wait;

	};
};



~clarendon = { | tick_time, pixels |
	~sounds.enter_function.();
	tick_time.wait;
	~brightness.(tick_time, pixels);
	~sounds.enter_function.();
	tick_time.wait;
	~contrast.(tick_time, pixels);
	~sounds.enter_function.();
	tick_time.wait;
	~saturation.(tick_time, pixels);
};
)
(
~random_intense_process = {
	var sounds = List[], num_process_iterations = 10;
	{
		num_process_iterations.do{
			var num_process_elements = rrand(6, 12);
			num_process_elements.do{
				sounds.add(
					(
						duration_time: [1/4, 1/3, 1/5].choose,
						freq_pitch: rrand(7000, 12000),
						synth_type: [\tick2, \sine, \dist_noise].wchoose([0.5, 0.1, 0.4]),
						sus_time: rrand(0.0, 0.1),
						play_func: {|self, tick_time = 0.2|
							switch(self.synth_type,
								\tick2, {Synth(\tick2, [\freq, self.freq_pitch, \amp, 0.1]);},
								\sine, {Synth(\sine, [\freq, self.freq_pitch*0.05, \amp, 0.05, \atk, 0.005, \sus, self.sus_time, \rel, self.duration_time*tick_time ]);},
								\dist_noise, {Synth(\dist_noise, [\freq, self.freq_pitch, \amp, 0.1, \rel, 0.02]);},
							);
							(self.duration_time*tick_time).wait;
						},
					)
				);
			};

			rrand(3, 10).do{
				sounds.do{|sound|
					sound.play_func.(0.1);
				};
			};
		}
	}.fork;
};
~random_intense_process.();
)
(
{
	~clarendon.(0.01, 30*20);
}.fork;
)
