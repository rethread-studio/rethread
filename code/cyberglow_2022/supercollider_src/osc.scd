thisProcess.openUDPPort(57121); // attempt to open 1121

~next_transition_vis_transition_from = nil;
OSCdef(\transition_from_vis_OSC, { arg msg, time, addr, recvPort;
	var transitions_from = msg[1];
	// [msg, time, addr, recvPort].postln;
	// record this to be used for the next transition which will transition into the next type
	~next_transition_vis_transition_from = transitions_from;

}, '/transition_from_vis', nil);

OSCdef(\transitionOSC, { arg msg, time, addr, recvPort;
	var time_to_next_transition = msg[1].asFloat;
	[msg, time, addr, recvPort].postln;
	// if there was a visualisation transition, change synthesis mode
	if(~next_transition_vis_transition_from != nil, {
		switch(~next_transition_vis_transition_from,
			\ftrace, {~set_synthesis_mode.(\active_mode);},
			\overview, {~set_synthesis_mode.(\soft_mode);},
			{}
		);
	});
	~trigger_transition.(time_to_next_transition);

}, '/transition', nil);

OSCdef(\ftraceOSC, { arg msg, time, addr, recvPort;
	var type = msg[1];
	// [msg, time, addr, recvPort].postln;
	//
	if(~enable_ftrace, {
		~ftrace_trigger.(type);
	});

}, '/ftrace_trigger', nil);

OSCdef(\ftraceStatsOSC, { arg msg, time, addr, recvPort;
	var type = msg[1], rolling_average = msg[2], min_rolling_average = msg[3], max_rolling_average = msg[4];
	// [msg, time, addr, recvPort].postln;
	if(min_rolling_average > 1000000, {
		min_rolling_average = 0;
	});
	switch(type,
		\syscall, {~ftrace_stats.syscall.rolling_average = rolling_average;
			~ftrace_stats.syscall.min_rolling_average = min_rolling_average;
			~ftrace_stats.syscall.max_rolling_average = max_rolling_average;
		},
		\random, {~ftrace_stats.random.rolling_average = rolling_average;
			~ftrace_stats.random.min_rolling_average = min_rolling_average;
			~ftrace_stats.random.max_rolling_average = max_rolling_average;
		}
	);

}, '/ftrace_stats', nil);

~last_user_whisper = 0;
OSCdef(\monitorOSC, { arg msg, time, addr, recvPort;
	var origin = msg[1].asSymbol, action = msg[2], arguments = msg[3];
	// [msg, time, addr, recvPort].postln;

	if(origin == \user, {
		if(~enable_user, {
			{
				var now = Date.getDate.rawSeconds;
				rrand(0, 0.5).wait; // artificial spreading of the events
				if(now - ~last_user_whisper > 0.5, {
					~user_whisper.(action, ~channels.user_whispers);
					~last_user_whisper = now;
				});
				~user_gestures.choose.(~chord, 0);
			}.fork;
		});
	});
	if(origin == \node || (origin == \gameEngine), {
		if(~enable_server, {
			{// artificial spreading of the events
			rrand(0, 0.5).wait;
			~server_gestures.choose.(~chord);
			}.fork;
		});
		if(action == \newQuestion, {
			~changeChordToRandom.();
		});
	});


}, '/monitor', nil);
