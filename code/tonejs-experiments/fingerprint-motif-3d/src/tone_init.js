import * as Tone from 'tone';
import * as global from './globals.js'

var bassSynth;
var sonarSynth;

function init_tone() {
    // Tone.js

    global.sound.reverb = new Tone.Reverb(0.5).toMaster();
    global.sound.reverb.generate();
    global.sound.midverb = new Tone.Reverb(2.5).toMaster();
    global.sound.midverb.generate();
    global.sound.longverb = new Tone.Reverb(6).toMaster();
    global.sound.longverb.generate();

    global.sound.chorus = new Tone.Chorus(1.5, 0.5, 0.3).connect(global.sound.midverb).toMaster();
    global.sound.globalSynthLPF = new Tone.Filter(600, "lowpass").connect(global.sound.chorus);

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
    ).connect(global.sound.longverb).toMaster();
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
    bassSynth.triggerAttackRelease("D0", "1n", "2:0:0", 0.15);
    bassSynth.triggerAttackRelease("E0", "1n", "3:0:0", 0.1);
    bassSynth.triggerAttackRelease("D#0", "1n", "3:3:3", 0.03);

    sonarSynth = new Tone.FMSynth( {
        harmonicity : 2 ,
        modulationIndex : 2 ,
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
            type : "sine"
        },
            modulationEnvelope : {
            attack : 0.5 ,
            decay : 0 ,
            sustain : 1 ,
            release : 0.5
            }
        }
    ).connect(global.sound.longverb).toMaster();
    sonarSynth.volume.value = -12;
    sonarSynth.sync();
    let sonarPitch = Tone.Frequency.mtof(global.sound.stablePitches[1]+12);
    sonarSynth.triggerAttackRelease(sonarPitch, "16n", 0, 0.4);
    sonarSynth.triggerAttackRelease(sonarPitch, "16n", "0:0:2", 0.2);
    sonarSynth.triggerAttackRelease(sonarPitch, "16n", "2:2:0", 0.4);
    sonarSynth.triggerAttackRelease(sonarPitch, "16n", "2:2:2", 0.2);
    


    Tone.Transport.bpm.value = 110;
    Tone.Transport.loop = true;
    Tone.Transport.setLoopPoints(0, "4m");

    //start/stop the transport
    // document.getElementById('start-stop')
    //     .addEventListener('click', e => {
    //         Tone.Transport.toggle();
    //         console.log("Toggled transport");
    //     })
    // Tone.Transport.start();

}

function newSynth(){
    let synth = new Tone.FMSynth( {
            harmonicity : Math.floor(Math.random() * 6) * 2 + 1 ,
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
    );
    synth.volume.value = -10;
    
    synth.connect(global.sound.globalSynthLPF);
    // let lfo = new Tone.LFO("4n", 400, 4000);
    // lfo.connect(filter.frequency);
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
        ).chain(global.sound.chorus, global.sound.reverb).toMaster();
    newSynth.volume.value = -10;
    return newSynth;
}

function clearIdsFromTransport(ids) {
    for (let id of ids) {
        // console.log("clearing id: " + id);
        Tone.Transport.clear(id);
    }
}

function getTransport() {
    return Tone.Transport;
}



// StartAudioContext(Tone.context, 'start-stop').then(function(){
//     //callback is invoked when the AudioContext.state is 'running'
//     console.log("Starts audio context");
// });

export { init_tone, newSynth, newNoiseSynth, clearIdsFromTransport, getTransport };