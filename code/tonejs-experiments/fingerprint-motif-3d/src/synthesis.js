import * as Tone from 'tone';
import * as Global from './globals.js'

var longverb;
var chorus;
var reverb;
var globalSynthLPF;
var pingPong;
var noisegain, noise, noiseGainMult, noiseEnv, noiseUsrGain;
var fmSynths = [];
var fmSynthsUsed = [];
var noiseSynths = [];
var noiseSynthsUsed = [];
var padSynths = [];
var padSynthsUsed = [];
var soundSignature;

function init_tone() {
    // Tone.js

    Tone.context.latencyHint = 'balanced'; // how far in advance events are scheduled, interactive, balanced, fastest, playback
    Tone.Transport.loop = false;

    reverb = new Tone.Reverb(0.5).toMaster();
    reverb.generate();
    // midverb = new Tone.Reverb(2.5).toMaster();
    // midverb.generate();
    longverb = new Tone.Reverb(4.5).toMaster();
    longverb.generate();

    chorus = new Tone.Chorus(1.5, 0.5, 0.3).connect(longverb).toMaster();
    globalSynthLPF = new Tone.Filter(600, "lowpass").connect(chorus);


    pingPong = new Tone.PingPongDelay("4n", 0.2).toMaster();


    // noisegain = new Tone.Gain(0.00).toMaster();
    // noise = new Tone.Noise('pink').start().connect(noisegain);
    // noiseGainMult = new Tone.Multiply();
    // noiseEnv = new Tone.ScaledEnvelope({
    //     "attack": 2.0,
    //     "decay": 0.01,
    //     "sustain": 1.0,
    //     "release": 10.0,
    // });
    // noiseEnv.releaseCurve = "linear";
    // // Multiply two signals together
    // noiseEnv.connect(noiseGainMult, 0, 0);
    // noiseUsrGain = new Tone.Signal(0.00).connect(noiseGainMult, 0, 1);
    // // Use as gain control
    // noiseGainMult.connect(noisegain.gain);

    // Create a number of synths and hand them out
    for (let i = 0; i < 7; i++) {
        fmSynths.push(newSynth());
        fmSynthsUsed.push(false);
    }
    for (let i = 0; i < 7; i++) {
        noiseSynths.push(newNoiseSynth());
        noiseSynthsUsed.push(false);
    }

    for (let i = 0; i < 5; i++) {
        padSynths.push(createPadSynth(20, i));
        padSynthsUsed.push(false);
    }

    soundSignature = initSoundSignature();

    //start/stop the transport
    // document.getElementById('start-stop')
    //     .addEventListener('click', e => {
    //         Tone.Transport.toggle();
    //         console.log("Toggled transport");
    //     })
    // Tone.Transport.start();

}

function requestFMSynth() {
    for (let i = 0; i < fmSynths.length; i++) {
        if (fmSynthsUsed[i] == false) {
            fmSynthsUsed[i] = true;
            return { synth: fmSynths[i], index: i };
        }
    }
    // Optionally create a new synth if none was free

    return undefined;// Return undefined to signal that no synth was free
}

function returnFMSynth(index) {
    fmSynthsUsed[index] = false;
}

function getNumFreeFMSynths() {
    let numSynths = 0;
    for (let i = 0; i < fmSynths.length; i++) {
        if (fmSynthsUsed[i] == false) {
            numSynths++;
        }
    }
    return numSynths;
}

function requestNoiseSynth() {
    for (let i = 0; i < noiseSynths.length; i++) {
        if (noiseSynthsUsed[i] == false) {
            noiseSynthsUsed[i] = true;
            return { synth: noiseSynths[i], index: i };
        }
    }
    // Optionally create a new synth if none was free

    return undefined;// Return undefined to signal that no synth was free
}

function returnNoiseSynth(index) {
    noiseSynthsUsed[index] = false;
}

function newSynth() {
    let synth = new Tone.FMSynth({
        harmonicity: Math.floor(Math.random() * 6) * 2 + 1,
        modulationIndex: Math.floor(Math.pow(Math.random(), 2.0) * 10) + 1,
        detune: 0,
        oscillator: {
            type: "sine"
        },
        envelope: {
            attack: 0.01,
            decay: 0.01,
            sustain: 1,
            release: 0.1
        },
        modulation: {
            type: "square"
        },
        modulationEnvelope: {
            attack: 0.5,
            decay: 0,
            sustain: 1,
            release: 0.2
        }
    }
    );
    synth.volume.value = -10;

    synth.connect(globalSynthLPF);
    // let lfo = new Tone.LFO("4n", 400, 4000);
    // lfo.connect(filter.frequency);
    return synth;
}

