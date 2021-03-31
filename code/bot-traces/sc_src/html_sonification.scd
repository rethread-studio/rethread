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
var parseNode, parseDiv, parseContent, sineNode, fmChildren, additiveChildren, amChildren, stutterChildren, lpfChildren, sawNode;
// recursive function to parse the html tree into a signal graph
parseNode = { | node, sig, context |
	context.indent = context.indent + 1;
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
				"h1", {sig = sineNode.(node, context)},
				"h2", {sig = sineNode.(node, context)},
				"h3", {sig = sineNode.(node, context)},
				"h3", {sig = sineNode.(node, context)},
				"h4", {sig = sineNode.(node, context)},
				"h5", {sig = sineNode.(node, context)},
				"h6", {sig = sineNode.(node, context)},
				"img", {sig = sawNode.(node, context)},
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
sineNode = { | node, context |
	var freq, newContext, sig, childSig;
	// freq = context.freq * (node["total_children"].asFloat + 1);
	freq = context.freq * (context.indent + 1) / 16;
	// Keep freq under maxfreq
	while({freq > context.max_freq}, {freq = freq * 0.5});
	newContext = context.deepCopy;
	newContext.freq = freq;
	childSig = additiveChildren.(node, DC.ar(0.0), context);

	context.indent.do{" ".post;};
	("sine" + freq).postln;
	sig = SinOsc.ar(freq + (childSig * freq), Rand(0, pi), mul: 0.1);
	sig = sig * SinOsc.ar((node["total_children"].asFloat + 1) + ((context.indent + 1) / 16), mul: 0.5, add: 0.5);

	sig + childSig
};
sawNode = { | node, context |
	var freq = context.freq * (node["total_children"].asFloat + 1), newContext, sig;

	// Keep freq under maxfreq
	while({freq > context.max_freq}, {freq = freq * 0.5});
	("saw" + freq).postln;
	sig = Saw.ar(freq, mul: 0.1);
	newContext = context.deepCopy;
	newContext.freq = freq;
	sig = additiveChildren.(node, sig, context);

	sig = sig * LFTri.ar((node["total_children"].asFloat + 1) + ((context.indent + 1) / 16));

	sig
};

sweepNode = { | node, context |
	var startfreq = context.freq, endfreq, newContext, sig, freqEnv, sweepTime = 1/node["total_children"].asFloat;

	// Keep freq under maxfreq
	while({startfreq > context.max_freq}, {startfreq = startfreq * 2/3});
	endfreq = (context.freq * (node["total_children"].asFloat + 1)).min(100000);
	("sweep" + startfreq).postln;
	freqEnv = Env([startfreq, endfreq, startfreq], times: [sweepTime, sweepTime], releaseNode: 1, loopNode: 0).ar();
	sig = SinOsc.ar(freqEnv, mul: 0.1);
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
	var childSig = additiveChildren.(node, sig, context), stutterFreq = context.freq;
	while({stutterFreq > 15}, {stutterFreq = stutterFreq * (4/7) });
	childSig = childSig * Demand.ar(Dust.ar(stutterFreq), 0, Dseq([0, 1], inf));
	sig + childSig
};
lpfChildren = { | node, sig, context |
	// "additive".postln;
	var childSig = additiveChildren.(node, sig, context), lpfFreq = context.freq;
	while({lpfFreq > 4}, {lpfFreq = lpfFreq * (4/7) });
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
Ndef(\html_graph).fadeTime = 0.1;
SynthDef(\html_graph, {
	var sig = DC.ar(0.0), context = IdentityDictionary(know: true), envFollower;
	context.indent = 0;
	context.freq = ~html["total_children"].asFloat;
	context.max_freq = 5000;
	sig = parseNode.(~html, sig, context);
	sig = LeakDC.ar(sig);
	envFollower = PeakFollower.ar(sig, 0.99999999);
	sig = sig / (envFollower * 0.1);
	sig = JPverb.ar(sig, damp: 0.5);
	// sig = sig + SinOsc.ar(context.freq, mul: 0.1);
	// SendTrig.kr(Impulse.kr(10), 0, envFollower);
	sig = sig * Line.kr(0, 1, 2);
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