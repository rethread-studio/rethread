
NetAddr.langPort;    // retrieve the current port SC is listening to

// Catch all the packages
o = OSCFunc({ arg msg, time, addr, recvPort; [msg, time, addr, recvPort].postln; }, '/package'); // create the OSCFunc
o.free;    // remove the OSCFunc when you are done.
