// Load json
~html = "../html_tree_generator/sl2_html_json.json".resolveRelative.parseJSONFile;
~html = "../html_tree_generator/google_html_json.json".resolveRelative.parseJSONFile;
~html = "../html_tree_generator/wikipedia_html_json.json".resolveRelative.parseJSONFile;


~html["total_children"].asFloat

( var printTag;
printTag = { | node, indent = "" |
	// if(node["tag"] == "a") {
		(indent + node["tag"] + node["category"]).postln;
// };
	node["children"].do{|child| printTag.(child, indent++" "); };
};
printTag.(~html);
)

// Generate audio graph from tree
(
var parseNode, parseDiv, parseContent, sineNode, fmChildren, additiveChildren, amChildren, stutterChildren, lpfChildren, sawNode, sweepNode, fallNode, getTimeEnv;
// recursive function to parse the html tree into a signal graph
parseNode = { | node, sig, context |
	context.indent = context.indent + 1;
	context.node_number = context.node_number + 1;
	// node["tag"].postln;
	switch(node["category"],
		"structure", {
			switch(node["tag"],
				"section", {sig = amChildren.(node, sig, context);},
				"span", {sig = fmChildren.(node, sig, context);},
				"div", {sig = lpfChildren.(node, sig, context);},
				"nav", {sig = stutterChildren.(node, sig, context);},
				"article", {sig = stutterChildren.(node, sig, context);},
				"main", {sig = lpfChildren.(node, sig, context);},
				"header", {sig = stutterChildren.(node, sig, context);},
				"footer", {sig = lpfChildren.(node, sig, context);},
				// default function
				{ sig = additiveChildren.(node, sig, context); }
			);
		},
		"content", {

			switch(node["tag"],
				"p", {sig = amChildren.(node, sig, context)},
				"i", {sig = sawNode.(node, context)},
				"a", {sig = sawNode.(node, context)},
				"h1", {sig = sweepNode.(node, context)},
				"h2", {sig = sweepNode.(node, context)},
				"h3", {sig = sweepNode.(node, context)},
				"h3", {sig = sineNode.(node, context)},
				"h4", {sig = sineNode.(node, context)},
				"h5", {sig = sineNode.(node, context)},
				"h6", {sig = sineNode.(node, context)},
				"img", {sig = fallNode.(node, context)},
				"audio", {sig = sineNode.(node, context)},
				"video", {sig = sawNode.(node, context)},
				"button", {sig = sineNode.(node, context)},
				"embed", {sig = sawNode.(node, context)},
				"iframe", {sig = lpfChildren.(node, sig, context);},
				// default function
				{ sig = additiveChildren.(node, sig, context); }
			);
		},
		// default function
		{
			switch(node["tag"],
				"style", {sig = sineNode.(node, context)},
				"ul", {sig = sineNode.(node, context)},
				"li", {sig = sineNode.(node, context)},
				// default function
				{ sig = additiveChildren.(node, sig, context); }
			);
		}
	);
	context.indent = context.indent - 1;
	sig
};
// create an envelope based on the node and the context
getTimeEnv = { | node, context |
	var atk, rel, del;
	atk = context.max_duration / (context.indent * 10);
	rel = context.max_duration / (context.node_number.pow(1/4));
	del = 0; //((context.max_duration - (atk + rel)) / 2).max(0);
	("atk: " + atk + " rel: " + rel + " del: " + del).postln;
	DelayL.ar(Env.perc(atk, rel).ar(), del, del);
};
sineNode = { | node, context |
	var freq, newContext, sig, childSig;
	// freq = context.freq * (node["total_children"].asFloat + 1);
	freq = (context.freq * (context.indent + 1) / 16) * 6/5;
	// Keep freq under maxfreq
	// while({freq > context.max_freq}, {freq = freq * 0.5});
	freq = freq / 2.pow((freq/context.max_freq).floor.max(0));
	newContext = context.deepCopy;
	newContext.freq = freq;
	childSig = additiveChildren.(node, DC.ar(0.0), context);

	context.indent.do{" ".post;};
	("sine" + freq).postln;
	sig = SinOsc.ar(freq + (childSig * freq), Rand(0, pi), mul: 0.1) * getTimeEnv.(node, context);
	sig = sig * SinOsc.ar((node["total_children"].asFloat + 1) + ((context.indent + 1) / 16), mul: 0.5, add: 0.5);

	sig + childSig
};
sawNode = { | node, context |
	var freq = context.freq * (node["total_children"].asFloat + 1) * 5/4, newContext, sig;

	// Keep freq under maxfreq
	// while({freq > context.max_freq}, {freq = freq * 0.5});
	freq = freq / 2.pow((freq/context.max_freq).floor.max(0));
	("saw" + freq).postln;
	sig = Saw.ar(freq, mul: 0.1) * getTimeEnv.(node, context);
	newContext = context.deepCopy;
	newContext.freq = freq;
	sig = additiveChildren.(node, sig, context);

	sig = sig * LFTri.ar((node["total_children"].asFloat + 1) + ((context.indent + 1) / 16));

	sig
};

sweepNode = { | node, context |
	var startfreq = context.freq * 4/3, endfreq, newContext, sig, freqEnv, sweepTime = 1/((context.indent + 1) * 7), ratio = 2/3, numIterations;

	// Keep freq under maxfreq
	// while({startfreq > context.max_freq}, {startfreq = startfreq * 2/3});
	// startfreq = startfreq * ((2/3).pow(startfreq/context.max_freq).floor);
	numIterations = ((context.max_freq/startfreq).log / ratio.log).ceil;
	startfreq = startfreq * ratio.pow(numIterations);
	endfreq = (context.freq * (node["total_children"].asFloat + 2)).min(100000);
	("sweep" + startfreq + "end: " + endfreq + "time: " + sweepTime).postln;
	freqEnv = Env([startfreq, endfreq, startfreq, endfreq], times: [sweepTime, sweepTime, sweepTime], releaseNode: 2, loopNode: 0).ar();
	sig = SinOsc.ar(freqEnv, mul: 0.1) * getTimeEnv.(node, context);
	newContext = context.deepCopy;
	newContext.freq = startfreq;
	sig = additiveChildren.(node, sig, context);

	// sig = sig * LFTri.ar((node["total_children"].asFloat + 1) + ((context.indent + 1) / 16));

	sig
};

fallNode = { | node, context |
	var startfreq = context.freq * 5, endfreq, newContext, sig, freqEnv, sweepTime = context.max_duration, ratio = 4/10, numIterations;

	// Keep freq under maxfreq
	// while({startfreq > context.max_freq}, {startfreq = startfreq * 4/10});
	numIterations = ((context.max_freq/startfreq).log / ratio.log).ceil;
	startfreq = startfreq * ratio.pow(numIterations);
	endfreq = (context.freq / (context.indent + 1)).max(20);
	("fall" + startfreq + "end: " + endfreq + "time: " + sweepTime).postln;
	freqEnv = Env([startfreq, endfreq, startfreq, endfreq], times: [sweepTime, sweepTime, sweepTime], releaseNode: 2, loopNode: 0).ar();
	sig = DPW3Tri.ar(freqEnv, mul: 0.1) * getTimeEnv.(node, context);
	newContext = context.deepCopy;
	newContext.freq = startfreq;
	sig = additiveChildren.(node, sig, context);

	// sig = sig * LFTri.ar((node["total_children"].asFloat + 1) + ((context.indent + 1) / 16));

	sig
};
// Add together all of the child nodes
additiveChildren = { | node, sig, context |
	// "additive".postln;
	var childSigs = List[];
	// ("add: " + sig).postln;
	if(node["children"].size > 0) {
		node["children"].do{ | child_node |
			var childSig = parseNode.(child_node, DC.ar(0.0), context);
			if(childSig.source.class != DC) {
				childSigs.add(childSig);
			};
		};
		if(childSigs.size > 0) {
			sig = sig + Mix(childSigs);
		};
	};
	sig
};

stutterChildren = { | node, sig, context |
	// "additive".postln;
	var childSig = additiveChildren.(node, sig, context), stutterFreq = context.freq, maxFreq = 15, ratio = 4/7, numIterations;
	// while({stutterFreq > maxFreq}, {stutterFreq = stutterFreq * (4/7) });
	numIterations = ((maxFreq/stutterFreq).log / ratio.log).ceil;
	stutterFreq = stutterFreq * ratio.pow(numIterations);
	childSig = childSig * Demand.ar(Dust.ar(stutterFreq), 0, Dseq([0, 1], inf));
	sig + childSig
};
lpfChildren = { | node, sig, context |
	// "additive".postln;
	var childSig = additiveChildren.(node, sig, context), lpfFreq = context.freq, maxFreq = 4, ratio = 4/7, numIterations;
	// while({lpfFreq > 4}, {lpfFreq = lpfFreq * (4/7) });
	numIterations = ((maxFreq/lpfFreq).log / ratio.log).ceil;
	lpfFreq = lpfFreq * ratio.pow(numIterations);
	childSig = LPF.ar(childSig, SinOsc.ar(lpfFreq).range(context.freq, context.freq*2));
	sig + childSig
};
// parse a div, fm synthesis
// maybe a div isn't the best structural element since it seems to have gone out of fashion
fmChildren = { | node, sig, context |
	// FM synthesis based on the children of the node
	// linearly connect the children together in an FM chain
	var children = List[], freq = context.freq + node["total_children"].asFloat, locsig;
	context.indent.do{" ".post;};
	("fm " + freq).postln;
	node["children"].collect({|child|
		var childSig = parseNode.(child, DC.ar(0), context);
		if(childSig.source.class != DC) {
			children.add(childSig);
		};
	});

	// locsig = sig;
	locsig = 0;
	children.do{|child|
		var locfreq = child * freq, locamp = freq;
		locsig = SinOsc.ar(locfreq + (locsig*locamp));
	};
	locsig + sig
	// locsig
};
amChildren = { | node, sig, context |
	var children = List[], freq = 20 + node["total_children"].asFloat, locsig;
	context.indent.do{" ".post;};
	"am".postln;
	node["children"].collect({|child|
		var childSig = parseNode.(child, DC.ar(0), context);
		if(childSig.source.class != DC) {
			children.add(childSig);
		};
	});

	locsig = 1;
	children.do{|child|
		locsig = locsig * child;
	};
	locsig + sig
};

Ndef.clear;
Ndef(\html_graph).fadeTime = 0.03;
Ndef(\html_graph, {
	var sig = DC.ar(0.0), context = IdentityDictionary(know: true), envFollower;
	context.indent = 0; // the depth of the current node
	context.node_number = 0; // the number of the node in a depth first pass
	// context.freq = ~html["total_children"].asFloat * 2;
	context.freq = 500 * (Demand.ar(Impulse.ar(12), 0, Dseq([1, 5/4, 3/2, 4/3, 7/4, 16/9, 9/8, 15/16], inf))).lag(0.02);
	context.freq = context.freq.max(20);
	// context.freq = MouseX.kr(50, 2000, \exponential);
	// context.max_freq = 5000;
	context.max_freq = (~html["total_children"].asFloat * 4).min(20000);
	context.max_duration = 12;
	sig = parseNode.(~html, sig, context);
	sig = LeakDC.ar(sig);
	envFollower = PeakFollower.ar(sig, 0.99999999);
	sig = sig / (envFollower * 0.1);
	sig = sig + (JPverb.ar(sig, damp: 0.5) * 0.1);
	// sig = sig + SinOsc.ar(context.freq, mul: 0.1);
	// SendTrig.kr(Impulse.kr(10), 0, envFollower);
	sig = sig * Line.kr(0, 1, 0.1);
	sig = Pan2.ar(sig * 0.01);
	sig = Limiter.ar(sig, 0.9, 0.02);
	Out.ar(0, sig);
}).play;

OSCdef(\feedback, { |msg, time, addr, recvPort|
	msg.postln;
}, '/tr');

)
Ndef(\html_graph).gui
s.queryAllNodes


// Limit values with iterative multiplication without iteration
(
var freq = 2000, maxfreq = 15, ratio = 4/7.0,
numRatios = freq.log10;
numRatios
)

(
var freq = 2000, maxfreq = 15, ratio = 4/7.0, numIterations = 0;
while({freq > maxfreq}, {
	freq = freq *ratio;
	numIterations = numIterations + 1;
});
numIterations.postln;
freq.postln;
)

(
var freq = 2000, maxfreq = 15, ratio = 4/7.0, numIterations = 9;
// has to include freq, maxfreq, ratio
// change base
numIterations = ((maxfreq/freq).log / ratio.log).ceil;
freq * ratio.pow(numIterations);
numIterations.postln;
)

(
var freq = 2000, maxfreq = 15, ratio = 4/7.0, numIterations = 9;
freq = freq * ratio.pow(numIterations);
freq.postln;
)
