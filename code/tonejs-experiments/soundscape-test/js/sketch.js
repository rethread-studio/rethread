/*
 * Sketch to try out using unsynchronized grids with 19-EDO to sonify a collection of browser fingerprints
 * In Firefox:
 * This runs very slow after a while, as if triggered synths continue taking up resources after they've finished playing.
 */

class Index {
    v = 0;
    constructor(length) {
        this.v = 0;
        this.length = length;
    }
    progress() {
        this.v = (this.v+1) % this.length;
    }
    set_length(length) {
        this.length = length;
        this.v = this.v % this.length;
    }
}

class Grid {
    constructor(grid, indices) {
        this.grid = grid;
        this.indices = new Array();
        for(let i = 0; i < indices; i++) {
            this.indices.push(new Index(grid.length));
        }
        console.log(this.indices);
    }
    value(i) {
        let v = this.grid[this.indices[i].v];
        return v;
    }
    progress(i) {
        this.indices[i].progress();
    }
    set_grid(grid) {
        this.grid = grid;
        for(let i = 0; i < this.indices.length; i++) {
            this.indices[i].set_length(this.grid.length);
        }
    }
}

function amp2db(amp) {
    return 20 * Math.log10(amp);
}

let loopBeat;

let bassSynth;
let snareSynth;
let leadSynths;
let metalSynth;
let chordSynths;
let reverb;
let longverb;
let chord = [60, 63, 67, 70, 72];
let chords = [
    [60, 63, 67, 70, 72],
    [59, 62, 65, 67, 74],
    [60, 65, 68, 72, 75],
    [72, 75, 79, 82, 84],
    [84, 87, 91, 94, 96],
];
let root_note = 60;

const NUM_INDICES = 16;

// A hypothetical grid of how common different resolutions are e.g. 3840x2160 2560x1440 1920x1080 1366x768 1280x720 800x600 640x480
let screen_size_grid = new Grid([0.1, 0.05, 0.65, 0.1, 0.05, 0.025, 0.025], NUM_INDICES);
// The canvas grid could be a hash of the result of a canvas test hashed and then moded or something like that
let canvas_grid = new Grid([0.05, 0.3, 0.08, 0.05, 0.05, 0.11], NUM_INDICES);
// The length of the language grid could evolve as more languages are added
let language_grid = new Grid([0.3, 0.2, 0.2, 0.1, 0.04, 0.02, 0.04, 0.03, 0.03, 0.02, 0.01, 0.01, 0.01], NUM_INDICES);
// Could be browser as in Firefox/Chrome/Safari or browser versions etc.
let browser_grid = new Grid([0.8, 0.13, 0.07], NUM_INDICES);

function randomizeGrids() {
    let n_elements = Math.floor(Math.random() * 8 + 2);
    screen_size_grid.set_grid(getRandomGrid(n_elements));
    n_elements = Math.floor(Math.random() * 3 + 2);
    browser_grid.set_grid(getRandomGrid(n_elements));
    n_elements = Math.floor(Math.random() * 10 + 2);
    language_grid.set_grid(getRandomGrid(n_elements));
    n_elements = Math.floor(Math.random() * 16 + 4);
    canvas_grid.set_grid(getRandomGrid(n_elements));
}

function getRandomGrid(num_elements) {
    let grid = [];
    for(let i = 0; i < num_elements; i++) {
        grid.push(Math.random());
    }
    return normalizeArray(grid);
}

function normalizeArray(array) {
    let normalizer = 1/array.reduce((a, b) => a + b, 0);
    let normalizedArray = array.map(x => x * normalizer);
    return normalizedArray;
}

let counter = 0;
let bars = 0;
let chord_synth_i = 0;
let chord_note_i = 0;
let lead_synth_i = 0;

let play = {
    bassDrum : false,
    bass : false,
    chord : false,
    hihat : false,
    snare : false,
}

