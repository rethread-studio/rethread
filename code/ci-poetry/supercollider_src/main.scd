
// Receive via OSC

(
~sensorValues = 100!12;
~sensorThreshold = 7;
o = OSCFunc({
	arg msg, time, addr, recvPort, change, filterAmount = 0.9;
	// if(msg[1] == 0) {[msg, time, addr, recvPort].postln; };
	// low pass filter
	change = msg[2] - ~sensorValues[msg[1]];
	~sensorValues[msg[1]] = (~sensorValues[msg[1]]*filterAmount) + (change * (1-filterAmount));

	//if(msg[1] == 0) { ~sensorValues[0].postln; };

	~poets[msg[1]].updateState(~sensorValues[msg[1]]<~sensorThreshold);

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
~minTimeBetweenTouches = 0.5;
// a pseudo-object factory to store poet info
~createPoet = { |index, wordList|
	var folder = ("poet" ++ index.asString ++ "/").resolveRelative, personalPoem;
	File.mkdir(folder); // creates the folder if it doesn't exist
	// load the poem specific to this poet
	personalPoem = File.readAllString(("../text-files/poet"++(index%12).asString++".txt").resolveRelative);
	postln(personalPoem);
	( // create an Event similar to a javascript object
		// ----------------- variables
		index: index,
		wordList: wordList,
		personalPoem: personalPoem,
		editActions: [~replaceRandomLine], // a list of functions that
		poem: "", // the local version of the poem as edited by this poet
		localMaster: "", // the master version of the poem when this iteration of edits began
		folder: folder,
		active: false, // if the sensor is currently used for an active sequence i.e. has changes that have not been committed to master
		touched: false, // if the sensor is in the touched state
		touchStart: 0, // timestamp for when it last touched
		noTouchStart: 0, // timestamp for when it stopped being touched

		// ----------------- methods
		// this method is called whenever a new sensor value is received
		updateState: { | self, touched |
			if(touched, {
				// the sensor is being touched
				if(self.touched != true) {
					if(~now.() - self.touchStart > ~minTimeBetweenTouches) {
						self.touched = true;
						self.touchStart = ~now.();
						if(self.active != true) {
							self.active = true;
							self.startSequence();
						};
						// sonify it
						~sonifyTouch.(self.index);
						~processingOsc.sendMsg("/edit");
					};
				};
			}, {
				// the sensor is not being touched
				if(self.touched != false) {
					var now = ~now.();
					// edit the poem based on how long the sensor was pressed
					self.editPoem(now - self.touchStart);
					self.touched = false;
					self.noTouchStart = ~now.();
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
						~commitChange.(self);
						// set to inactive
						self.active = false;
					};
				};
			};
		},
		startSequence: { | self | var masterPoem, localMasterFile;
			"Start sequence".postln;
			~processingOsc.sendMsg("/startedit");
			// copy file from master poem into its own copy of the file
			masterPoem = File.readAllString(~masterPoemPath);
			~masterPoemText = masterPoem; // keep the master poem text up to date
			localMasterFile = File.open(self.folder ++ "mastercopy.txt", "w"); // open a file and erase whatever might be in it
			localMasterFile.write(masterPoem);
			localMasterFile.close();
			self.localMaster = masterPoem; // save for later to avoid having to read it from file again
			self.poem = masterPoem; // initialise to the master poem
			self.savePoemToFile(); // bring the file up to date

			// set to active
			self.active = true;
		},
		editPoem: { | self, timeTouched |
			var editAction;
			("Poet " ++ self.index ++ " edits its poem").postln;
			// apply a change to the poem
			editAction = self.editActions.choose;
			// perform the edit and store the result back into self.poem
			self.poem = editAction.value(self);
			// write the updated version to file
			self.savePoemToFile();
		},
		savePoemToFile: { | self | var file;
			// save this poet's version of the poem
			File.use(self.folder ++ "poem.txt", "w", { |f| f.write(self.poem) });
		},
	)
};

// helper functions

// returns the current time
// as separate function to allow us to use a different method later
~now = { SystemClock.seconds; };

~commitChange = { | poet | var commitPasses = true, editedLines = List[], poetLines, localMasterLines, masterLines, masterPoem, masterDiffLines = Set[];
	// lock the master file for changes (to avoid a race condition where two poets could try to commit a change simultaneously)
	~masterPoemLocked = true;
	// check for conflicts between local sensor version and master
	// If another poet has already edited a line which this poet edits, the commit fails. Otherwise it passes.

	masterPoem = File.readAllString(~masterPoemPath);
	masterLines = masterPoem.split($\n);

	poetLines = poet.poem.split($\n);
	localMasterLines = poet.localMaster.split($\n); // the lines in the copy of the master made when beginning edits

	// get which lines were edited by this poet
	localMasterLines.size.do { |i|
		if(localMasterLines[i] != poetLines[i]) {
			editedLines.add(i);
		};
	};

	// what lines have changed in the masterPoem compared to the local version
	localMasterLines.size.do { |i|
		if(localMasterLines[i] != masterLines[i]) {
			masterDiffLines.add(i);
		};
	};

	// have any of the lines edited by this poet been changed in master?
	editedLines.do { |linenr|
		if(masterDiffLines.findMatch(linenr) != nil) {
			// line has been changed in master, fail the merge
			commitPasses = false;
		};
	};

	if(commitPasses == true, {
		// if the commit passes:
		// merge with master by transferring the changes this poet has made to those lines in the master poem
		("SUCCESS: commit from poet" + poet.index + "succeeded").postln;
		editedLines.do{ |linenr|
			masterLines[linenr] = poetLines[linenr];
		};
		masterPoem = "";
		masterLines.size.do{|index|
			masterPoem = masterPoem ++ masterLines[index];
			// only add the new line if it's not the last line of the poem
			if(index != (masterLines.size-1)) {
				masterPoem = masterPoem ++"\n"
			};
		};
		// save master poem to disk
		File.use(~masterPoemPath, "w", { |f| f.write(masterPoem) });
		// also save a timestamped version to keep a version history
		File.use(~historyFolderPath ++ (Date.localtime.asString.replace(" ", "_")) ++".txt", "w", { |f| f.write(masterPoem) });
		~masterPoemText = masterPoem;
		// trigger a new sonification if the commit passed
		~updatePoemSonification.();
		// send poem to processing for visualisation
		~processingOsc.sendMsg("/poem", masterPoem);
	}, {

		// if the commit fails:
		// play a "commit failed" sound
		("FAILED: commit from poet" + poet.index + "failed").postln;
		~processingOsc.sendMsg("/fail");
	});

	// unlock the master poem lock
	~masterPoemLocked = false;
};


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

