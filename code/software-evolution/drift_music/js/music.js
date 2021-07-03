/* eslint-env es6 */

/* eslint-disable no-console */

// Playing the background ambience music for the drift exhibition

// Each sound file needs to be loaded into a buffer and played by a player

class Sample {
	constructor(url_path, autostart = false, loop = false, onstop = (source) => {}) {
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
			
			if (autostart) {
				console.log("starting " + url_path);
				that.player.start();
			}
		});
	}
	start() {
		if (this.player != null) {
			this.player.start();
		}
	}
	
}

// Load all audio files
const audio_file_root = "./audio/";
const background_paths = ["root_note.mp3", "long_notes.mp3"];
const sites = ["bing"];
const site_variants = ["fast", "middle", "slow"];
var site_playing = false;
let background_samples = [];
for (let path of background_paths) {
	background_samples.push(new Sample(audio_file_root + path, false, true))
}

let site_samples = [];
for (let site of sites) {
	for (let variant of site_variants) {
		site_samples.push(new Sample(audio_file_root + site + "_" + variant + ".mp3", false, false, (source) => {site_playing = false}));
	}
}

// Start everything at the click of a button
document.getElementById("tone-play-toggle").onclick = () => {
	for (let sample of background_samples) {
		sample.start();
	}


	var loop = new Tone.Loop(function(time){
		if(!site_playing) {
			let sample = site_samples[Math.floor(Math.random() * site_samples.length)];
			sample.start();
			site_playing = true;
		}

	}, "8n").start(0);
	Tone.Transport.start();
	
};