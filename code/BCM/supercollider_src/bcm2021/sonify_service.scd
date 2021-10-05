// BCM 2021

// This is called in the loop, not right away. The "activity" is how many packets

~sonify_service = { | service, activity, channel, inout |
	var freq = ~s53.degreeToFreq(~chord.choose + channel.pitch_offset, 0.midicps, ~octave + 1),
	amp = ~serviceToneAmp,
	bus = channel.reverb_bus,
	thump_atk = rrand(0.18, 0.21),
	release_coeff = 1.0, delay = 0;

	if(~randomizeTiming, { delay = rrand(0.0, 0.3); });
	delay = delay + rrand(0.0, ~attackSmear);

	if(channel.sonifyServicesWhisperToggle, {
		~service_whisper.(service, channel);
	});

	if(channel.sonifyServicesToneToggle, {
		var soundFunc = ~service_sounds.at(service.asSymbol);
		switch(activity,
			\low, {
				amp = amp * rrand(0.3, 0.7);
			},
			\medium, {
				amp = amp * rrand(0.7, 1.2);
				release_coeff = rrand(1.0, 1.5);
				thump_atk = rrand(0.5, 1);
			},
			\high, {
				amp = amp * rrand(1.2, 2.0);
				freq = freq * (2.pow(rrand(-1, 1.0).round));
				release_coeff = rrand(0.3, 0.7);
				thump_atk = rrand(1.0, 2);
			}
		);

		if(soundFunc != nil, {
			soundFunc.(freq, amp, channel, bus);
		}, {

			if(inout == \out, {
				{
					var atk = rrand(0.2, 0.4) * release_coeff;
					delay.wait;
					channel.play_on(\reverse_google, [
						\freq, freq,
						\atk, atk,
						\rel, rrand(0.1, 4 * release_coeff),
						\c0, rrand(1, 4),
						\c1, \sine,
						\pan, rrand(-0.7, 0.7),
						\amp, 0.05 * amp,
						\out, bus],
					atk * -1);
				}.fork;
			}, {
				if(activity == \low || (activity == \high)) {
					{
						delay.wait;
						channel.play_on(\thump, [
							\freq, freq,
							\atk, thump_atk,
							\rel, rrand(0.5, 2),
							\c0, -3,
							\c1, \sine,
							\pan, rrand(-0.7, 0.7),
							\amp, 0.05 * amp,
							\out, bus],
						thump_atk * -1
						);
					}.fork;
				};

				if(activity == \medium || (activity == \high)) {
					{
						delay.wait;
						channel.play_on(\dist_sine, [
							\freq, freq,
							\atk, 0.01,
							\dist, rrand(3, 8),
							\rel, rrand(0.5, 1),
							\pan, rrand(-0.7, 0.7),
							\amp, 0.05 * amp,
							\out, bus]);
					}.fork;
				};
			});
		});
	});

};

~service_whisper = { | service, channel |
	var buf = nil;
	switch(service,
		\Google, { buf = ~voiceServices.google },
		\Amazon, { buf = ~voiceServices.amazon },
		\Facebook, { buf = ~voiceServices.facebook },
		\Instagram, { buf = ~voiceServices.instagram },
		\Microsoft, { buf = ~voiceServices.microsoft },
		\Signal, { buf = ~voiceServices.signal },
		\Slack, { buf = ~voiceServices.slack },
		\YouTube, { buf = ~voiceServices.youtube },
		\WhatsApp, { buf = ~voiceServices.whatsapp },
	);
	if (buf != nil, {
		channel.play_on(\service_voice, [\buf, buf, \amp, ~whisper_amp, \out, channel.bus]);
	});
};

~service_sounds = Environment.new(know:true);
~service_sounds[\Google] = { | freq, amp, channel, bus |
	channel.play_on(\reverse_google, [
		\freq, freq,
		\atk, 1.5,
		\rel, 4,
		\c0, rrand(1, 4),
		\c1, \sine,
		\pan, 0,
		\amp, 0.05 * amp,
		\out, bus],
	-0.5);
};
~service_sounds[\YouTube] = { | freq, amp, channel, bus |
	channel.play_on(\reverse_google, [
		\freq, freq,
		\atk, 2.0,
		\rel, 0.1,
		\c0, rrand(1, 4),
		\c1, \sine,
		\pan, 0,
		\amp, 0.05 * amp,
		\out, bus],
	-1);
};
~service_sounds[\Facebook] = { | freq, amp, channel, bus |
	channel.play_on(\reverse_saw, [
		\freq, freq,
		\atk, 3.0,
		\rel, 0.1,
		\c0, rrand(1, 4),
		\c1, \sine,
		\pan, 0,
		\amp, 0.5 * amp,
		\out, bus],
	-1);
};

~service_sounds[\Microsoft] = { | freq, amp, channel, bus |
	channel.play_on(\softy, [
		\freq, freq,
		\atk, 0.2,
		\rel, 3.0,
		\pan, 0,
		\amp, 0.5 * amp,
		\out, bus],
	-1);
};
~service_sounds[\Amazon] = { | freq, amp, channel, bus |
	channel.play_on(\glitchy_rise, [
		\freq, freq,
		\atk, rrand(2.2, 4.0) * amp.pow(2),
		\rel, 1.0,
		\pan, 0,
		\amp, 0.8 * amp.pow(1.5),
		\out, bus],
	-1);
};

~service_sounds[\WhatsApp] = { | freq, amp, channel, bus |
	channel.play_on(\dist_sine, [
		\freq, freq,
		\atk, 0.1,
		\rel, 2.0 * amp,
		\dist, 15,
		\pan, 0,
		\amp, 0.5 * amp,
		\out, bus],
	-1);
};