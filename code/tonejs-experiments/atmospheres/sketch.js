let reverb, midverb, longverb;
let chorus;
let globalSynthLPF;

reverb = new Tone.Reverb(0.5).toMaster();
reverb.generate();
midverb = new Tone.Reverb(2.5).toMaster();
midverb.generate();
longverb = new Tone.Reverb(4.5).toMaster();
longverb.generate();
chorus = new Tone.Chorus(1.5, 0.5, 0.3).connect(longverb).toMaster();
globalSynthLPF = new Tone.Filter(600, "lowpass").connect(chorus);

let noise;

noise = new Tone.Noise("pink").start();
var noiseGain = new Tone.Gain(0.2).connect(reverb).toMaster();
var chebyenv = new Tone.ScaledEnvelope({
	"attack" : 5.0,
	"decay" : 0.01,
	"sustain" : 1.0,
	"release" : 5.0,
});
chebyenv.releaseCurve = "linear";
chebyenv.max = 0.5;

var chebylfofreq = new Tone.LFO(0.1, 0.05, 0.3).start();
var chebylfo = new Tone.LFO(0.1, 0.3, 0.5).start();
chebylfofreq.connect(chebylfo.frequency);

var gainMult = new Tone.Multiply();
// Multiply two signals together
chebyenv.connect(gainMult, 0, 0);
chebylfo.connect(gainMult, 0, 1);
// Use as gain control
gainMult.connect(noiseGain.gain);


var cheby = new Tone.Chebyshev(300).connect(noiseGain);
noise.connect(cheby);



// Smooth pad!
// Its gain is very tilted to the left for some unknown reason
function makePadSynth(freq) {
    console.log(freq);
    let noise = new Tone.Noise("pink").start();
    let padenv = new Tone.ScaledEnvelope({
        "attack" : 5.0,
        "decay" : 0.01,
        "sustain" : 1.0,
        "release" : 5.0,
    });
    padenv.releaseCurve = "linear";
    padenv.max = 2.0;
    let filter = new Tone.Filter(freq, 'bandpass', -48);
    filter.Q.value = 500;
    let padGain = new Tone.Gain(1.0).connect(longverb).toMaster();
    noise.connect(filter);
    filter.connect(padGain);
    padenv.connect(padGain.gain);
    return {
        noise: noise,
        env: padenv,
        filter: filter,
        gain: padGain
    };
}

let padSynths = [];

// Creates a popping (DC offset?) sound, why?
let notes = [48, 36, 60, 64, 67];
for(let i = 0; i < notes.length; i++) {
    padSynths.push(makePadSynth(Tone.Frequency.mtof(notes[i]-12)));
}


document.getElementById("start").addEventListener('click', function(){ Tone.start(); }, true); 
document.getElementById("chebynoise").addEventListener('click', function(){ chebyenv.triggerAttack(); }, true); 
document.getElementById("stop-chebynoise").addEventListener('click', function(){ chebyenv.triggerRelease(); }, true);

document.getElementById("smoothpad").addEventListener('click', function(){ 
    for(syn of padSynths) {
        syn.env.triggerAttack(); 
    }
}, true); 
document.getElementById("stop-smoothpad").addEventListener('click', function(){ 
    for(syn of padSynths) {
        syn.env.triggerRelease();
    }
}, true); 