import * as Tone from 'tone';
import * as Global from './globals.js'

function init_tone() {
    // Tone.js

    Tone.Transport.loop = false;

    Global.sound.reverb = new Tone.Reverb(0.5).toMaster();
    Global.sound.reverb.generate();
    // Global.sound.midverb = new Tone.Reverb(2.5).toMaster();
    // Global.sound.midverb.generate();
    Global.sound.longverb = new Tone.Reverb(4.5).toMaster();
    Global.sound.longverb.generate();

    Global.sound.chorus = new Tone.Chorus(1.5, 0.5, 0.3).connect(Global.sound.longverb).toMaster();
    Global.sound.globalSynthLPF = new Tone.Filter(600, "lowpass").connect(Global.sound.chorus);

    
    Global.sound.noisegain = new Tone.Gain(0.00).toMaster();
    Global.sound.noise = new Tone.Noise('pink').start().connect(Global.sound.noisegain);
    Global.sound.noiseGainMult = new Tone.Multiply();
    Global.sound.noiseEnv = new Tone.ScaledEnvelope({
        "attack" : 2.0,
        "decay" : 0.01,
        "sustain" : 1.0,
        "release" : 10.0,
    });
    Global.sound.noiseEnv.releaseCurve = "linear";
    // Multiply two signals together
    Global.sound.noiseEnv.connect(Global.sound.noiseGainMult, 0, 0);
    Global.sound.noiseUsrGain = new Tone.Signal(0.001).connect(Global.sound.noiseGainMult, 0, 1);
    // Use as gain control
    Global.sound.noiseGainMult.connect(Global.sound.noisegain.gain);

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

// Smooth pad!
// Its gain is very tilted to the left for some unknown reason
function newPadSynth(freq) {
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
    let padGain = new Tone.Gain(1.0).connect(Global.sound.longverb).toMaster();
    noise.connect(filter);
    filter.connect(padGain);
    padenv.connect(padGain.gain);
    return {
        noise: noise,
        env: padenv,
        filter: filter,
        gain: padGain,
        dispose: function(syn) {
            syn.env.dispose();
            syn.filter.dispose();
            syn.gain.dispose();
            syn.noise.dispose();
        }
    };
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

export { init_tone, newSynth, newNoiseSynth, newPadSynth, clearIdsFromTransport };