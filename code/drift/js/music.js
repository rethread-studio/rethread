/* eslint-env es6 */

/* eslint-disable no-console */

// Playing the background ambience music for the drift exhibition

// Each sound file needs to be loaded into a buffer and played by a player

class Sample {
    constructor(url_path, autostart = false, loop = false, onstop = (source) => { }, delayed = false) {
        // delayed is used for samples that aren't needed right away and won't be counted for asset loading
        if (!delayed) {
            total_sound_assets += 1;
        }
        this.buf = null;
        this.player = null;
        this.autostart = autostart;
        let that = this;
        let buffer = new Tone.Buffer(url_path, function () {
            // console.log("loaded buffer " + url_path);

            //the buffer is now available.
            that.buf = buffer.get();

            that.player = new Tone.Player({
                url: buffer,
                loop: loop,
                loopStart: 0.0,
                loopEnd: buffer.length / buffer.sampleRate,
                onstop: onstop,
            }).toDestination();
            that.player.fadeOut = 0.8;

            if (that.autostart) {
                that.player.start();
            }
            if (!delayed) {
                register_sound_asset_loaded();
            }
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
const sites = ["bing", "google"];
// const root_sample_names = ["root_note_short1", "root_note_short2", "root_note_short3"];
const root_sample_names = ["root_note_shorter1", "root_note_shorter2"];
// const long_sample_names = ["long_notes_short1", "long_notes_short2", "long_notes_short3", "long_notes_short4"];
const long_sample_names = ["long_notes_short1", "long_notes_short2"];
const event_sample_names = ["chord5-1", "arpeggio1", "arpeggio2", "rain1", "rain2", "chord1-1", "chord1-2", "chord2-1", "chord4-1"];
const site_variants = ["fast", "middle_short", "slow_short"];
var enabled_variants = ["fast", "middle_short", "slow_short"];
var enabled_sites = [...sites];
var visitors_connected_level = 0; // 0-3, the number of connected visitors influences some sounds
var site_playing = false;
var last_played_site_sample = ""; // Keep track not to play the same 2 times in a row if possible
var currently_playing_site_sample = null;

// var root_sample = null;
var root_samples = [];
// var long_notes_sample = null;
var long_samples = [];
let site_sample_variants = new Map();
let visitor_samples = [];
let playing_visitor_sample = null;
let event_samples = [];
var all_music_loaded = false;

function load_all_music_assets() {
    // Load all audio files

    total_sound_assets = 0;
    loaded_sound_assets = 0;

    // Background samples
    // root_sample = new Sample(audio_file_root + "root_note.mp3", false, true);
    let root_i = 0;
    for (let file of root_sample_names) {
        if (root_i == 0) {
            root_samples.push(new Sample(audio_file_root + file + ".mp3", false, false,
                (source) => {
                    if (music_is_playing) {
                        let delay = Math.pow(Math.random(), 1.5) * 50000 + 10000;
                        setTimeout(() => {
                            let i = Math.floor(Math.random() * root_samples.length);
                            root_samples[i].start();
                        }, delay);
                    }
                }));
        } else {
            // Delay subsequent root samples for a bit, no need to load them right away
            setTimeout(() => {
                root_samples.push(new Sample(audio_file_root + file + ".mp3", false, false,
                    (source) => {
                        if (music_is_playing) {
                            let delay = Math.pow(Math.random(), 1.5) * 50000 + 10000;
                            setTimeout(() => {
                                let i = Math.floor(Math.random() * root_samples.length);
                                root_samples[i].start();
                            }, delay);
                        }
                    }, true));
            }, 30000);
        }
        root_i += 1;
    }
    root_i = 0;
    for (let file of long_sample_names) {
        if (root_i == 0) {
            long_samples.push(new Sample(audio_file_root + file + ".mp3", false, false,
                (source) => {
                    if (music_is_playing) {
                        let i = Math.floor(Math.random() * root_samples.length);
                        long_samples[i].start();
                    }
                }));
        } else {
            // Delay subsequent long samples for a bit, no need to load them right away
            setTimeout(() => {
                long_samples.push(new Sample(audio_file_root + file + ".mp3", false, false,
                    (source) => {
                        if (music_is_playing) {
                            let i = Math.floor(Math.random() * root_samples.length);
                            long_samples[i].start();
                        }
                    }, true));
            }, 30000);
        }
        root_i += 1;
    }
    // long_notes_sample = new Sample(audio_file_root + "long_notes.mp3", false, true);

    // Site samples
    for (let variant of site_variants) {
        let variant_map = new Map();
        for (let site of sites) {
            let sample = new Sample(audio_file_root + site + "_" + variant + ".mp3", false, false, (source) => {
                // Set site_playing to false after a short break
                setTimeout(() => {
                    site_playing = false
                }, Math.pow(Math.random(), 1.5) * 20000 + 5000)
            });
            variant_map.set(site, sample);
        }
        site_sample_variants.set(variant, variant_map);
    }
    // Visitor samples
    let visitor_sample_file_names = ["visitors1", "visitors2", "visitors3"];
    for (let name of visitor_sample_file_names) {
        let array = [];
        for (let i = 0; i < 3; i++) {
            array.push(new Sample(audio_file_root + name + "-" + (i + 1) + ".mp3", false, true, (source) => {
                visitor_samples[i][Math.floor(Math.random() * 3)].start();
            }));
        }
        visitor_samples.push(array);
    }
    // Event samples
    for (let name of event_sample_names) {
        event_samples.push(new Sample(audio_file_root + name + ".mp3", false, false));
    }
}

// Function called when a sample has finished loading
function register_sound_asset_loaded() {
    loaded_sound_assets += 1;
    // let e = document.getElementById("asset-loading-progress");
    if (loaded_sound_assets == total_sound_assets) {
        // e.innerHTML = "All assets loaded";
        // start_all();
        all_music_loaded = true;
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
    if (music_is_playing) {
        if (all_music_loaded) {
            event_samples[event_sample_index].start();
            event_sample_index += 1;
            if (event_sample_index >= event_samples.length) {
                shuffleArray(event_samples);
                event_sample_index = 0;
            }
        } else {
            // If the sounds haven't been loaded, schedule a sound effect to be played in a little while instead.
            setTimeout(start_sound_effect, 300);
        }
    }
}


function update_visitors_connected() {
    if (all_music_loaded && music_is_playing) {
        let new_level = 0;
        if (interaction.users) {
            if (interaction.users.length > 1) {
                // Someone more than the current user
                new_level = 1;
            }
            if (interaction.users.length > 3) {
                new_level = 2;
            }
            if (interaction.users.length > 7) {
                new_level = 3;
            }
        }
        // console.log("visitors connected, new_level: " + new_level + "\ninteraction.users: " + JSON.stringify(interaction.users));
        if (new_level != visitors_connected_level) {
            if (new_level > visitors_connected_level) {
                // Stop existing sound samples
                for (let i = 0; i < 3; i++) {
                    for (let j = 0; j < 3; j++) {
                        visitor_samples[i][j].stop();
                    }
                }
                // Start new sound samples
                for (let i = visitors_connected_level; i < new_level; i++) {
                    visitor_samples[i][0].start();
                }
            } else {
                // Stop existing sound samples
                for (let i = new_level; i < visitors_connected_level; i++) {
                    for (let j = 0; j < 3; j++) {
                        visitor_samples[i][j].stop();
                    }
                }
            }
            visitors_connected_level = new_level;
        }
        setTimeout(update_visitors_connected, 20000);
    }
};

// The loop that starts new site samples depending on what is enabled
var site_loop = new Tone.Loop(function (time) {
    if (!site_playing && enabled_variants.length > 0 && enabled_sites.length > 0) {
        // First choose a variant among the enabled variants
        let variant;
        let site;
        // Loop until finding a different one than last time
        do {
            variant = enabled_variants[Math.floor(Math.random() * enabled_variants.length)];
            site = enabled_sites[Math.floor(Math.random() * enabled_sites.length)];
        } while (enabled_variants.length * enabled_sites.length > 1 && (variant + site) == last_played_site_sample);
        currently_playing_site_sample = site_sample_variants.get(variant).get(site);
        currently_playing_site_sample.start();
        last_played_site_sample = variant + site;
        site_playing = true;
    }
}, "8n");

Tone.Transport.bpm.value = 75;

var music_is_playing = false;
// Starts everything with default settings
function start_all() {
    console.log("Start audio");
    if (all_music_loaded) {
        // delay the start of the root notes
        setTimeout(() => {
            if (music_is_playing) {
                root_samples[0].start();
            }
        }, 10000);
        long_samples[0].start();
        Tone.Transport.start();
        // delay the start of the site samples
        setTimeout(() => {
            if (music_is_playing) {
                site_loop.start(0);
            }
        }, 8000);
        update_visitors_connected();
        event_samples[3].start();
    } else if (!music_is_playing) {
        setTimeout(() => { start_all(); }, 300);
    }
    music_is_playing = true;
}

function stop_all() {
    console.log("Stop audio");
    // Must set this property first, otherwise some sounds will be restarted once stopped
    music_is_playing = false;
    Tone.Transport.stop();
    if(site_loop != null) {
        site_loop.stop();
    }
    if(currently_playing_site_sample instanceof Sample) {
        currently_playing_site_sample.stop();
    }
    
    for (let sample of root_samples) {
        if(sample instanceof Sample) {
            sample.stop();
        }
    }
    for (let sample of long_samples) {
        if(sample instanceof Sample) {
            sample.stop();
        } else {
            console.log("long sample not Sample")
            console.log(sample)
        }
    }
    for (let sample_list of visitor_samples) {
        for (let sample of sample_list) {
            if(sample instanceof Sample) {
                sample.stop();
            }
        }
    }
    for (let sample of event_samples) {
        if(sample instanceof Sample) {
            sample.stop();
        }
    }
}

// UI
function toggleAudioOnOff() {
    if (music_is_playing) {
        stop_all();
    } else {
        start_all();
    }
    let e = document.getElementById("audio-div");
    e.innerHTML = getAudioOnOffButton();
    // console.log("toggle audio, music_is_playing = " + music_is_playing + " ");
}

let audio_button_size = "fa-5x";
function getAudioOnOffButton(size = audio_button_size) {
    audio_button_size = size;
    let html;
    if (music_is_playing) {
        html = `
        <button onclick="toggleAudioOnOff();"><i class="fas fa-volume-up ${size}"></i></button>
        `;
    } else {
        html = `
        <button onclick="toggleAudioOnOff();"><i class="fas fa-volume-mute ${size}"></i></button>
        `;
    }
    return html;
}

// Delaying the sound asset loading by enough time here seems to place it after everything else, creating a smoother experience
setTimeout(() => {
    load_all_music_assets()
}, 1000);
