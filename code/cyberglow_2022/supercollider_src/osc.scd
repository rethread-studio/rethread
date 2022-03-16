

OSCdef(\ftraceOSC, { arg msg, time, addr, recvPort;
	var type = msg[1];
	[msg, time, addr, recvPort].postln;
	//
	if(~enable_ftrace, {
		~ftrace_trigger.(type);
	});

}, '/ftrace', nil);

OSCdef(\ftraceStatsOSC, { arg msg, time, addr, recvPort;
	var type = msg[1], rolling_average = msg[2];
	// [msg, time, addr, recvPort].postln;
	switch(type,
		\syscall, {~ftrace_stats.syscall.rolling_average = rolling_average},
		\random, {~ftrace_stats.random.rolling_average = rolling_average}
	);

}, '/ftrace_stats', nil);

OSCdef(\monitorOSC, { arg msg, time, addr, recvPort;
	var origin = msg[1].asSymbol, action = msg[2], arguments = msg[3];
	// [msg, time, addr, recvPort].postln;

	if(origin == \user, {
		if(~enable_user, {
		~user_whisper.(action, ~channels.user_whispers);
		~user_gestures.choose.(~chord, 0);
		});
	});
	if(origin == \node || (origin == \gameEngine), {
		if(~enable_server, {
			~server_gestures.choose.(~chord);
		});
		if(action == \newQuestion, {
			~changeChordToRandom.();
		});
	});


}, '/monitor', nil);
