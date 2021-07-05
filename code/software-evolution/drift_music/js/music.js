/* eslint-env es6 */

/* eslint-disable no-console */

// Playing the background ambience music for the drift exhibition

// Each sound file needs to be loaded into a buffer and played by a player

class Sample {
	constructor(url_path, autostart = false, loop = false, onstop = (source) => {}) {
        total_sound_assets += 1;
		this.buf = null;
		this.player = null;
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
			
			if (autostart) {
				console.log("starting " + url_path);
				that.player.start();
			}
            register_sound_asset_loaded();
		});
	}
	start() {
		if (this.player != null) {
			this.player.start();
		}
	}
    stop() {
		if (this.player != null) {
			this.player.stop();
		}
	}

	
}

// Load all audio files
const audio_file_root = "./audio/";
const sites = ["bing", "duckduckgo", "google"];
const site_variants = ["fast", "middle", "slow"];
var enabled_variants = ["fast", "middle", "slow"];
var enabled_sites = [...sites];
var site_playing = false;
var last_played_site_sample = ""; // Keep track not to play the same 2 times in a row if possible
var currently_playing_site_sample = null;
var total_sound_assets = 0;
var loaded_sound_assets = 0;
function register_sound_asset_loaded() {
    loaded_sound_assets += 1;
    let e = document.getElementById("asset-loading-progress");
    if (loaded_sound_assets == total_sound_assets) {
        e.innerHTML = "All assets loaded";
    } else {
        let progress = (loaded_sound_assets / total_sound_assets) * 100;
        e.innerHTML = `
<h5>Loading assets:</h5>
<progress value="${progress}" max="100">
</progress>
`;
    }

}
let root_sample = new Sample(audio_file_root + "root_note.mp3", false, true);
let long_notes_sample = new Sample(audio_file_root + "long_notes.mp3", false, true);

let site_sample_variants = new Map();
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

// Set up checkboxes
for (let variant of site_variants) {

    let query = 'input[value="' + variant + '"]';
    let checkbox = document.querySelector(query);
    checkbox.addEventListener('change', () => {
  if(checkbox.checked) {
      if (!enabled_variants.includes(variant)) {
          enabled_variants.push(variant);
      }
  } else {
      if (enabled_variants.includes(variant)) {
          let index = enabled_variants.findIndex((element) => {
              return element === variant
          });
          enabled_variants.splice(index, 1) // this is hStart root note
      }
  }
});
}

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

document.getElementById("start-root").onclick = () => {
    root_sample.start();
};
document.getElementById("stop-root").onclick = () => {
    root_sample.stop();
};
document.getElementById("start-long").onclick = () => {
    long_notes_sample.start();
};
document.getElementById("stop-long").onclick = () => {
    long_notes_sample.stop();
};
// Start everything at the click of a button
document.getElementById("play-sites").onclick = () => {
	Tone.Transport.start();
	site_loop.start(0);
};

document.getElementById("stop-sites").onclick = () => {
	Tone.Transport.stop();
	site_loop.stop();
    if(currently_playing_site_sample != null) {
        currently_playing_site_sample.stop();
    }
};

// Start everything with default settings (move this to the actual exhibition)


document.getElementById("start-all").onclick = () => {
    setTimeout(() => {
        root_sample.start();
    }, 5000);
    long_notes_sample.start();
	Tone.Transport.start();
	site_loop.start(0);
};
