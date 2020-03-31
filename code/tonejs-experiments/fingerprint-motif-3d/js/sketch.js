


let schedulingIds = [];
let synths = [];
let numParametersUsed = 24;

let fmSynth;
let fmSynth2;
let fmSynth3;
let chorus;
let reverb;
let longverb;
let midverb;

let oscillators = ["sine", "square", "triangle", "sawtooth"];

let fm2_lfo1;
let fm2_lfo2;

let rawFingerprints = []; // the raw data strings
let fingerprints = []; // the Fingerprint objects created
let headers = [];

function setup() {
    // Get the data
    $.ajax({
        type: "GET",
        url: "data/amiunique-fp.min.csv",
        dataType: "text",
        success: function(data) {
          const t = data.split("\n");
          headers = t[0].split(",");
          rawFingerprints = t.slice(1);
          for (let l of rawFingerprints) {
            const vs = l.split(",");
            for (let i in vs) {
              let v = headers[i] + "_" + vs[i];
              // Add some global information for that specific data point
            }
          }
          // Render a few fingerprints per default
            for(let i = 0; i < 40; i++) {
                renderFingerPrint();
            }
        }
      });

    // Tone.js

    reverb = new Tone.Reverb(0.5).toMaster();
    reverb.generate();
    midverb = new Tone.Reverb(2.5).toMaster();
    midverb.generate();
    longverb = new Tone.Reverb(6).toMaster();
    longverb.generate();

    chorus = new Tone.Chorus(1.5, 0.5, 0.3).connect(midverb).toMaster();

    fmSynth = new Tone.FMSynth( {
            harmonicity : 3 ,
            modulationIndex : 10 ,
            detune : 0 ,
            oscillator : {
            type : "sine"
        },
        envelope : {
            attack : 0.01 ,
            decay : 0.01 ,
            sustain : 1 ,
            release : 0.2
        },
        modulation : {
            type : "square"
        },
            modulationEnvelope : {
            attack : 0.5 ,
            decay : 0 ,
            sustain : 1 ,
            release : 0.5
            }
        }
    ).connect(longverb).toMaster();
    fmSynth.volume.value = -10;

    fmSynth2 = new Tone.FMSynth( {
            harmonicity : 3 ,
            modulationIndex : 10 ,
            detune : 0 ,
            oscillator : {
            type : "sine"
        },
        envelope : {
            attack : 0.01 ,
            decay : 0.01 ,
            sustain : 1 ,
            release : 0.5
        },
        modulation : {
            type : "sine"
        },
            modulationEnvelope : {
            attack : 0.5 ,
            decay : 0 ,
            sustain : 1 ,
            release : 0.5
            }
        }
    ).connect(longverb).toMaster();
    fm2_lfo1 = new Tone.LFO(1, 1, 100);
    fm2_lfo1.connect(fmSynth2.modulationIndex);
    fm2_lfo1.start();

    fm2_lfo2 = new Tone.LFO(0, 1, 3);
    fm2_lfo2.connect(fmSynth2.detune);
    fm2_lfo2.start();

    bassSynth = new Tone.MembraneSynth(
        {
            pitchDecay  : 0.2,
            octaves     : 10,
            oscillator  : {
                type    : "sine"
            },
            envelope : {
                attack  : 0.001 ,
                decay   : 0.4 ,
                sustain : 0.01 ,
                release : 1.4 ,
                attackCurve : "exponential"
                } 
        }
    ).connect(longverb).toMaster();
    bassSynth.sync();

    bassSynth.triggerAttackRelease("D0", "1n", 0, 0.4);
    // bassSynth.triggerAttackRelease("A0", "1n", "4n", 0.1);
    bassSynth.triggerAttackRelease("D#0", "1n", "2n", 0.15);
    // bassSynth.triggerAttackRelease("A0", "1n", "2n.", 0.1);
    bassSynth.triggerAttackRelease("E0", "1n", "1m", 0.1);
    // bassSynth.triggerAttackRelease("A0", "1n", "1:1", 0.1);
    bassSynth.triggerAttackRelease("F0", "1n", "1:2", 0.05);
    bassSynth.triggerAttackRelease("D#0", "1n", "1:2:3", 0.03);
    bassSynth.triggerAttackRelease("D#0", "1n", "1:3:3", 0.03);
    
    

    Tone.Transport.bpm.value = 140;
    Tone.Transport.loop = true;
    Tone.Transport.setLoopPoints(0, "2m");

    //start/stop the transport
    document.getElementById('start-stop')
        .addEventListener('click', e => {
            Tone.Transport.toggle();
            console.log("Toggled transport");
        })
    // Tone.Transport.start();

}