function setup() {
    // P5

    createCanvas(640, 1080);

    // Tone.js

    reverb = new Tone.Reverb(0.5).toMaster();
    reverb.generate();
    longverb = new Tone.Reverb(8).toMaster();
    longverb.generate();

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

    snareSynth = new Tone.NoiseSynth(
        {
            noise : {
                type : "pink"
            },
            envelope : {
                attack : 0.005 ,
                decay : 0.01 ,
                sustain : 0.001
            }
        }   
    ).connect(reverb).toMaster();
    snareSynth.volume.value = -4;

    leadSynths = [];
    for(let i = 0; i < 8; i++) {
        let leadSynth = new Tone.FMSynth(
            {
                harmonicity : 1 ,
                modulationIndex : 8 ,
                detune : 0 ,
                oscillator : {
                type : "sine"
                }
                ,
                envelope : {
                attack : 0.01 ,
                decay : 0.01 ,
                sustain : 1 ,
                release : 0.5
                }
                ,
                modulation : {
                type : "square"
                }
                ,
                modulationEnvelope : {
                attack : 0.5 ,
                decay : 0 ,
                sustain : 0.25 ,
                release : 0.5
                }
            }            
        ).connect(longverb).toMaster();
        leadSynth.volume.value = 0;
        leadSynths.push(leadSynth);
        var lfo = new Tone.LFO("8n", 0.0, 1.0);
        lfo.start(0);
        lfo.connect(leadSynth.detune);      
    }

    metalSynth = new Tone.MetalSynth(
        {
            frequency : 2000 ,
            envelope : {
                attack : 0.001 ,
                decay : 0.3 ,
                release : 0.01
            },
            harmonicity : 5.1 ,
            modulationIndex : 32 ,
            resonance : 4000 ,
            octaves : 1.5
        }
    ).toMaster();
    metalSynth.volume.value = -12;

    let chordOptions =  {
        harmonicity : 1.9,
        modulationIndex : 3,
        detune : 0.0 ,
        oscillator : {
            type : "fatsawtooth"
        },
        envelope : {
            attack : 0.6 ,
            decay : 0.5 ,
            sustain : 0.2 ,
            release : 5
        },
        modulation : {
            type : "square"
        },
        modulationEnvelope : {
            attack : 0.01 ,
            decay : 1 ,
            sustain : 0.01 ,
            release : 0.5
        }
    }
        

    chordSynths = [];
    for(let i = 0; i < chords[0].length; i++) {
        var autoFilter = new Tone.AutoFilter("2n", 1000, 0.5).connect(longverb).toMaster().start();
        let synth = new Tone.Synth(chordOptions).connect(autoFilter);;
        synth.volume.value = -8;
        chordSynths.push(synth);
    }
    

    Tone.Transport.bpm.value = 140;

    let gridLoop = new Tone.Loop(gridPlayback, '8n');
    gridLoop.start(0);

    //start/stop the transport
    document.getElementById('start-stop')
        .addEventListener('click', e => {
            Tone.Transport.toggle();
            console.log("Toggled transport");
        })
    //Tone.Transport.start();

}

let note = chord[0];
let noteIndex = 0;

/// Construct a chord based on the current grids so that it only changes when the grids change
/// TODO: first choose a scale, then create the chord?
function generateChord() {
    let canvas_grid_size = canvas_grid.grid.length;
    let browser_grid_size = browser_grid.grid.length;
    let language_grid_size = language_grid.grid.length;
    let screen_size_grid_size = screen_size_grid.grid.length;
    // What it the highest value in the array?
    let screen_size_bias = Math.max.apply(Math, screen_size_grid.grid);
    let screen_size_bias_i = screen_size_grid.grid.indexOf(screen_size_bias);
    let language_bias = Math.max.apply(Math, language_grid.grid);
    let language_bias_i = language_grid.grid.indexOf(language_bias);
    let browser_bias = Math.max.apply(Math, browser_grid.grid);
    let browser_bias_i = browser_grid.grid.indexOf(browser_bias);
    
    let root_note = 20 + canvas_grid_size + browser_grid_size + language_grid_size + screen_size_grid_size;
    let third = 4;
    if(browser_bias > 0.5) {
        third = 3;
    }
    chord = [root_note, root_note + 7];
    // chord[0] += Math.floor((screen_size_grid.value(15)) * 12);
    if(screen_size_bias > 0.3) {
        chord.push(chord[0] + third);
    } else {
        chord.push(chord[0] + third + 12);
    }
    if(screen_size_bias_i > 2) {
        chord.push(chord[0] + 13);
    } else {
        chord.push(chord[0] + 14);
    }
    if(language_bias < 0.4) {
        chord.push(chord[0] + 19);
        chord.push(chord[0] + 21);
    }
    if(language_bias_i > 1) {
        chord.push(chord[0] + 11);
    }
    let octaves = Math.floor((screen_size_grid.value(15)) * 4);
    let extraNotes = chord.slice();
    for(let i = 0; i < octaves; i++) {
        for(let j = 0; j < extraNotes.length; j++) {
            chord.push(extraNotes[j] + (12*(i+1)));
        }
    }
}

