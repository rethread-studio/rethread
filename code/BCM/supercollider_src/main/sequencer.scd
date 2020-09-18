//////////////////////////////////////////////////////
/////// SEQUENCER
/////////////////////////////////////////////////////

/*
The sequencer holds functions (closures/lambdas) that start sounds. Each step is a list of functions.
*/

~newSequencer = { | numSteps |
	var sequencer = Environment(know: true);
	sequencer.numSteps = numSteps;
	sequencer.steps = {[]}!sequencer.numSteps;
	sequencer.currentStep = 0;
	sequencer
};

~addToSequencer = { | sequencer, step, function |
	var index = step % sequencer.numSteps;
	sequencer.steps[index] = sequencer.steps[index].add(function);
};

~playSequencer = { | sequencer |
	var step = sequencer.currentStep;
	sequencer.steps[step].do { |func|
		func.();
	};
	sequencer.currentStep = (sequencer.currentStep + 1) % sequencer.numSteps;
};

~sequencer = ~newSequencer.(16)