function newSynth(){
    synth = new Tone.FMSynth( {
            harmonicity : Math.floor(Math.random() * 6) + 1 ,
            modulationIndex : Math.floor(Math.pow(Math.random(), 2.0) * 10) + 1 ,
            detune : 0 ,
            oscillator : {
                type : "sine"
            },
            envelope : {
                attack : 0.01 ,
                decay : 0.01 ,
                sustain : 1 ,
                release : 0.2
            },
            modulation : {
                type : "square"
            },
                modulationEnvelope : {
                attack : 0.5 ,
                decay : 0 ,
                sustain : 1 ,
                release : 0.5
                }
            }
    ).connect(chorus);
    synth.volume.value = -10;
    // synth.sync();
    synths.push(synth);
    return synth;
}

function newNoiseSynth() {
    // let newSynth = new Tone.NoiseSynth(
    //     {
    //         noise : {
    //             type : "pink"
    //         },
    //         envelope : {
    //             attack : 0.005 ,
    //             decay : 0.01 ,
    //             sustain : 0.001
    //         }
    //     }   
    // ).chain(chorus, reverb);
    // newSynth.volume.value = -12;

    let newSynth = new Tone.MembraneSynth( {
        pitchDecay : 0.05 ,
        octaves : 10 ,
        oscillator : {
        type : "sine"
        }
        ,
        envelope : {
        attack : 0.005 ,
        decay : 0.4 ,
        sustain : 0.01 ,
        release : 1.4 ,
        attackCurve : "exponential"
        }
        }
        ).chain(chorus, reverb).toMaster();
    newSynth.volume.value = -10;
    return newSynth;
}

function getRandomFingerPrint() {
    return rawFingerprints[Math.floor(rawFingerprints.length * Math.random())];
}

function renderFingerPrint() {
    if (rawFingerprints.length == 0) {
      return;
    }
    const p = [];
    let size = 140;
    let fingerprint = new Fingerprint(getRandomFingerPrint(), Math.random() * size - (size/2), Math.random() * size - (size/2), Math.random() * size - (size/2));
    fingerprints.push(fingerprint);
}

StartAudioContext(Tone.context, 'start-stop').then(function(){
    //callback is invoked when the AudioContext.state is 'running'
    console.log("Starts audio context");
})

let fmSynthOn = false;
// document.getElementById("test1").onclick = function(){
//     if(!fmSynthOn) {
//         fmSynth.triggerAttack("c2");
//     } else {
//         fmSynth.triggerRelease();
//     }
//     fmSynthOn = !fmSynthOn;
// }

// document.getElementById("test2").onclick = function(){
//     fmSynth2.triggerAttack("c2");
// }

// document.getElementById("test3").onclick = function(){
//     renderFingerPrint();
// }

// document.getElementById("clear-timeline").onclick = function(){
//     for(id of schedulingIds) {
//         Tone.Transport.clear(id);
//     }
//     schedulingIds = [];
// }

// document.getElementById("numParameters").value = numParametersUsed;
// document.getElementById("numParameters").addEventListener('input', function(e){
//     numParametersUsed = e.target.value;
// });

let scale = [0, 2, 4, 5, 7, 11];
scale = pitchSet;

function updateSound(x, y) {
    // console.log("x: " + x + " y: " + y);
    fmSynth.modulationIndex.value = x * 100;
    fmSynth.harmonicity.value = Math.floor(Math.abs(x-y) * 20) + 1;
    // fmSynth.detune.value = Math.floor(y * 50) * 100;
    let scale_i = Math.floor(y * scale.length * 2);
    let octave = Math.floor(scale_i/scale.length);
    let midinote = scale[scale_i%scale.length] + (12 * octave);
    let freq = Tone.Frequency.mtof(midinote);
    fmSynth.frequency.value = freq;

    fm2_lfo1.max = Math.pow(x, 2)*200;
    fm2_lfo1.frequency.value = Math.sin(y * 20) * 5 + 6;

    fm2_lfo2.frequency.value = Math.sin(x * 30) * 3 + 3.1;
    fm2_lfo2.max = y * 2;

    scale_i = Math.sin( (1 - (x * y)) * 20) * 0.5 + 0.5;
    scale_i = Math.floor(scale_i * scale.length*3.2);
    octave = Math.floor(scale_i/scale.length) + 2;
    // console.log("oct: " + octave);
    note_offset = Math.floor(y * 5) + 1;
    midinote = scale[(scale_i*note_offset)%scale.length] + (12 * octave);
    freq = Tone.Frequency.mtof(midinote);

    fmSynth2.frequency.value = freq;
}

setup();

