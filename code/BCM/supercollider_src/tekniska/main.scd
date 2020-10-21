( // For setting up the server on Mac using MADIface XT
s.options.device = "MADIface XT (23757085)";
s.options.numOutputBusChannels = 36;
s.reboot;
)

(
s.options.numOutputBusChannels = 36;
s.options.memSize = 1024 * 128;
s.reboot;
)

// Control the main bus while it is running
~decoder.set(\extraAmp, 1.0) // Set amplification
~decoder.set(\cRatio, 1/2.5, \cThresh, 0.06, \cAtk, 0.012, \cRel, 0.08, \preCompAmp, 4.0); // change compression settings on the master bus

-12.dbamp
(
// Run the main code block starting everything else
// The file main_auto.scd can be run from the command line using `sclang main_auto.scd`
"main_auto.scd".loadRelative;
)
