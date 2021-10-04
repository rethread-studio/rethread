~sonify_instantly = { | len, out, services, device |
	{
		var channel = ~stats[device].channel, octave = (channel.activity_level_slow * 5.0).round(1.0);
		// There can be bursts of very many packets at once. If too many packets have arrived in a short time frame, don't run this sonification.
		if(~overallActivity < (~maxActivity * 0.5)) {
			rrand(0.0, 0.2).wait;
			[{
				var freq = ~s53.degreeToFreq(~chord.choose + 159 + channel.pitch_offset, 0.midicps, ~octave + 2 + octave).min(19000);
				while({freq < 50 }, { freq = freq * 2 }); // limit how low these pitches can be
				channel.play_on(\tick2,
					[
						\freq, freq,
						\rq, exprand(0.0001, 0.1),
						\out, channel.reverb_bus,
						\amp, rrand(0.001, 0.01) * ~tickAmp,
						\atk, rrand(0.000, 0.004),
						\c0, -10,
						\rel, rrand(0.01, 0.05) + 0.01, //0.01,
						\c1, -12,
						\pan, rrand(-1*~packetRecPanWidth, ~packetRecPanWidth),
					]
				);
			}, {
				var freq = ~s53.degreeToFreq(~chord.choose + 106 + channel.pitch_offset, 0.midicps, ~octave + 1 + octave).min(19000);
				while({freq < 50 }, { freq = freq * 2 }); // limit how low these pitches can be
				channel.play_on(\dist_sine,
					[
						\freq, freq,
						\out, channel.reverb_bus,
						\dist, rrand(1, 4),
						\amp, rrand(0.01, 0.1) * ~tickAmp * 0.5,
						\atk, rrand(0.001, 0.05),
						\rel, rrand(0.1, 0.8),
						\pan, rrand(-1*~packetRecPanWidth, ~packetRecPanWidth),
					]
				);
			}].choose.();
		}
	}.fork;

};