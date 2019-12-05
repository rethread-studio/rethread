
// Receive via OSC
(
NetAddr.disconnectAll;
~sensorValues = 100!12;
~sensorThreshold = [35, 40, 30, 40, 50, 40, 50, 40, 45, 40, 19, 20];
// ~visosc = NetAddr.new("127.0.0.1", 7772);
~visosc = NetAddr.new("192.168.1.6", 7772);
o = OSCFunc({
	arg msg, time, addr, recvPort, change, filterAmount = 0.9, show = 11;
	// msg.postln;
	// if(msg[1] == 0) {[msg, time, addr, recvPort].postln; };
	// low pass filter
	change = msg[2] - ~sensorValues[msg[1]];
	~sensorValues[msg[1]] = (~sensorValues[msg[1]]*filterAmount) + (change * (1-filterAmount));

	if(msg[1] == show) { ~sensorValues[show].postln; };

	~poets[msg[1]].updateState(~sensorValues[msg[1]]<~sensorThreshold[msg[1]]);

}, '/touched', nil, 7771);

o = OSCFunc({
	arg msg, time, addr, recvPort, touched, sensors = false!12;
	// if(msg[1] == 0) {[msg, time, addr, recvPort].postln; };
	// low pass filter


	// check if each bit is set
	12.do { arg i;
		if((msg[1] & (1 << i)) != 0) {
			sensors[i] = true;
		}
	};

	if(sensors[0]) {"Touched 0".postln; };

	sensors.do{ arg state, i;
		~poets[i].updateState(state);
	};
}, '/touched2', nil, 7771);




~wordList = ["computer", "night", "git", "far", "away", "get", "got", "gat", "stream", "fall"];
~masterPoemLocked = false; // is set to true while a poet is committing a change to the master poem
~masterPoemPath = "master/poem.txt".resolveRelative;
~historyFolderPath = "history/".resolveRelative;
~touchThreshold = 2000;
~delayUntilCommit = 3.0; // number of seconds of no touching until a change is committed to the master poem
~processingOsc = NetAddr("127.0.0.1", 12000);


// ----------------------------------------------------------- EDIT ACTIONS

~addWord = { | poet |
	var lines, words, addPosition, lineString = "", wordList = poet.wordList, poem = poet.poem, lineNumber = poet.index;
	// split poem into lines
	lines = poem.split($\n);
	//("lines: " + lines).postln;
	words = lines[lineNumber].split($ );
	//("words: " + words).postln;
	addPosition = rrand(0, words.size).floor(); // get random position where the word will be inserted
	words = words.insert(addPosition, wordList.choose()); // insert word into list
	// turn everything back into a flat string
	words.do{|word| lineString = lineString ++ word ++ " "; };
	//("lineString: " + lineString).postln;
	lines[lineNumber] = lineString;
	poem = "";
	lines.do{|line| poem = poem ++ line ++"\n"; };
	poem
};

~replaceRandomLine = { | poet |
	var poetLines, masterLines, fromIndex, toIndex, poem;
	poetLines = poet.personalPoem.split($\n);
	masterLines = poet.poem.split($\n);
	toIndex = rrand(0, masterLines.size-1); // integer between 0 and masterLines.size-1 inclusive
	masterLines[toIndex] = poetLines.choose;
	poem = "";
	masterLines.do{|line| poem = poem ++ line ++"\n"; };
	poem
};


// ----------------------------------------------------------- POET FACTORY
~minTimeBetweenTouches = 0.125;
~timeDisabled = 2.0;
~numSensorsBeingTouched = 0;
~maxSensorsTouched = 2;
~disabledTimestamp = 0;
// a pseudo-object factory to store poet info
~createPoet = { |index|
	( // create an Event similar to a javascript object
		// ----------------- variables
		index: index,
		active: false, // if the sensor is currently used for an active sequence i.e. has changes that have not been committed to master
		touched: false, // if the sensor is in the touched state
		touchStart: 0, // timestamp for when it last touched
		noTouchStart: 0, // timestamp for when it stopped being touched
		disabledTimestamp: 0, // timestamp for when it started being disabled

		// ----------------- methods
		// this method is called whenever a new sensor value is received
		updateState: { | self, touched |
			if(touched, {

				// the sensor is being touched
				if(self.touched != true) {
					if(~now.() - self.touchStart > ~minTimeBetweenTouches
						&& (~now.() - ~disabledTimestamp > ~timeDisabled)
					) {
						self.touchStart = ~now.();
						if(~numSensorsBeingTouched < ~maxSensorsTouched, {
							self.touched = true;
							if(self.active != true) {
								self.active = true;
							};
							// sonify it
							~sonifyTouch.(self.index);
							~processingOsc.sendMsg("/edit");

							~numSensorsBeingTouched = ~numSensorsBeingTouched + 1;
							~visosc.sendMsg("/touched", self.index, touched); // send to p5 for visuals creation
						}, {
							// FAILURE
							~sonifyFailed.(self.index);
							~disabledTimestamp = ~now.();
							~visosc.sendMsg("/failure");
						});
					};
				};
			}, {
				// the sensor is not being touched
				if(self.touched != false) {
					var now = ~now.();

					self.touched = false;
					self.noTouchStart = now;
					~numSensorsBeingTouched = ~numSensorsBeingTouched - 1;
				};
			});
		},
		// called at a set time interval
		updatePoet: { | self |
			if(self.active) {
				if(self.touched != true) {
					var now = ~now.();
					// if enough time has passed, commit the change to the master poem
					if( (now - self.noTouchStart) > ~delayUntilCommit) {
						// commit all changes to the master poem
						// set to inactive
						self.active = false;
					};
				};
			};
		},
	)
};

// helper functions

// returns the current time
// as separate function to allow us to use a different method later
~now = { SystemClock.seconds; };

// ----------------------------------------------------------- INITIALISE

// create all the poets
~poets = 12.collect{ | i | ~createPoet.(i, ~wordList) };

// run poet update loop
{
	loop {
		~poets.do( { |poet| poet.updatePoet(); } );
		0.1.wait;
	}
}.fork;

// initialise sonification
"sonification.scd".loadRelative;
)

// =========================================================== PLAYGROUND / TESTING
(
~simulateTouch = { |index, delayTime|
	{
		~poets[index].updateState(true);
		delayTime.wait;
		~poets[index].updateState(false);
	}.fork
};
)
(
fork{
	~simulateTouch.(rrand(0, 11), 0.5);
	1.wait;
}
)
(
fork{
	~simulateTouch.(10, 0.5);
	1.wait;
}
)
(// loop of random touches
fork{
	loop{
		~simulateTouch.(rrand(0, 11), 0.5);
		0.5.wait;
	}
}
)

(// loop of random touches
fork{
	loop{
		~simulateTouch.(rrand(0, 11), rrand(0.2, 2.0));
		0.5.wait;
	}
}
)

(// loop of random touches
fork{
	loop{
		~numSensorsBeingTouched.postln;
		~simulateTouch.(rrand(0, 11), rrand(0.2, 1.0));
		rrand(0.5, 1.5).wait;
	}
}
)

