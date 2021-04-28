~poemTTSPath = "sonified/poem.wav".resolveRelative;
~textPath = "sonified/text.txt".resolveRelative;
~sonifyString = { | textToSonify |
	var cmd, outputPath = ~poemTTSPath, textFile;

	textFile = File.open(~textPath, "w"); // open a file and erase whatever might be in it
	textFile.write(textToSonify);

	fork {
		// Remove the old file
		File.delete(outputPath);

		// TTS generation of .wav file
		// this requires the festival server to be started by running 'festival --server' in a terminal
		cmd = "festival_client " ++ ~textPath ++ " --ttw --output "++ outputPath;
		cmd.unixCmd; // asynchronous

		// wait for the file to finish rendering
		while({File.exists(outputPath) == false }, {
			0.1.wait;
		});

		// read the TTS poem
		~ttsBuffer = Buffer.read(s, ~poemTTSPath, 0, -1);
		s.sync();
		{ var sig, bufnum = ~ttsBuffer, envbuf = z, pan = 0, pos, cutfreq = [350, 1000, 100];
			/*sig = PlayBuf.ar(1, bufnum, BufRateScale.kr(bufnum));
			sig = PitchShift.ar(sig, 0.2, 1.5);*/
			pos = Line.kr(0, 1, BufSamples.kr(bufnum)/BufSampleRate.kr(bufnum) * 0.9, doneAction: 2);
			sig = GrainBuf.ar(1, Impulse.kr(LFNoise1.kr(2).range(30, 60)), LFNoise1.kr(3).range(0.15, 0.4), bufnum, LFNoise1.kr(1).range(0.9, 1.1),
				pos, 2, pan, envbuf);
			//sig = PlayBuf.ar(1, bufnum, BufRateScale.ir(bufnum));
			sig = LPF.ar(sig, 4000);
			sig = HPF.ar(sig, 100);
			sig = BPeakEQ.ar(sig, 1500, 0.2, 10);
			cutfreq.do{|cut|
				sig = BPeakEQ.ar(sig, cut, 0.8, -10);
			};
			sig = (sig * 0.5) + (FreeVerb.ar(sig, 0.2) * 0.5);
			sig = (sig*0.5) + (sig * (Demand.kr(Dust.kr(LFNoise1.kr(1/2).range(5, 20)) + Impulse.kr(0), 0, Dseq([1, 0], inf))) * 0.5);
			sig = sig * LFNoise2.kr(1).range(0.1, 1.0) * XLine.kr(0.5, 1.0, 1);
			sig = Pan2.ar(sig * 3);

			SendTrig.kr(pos > 0.99, 1);
			Out.ar(0, sig);
		}.play;
	};

};