function newNoiseSynth() {

    let newSynth = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 10,
        oscillator: {
            type: "sine"
        }
        ,
        envelope: {
            attack: 0.005,
            decay: 0.4,
            sustain: 0.01,
            release: 1.4,
            attackCurve: "exponential"
        }
    }
    ).chain(chorus, reverb).toMaster();
    newSynth.volume.value = -10;
    return newSynth;
}

// Smooth pad!
// Its gain is very tilted to the left for some unknown reason
function createPadSynth(freq, index) {
    let noise = new Tone.Noise("pink").start();
    let padenv = new Tone.ScaledEnvelope({
        "attack": 5.0,
        "decay": 0.01,
        "sustain": 1.0,
        "release": 5.0,
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
        playing: false,
        midi: 60,
        noise: noise,
        env: padenv,
        filter: filter,
        gain: padGain,
        index: index,
        toggle: function (pad, time) {
            if (pad.playing) {
                pad.env.triggerRelease(time);
                pad.playing = false;
            } else {
                pad.filter.frequency.value = Tone.Frequency.mtof(pad.midi);
                let vel = Math.random() * 0.75 + 0.25;
                pad.env.triggerAttack(time, vel);
                pad.playing = true;
            }
        },
        release: function (pad) {
            if (pad.playing) {
                pad.env.triggerRelease();
                pad.playing = false;
            }
        },
        dispose: function (syn) {
            // syn.env.dispose();
            // syn.filter.dispose();
            // syn.gain.dispose();
            // syn.noise.dispose();
            padSynthsUsed[syn.index] = false;
        }
    };
}
function newPadSynth(freq) {
    for (let i = 0; i < fmSynths.length; i++) {
        if (padSynthsUsed[i] == false) {
            padSynthsUsed[i] = true;
            return padSynths[i];
        }
    }
    // Optionally create a new synth if none was free

    return undefined;// Return undefined to signal that no synth was free
}

function initSoundSignature() {
    let noise = new Tone.FMOscillator("C1", "sine", "square").start();
    let noiseGain = new Tone.Gain(0.0).connect(chorus).connect(longverb).connect(pingPong).toMaster();
    let userGain = new Tone.Signal(0.00);
    let chebylfofreq = new Tone.LFO(0.1, -1, 1).start();
    let chebylfo = new Tone.LFO(0.1, 0.03, 0.2).start();
    chebylfofreq.connect(chebylfo.frequency);
    let gainMult = new Tone.Multiply();
    let gainMult2 = new Tone.Multiply();
    let lpf = new Tone.Filter(600, "lowpass").connect(noiseGain);
    let lpfLFO = new Tone.LFO(1, 100, 10000).start();
    let env = new Tone.Envelope({
        "attack": 0.01,
        "decay": 0.03,
        "sustain": 0.5,
        "release": 0.1,
    });
    // Multiply two signals together
    userGain.connect(gainMult, 0, 0);
    chebylfo.connect(gainMult, 0, 1);
    gainMult.connect(gainMult2, 0, 0);
    env.connect(gainMult2, 0, 1);
    // Use as gain control
    gainMult2.connect(noiseGain.gain);


    let cheby = new Tone.Chebyshev(51).connect(lpf);
    noise.connect(cheby);
    return {
        playing: true,
        noise: noise,
        chebylfo: chebylfo,
        chebylfofreq: chebylfofreq,
        gainMult: gainMult,
        noiseGain: noiseGain,
        cheby: cheby,
        userGain: userGain,
        lpf: lpf,
        lpfLFO: lpfLFO,
        env: env,

        setGain: function (syn, gain) {
            syn.userGain.value = gain;
        },
        trigger: function (syn, time) {
            syn.env.triggerAttack(time);
            syn.playing = true;
        },
        release: function (syn, time) {
            if (syn.playing) {
                syn.env.triggerRelease(time);
                syn.playing = false;
            }
        },
        triggerAttackRelease: function (syn, time) {
            let duration = Math.random() * 0.4 + 0.1;
            let velocity = Math.random() + 0.5;
            syn.env.triggerAttackRelease(duration, time, velocity);
        },
        toggle: function (syn, time) {
            if (syn.playing) {
                syn.env.triggerRelease(time);
                syn.playing = false;
            } else {
                syn.env.triggerAttack(time);
                syn.playing = true;
            }
        },
        dispose: function (syn) {

            syn.release(syn);
            window.setTimeout(function () {
                syn.env.dispose();
                syn.noise.dispose();
                syn.chebylfo.dispose();
                syn.chebylfofreq.dispose();
                syn.gainMult.dispose();
                syn.noiseGain.dispose();
                syn.cheby.dispose();
            }, 5000)
            // padSynthsUsed[syn.index] = false;
        },
        setSignatureFromFingerprint: function (syn, rawPrint, timeScale = 1) {
            let rp = rawPrint;

            let octave = Math.floor(((rp[15] + rp[16] + rp[17]) * 5823.153) % 5);
            let freq = Tone.Frequency.mtof((rawPrint[0] % 3) * 7 + 48 + (12 * octave));
            syn.noise.frequency.value = freq;
            let order = ((rp[1] + rp[2] + rp[10]) * 999.4) % 300;
            // syn.cheby.order = order;
            let harmonicity = ((rp[3] + rp[4] + rp[11]) * 999.4) % 14 + 2;
            syn.noise.harmonicity.value = harmonicity;
            let modIndex = ((rp[5] + rp[6] + rp[12]) * 999.4) % 8 + 1;
            syn.noise.modulationIndex.value = modIndex;
            let lfofreqfreq = (((rp[7] + rp[8] + rp[13]) * 999.4) % 8 + 1) / (((rp[9] + rp[20] + rp[14]) * 999.4) % 8 + 1);
            syn.chebylfofreq.frequency.value = lfofreqfreq;

            let lfofreqamp = freq * Math.floor((rp[22] + rp[23] + rp[24]) % 3);
            syn.chebylfofreq.amplitude.value = lfofreqamp;
            let lpflfofreq = 20 / (((rp[5] + rp[6] + rp[12]) * 999.4) % 20 + 1);
            syn.lpfLFO.frequency.value = lpflfofreq * timeScale;
        }
    };
}

function newChebySynth() {
    let noise = new Tone.Noise("pink");
    let noiseGain = new Tone.Gain(0.0).connect(reverb).toMaster();
    let chebyenv = new Tone.ScaledEnvelope({
        "attack": 5.0,
        "decay": 0.01,
        "sustain": 1.0,
        "release": 5.0,
    });
    chebyenv.releaseCurve = "linear";
    chebyenv.max = 0.5;
    let chebylfofreq = new Tone.LFO(0.1, 0.05, 0.3).start();
    let chebylfo = new Tone.LFO(0.1, 0.05, 0.1).start();
    chebylfofreq.connect(chebylfo.frequency);
    let gainMult = new Tone.Multiply();
    // Multiply two signals together
    chebyenv.connect(gainMult, 0, 0);
    chebylfo.connect(gainMult, 0, 1);
    // Use as gain control
    gainMult.connect(noiseGain.gain);


    let cheby = new Tone.Chebyshev(300).connect(noiseGain);
    noise.connect(cheby);

    noise.start();

    return {
        playing: true,
        noise: noise,
        env: chebyenv,
        chebylfo: chebylfo,
        chebylfofreq: chebylfofreq,
        gainMult: gainMult,
        noiseGain: noiseGain,
        cheby: cheby,

        trigger: function (syn) {
            syn.env.triggerAttack();
            syn.playing = true;
        },
        release: function (syn) {
            if (syn.playing) {
                syn.env.triggerRelease();
                syn.playing = false;
            }
        },
        dispose: function (syn) {

            syn.release(syn);
            window.setTimeout(function () {
                syn.env.dispose();
                syn.noise.dispose();
                syn.chebylfo.dispose();
                syn.chebylfofreq.dispose();
                syn.gainMult.dispose();
                syn.noiseGain.dispose();
                syn.cheby.dispose();
            }, 5000)
            // padSynthsUsed[syn.index] = false;
        }
    };
}

function setSoundSignature(fingerprint) {
    soundSignature.setSignatureFromFingerprint(soundSignature, fingerprint);
}

function setSoundSignatureGain(gain) {
    soundSignature.setGain(soundSignature, gain);
}
function triggerSoundSignature(time) {
    soundSignature.trigger(soundSignature, time);
}
function releaseSoundSignature(time) {
    soundSignature.release(soundSignature, time);
}
function toggleSoundSignature(time) {
    soundSignature.toggle(soundSignature, time);
}
function attackReleaseSoundSignature(time) {
    soundSignature.triggerAttackRelease(soundSignature, time);
}

function clearIdsFromTransport(ids) {
    for (let id of ids) {
        // console.log("clearing id: " + id);
        Tone.Transport.clear(id);
    }
}

export {
    init_tone, newPadSynth, newChebySynth, clearIdsFromTransport,
    requestFMSynth, returnFMSynth, requestNoiseSynth, returnNoiseSynth,
    longverb, globalSynthLPF, reverb, chorus,
    getNumFreeFMSynths,
    setSoundSignatureGain, setSoundSignature, triggerSoundSignature, releaseSoundSignature, toggleSoundSignature, attackReleaseSoundSignature
};