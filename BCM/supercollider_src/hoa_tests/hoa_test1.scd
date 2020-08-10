(
// Encode
~order = 1;
~hoaNumChannels = (~order+1).pow(2);
~decoderNumChannels = 29;

//////////////////
// Create an example encoder
// PanB uses the wrong output format
~hoaSignal = NodeProxy.new(s, \audio, ~hoaNumChannels);
~hoaSignal.source = {
	var sig = WhiteNoise.ar(1), // * Decay.ar(Impulse.ar(2), 0.3).lag(0.02),
	radius = MouseX.kr(pi*2, -pi*2),
	azimuth = MouseY.kr(-pi * 0.5, pi * 0.5),
	elevation = MouseX.kr(pi * 0.5, -pi * 0.5);
	// azimuth = 0;
	HOAEncoder1.ar(
		sig,
		1.0,
		0.0,
		azimuth,
		elevation,
		0.0
	);
	/*
	// Test using PanB.ar
	azimuth = MouseY.kr(-pi, pi);
	sig = PanB.ar(
		sig,
		azimuth,
		elevation,
		1.0
	);
	// PanB uses the wrong output format for the decoder W, X, Y, Z, should be W Y Z X
	[sig[0], sig[2], sig[1], sig[3]]*/
	// Test using NFHOAEncoderFor1SourceToOrder1
	/*NFHOAEncoderFor1SourcesToOrder1.ar(
		sig,
		1.0,
		radius, azimuth, elevation,
		0.0
	);*/
};
~hoaSignal.fadeTime = 1;
)

(
// Decode
~decoderOrder = 1;
~decoder = NodeProxy.new(s, \audio, ~decoderNumChannels);
// In this case the KMH108AE1h1p is used, taking four inputs from the encoded signal.
~decoder.source = {
	var in; in = \in.ar(0!4);
	// KMHLSAE1h1p.ar(in[0], in[1], in[2], in[3], gain:10)
	KMHLSDome1h1pNormal6.ar(in[0], in[1], in[2], in[3], gain:10)
};
~decoder.fadeTime = 1;
// If we want to listen to the decoder without mapping, uncomment this line.

// Connect the encoder with the decoder

~decoder.play(0, ~decoderNumChannels, vol: 1.0);
~hoaSignal <>> ~decoder;
)

Platform.systemAppSupportDir
