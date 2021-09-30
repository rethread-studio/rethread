(
var freq = ~s53.degreeToFreq(~chord.choose, 0.midicps, ~octave-4);
		~channels.tick_channel.play_on(\fm,
			[
				\freq, freq,
		\mRatio, 10,
				\cRatio, 4,
				\index, 1,
		\iScale, rrand(4, 6),
				\atk, 0.01,
				\rel, 5.0,
		\cRel, -10,
				\out, ~channels.tick_channel.bus,
				\amp, rrand(0.01, 0.02) * ~tickAmp * 2.5,
				\pan, 0,
			]
		);
)

(
var ipPacketArray = List[];
~ipPackets.keysValuesDo { |key, value| ipPacketArray.add([key, value])};
ipPacketArray.sort({|a, b| a[1] > b[1]});
ipPacketArray.postln;

)

(
var allDevices = ~stats.values;
allDevices.do { |statDevice|
	statDevice.channel.spat_rotate(10.0);
};
)

(
var allDevices = ~stats.values;
allDevices.do { |statDevice|
	statDevice.channel.bus.postln;
};
)
~stats.values[0].channel.name

(
c = ~makeMixerChannel.("Test device", ~decoderBus);
~makeDeviceGui.("Test device", c);
)

~tickClock.tempo = 15/60;


c = ~stats[\SoundProxy].channel
~service_sounds[\Google].(300, 2.0, c, c.reverb_bus)
~service_sounds[\YouTube].(300, 2.0, c, c.reverb_bus)
~service_sounds[\Amazon].(300, 0.5, c, c.reverb_bus)
~service_sounds[\Facebook].(300, 2.0, c, c.reverb_bus)
~service_sounds[\Microsoft].(300, 10.0, c, c.reverb_bus)
~service_sounds[\WhatsApp].(300, 1.0, c, c.reverb_bus)

~service_sounds.at(\Facebook)