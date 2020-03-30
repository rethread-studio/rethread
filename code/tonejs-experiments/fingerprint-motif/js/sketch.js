/*
 * XY(Z)-pad in Tone.js 
 */

let pitchSet = [60, 59, 62, 64, 65, 67, 69, 71, 72, 74];
let schedulingIds = [];
let synths = [];
let numParametersUsed = 1;

class Motif {
    pitches;
    // Duration is the number of 16th notes the pitch spans
    durations;
    constructor(){
        this.pitches = [];
        this.durations = [];
    }
    schedulePlayback(synth, transport){
        let totalDur = 0;
        console.log("pitchlen: " + this.pitches.length + " durlen: " + this.durations.length);
        console.log("durations: " + this.durations);
        console.log("pitches: " + this.pitches);
        for(let i in this.pitches) {
            // Schedule the note to be played
            let pitch = Tone.Frequency.mtof(this.pitches[i]);
            let dur = this.durations[i].valueOf();
            let schedTime = dur16ToTransport(totalDur);
            let id = transport.schedule(function(time){
                console.log("pitch: " + pitch + " dur: " + dur + " time: " + time);
                synth.triggerAttackRelease(
                    pitch,
                    "16n",//dur16ToTransport(dur/2),
                    time
                );
            }, schedTime);
            // For later removing the event from scheduling
            schedulingIds.push(id);
            // Add the scheduling time so the next note is scheduled after this one.
            totalDur += this.durations[i];
        }
    }
    addPitch(i) {
        this.pitches.push(pitchSet[i%pitchSet.length]);
        this.durations.push(2);
    }
    changeDur(i, newDur) {
        let index =  Math.floor(i) % (this.durations.length);
        console.log("i: " + i + " durindex: " + index + " newDur: " + newDur + " durlength: " + this.durations.length);
        this.durations[index] = newDur;
    }
}

/// Converts a duration based on the number of 16th notes to the Tone.Transport format "bar:quarter:sixteenth"
/// https://github.com/Tonejs/Tone.js/wiki/Time
function dur16ToTransport(dur) {
    const quarterNotesPerBar = 4;
    let sixteenths = dur%4;
    let quarters = ((dur-sixteenths)/4) % quarterNotesPerBar;
    let bars = (((dur-sixteenths)/4) - quarters) / quarterNotesPerBar;
    return "" + bars + ":" + quarters + ":" + sixteenths;
}

let fmSynth;
let fmSynth2;
let fmSynth3;

let fm2_lfo1;
let fm2_lfo2;

let fingerPrints = [];
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
          fingerPrints = t.slice(1);
          for (let l of fingerPrints) {
            const vs = l.split(",");
            for (let i in vs) {
              let v = headers[i] + "_" + vs[i];
              // Add some global information for that specific data point
            }
          }
        }
      });

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

    bassSynth.triggerAttackRelease("D0", "1n", 0, 0.8);
    bassSynth.triggerAttackRelease("A0", "1n", "4n", 0.1);
    bassSynth.triggerAttackRelease("G0", "1n", "2n", 0.2);
    bassSynth.triggerAttackRelease("A0", "1n", "2n.", 0.1);
    bassSynth.triggerAttackRelease("E0", "1n", "1m", 0.5);
    bassSynth.triggerAttackRelease("A0", "1n", "1:1", 0.1);
    bassSynth.triggerAttackRelease("G0", "1n", "1:2", 0.2);
    bassSynth.triggerAttackRelease("A0", "1n", "1:3", 0.1);
    
    

    Tone.Transport.bpm.value = 140;
    Tone.Transport.loop = true;
    Tone.Transport.setLoopPoints(0, "2m");

    //start/stop the transport
    document.getElementById('start-stop')
        .addEventListener('click', e => {
            Tone.Transport.toggle();
            console.log("Toggled transport");
        })
    //Tone.Transport.start();

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
    ).connect(longverb).toMaster();
    synth.volume.value = -10;
    // synth.sync();
    synths.push(synth);
    return synth;
}

function getRandomFingerPrint() {
    return fingerPrints[Math.floor(fingerPrints.length * Math.random())];
}

function renderFingerPrint() {
    if (fingerPrints.length == 0) {
      return;
    }
    const p = [];
    let fingerPrint = getRandomFingerPrint();
    let motif = new Motif();
    const vs = fingerPrint.split(",");
    for (let i = 0; i < vs.length && i < numParametersUsed; i++) {
        let v = headers[i] + "_" + vs[i];
        switch(i%2) {
            case 0:
                motif.addPitch(vs[i]);
                break;
            case 1:
                motif.changeDur(i/2, vs[i]%6 + 1);
                break;

      }
    }
    let synth = newSynth();
    motif.schedulePlayback(synth, Tone.Transport);
  }


StartAudioContext(Tone.context, 'start-stop').then(function(){
    //callback is invoked when the AudioContext.state is 'running'
    console.log("Starts audio context");
})

let fmSynthOn = false;
document.getElementById("test1").onclick = function(){
    if(!fmSynthOn) {
        fmSynth.triggerAttack("c2");
    } else {
        fmSynth.triggerRelease();
    }
    fmSynthOn = !fmSynthOn;
}

document.getElementById("test2").onclick = function(){
    fmSynth2.triggerAttack("c2");
}

document.getElementById("test3").onclick = function(){
    renderFingerPrint();
}

document.getElementById("clear-timeline").onclick = function(){
    for(id of schedulingIds) {
        Tone.Transport.clear(id);
    }
    schedulingIds = [];
}

document.getElementById("numParameters").value = numParametersUsed;
document.getElementById("numParameters").addEventListener('input', function(e){
    numParametersUsed = e.target.value;
});

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