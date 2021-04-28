// 0 = bing, 1 = duckduckgo, 2 = google, 3 = wikipedia, 4 = yahoo
(
var root_path = "/home/erik/code/kth/request-bot-files/20200124/",
path_groups = [
        [
            "bing01-12-2020_16_06/",
            "bing01-13-2020_11_45/",
            "bing01-14-2020_15_32/",
            "bing01-15-2020_14_00/",
            "bing01-16-2020_13_34/",
            "bing01-17-2020_14_10/",
            "bing01-19-2020_20_01/",
        ],
        [
            "duckduck01-12-2020_16_06/",
            "duckduck01-13-2020_11_45/",
            "duckduck01-14-2020_15_32/",
            "duckduck01-15-2020_14_00/",
            "duckduck01-16-2020_13_34/",
            "duckduck01-17-2020_14_10/",
            "duckduck01-19-2020_20_01/",
        ],
        [
            "google01-12-2020_15_42/",
            "google01-12-2020_16_06/",
            "google01-13-2020_11_45/",
            "google01-14-2020_15_32/",
            "google01-15-2020_14_00/",
            "google01-16-2020_13_34/",
            "google01-17-2020_14_10/",
            "google01-19-2020_20_01/",
        ],
        [
            "wikipedia01-12-2020_16_06/",
            "wikipedia01-14-2020_15_32/",
            "wikipedia01-13-2020_11_45/",
            "wikipedia01-15-2020_14_00/",
            "wikipedia01-16-2020_13_34/",
            "wikipedia01-17-2020_14_10/",
            "wikipedia01-19-2020_20_01/",
        ],
        [
            "yahoo01-12-2020_16_06/",
            "yahoo01-13-2020_11_45/",
            "yahoo01-14-2020_15_32/",
            "yahoo01-15-2020_14_00/",
            "yahoo01-16-2020_13_34/",
            "yahoo01-17-2020_14_10/",
            "yahoo01-19-2020_20_01/",
        ],
    ];
~path_groups = path_groups;

// Function to load the indentation data into a buffer, scaled to values that make sense for audio
~loadIndentationToBuffer = { | path |
	var data, digits, numbers, average, sum = 0, buf, moving_avg = 0.0, moving_avg_coeff = 0.9995;
	// load csv file
	~data = File.readAllString(path ++ "indent_profile.csv");
	("data from " + path + "was read").postln;
	digits = ~data.split($,);
	("data was split into " + digits.size + "numbers").postln;
	numbers = digits.collect({ | num |
		var conv = num.asInteger.asFloat, new;
		new = conv - (moving_avg);
		// new = conv;
		moving_avg = (moving_avg * (moving_avg_coeff)) + (conv * (1.0 - moving_avg_coeff));
		if(moving_avg.isNaN) {
			("nan!" + num + conv).postln;
		};
		new
	});
	("data was converted to integers").postln;
	numbers
};
~applyNormalizationAndDCBlocking = { | list, max_num |
	var average, sum = 0, buf, last_value = 0;

	list = list.collect({ | num |
		var n = num / max_num, sign = 1;
		// We cannot take the root of a negative number without a complex result so we store the sign and take the root of the absolute value
		if(n < 0, {sign = -1});
		n = n.abs.pow(1/4) * sign; // lessens the impact of very high peaks in the indentation profile, basically compressing the signal
		sum = sum + n;
		n
	});
	"data normalized".postln;
	// Remove DC bias
	// A running average may do better to equal out the large peaks in the waveform?
	// This DC blocker is inadequate for properly evening out the DC of the peaks (which should swing from one pole to the other)
	// Hopefully, later highpass filtering and DC blocking as well as resynthesis is enough
	"remove dc bias".postln;
	average = sum / list.size;
	("average: " + average).postln;
	// ("average: " + average).postln;
	list = list.collect({ | num |
		var new = num - average;
		new
	});

	list
};
~buffers = List[];
path_groups.do { |path_group|
	var group_buffers = List[], max_num = 0;
	// load all files into lists
	path_group.do{ | end_path |
		var local_path = root_path ++ end_path;
		group_buffers.add(~loadIndentationToBuffer.(local_path));
	};
	// find the largest peak in all the lists for equal normalization
	group_buffers.do{|buf|
		buf.do({ | num |
			if(num.abs > max_num, { max_num = num.abs; });
		});
	};
	("max_num: " + max_num).postln;
	// normalize and turn into sound buffer format on the server
	group_buffers = group_buffers.collect{|list|
		var buf = ~applyNormalizationAndDCBlocking.(list, max_num);
		buf
	};

	group_buffers = group_buffers.collect({|list|
		Buffer.loadCollection(s, list);
	});

	~buffers.add(group_buffers);
};
)
~path_groups[0][0][0..~path_groups[0][0].size-2]
( // Save all the buffers generated to disk in .wav format
var root_path = "/home/erik/Dokument/KTH/software_evolution/js indentation sonification/raw_bufs/";
~buffers.do{ |bufGroup, i|
	bufGroup.do{| buf, k |
		var filename = ~path_groups[i][k];
		// remove the ending /
		filename = filename[0..filename.size-2];
		buf.write(root_path ++ filename ++ ".wav", headerFormat: "wav", sampleFormat: "int24");
	};
};

)