function gridPlayback(time) {
    chord = chords[0];

    chord = [60];
    // chord[0] += Math.floor((screen_size_grid.value(15)) * 12);
    if(browser_grid.value(2) > 0.5) { chord[0] += 3; }
    if(screen_size_grid.value(7) > 0.3) {
        chord.push(chord[0] + 4);
    } else {
        chord.push(chord[0] + 16);
    }
    if(canvas_grid.value(6) > 0.1) {
        chord.push(chord[0] + 7);
    } else {
        chord.push(chord[0] + 8);
    }
    
    chord.sort();

    chord = [60, 64, 67, 69, 72, 74, 79];

    generateChord();

    let snare_amp = (screen_size_grid.value(0)*0.5 + screen_size_grid.value(3)*0.25 + language_grid.value(1)*0.25);
    let snare_db = amp2db(snare_amp*0.5 * browser_grid.value(15));
    snareSynth.volume.value = snare_db;
    snareSynth.triggerAttackRelease('16n', time);

    let leadDensity = Math.floor(screen_size_grid.value(6) * 24 + 1);
    if(counter%leadDensity == 0) {
        let db = amp2db(browser_grid.value(5) * 0.5);
        leadSynths[lead_synth_i].volume.value = db;
        let note = chord[Math.floor((canvas_grid.value(7) + browser_grid.value(6))*0.5*chord.length)];
        note = Tone.Frequency(note-12, "midi"),
        leadSynths[lead_synth_i].triggerAttackRelease(note, "8n.", time);
        lead_synth_i = (lead_synth_i+1) % leadSynths.length;
    }

    if(language_grid.value(1) > 0.1) {
        let db = amp2db(language_grid.value(0));
        bassSynth.volume.value = db;
        let note = chord[0];
        note = Tone.Frequency(note-48, "midi");
        bassSynth.triggerAttackRelease(note, "1n", time);
    }

    if(counter%1 == 0) {
        chord_note_i %= chord.length;
        
        let num_notes = Math.floor(browser_grid.value(11) * 3 + 1);
        for(let i = 0; i < num_notes; i++) {
            chordSynths[chord_synth_i].volume.value = amp2db(language_grid.value(4));
            chordSynths[chord_synth_i]
                .triggerAttackRelease(
                    Tone.Frequency(chord[chord.length-1-chord_note_i], "midi"),
                    '8n',
                    time
                );
            chord_synth_i = (chord_synth_i + 1) % chordSynths.length;
            chord_note_i = (chord_note_i + 1) % chord.length;
        }
    }
    // Progress the different indexes
    for(let i = 0; i < NUM_INDICES; i++) {
        if(counter%(i+1) == 0) {
            language_grid.progress(i);
            canvas_grid.progress(i);
            browser_grid.progress(i);
            screen_size_grid.progress(i);
        }
    }
    counter += 1;
}

StartAudioContext(Tone.context, 'start-stop').then(function(){
    //callback is invoked when the AudioContext.state is 'running'
    console.log("Starts audio context");
})

function playPart(e) {
    // 'this' is reference to checkbox clicked on
    let part = this.name;
    play[part] = this.checked;
}

document.getElementById("test").onclick = function(){
    // test synths
    let chord = [60, 64, 67, 71, 72];
        chordSynths.forEach(function(synth, index) {
            language_grid.value
            synth.triggerAttackRelease(
                Tone.Frequency(chord[Math.floor(Math.random()*(chord.length-1))], "midi"),
                '8n'
            );
        });
}

document.getElementById('randomize-grids').onclick = randomizeGrids;