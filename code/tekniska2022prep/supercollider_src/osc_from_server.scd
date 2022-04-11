

OSCdef(\foreach_state, {|msg, time, addr, recvPort|
	var type = msg[1];
	msg.postln;

	switch(type,
		\SPEED1_BUTTON_ON, {~speed1.();},
		\SPEED1_BUTTON_OFF, {},
		\SPEED2_BUTTON_ON, {~speed2.()},
		\SPEED2_BUTTON_OFF, {},
		\SPEED3_BUTTON_ON, {~speed3.()},
		\SPEED3_BUTTON_OFF, {},
		\RESET_BUTTON_ON, {},
		\RESET_BUTTON_OFF, {},
		\PICTURE, {},
		\IDLE, {},
		\previous, { ~crank_speed = msg[2].asFloat },
		\next, { ~crank_speed = msg[2].asFloat }
	);

}, '/foreach'); // def style