~buf.plot
~buffers[0][0].plot
~buffers[0][0].play
~buffers[0][0].get(9, {|num| num.postln;})
(
{
	var sig;
	sig = PlayBuf.ar(1, ~buf, doneAction: 2);
	sig = LeakDC.ar(sig);
	sig = Pan2.ar(sig);
	sig

}.play;
)

( // Super simple wave guide implementation
~buf = ~buffers[4][0];
{
	var sig, freq = 50, decay = MouseX.kr(0.001, 1.0, 'exponential'), rate, buf = ~buf;
	rate = BufDur.ir(buf) / 2.0; // scale the buffer playback so all buffers take the same amount of time
	sig = PlayBuf.ar(1, buf, rate: rate, doneAction: 2);
	sig = LeakDC.ar(HPF.ar(sig, 20));
	// optionally control more parameters using the same values
	decay = sig;
	// freq = 40 + (1000 * sig.abs);
	sig = CombC.ar(sig, 0.2, freq.reciprocal, decay);
	sig = Limiter.ar(sig);
	sig = Pan2.ar(sig);
	sig

}.play;
)

(
SynthDef(\separator, {
	var sig, freq = 2000;
	sig = SinOsc.ar([freq, freq * 1.001, freq * 1.002]) * 0.1;
	sig = Splay.ar(sig) * Env.perc(0.03, 0.6).ar();
	Out.ar(\out.kr(0), sig);
}).add;
SynthDef(\beat, {
	var sig, freq = 50;
	freq = freq * Line.ar(4.5, 0.8, 0.05);
	sig = SinOsc.ar([freq, freq * 1.001, freq * 1.002]) * 0.1;
	sig = Splay.ar(sig) * Env.perc(0.03, 0.6).ar();
	Out.ar(\out.kr(0), sig);
}).add;
SynthDef(\tick2, {
	var sig, env, rq = \rq.kr(0.1), delay1 = 0.0006, delay2 = 0.002;
	env = Env.perc(\atk.kr(0), \rel.kr(0.05), curve: [\c0.kr(-4), \c1.kr(-4)]).ar(2);
	sig = Impulse.ar(0);
	sig = sig * 0.5;
	// high freq and rq values causes the filter to blow up violently
	sig = RHPF.ar(sig, \freq.kr(1000).min(18000).max(20), rq.min(5)) * env;
	sig = Pan2.ar(sig, \pan.kr(0)) * \amp.kr(1.0) * 10;
	sig = sig.tanh; // Should never happen, but better to soft clip
	sig = sig + [DelayL.ar(sig[1], delay1, delay1), DelayL.ar(sig[0], delay2, delay2)];
	Out.ar(\out.kr(0), sig);
}).play;
)

