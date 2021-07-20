/* eslint-env es6 */

/* eslint-disable no-console */

// Playing the background ambience music for the drift exhibition

// Each sound file needs to be loaded into a buffer and played by a player

class Sample {
	constructor(url_path, autostart = false, loop = false, onstop = (source) => {}) {
        total_sound_assets += 1;
		this.buf = null;
		this.player = null;
        this.autostart = autostart;
		let that = this;
		let buffer = new Tone.Buffer(url_path, function(){
			console.log("loaded buffer " + url_path);
			
			//the buffer is now available.
			that.buf = buffer.get();
			console.log(" length: " + buffer.length/buffer.sampleRate);

			that.player = new Tone.Player({
				url: buffer,
				loop: loop,
				loopStart: 0.0,
				loopEnd: buffer.length/buffer.sampleRate,
				onstop: onstop,
			}).toDestination();
            that.player.fadeOut = 0.8;
			
			if (that.autostart) {
				console.log("starting " + url_path);
				that.player.start();
			}
            register_sound_asset_loaded();
		});
	}
	start() {
		if (this.player != null) {
			this.player.start();
		} else {
            this.autostart = true;
        }
	}
    stop() {
		if (this.player != null) {
			this.player.stop();
		} else {
            this.autostart = false;
        }
	}	
}

var total_sound_assets = 0;
var loaded_sound_assets = 0;
const audio_file_root = "./audio/";
const sites = ["bing", "duckduckgo", "google"];
const event_sample_names = ["arpeggio1", "arpeggio2", "rain1", "rain2", "chord1-1", "chord1-2", "chord2-1", "chord4-1", "chord5-1"];
const site_variants = ["fast", "middle", "slow"];
var enabled_variants = ["fast", "middle", "slow"];
var enabled_sites = [...sites];
var visitors_connected_level = 0; // 0-3, the number of connected visitors influences some sounds
var site_playing = false;
var last_played_site_sample = ""; // Keep track not to play the same 2 times in a row if possible
var currently_playing_site_sample = null;

var root_sample = null;
var long_notes_sample = null;
let site_sample_variants = new Map();
let visitor_samples = [];
let event_samples = [];

function load_all_music_assets() {
    // Load all audio files
    
    total_sound_assets = 0;
    loaded_sound_assets = 0;

    // Background samples
    root_sample = new Sample(audio_file_root + "root_note.mp3", false, true);
    long_notes_sample = new Sample(audio_file_root + "long_notes.mp3", false, true);

    // Site samples
    for (let variant of site_variants) {
        let variant_map = new Map();
        for (let site of sites) {
            let sample = new Sample(audio_file_root + site + "_" + variant + ".mp3", false, false, (source) => {
                // Set site_playing to false after a short break
                setTimeout(() => {
                    site_playing = false
                }, 3000)
            });
            variant_map.set(site, sample);
        }
        site_sample_variants.set(variant, variant_map);
    }
    // Visitor samples
    let visitor_sample_file_names = ["visitors1", "visitors2", "visitors3"];
    for (let name of visitor_sample_file_names) {
        visitor_samples.push(new Sample(audio_file_root + name + ".mp3", false, true));
    }
    // Event samples
    let event_div = document.getElementById("event-samples");
    for (let name of event_sample_names) {
        event_samples.push(new Sample(audio_file_root + name + ".mp3", false, false));
        let i = event_samples.length-1;
        event_div.innerHTML += '<button id="start-' + name + '" type="button" onclick="event_samples['+i+'].start()">'+name+'</button>';
    }
}

// Function called when a sample has finished loading
function register_sound_asset_loaded() {
    loaded_sound_assets += 1;
    // let e = document.getElementById("asset-loading-progress");
    if (loaded_sound_assets == total_sound_assets) {
        // e.innerHTML = "All assets loaded";
        start_all();
    } else {
//         let progress = (loaded_sound_assets / total_sound_assets) * 100;
//         e.innerHTML = `
// <h5>Loading assets:</h5>
// <progress value="${progress}" max="100">
// </progress>
// `;
    }
}



////////////////////////////////////////
//// Functions for starting sounds ////
//////////////////////////////////////

// by Laurens Holst
// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
/* Randomize array in-place using Durstenfeld shuffle algorithm */
function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

var event_sample_index = Math.floor(Math.random() * event_samples.length);
function start_sound_effect() {
    event_samples[event_sample_index].start();
    event_sample_index += 1;
    if(event_sample_index >= event_samples.length) {
        shuffleArray(event_samples);
        event_sample_index = 0;
    }
}


function update_visitors_connected(new_level) {
    if (new_level != visitors_connected_level) {
        if (new_level > visitors_connected_level) {
            // Start new sound samples
            for(let i = visitors_connected_level; i < new_level; i++) {
                visitor_samples[i].start();
            }
        } else {
            // Stop existing sound samples
            for(let i = new_level; i < visitors_connected_level; i++) {
                visitor_samples[i].stop();
            }
        }
        visitors_connected_level = new_level;
    }
};

// The loop that starts new site samples depending on what is enabled
var site_loop = new Tone.Loop(function(time){
    if(!site_playing && enabled_variants.length > 0 && enabled_sites.length > 0) {
        // First choose a variant among the enabled variants
        let variant;
        let site;
        // Loop until finding a different one than last time
        do {
        variant = enabled_variants[Math.floor(Math.random() * enabled_variants.length)];
        site = enabled_sites[Math.floor(Math.random() * enabled_sites.length)];
        } while (enabled_variants.length * enabled_sites.length > 1 && (variant + site) == last_played_site_sample);
        console.log("variant: " + variant + " site: " + site);
        currently_playing_site_sample = site_sample_variants.get(variant).get(site);
        currently_playing_site_sample.start();
        last_played_site_sample = variant + site;
        site_playing = true;
    }
}, "8n");

Tone.Transport.bpm.value = 75;

// Starts everything with default settings
function start_all() {
    setTimeout(() => {
        root_sample.start();
    }, 5000);
    long_notes_sample.start();
	Tone.Transport.start();
	site_loop.start(0);
}

load_all_music_assets();