// Receive the trace
// 1. Receive start of new GraphData
// 2. For each ScriptData, get the overall data data
// 3. Receive every FunctionData one by one
// 4. End of ScriptData
// 5. Receive end of transmission message
(
~createGraphData = {
	var gd = Environment.new(know: true);
	gd.scripts = List[];
	gd
};
~createScriptData = { | ticks, num_functions, num_called_functions, total_function_calls |
	var sd = Environment.new(know: true);
	sd.functions = List[];
	sd.ticks = ticks;
	sd.num_functions = num_functions;
	sd.num_called_functions = num_called_functions;
	sd.total_function_calls = total_function_calls;
	sd
};
~createFunctionData = { | ticks, calls_to, calls_from |
	var fd = Environment.new(know: true);
	("calls_to: " ++ calls_to).postln;
	fd.ticks = ticks;
	fd.calls_to = calls_to;
	fd.calls_from = calls_from;
	fd
};
~graphDatas = List[];
~currentlyReceivingGraphData = nil;
~currentlyReceivingScriptData = nil;

OSCFunc({ arg msg, time, addr, recvPort;
	~currentlyReceivingGraphData = ~createGraphData.();
	"Received graph data transmission start".postln;
}, '/graph_data', nil, 57120);

OSCFunc({ arg msg, time, addr, recvPort;
	var id = msg[1],
	ticks_in_script = msg[2],
	num_functions = msg[3],
	num_called_functions = msg[4],
	total_function_calls = msg[5];

	~currentlyReceivingScriptData = ~createScriptData.(ticks_in_script, num_functions, num_called_functions, total_function_calls);
}, '/script_data', nil, 57120);

OSCFunc({ arg msg, time, addr, recvPort;
	var ticks_in_function = msg[1],
	calls_to_function = msg[2],
	calls_from_function = msg[3];
	~currentlyReceivingScriptData.functions.add(~createFunctionData.(ticks_in_function, calls_to_function, calls_from_function));
}, '/function_data', nil, 57120);

OSCFunc({ arg msg, time, addr, recvPort;
	// Must sort according to all the parameters to get a deterministic order
	~currentlyReceivingScriptData.functions.sort({|a, b| a.ticks < b.ticks });
	~currentlyReceivingScriptData.functions.sort({|a, b| a.calls_from < b.calls_from });
	~currentlyReceivingScriptData.functions.sort({|a, b| a.calls_to < b.calls_to });
	~currentlyReceivingGraphData.scripts.add(~currentlyReceivingScriptData);
}, '/end_of_script_data', nil, 57120);
OSCFunc({ arg msg, time, addr, recvPort;
	// Must sort according to all the parameters to get a deterministic order
	~currentlyReceivingGraphData.scripts.sort({|a, b| a.ticks > b.ticks });
	~currentlyReceivingGraphData.scripts.sort({|a, b| a.num_called_functions > b.num_called_functions });
	~currentlyReceivingGraphData.scripts.sort({|a, b| a.total_function_calls > b.total_function_calls });
	~graphDatas.add(~currentlyReceivingGraphData);
	"Received graph data transmission end".postln;
	~sonifyGraphData.(~currentlyReceivingGraphData);
}, '/end_of_graph_data', nil, 57120);

// Generate an Ndef based on the trace
~sonifyGraphData = { |gd|
	var total_ticks = 0, num_amplitudes = 1;
	gd.scripts.do{ |script, i|
		total_ticks = total_ticks + script.ticks;
	};
	// Stop previous sonifications
	Ndef.clear(0.5);
	// most ticks and total ticks
	gd.scripts.do{ |script, i|
		var symbol = ("script_node"++i++"#").asSymbol;
		Ndef(symbol, {
			var sig, freq = 100 + (script.num_called_functions);
			sig = SinOsc.ar(freq, 0.0, 0.1);

			script.functions.do{|fd, i|
				sig = sig + (SinOsc.ar(freq * (i+1), 0.0, 0.01) * (fd.ticks+1)/total_ticks);
				num_amplitudes = num_amplitudes + 1;
				if(fd.calls_from > 1, {
					if(fd.calls_from > 10, {
						var pitch_ratio = 4/fd.calls_to.min(5);
						sig = sig + PitchShift.ar(sig, 0.2, pitch_ratio, 0.01, 0.01);
						num_amplitudes = num_amplitudes + 1;
					}, {
						var delay_time = (freq / fd.calls_from).reciprocal;
						// Comb filter
						sig = sig + CombC.ar(sig, 0.2, delay_time, 0.1);
						num_amplitudes = num_amplitudes + 1;
						// sig = LPF.ar(sig, SinOsc.ar((
					});
				});
				if(fd.calls_to > 10, {
					var loc_freq = (freq * fd.calls_to) + SinOsc.ar(freq, 0.0, freq/fd.ticks);
					"demand".postln;
					sig = sig * Demand.ar(Dust.ar(fd.calls_to * 0.5), 0.0, Dseq([0.2, 1], inf));
					sig = sig + (SinOsc.ar(freq * (i+1), 0.0, 0.01) * (fd.ticks+1)/total_ticks);
					num_amplitudes = num_amplitudes + 1;
				}, {
					// Tremolo
					sig = sig + (sig * SinOsc.ar(5/fd.calls_to));
					num_amplitudes = num_amplitudes + 1;
				});
		};
		num_amplitudes.postln;
		// soft clip and amplitude adjustment
		sig = sig/num_amplitudes;
		sig = sig.tanh * (1/gd.scripts.size);
		// sig = sig.tanh * ((script.ticks+1)/total_ticks);
		Pan2.ar(sig, (-1).pow(i+1) * ((i)/gd.scripts.size));
	}).play;
};
};

)

(
// Compare graph datas to see if the data is different between transfers
var numScripts = List[], numFunctions = List[], functionCalls = List[], scriptTicks = List[], callsTo = List[], callsFrom = List[], funcTicks = List[];
~graphDatas.do{ |gd, i|
	var numFuncList = List[], funcCallList = List[], scriptTicksList = List[], callsToListList = List[], callsFromListList = List[], funcTickListList = List[];
	gd.scripts.do{|sd|
		var callsToList = List[], callsFromList = List[], funcTickList = List[];
		sd.functions.do{|fd|
			callsToList.add(fd.calls_to);
			callsFromList.add(fd.calls_from);
			funcTickList.add(fd.ticks);
		};
		callsFromListList.add(callsFromList);
		callsToListList.add(callsToList);
		funcTickListList.add(funcTickList);
		numFuncList.add(sd.num_called_functions);
		funcCallList.add(sd.total_function_calls);
		scriptTicksList.add(sd.ticks);
	};
	numFunctions.add(numFuncList);
	functionCalls.add(funcCallList);
	scriptTicks.add(scriptTicksList);
	numScripts.add(gd.scripts.size);
	callsTo.add(callsToListList);
	callsFrom.add(callsFromListList);
	funcTicks.add(funcTickListList);
};

~compare = { |l|
	(l.size-1).do{ |i|
		if(l[i] != l[i+1], {
			("diff: " ++ l[i] + "!=" + l[i+1]).postln;
		});
	};
};

"numScripst".postln;
~compare.(numScripts);

"numFunctions".postln;
~compare.(numFunctions);

"functionCalls".postln;
~compare.(numFunctions);

"callsTo".postln;
callsTo.postln;
~compare.(callsTo);

"funcTicks".postln;
~compare.(funcTicks);
)