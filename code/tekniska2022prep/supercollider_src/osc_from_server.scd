

OSCdef(\foreach_state, {|msg, time, addr, recvPort|
	var type = msg[1];
	msg.postln;

	switch(type,
		\SPEED1_BUTTON_ON, {},
		\SPEED1_BUTTON_OFF, {},
		\SPEED2_BUTTON_ON, {},
		\SPEED2_BUTTON_OFF, {},
		\SPEED3_BUTTON_ON, {},
		\SPEED3_BUTTON_OFF, {},
		\RESET_BUTTON_ON, {},
		\RESET_BUTTON_OFF, {},
		\PICTURE, {},
		\IDLE, {}
	);

}, '/foreach'); // def style