/*
 * XY(Z)-pad in Tone.js 
 */

let fmSynth;
let fmSynth2;
let fmSynth3;

let fm2_lfo1;
let fm2_lfo2;

function setup() {
    // P5

    createCanvas(640, 640);
    points.push(new MovingPoint(new p5.Vector(width/2, height/2)));

    // Tone.js

    reverb = new Tone.Reverb(0.5).toMaster();
    reverb.generate();
    longverb = new Tone.Reverb(8).toMaster();
    longverb.generate();

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
            release : 0.5
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
    fmSynth.triggerAttack();

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
    

    Tone.Transport.bpm.value = 140;

    //start/stop the transport
    document.getElementById('start-stop')
        .addEventListener('click', e => {
            Tone.Transport.toggle();
            console.log("Toggled transport");
        })
    //Tone.Transport.start();

}


StartAudioContext(Tone.context, 'start-stop').then(function(){
    //callback is invoked when the AudioContext.state is 'running'
    console.log("Starts audio context");
})

document.getElementById("test1").onclick = function(){
    fmSynth.triggerAttack("c3");
}

document.getElementById("test2").onclick = function(){
    fmSynth2.triggerAttack("c2");
}

let scale = [0, 2, 4, 5, 7, 11];

function updateSound(x, y) {
    // console.log("x: " + x + " y: " + y);
    fmSynth.modulationIndex.value = x * 100;
    fmSynth.harmonicity.value = Math.floor(Math.abs(x-y) * 20) + 1;
    fmSynth.detune.value = Math.floor(y * 50) * 100;

    fm2_lfo1.max = Math.pow(x, 2)*200;
    fm2_lfo1.frequency.value = Math.sin(y * 20) * 5 + 6;

    fm2_lfo2.frequency.value = Math.sin(x * 30) * 3 + 3.1;
    fm2_lfo2.max = y * 2;

    let scale_i = Math.sin( (1 - (x * y)) * 20) * 0.5 + 0.5;
    scale_i = Math.floor(scale_i * scale.length*3.2);
    let octave = Math.floor(scale_i/scale.length) + 2;
    // console.log("oct: " + octave);
    let note_offset = Math.floor(y * 5) + 1;
    let midinote = scale[(scale_i*note_offset)%scale.length] + (12 * octave);
    let freq = Tone.Frequency.mtof(midinote);

    fmSynth2.frequency.value = freq;
}