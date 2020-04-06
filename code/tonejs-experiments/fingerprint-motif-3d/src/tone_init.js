import * as Tone from 'tone';
import * as Global from './globals.js'

function init_tone() {
    // Tone.js

    Global.sound.reverb = new Tone.Reverb(0.5).toMaster();
    Global.sound.reverb.generate();
    // Global.sound.midverb = new Tone.Reverb(2.5).toMaster();
    // Global.sound.midverb.generate();
    Global.sound.longverb = new Tone.Reverb(4.5).toMaster();
    Global.sound.longverb.generate();

    Global.sound.chorus = new Tone.Chorus(1.5, 0.5, 0.3).connect(Global.sound.longverb).toMaster();
    Global.sound.globalSynthLPF = new Tone.Filter(600, "lowpass").connect(Global.sound.chorus);

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
    
    synth.connect(Global.sound.globalSynthLPF);
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
        ).chain(Global.sound.chorus, Global.sound.reverb).toMaster();
    newSynth.volume.value = -10;
    return newSynth;
}

function clearIdsFromTransport(ids) {
    for (let id of ids) {
        // console.log("clearing id: " + id);
        Tone.Transport.clear(id);
    }
}


// StartAudioContext(Tone.context, 'start-stop').then(function(){
//     //callback is invoked when the AudioContext.state is 'running'
//     console.log("Starts audio context");
// });

export { init_tone, newSynth, newNoiseSynth, clearIdsFromTransport };