// 0 = bing, 1 = duckduckgo, 2 = google, 3 = wikipedia, 4 = yahoo
( // Play all buffers of a type
{
	var bufferGroup = ~buffers[0];
	bufferGroup.do { |buf, i|
		var duration = buf.duration * 0.08;
		duration = 1;
		(i.asString + "dur: " + duration).postln;
		// Synth(\separator);
		0.1.wait;
		// 0.3.wait;
		{
			var sig, freq = 30, decay = MouseX.kr(0.001, 1.0, 'exponential'), rate, maxfreq = 500, minfreq = 50;
			rate = BufDur.ir(buf) / duration; // scale the buffer playback so all buffers take the same amount of time
			sig = PlayBuf.ar(1, buf, rate: rate, doneAction: 2);
			sig = LeakDC.ar(HPF.ar(sig, 20));
			// optionally control more parameters using the same values
			// decay = sig;
			// decay.poll;
			decay = 0.068;
			// freq = maxfreq - ((maxfreq-minfreq) * sig.abs.lag(0.1).pow(1/3));
			freq = minfreq + ((maxfreq) * sig.abs.lag(0.1).pow(1/2));
			sig = CombC.ar(sig, 0.2, freq.reciprocal, decay);
			sig = Limiter.ar(sig);
			sig = Pan2.ar(sig);
			sig = sig + DelayL.ar((JPverb.ar(sig, 3.0)*0.09), 0.05, 0.05);
			sig

		}.play;
		/*{ // beat
			var numBeats = 3, beatLength = duration/numBeats;
			(numBeats-1).do {
				3.do{
					(beatLength*0.25).wait;
					Synth(\tick2, [\amp, 0.05]);
				};
				(beatLength*0.25).wait;
				Synth(\tick2, [\rel, 0.2, \freq, 5000, \rq, 1, \amp, 0.2]);
				// Synth(\beat);
			};
		}.fork;*/
		duration.wait;
	};
}.fork;
)


// Play two buffers simultaneously, one in each channel
(
var duration, bufGroup = ~buffers[0], index = 0;
~playBuffer = { | buf, pan = 0, duration |
	{
		var sig, freq = 30, decay = MouseX.kr(0.001, 1.0, 'exponential'), rate, maxfreq = 1000, minfreq = 50;
		rate = BufDur.ir(buf) / duration; // scale the buffer playback so all buffers take the same amount of time
		sig = PlayBuf.ar(1, buf, rate: rate, doneAction: 2);
		sig = LeakDC.ar(HPF.ar(sig, 20));
		// optionally control more parameters using the same values
		// decay = sig;
		// decay.poll;
		decay = 0.038;
		// freq = 400 + (350 * sig.lag(0.1));
		freq = maxfreq - ((maxfreq-minfreq) * sig.abs.lag(0.1).pow(1/3));
		sig = CombC.ar(sig, 0.2, freq.reciprocal, decay);
		sig = Limiter.ar(sig);
		sig = Pan2.ar(sig, pan);
		// sig = sig + DelayL.ar((JPverb.ar(sig, 3.0)*0.6), 0.05, 0.05);
		sig

	}.play;
};

{
	bufGroup.size.do { | i |
		index = i;
		duration = bufGroup[index].duration * 0.08;
		~playBuffer.(bufGroup[index], -1, duration);
		~playBuffer.(bufGroup[(index+1) % bufGroup.size], 1, duration);
		duration.wait;
		0.2.wait;
	};
}.fork;

)

( // Pan between all of the buffers
var bufGroup = ~buffers[4], duration = 2.0;

{
	var sig, decay = 0.038, pan = MouseX.kr(0, 1) * (bufGroup.size-1);
	// scale the buffer playback so all buffers take the same amount of time
	sig = bufGroup.collect{ |buf, i|
		var rate = BufDur.ir(buf) / duration, freq,
		amp = 1.0 - ((i - pan).abs * 2.0),
		pan2 = i - pan,
		sig2 = PlayBuf.ar(1, buf, rate: rate, loop: 1.0);
		sig2 = LeakDC.ar(sig2);
		freq = 400 + (350 * sig2.lag(0.1));
		sig2 = CombC.ar(sig2, 0.2, freq.reciprocal, decay);
		sig2 = Limiter.ar(sig2) * amp.max(0);
		sig2 = Pan2.ar(sig2, pan2);
		pan2.poll;
		sig2
	};
	sig = Mix(sig);

	// sig = sig + DelayL.ar((JPverb.ar(sig, 3.0)*0.6), 0.05, 0.05);
	sig

}.play;
)