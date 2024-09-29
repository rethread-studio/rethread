// import: thisProcess.interpreter.compileFile(path).()

// Regenerate sound files for
// - sjvasquez#handwriting-synthesis

// - [x] En icket-engelsk röst per ankare + en engelsk röst
// - [x] Ta bort mest aggressiva glitchet
// - [x] Lägg till toner
// - [ ] Generera nya röster för loam
// - [x] Splitta loam i 3
// - [x] Testa att inte normalisera glitch för bättre balans

("/home/erik/code/kth/loam/repo_data_manip/wav_files/repos/apache#maven/non_english/*.wav").resolveRelative.pathMatch.collect{|file|file.split($/).last.asString}
// Construct ~anchors and set file paths
(
var english_voices = ["en_UK@apope_low.wav", "en_US@hifi-tts_low.wav", "en_US@vctk_low.wav", "tts_models@en@ljspeech@tacotron2-DDC_ph.wav"],
non_english_voices = ("/home/erik/code/kth/loam/repo_data_manip/wav_files/repos/apache#maven/non_english/*.wav").resolveRelative.pathMatch.collect{|file|file.split($/).last.asString},
proprietary_buffers = ("/home/erik/code/kth/loam/repo_data_manip/wav_files/repos/PROPRIETARY/*.wav").resolveRelative.pathMatch.collect( { |file|
	Buffer.readChannel(s, file, channels: [0]);}),
repo = { | name, is_redacted = false, num_contributors = nil |
	(
		name: name,
		num_contributors: num_contributors,
		is_redacted: is_redacted,
		english: nil,
		non_english: nil,
		glitchy: nil,
		main_voice: nil,
		english_voice: nil,
		load: {|self, voice_index|
			if(self.is_redacted == false, {
				self.glitchy = ("/home/erik/code/kth/loam/repo_data_manip/wav_files/repos/" ++ self.name ++ "/glitchy/*.wav").resolveRelative.pathMatch.collect( { |file|
					var buf = Buffer.readChannel(s, file, channels: [0]);
					// buf.normalize;
					buf
				});
				self.english = ("/home/erik/code/kth/loam/repo_data_manip/wav_files/repos/" ++ self.name ++ "/english/*.wav").resolveRelative.pathMatch.collect( { |file|
					var buf = Buffer.readChannel(s, file, channels: [0]); buf.normalize; buf
				});
				self.non_english = ("/home/erik/code/kth/loam/repo_data_manip/wav_files/repos/" ++ self.name ++ "/non_english/*.wav").resolveRelative.pathMatch.collect( { |file|
					var buf = Buffer.readChannel(s, file, channels: [0]); buf.normalize; buf
				});
				("/home/erik/code/kth/loam/repo_data_manip/wav_files/repos/" ++ self.name ++ "/non_english/*.wav").resolveRelative.pathMatch.do( { |file|
					var filename =file.split($/).last.asString;
					if(filename == (non_english_voices[voice_index.min(non_english_voices.size-1)]), {
						var buf = Buffer.readChannel(s, file, channels: [0]); buf.normalize;
						self.main_voice = buf;
					});
				});
				("/home/erik/code/kth/loam/repo_data_manip/wav_files/repos/" ++ self.name ++ "/english/*.wav").resolveRelative.pathMatch.do( { |file|
					var filename =file.split($/).last.asString;
					if(filename == (english_voices[voice_index%english_voices.size]), {
						var buf = Buffer.readChannel(s, file, channels: [0]); buf.normalize;
						self.main_english_voice = buf;
					});
				});
				if (self.main_voice == nil, {self.main_voice = self.non_english.choose});
				if (self.main_english_voice == nil, {self.main_english_voice = self.english.choose});
			}, {
				self.glitchy = ~proprietary_buffers;
				self.main_voice = self.glitchy.choose;
				self.main_english_voice = self.main_voice;
			}
			);
		},
	)
},
anchor = { | repos, name = "" |
	(
		name: name,
		repos: repos,
		current_repo: 0,
		next_repo: { |self| self.current_repo = (self.current_repo + 1) % self.repos.size; },
		number: 0,
		load_buffers: {|self|
			self.repos.do{|repo| repo.load(self.number); s.sync;};
		},
	)
},
repos = "/home/erik/code/kth/loam/repo_data_manip/wav_files/repos/*".resolveRelative.pathMatch.collect{|dir| var parts = dir.split($/); parts[parts.size-2] },
repoMap = Dictionary[];
repos.do{|repo| repoMap.put(repo, 0)};

~loadProprietaryGlitchBuffers = {
	~proprietary_buffers = ("/home/erik/code/kth/loam/repo_data_manip/wav_files/repos/PROPRIETARY/*.wav").resolveRelative.pathMatch.collect( { |file|
		var buf = Buffer.readChannel(s, file, channels: [0]);
		// buf.normalize;
		buf});
};
/*~anchors = [
	// OS, code editors
	anchor.([repo.("linux", true, 100000), repo.("llvm#llvm-project"), repo.("Windows", true, 40000), repo.("apache#maven"), repo.("microsoft#vscode"), repo.("curl#curl"), repo.("macOS", true, 30000), repo.("VSCodium#vscodium"), repo.("emacs-mirror#emacs"), repo.("textmate#textmate")]),
	// Developer tools
	anchor.([repo.("git#git"), repo.("llvm#llvm-project"), repo.("arduino#arduino-ide"), repo.("gcc-mirror#gcc"), repo.("rust-lang#cargo"), repo.("rust-lang#rust"), repo.("openjdk#jdk"), repo.("python#cpython"), repo.("snapview#tokio-tungstenite"), repo.("microsoft#TypeScript"), repo.("rtyley#bfg-repo-cleaner"), repo.("Discord", true, 2000), repo.("Kitware#CMake")]),
	// Coding visuals
	anchor.([repo.("openframeworks#openFrameworks"), repo.("bevyengine#bevy"), repo.("KhronosGroup#GLSL"), repo.("KhronosGroup#glslang"), repo.("KhronosGroup#glslang"), ]),
	anchor.([repo.("processing#processing"), repo.("processing#p5.js"), repo.("nannou-org#nannou"), repo.("KhronosGroup#WebGL"), repo.("processing#p5.js-web-editor"), repo.("gfx-rs#wgpu"), repo.("gka#chroma.js")]),
	// Non coding visuals
	anchor.([repo.("Adobe", true, 1000), repo.("GNOME#gimp"), repo.("scribusproject#scribus"), repo.("Resolve", true, 400), repo.("popcornmix#omxplayer"), repo.("HandBrake#HandBrake"), repo.("mrdoob#three.js"), repo.("videolan#vlc"), repo.("keenethics#svelte-notifications"), repo.("FFmpeg#FFmpeg"), repo.("PhotoMosh", true, 300)]),
	// Sound
	anchor.([repo.("BelaPlatform#Bela"), repo.("audacity#audacity"),   repo.("pure-data#pure-data"), repo.("supercollider#supercollider"), repo.("Max", true, 100000), repo.("WebAudio#web-audio-api"), repo.("WebAudio#web-midi-api"),  repo.("EnvelopSound#EnvelopForLive"),    repo.("CNMAT#OpenSoundControl.org")]),
	// Non coding sounds
	anchor.([repo.("Reaper", true, 20), repo.("Ableton", true, 500), repo.("Steinberg", true, 2000), repo.("Logic", true, 300), repo.("airwindows", true, 1), repo.("TU-Studio#IEMPluginSuite")]),
	// Web
	anchor.([repo.("hobbyquaker#artnet"), repo.("klingtnet#rosc"), repo.("npm#npm"),  repo.("colinbdclark#osc.js"),  repo.("brave#brave-browser"), repo.("nodejs#node"), repo.("v8#v8"), repo.("openssl#openssl"), repo.("Safari", true, 1500), repo.("websockets#ws"), repo.("vitejs#vite"), repo.("brave#brave-core"), repo.("carstenlebek#svelte-email"), repo.("Netlify", true, 500)]),

	anchor.([ repo.("ritwickdey#vscode-live-server"), repo.("kirovj#pocketbase-pyclient"), repo.("tensorflow#tensorflow"), repo.("apache#httpd"), repo.("moment#moment"), repo.("mozman#svgwrite"), repo.("glowroot#glowroot"), repo.("openjdk#jdk"), repo.("docker#compose"), repo.("sass#sass"), repo.("npm#cli"), repo.("nginx#nginx"), repo.("sveltejs#svelte"), repo.("fastmail", true, 100)]),
	anchor.([ repo.("YouTube", true, 10000), repo.("openai#openai-node"), repo.("NVlabs#stylegan2"), repo.("Instagram", true, 10000), repo.("cilium#ebpf"), repo.("autonomousvision#projected-gan"), repo.("scipy#scipy"), repo.("numpy#numpy"), repo.("otuva#handwriting-synthesis"), repo.("Facebook", true, 40000),  repo.("TikTok", true, 10000)])

];*/
{
	var dir = "/home/erik/code/kth/rethread/code/myriad/get_all_contributors/gh_repos_lists/", files = [
		"a-not-so-distant-past_gh_repos.txt",
		"apocryph_gh_repos.txt",
		"dear-ai_gh_repos.txt",
		"glommen_gh_repos.txt",
		"infinite-sand-sorter_gh_repos.txt",
		"megatouch_gh_repos.txt",
		"pain-creature_gh_repos.txt",
		"relaxrelaxrelax_gh_repos.txt",
		"why-am-i-seeing-this_gh_repos.txt",
		"loam_gh_repos.txt"],
	fileContent = files.collect{|fileName| try { File.readAllString(dir ++ fileName) } {|error|
		("Error: failed to read repo list: " ++ error ++ " for " ++ dir ++ fileName).postln;
		[]
	}},
	repos = fileContent.collect{|str| str.stripWhiteSpace.split($\n).collect{|re| re.replace("/", "#")}},
	anchors = repos.collect{|repos, i| anchor.(repos.collect{|re| repo.(re)}, files[i]) };
	~anchors = anchors;
}.();
{
	var addRepos = [
		[], // "a-not-so-distant-past_gh_repos.txt",
		[], // "apocryph_gh_repos.txt",
		[], // "dear-ai_gh_repos.txt",
		[], // "glommen_gh_repos.txt",
		[], // "infinite-sand-sorter_gh_repos.txt",
		[], // "megatouch_gh_repos.txt",
		[], // "pain-creature_gh_repos.txt",
		[], // "relaxrelaxrelax_gh_repos.txt",
		[], // "why-am-i-seeing-this_gh_repos.txt",
		["arduino#arduino-ide", "npm#cli", "processing#p5.js-web-editor", "hobbyquaker#artnet", "GNOME#gimp"], // "rethread_gh_repos.txt"
	];
	~anchors.do{|anchor, i| addRepos[i].do{|re| anchor.repos = anchor.repos.add(repo.(re))}};
}.();
{
	var addPropRepos = [
		[repo.("macOS", true, 30000), repo.("MAX/MSP", true, 500), repo.("Ableton", true, 900), repo.("Kontakt Una Corda", true, 20), repo.("Valhalla DSP", true, 10), repo.("Valhalla DSP", true, 30000),repo.("Izotope Ozone and Neutron", true, 100),repo.("Reaper", true, 50), repo.("IEM ambisonic plugins", true, 40)], // "a-not-so-distant-past_gh_repos.txt",
		[repo.("Google colab", true, 1000), repo.("macOS", true, 30000), repo.("Adobe", true, 3000), repo.("Xnconvert", true, 100)], // "apocryph_gh_repos.txt",
		[repo.("macOS", true, 30000), repo.("Adobe", true, 3000), repo.("fastmail", true, 800), repo.("netlify", true, 500)], // "dear-ai_gh_repos.txt",
		[], // "glommen_gh_repos.txt",
		[repo.("macOS", true, 30000), repo.("Affinity", true, 300),], // "infinite-sand-sorter_gh_repos.txt",
		[repo.("macOS", true, 30000), repo.("Adobe", true, 3000), repo.("Windows", true, 40000)], // "megatouch_gh_repos.txt",
		[repo.("macOS", true, 30000),repo.("Google Docs", true, 10000),repo.("Procreate", true, 300),], // "pain-creature_gh_repos.txt",
		[repo.("macOS", true, 30000),repo.("TouchDesigner", true, 3000),repo.("Adobe", true, 3000),repo.("macOS", true, 30000),repo.("Resolume", true, 400),repo.("Quicktime", true, 400),repo.("Pages", true, 1000),repo.("iMessage", true, 2000),repo.("MindApp", true, 200),repo.("MuseEEG", true, 200),], // "relaxrelaxrelax_gh_repos.txt",
		[repo.("Windows", true, 40000), repo.("Adobe", true, 3000), repo.("Ubisoft", true, 4000), repo.("Bryze", true, 600), repo.("Snapchat", true, 6000)], // "why-am-i-seeing-this_gh_repos.txt",
		[repo.("YouTube", true, 10000), repo.("Reaper", true, 20), repo.("Adobe", true, 3000), repo.("Gmail", true, 1000), repo.("Messenger", true, 700), repo.("Figma", true, 300), repo.("Phomemo Print Master", true, 30)], // "rethread_gh_repos.txt"
	];
	~anchors.do{|anchor, i| addPropRepos[i].do{|re| anchor.repos = anchor.repos.add(re)}};
}.();
~anchors.do{|anchor, i| anchor.repos = anchor.repos.scramble};
~anchors.do { |an|
	an.repos.do {|repo|
		if(repoMap.at(repo.name) != nil, {
			repoMap[repo.name] = repoMap[repo.name] + 1;
		}, {
			if(repo.is_redacted == false, {
				("Invalid repo name: " ++ repo.name).postln;
			});
		});
	}
};
// Filter out non-existent repos
~anchors.do { |an| var i = 0;
	an.repos = an.repos.select({|repo|
		if(repoMap.at(repo.name) != nil, {
			true
		}, {
			repo.is_redacted
		});
	});
};

// Print unused repos
{
	var keys = repoMap.keys;
	"\nUnused:".postln;
	keys.do {|repo|
		if(repoMap[repo] == 0, {
			repo.postln;
		});
	};
	"\nReused:".postln;
	keys.do {|repo|
		if(repoMap[repo] > 1, {
			repo.postln;
		});
	};
}.();

// Split loam repo into 3
{
	var repos = [List[], List[], List[]], an = ~anchors[9];
	an.repos = an.repos.scramble;
	an.repos.do{|repo, i| repos[i%3].add(repo);};
	~anchors[9].repos = repos[0];
	~anchors = ~anchors.add(anchor.(repos[1], "loam1"));
	~anchors = ~anchors.add(anchor.(repos[2], "loam2"));
}.();

// Set number
~anchors.do { |an, i|
	an.number = i;
};

~s53 = Scale.chromatic('et53');
/*~chords = [
[ -53, 0, 9, 31, 53, 62, 40+53, 137 ] - 31,
[ -53, 0, 9, 31, 53, 62, 40+53, 137 ] - 31+5,
[ -53, 0, 9, 31, 53, 62, 40+53, 137 ] - 31-3,
[ -53, 0, 9, 22, 31, 62, 40+53, 48+53 ] - 31+14,
[ -53, 0, 9, 31, 53, 62, 40+53, 137 ] - 31+14,
[ -53, 0, 9, 31, 40+9, 53+9, 62+9, 137+9 ] - 31+14,
[ -53, 0, 9, 31, 53, 62, 40+53, 137 ] - 31-3,
[ -53, 0, 9, 14, 31, 40, 53, 62, 137-5 ] - 31-3,
[ -53, 0, 9, 22, 31, 53, 22+53, 43+53 ] - 31+31,
[ -53, 0, 9, 31, 53, 62, 40+53, 137 ] - 31+5,
[ -53, 0, 9, 31, 53, 62, 40+53, 137 ] - 31,
];*/
~chords = [
	[ -84, 62, 22, 31, -22, 0, -31, 106 ],
	[ -26, -17, 111, 27, 36, -79, 5, 67 ],
	[ -34, 103, 28, -87, -25, 19, 59, -3 ],
	[ -17, -8, 5, 14, 45, 84, -70, 76 ],
	[ 76, 120, 45, 14, -70, 36, -17, -8 ],
	[ 14, 32, -70, 129, 45, 54, -17, -8 ],
	[ -25, 103, -34, 59, 19, 28, -87, -3 ],
	[ -34, -87, -3, -20, 6, -25, 19, 28, 98 ],
	[ 22, 31, 75, 9, 96, -53, 0, 53 ],
	[ -26, -17, 36, 27, 111, 67, 5, -79 ],
	[ 106, 62, -22, -84, -31, 22, 31, 0 ]
];

)

// utility to scramble chords
(
var chords = [
[ -53, 0, 9, 31, 53, 62, 40+53, 137 ] - 31,
[ -53, 0, 9, 31, 53, 62, 40+53, 137 ] - 31+5,
[ -53, 0, 9, 31, 53, 62, 40+53, 137 ] - 31-3,
[ -53, 0, 9, 22, 31, 62, 40+53, 48+53 ] - 31+14,
[ -53, 0, 9, 31, 53, 62, 40+53, 137 ] - 31+14,
[ -53, 0, 9, 31, 40+9, 53+9, 62+9, 137+9 ] - 31+14,
[ -53, 0, 9, 31, 53, 62, 40+53, 137 ] - 31-3,
[ -53, 0, 9, 14, 31, 40, 53, 62, 137-5 ] - 31-3,
[ -53, 0, 9, 22, 31, 53, 22+53, 43+53 ] - 31+31,
[ -53, 0, 9, 31, 53, 62, 40+53, 137 ] - 31+5,
[ -53, 0, 9, 31, 53, 62, 40+53, 137 ] - 31,
];
chords = chords.collect{|chord| chord.scramble};
chords.postln;
)


(
var dir = "/home/erik/code/kth/rethread/code/myriad/get_all_contributors/gh_repo_lists/", files = [
"a-not-so-distant-past_gh_repos.txt",
	"apocryph_gh_repos.txt",
	"dear-ai_gh_repos.txt",
	"glommen_gh_repos.txt",
	"infinite-sand-sorter_gh_repos.txt",
	"megatouch_gh_repos.txt",
	"pain-creature_gh_repos.txt",
	"relaxrelaxrelax_gh_repos.txt",
	"why-am-i-seeing-this_gh_repos.txt",
	"rethread_gh_repos.txt"],
fileContent = files.collect{|fileName| File.readAllString(dir ++ fileName)},
repos = fileContent.collect{|str| str.stripWhiteSpace.split($\n).collect{|re| re.replace("/", "#")}};
repos
)
(
a = ~anchors[0];
a.repos.do{|repo| repo.load()};
)
~anchors[0].repos[1].load.();
~anchors[0].repos[1].english;
"/home/erik/code/kth/loam/repo_data_manip/wav_files/repos/git#git/english/*.wav".resolveRelative.pathMatch.collect( { |file| file.postln; Buffer.readChannel(s, file, channels: [0]);});
// SynthDefs
(
var winenv;

// a custom envelope

winenv = Env([0, 1, 0], [0.5, 0.5], [4, -4]);
z = Buffer.sendCollection(s, winenv.discretize, 1);

SynthDef(\granulizer, { | out = 0, in = 10, depth = 0.5, mix = 0.5 |
	var sig, org, density, decay;

	org = In.ar(in, 2);

	density = depth.linexp(0, 1, 80, 5);
	decay = depth.linlin(0, 1, 0.02, 0.3);
	//sig = org * Decay.kr(Dust.kr(density), decay);
	sig = org * ({Demand.kr(Dust.kr(density) + Impulse.kr(0), 0, Dseq([1, 0], inf))}!2);

	sig = sig*mix + (org * (1-mix));

	Out.ar(out, sig);

}).add;

SynthDef(\playbuf, {arg amp = 0.2, sndbuf,
	rate = 1, out = 0, grainsize = 0.5, hold = 1, noiseAmp = 0.0;
	var pan = \pan.kr(0.0, 0.1), env, sig;

	sig = Pan2.ar(PlayBuf.ar(1, sndbuf, BufRateScale.kr(sndbuf)) * 0.5, pan);

	// noiseAmp = noiseAmp.lag(0.02);
	// sig = sig + PinkNoise.ar(noiseAmp*0.1);
	// sig = Resonz.ar(sig, \freq.kr(440), bwr)*(1.0/bwr);
	Out.ar(out, sig * amp)
}).add;

SynthDef(\playbuf_pan_away, {arg amp = 0.2, sndbuf,
	rate = 1, out = 0, grainsize = 0.5, hold = 1, noiseAmp = 0.0;
	var pan = \destination_pan.kr(1.0, 0.1), fade_time = \fade_time.kr(10), env, sig, verb_mix = Line.kr(0.05, 1.0, fade_time), start_offset = \start_offset.kr(0.0),
	amp_fade = EnvGen.kr(Env(levels: [0, 1, 1, 0.5, 0], times: [fade_time * 0.2, fade_time * 0.3, fade_time * 0.3, fade_time * 0.2 - 0.1], curve: [-4, \lin, \lin, -6]), doneAction: 2);
	amp = amp * amp_fade;

	sig = PlayBuf.ar(1, sndbuf, BufRateScale.kr(sndbuf), startPos: start_offset * BufFrames.kr(sndbuf), loop: 1.0);
	sig = Pan2.ar(sig, Line.kr(0.0, pan, fade_time));

	// noiseAmp = noiseAmp.lag(0.02);
	// sig = sig + PinkNoise.ar(noiseAmp*0.1);
	// sig = Resonz.ar(sig, \freq.kr(440), bwr)*(1.0/bwr);
	Out.ar(out, sig * amp * (1.0-verb_mix));
	Out.ar(\out_verb.kr(10), sig * amp * verb_mix);
}).add;

SynthDef(\grain_phaser, {arg gate = 1, amp = 0.2, preamp = 0.25, sndbuf, envbuf = -1, posrate = 1,
	modtime = 60, rate = 1, out = 0, grainsize = 0.5, hold = 1, noiseAmp = 0.0;
	var pan, env, freqdev, posmod, grainmod, grainsizemod, trigmod, trigger, sig, bwr = \bwr.kr(0.01), start_offset = \start_offset.kr(0.0), grain_mix = \grain_mix.kr(0.5, 1.0), pan_variation = \pan_variation.kr(0.5);
	pan = LFNoise1.kr(pan_variation).range((-1*pan_variation).max(-1.0), pan_variation.min(1.0));
	env = EnvGen.kr(
		Env([0, 1, 0], [0.1, \release_time.kr(1.0)], [\sin, -4], 1),
		gate,
		doneAction: 2);

	amp = amp * LFNoise1.kr(LFNoise1.kr(0.5).range(1.0/10.0, 3.0)).range(1.0, \amp_range.kr(1.0));

	trigger = Dust.kr(LFNoise1.kr(1).range(1/10, 1/2));

	//posmod = LFNoise2.kr(posrate).range(0.05, 0.95);
	//posmod = Line.kr(0.05, 0.95, posrate);
	posmod = Phasor.ar(0.0, (1.0/BufSamples.kr(sndbuf)) * BufRateScale.kr(sndbuf) * \playback_speed.kr(1.0), start: start_offset) + LFNoise1.kr(LFNoise1.kr(2).range(0.3, 1.0)).range(0.0, (1.0/BufSamples.kr(sndbuf)) * 1000 * \phase_amount.kr(1.0, 0.5));
	/*posmod = Phasor.kr(trig: trigger,
	//rate: 0.00001*(posrate/5),
	rate: 1/ SampleRate.ir,
	start: 0.05,
	end: 0.955,
	resetPos: TRand.kr(0.05, 0.955, trigger)
	);*/
	/*posmod = Ramp.kr(posmod, 0.01);*/

	grainmod = Dust.kr(SinOsc.kr(1/5).range(10, 15));
	//grainmod = Dust.kr(15);

	grainsizemod = LFNoise1.kr(3).range(0.05, 0.5);
	//grainsizemod = max(Line.kr(0.05, 0.8, modtime), TExpRand.kr(0.01, 2, trigger));

	sig = GrainBuf.ar(2, grainmod, grainsizemod, sndbuf, rate,
		posmod, 4, pan, envbuf) * preamp;

	sig = (sig * grain_mix) + (Pan2.ar(PlayBuf.ar(1, sndbuf, BufRateScale.kr(sndbuf), startPos: start_offset * BufFrames.kr(sndbuf), loop: 1) * 0.5, pan) * (1.0 - grain_mix));

	// noiseAmp = noiseAmp.lag(0.02);
	// sig = sig + PinkNoise.ar(noiseAmp*0.1);
	// sig = Resonz.ar(sig, \freq.kr(440), bwr)*(1.0/bwr);
	Out.ar(out, sig * env * amp)
}).add;

SynthDef(\buf_grain_filter, {arg gate = 1, amp = 0.2, preamp = 1, sndbuf, envbuf = -1, posrate = 1,
	modtime = 60, rate = 1, out = 0, grainsize = 0.5, hold = 1, noiseAmp = 0.0;
	var pan, env, freqdev, posmod, grainmod, grainsizemod, trigmod, trigger, sig, bwr = \bwr.kr(0.01);
	pan = LFNoise1.kr(1/2);
	env = EnvGen.kr(
		Env([0, 1, 0], [0.1, 1], \sin, 1),
		gate,
		doneAction: 2);

	trigger = Dust.kr(LFNoise1.kr(1).range(1/10, 1/2));

	//posmod = LFNoise2.kr(posrate).range(0.05, 0.95);
	//posmod = Line.kr(0.05, 0.95, posrate);
	posmod = Phasor.kr(trig: trigger,
		//rate: 0.00001*(posrate/5),
		rate: 1/ SampleRate.ir,
		start: 0.05,
		end: 0.955,
		resetPos: TRand.kr(0.05, 0.955, trigger)
	);
	posmod = Ramp.kr(posmod, 0.01);

	grainmod = Dust.kr(SinOsc.kr(1/5).range(10, 15));
	//grainmod = Dust.kr(15);

	//grainsizemod = LFNoise1.kr(1/5).range(0.05, 0.5);
	//grainsizemod = max(Line.kr(0.05, 0.8, modtime), TExpRand.kr(0.01, 2, trigger));

	sig = GrainBuf.ar(2, grainmod, grainsize, sndbuf, rate,
		posmod, 4, pan, envbuf) * preamp;

	noiseAmp = noiseAmp.lag(0.02);
	sig = sig + PinkNoise.ar(noiseAmp*0.1);
	sig = Resonz.ar(sig, \freq.kr(440), bwr)*(1.0/bwr);
	Out.ar(out, sig * env * amp)
}).add;

SynthDef(\verb, {
	var snd, wet;
	snd = In.ar(\in.kr(0), 2);
	wet = snd + (PitchShift.ar(snd, 0.2, 2)*0.1);
	wet = DelayN.ar(wet, 0.25, 0.25);
	// wet = GVerb.ar(wet * \wetness.kr(0.1), 200, 2);
	wet = JPverb.ar(wet * \wetness.kr(0.1), 2.0, 0.5, 1.0, 0.707, 0.1, 2.5, 1.0);
	wet = HPF.ar(wet, 100) * -3.dbamp;
	wet = LPF.ar(wet, 7000);
	snd = snd + wet;
	// Add a little bit of tape flutter
	snd = DelayC.ar(snd, 0.2, LFNoise2.kr(1).range(0, 0.005));

	//snd = (snd * Demand.kr(Dust.kr(5), 1, Dseq([1, 0], inf))) + (snd*0.5);

	Out.ar(\out.kr(0), snd);
}).add;

SynthDef(\wild_noise, {
	var value = \value.kr(0.0), sig, amp = \amp.kr(0.5), freq, pan = \pan.kr(0.0), am, random, random2, freq2, offset = \offset.kr(1), noiseAmp;

	freq = value.linexp(0, 1.0, 40, 300);
	random = frac(sin(value*30+offset)*307.93);
	random2 = frac(sin(value*40+offset)*507.3);
	freq2 = random.linlin(0, 1.0, 50, 1000);

	am = Pulse.ar(value.mod(value/3.0).linexp(0, 0.5, 100, 1000), 0.5, 0.5);

	//sig = Pulse.ar(freq, value)*am;
	//sig = Pulse.ar(freq + (am*100), value);
	noiseAmp = (value.pow(4)*2);
	sig = Resonz.ar(PinkNoise.ar()*am*noiseAmp, freq2, random*random);
	sig = sig + Pulse.ar(freq, value)*am*(value*value*value);
	sig = Decimator.ar(sig, 44100, random2*10);

	sig = Pan2.ar(sig, pan)*value*amp*0.2;

	Out.ar(\out.kr(0), sig);
	Out.ar(\out2.kr(0), sig*\amp2.kr(0));

}).add;

SynthDef(\distortion, { | in = 10, out = 0, mix = 0.3|
	var inSig, sig, amp;
	inSig = In.ar(in, 2);
	sig = (inSig*50).tanh;
	sig = LPF.ar(sig, 7000);
	//sig = sig * amp;
	sig = sig * 0.5;
	// sig = Decimator.ar(sig, s.sampleRate, 24);
	sig = Mix([sig * mix, inSig * (1-mix)]);

	Out.ar(out, sig);
}).add;

SynthDef(\chorus, { | out = 0, inBus, revBus, revAmp = 0.5, amp = 1 |
	var sig, in, lo, hi, predelay = 0.05, speed = 0.1, depth = 0.02, ph_diff = 0.5pi, crossover = 200, xfade = 0.5, numChan=2;

	in = In.ar(inBus, numChan);
	lo = LPF.ar(in, crossover);
	hi = HPF.ar(in, crossover);
	lo = DelayL.ar(lo, 0.1, SinOsc.kr(speed, ph_diff, depth, predelay));
	hi = Array.fill(numChan, { |i|
		predelay = predelay + depth;
		DelayL.ar(hi, 0.5, SinOsc.kr(speed, ph_diff * i, depth, predelay));
	}).scramble;
	lo = lo + hi;
	sig = lo;
	Out.ar(out, sig*amp);
	Out.ar(revBus, sig*revAmp);
}).add;

SynthDef(\lastLayer, {
	var sig, mix = \mix.kr(0, 0.02), tones;
	sig = In.ar(\in.kr(12), 2);

	//tones = {Pan2.ar(SinOsc.ar([8000 + LFNoise1.kr(1.2, 30), 325 + LFNoise1.kr(2.2, 10)])*0.1, LFNoise1.kr(0.5))}!3;

	// sig = (sig*(1-mix).pow(5)) + (tones*mix);

	Out.ar(\out.kr(0), sig);
}).add;

SynthDef(\fft_extract, {
	var sig, chain;
	sig = In.ar(\in.kr(2), 2);
	chain = FFT(Array.fill(2, { LocalBuf(2048, 1) }), sig);
	// chain = PV_RandComb(chain, MouseY.kr, Impulse.kr(0.4)); // process
	// chain = PV_BinScramble(chain, MouseX.kr, MouseY.kr, Impulse.kr(2));
	// chain = PV_MagSmear(chain, MouseX.kr(0, 128));
	sig = IFFT(chain); // inverse FF
	Out.ar(\out.kr(0), sig);
}).add;
SynthDef(\synth, {
	var sig, env, freq, density = LFNoise1.kr(0.3).range(0.1, 2), trig = Dust.kr(density), decaytime = TRand.kr(density.reciprocal * 0.6, density.reciprocal * 2.0, trig), coef = TRand.kr(0.2, 0.6, trig), bwr;
		freq = Lag.kr(Latch.kr(\freq.kr(440), trig).max(20), 0.02);
		// coef = MouseX.kr(-0.999, 0.999);
	// sig = DPW3Tri.ar(freq) * EnvGen.ar(Env.perc(0.02, decaytime*0.2), trig) * LFNoise1.kr(0.2).exprange(0.00001, 0.3);
	sig = LPF.ar(DPW4Saw.ar(freq), Lag.kr(LFNoise1.kr(0.3).range(freq * 2, freq * 7).clip(20.0, 12000.0))) * EnvGen.ar(Env.perc(0.3, decaytime), trig) * LFNoise1.kr(LFNoise1.kr(0.7).range(0.1, 5)).exprange(0.00001, 0.3) * 0.15;
		bwr = LFNoise1.kr(LFNoise1.kr(0.7).range(0.5, 10)).exprange(0.0001, 0.01);
	sig = sig + (Resonz.ar(PinkNoise.ar, freq, bwr) * EnvGen.ar(Env.perc(0.2, decaytime), trig) * (0.01/bwr));
		// sig = SinOsc.ar(freq) * EnvGen.ar(Env.perc(0.01, decaytime*0.2), trig) * LFNoise1.kr(LFNoise1.kr(2).range(0.5, 3)).range(0.5, 1.0).pow(2);
		sig = (sig * 20).tanh;
		// sig = Pluck.ar(PinkNoise.ar * SinOsc.ar(freq * 0.9) * 0.1, trig, 0.2, freq.reciprocal, decaytime, coef) * 10;
	sig = sig * \amp.kr(0.5, 1.0)*AmpCompA.kr(freq, 0.midicps);
	Out.ar(\out.kr(0), Pan2.ar(sig, \pan.kr(0.0)));
}).add;

SynthDef(\verb646, {
	var snd, wet, wetness = \wetness.kr(0.1);
	snd = In.ar(\in.kr(0), 2);
	wet = snd + (PitchShift.ar(snd, 0.2, 2)*0.1);
	wet = DelayN.ar(wet, 0.25, 0.25);
	// wet = GVerb.ar(wet * \wetness.kr(0.1), 200, 2);
	wet = JPverb.ar(wet * wetness, 4.0, 0.5, 1.0, 0.707, 0.1, 2.5, 1.0);
	wet = HPF.ar(wet, 100) * -3.dbamp;
	wet = LPF.ar(wet, 7000);
		snd = (snd * (1.0-wetness)) + wet;
	// Add a little bit of tape flutter
	snd = DelayC.ar(snd, 0.2, LFNoise2.kr(1).range(0, 0.005));

	//snd = (snd * Demand.kr(Dust.kr(5), 1, Dseq([1, 0], inf))) + (snd*0.5);

	Out.ar(\out.kr(0), snd);
}).add;

)

n = NdefMixer(s);
n.parent.alwaysOnTop_(true); // show mixer in front of IDE

(
var start_fx;
~events = [\pan_away, \granular_swell, \glitch_interruption];

~fxGroup = Group(s, addAction: \addToTail);
~ndefGroup = Group(~fxGroup, addAction: \addBefore);

~distBus = Bus.audio(s, 2);
~verbBus = Bus.audio(s, 2);
~pitchVerbBus = Bus.audio(s, 2);
~granBus = Bus.audio(s, 2);
~chorusBus = Bus.audio(s, 2);
~masterBus = Bus.audio(s, 2);
~fftBus = Bus.audio(s, 2);

start_fx = { var fxGroup;
/*	if(~master!=nil, {~master.free;});
	if(~verb!=nil, {~verb.free;});
	if(~dist!=nil, {~dist.free;});
	if(~granulizer!=nil, {~granulizer.free;});
	if(~chorus!=nil, {~chorus.free;});
	if(~fftExtract!=nil, {~fftExtract.free;});*/
	fxGroup = Group(s, addAction: \addToTail);
	fxGroup.postln;
	s.sync;
	~master = Synth(\lastLayer, [\in, ~masterBus], target: fxGroup);
	~verb = Synth(\verb, [\in, ~verbBus, \wetness, 0.5, \out, ~masterBus], target: ~master, addAction: \addBefore);
	~pitchVerb = Synth(\verb646, [\in, ~pitchVerbBus, \wetness, 0.5, \out, ~masterBus], target: ~master, addAction: \addBefore);
	~dist = Synth(\distortion, [\in, ~distBus, \out, ~verbBus], target: ~verb, addAction: \addBefore);
	~granulizer = Synth(\granulizer, [\in, ~granBus, \out, ~verbBus], target: ~verb, addAction: \addBefore);
	~chorus = Synth(\chorus, [\out, ~masterBus, \revBus, ~verbBus, \inBus, ~chorusBus, \revAmp, 0.3, \amp, 1], target: ~verb, addAction: \addBefore);
	~fftExtract = Synth(\fft_extract, [\in, ~fftBus, \out, ~chorusBus], target: ~chorus, addAction: \addBefore);
	s.sync;
};

/*~nodeAudio = {
~synths.add(Synth(\buf_grain_filter, [\sndbuf, ~viskningar.choose, \amp, 1.0, \preamp, 0.5, \bwr, 0.5, \out, ~verbBus]));
};
~setFreq = { |freq|
	~synths.do{|s| s.set(\freq, freq); };
};
~setBwr = { |bwr|
	~synths.do{|s| s.set(\bwr, bwr); };
};*/
// n = ~nodeSpawner.value();
// ~nodes = [];
// ~synths = List[];
// ~synths.add(Synth(\buf_grain_filter, [\sndbuf, ~viskningar.choose, \amp, 0.1, \preamp, 0.5, \noiseAmp, 0.0, \bwr, 0.5, \out, ~verbBus]));
// ~synths.add(Synth(\grain_phaser, [\sndbuf, ~viskningar.choose, \amp, 0.1, \preamp, 0.5, \noiseAmp, 0.0, \bwr, 0.5, \pan, rrand(-0.7, 0.7), \out, ~verbBus]));
// ~main_voice = Synth(\grain_phaser, [\sndbuf, ~viskningar.choose, \amp, 0.1, \phase_amount, 0, \preamp, 0.5, \noiseAmp, 0.0, \bwr, 0.5, \pan_variation, 0.0, \out, ~masterBus]);
// ~main_voice = Synth(\playbuf, [\sndbuf, ~viskningar.choose, \amp, 0.2, \out, ~masterBus]);

/*~anchors[7].repos[0].load()
~anchors[7].repos[0].main_voice
~anchors[7].repos[0].is_redacted
~anchors[7].repos[0].english[0].sampleRate*/
// ~anchors[5].repos[10].main_english_voice.duration
{ var anchor = 3;
	start_fx.();
	block { |break| loop {
		var main_r, aux_r, recording_dur = 60*10, aux_synths_to_free = Set[], swich_fx_dur, an, pitch_r, pitch_synth;
		"Freeing buffers".postln;
		Buffer.freeAll;
		an = ~anchors[anchor];
		"Loading buffers...".postln;
		~loadProprietaryGlitchBuffers.();
		an.load_buffers();
		an.current_repo = 0;
		// s.sync;
		"Loading done".postln;

		s.prepareForRecord("/home/erik/code/kth/loam/anchors/2024-09-29/"++anchor++".aif", 2);
		s.sync;
		s.record("/home/erik/code/kth/loam/anchors/2024-09-29/"++anchor++".aif", duration: recording_dur);

		("Start anchor " ++ anchor).postln;
		pitch_r = { var pitch_synth =Synth(\synth, [\freq, 20, \amp, 0.0, \out, ~pitchVerbBus]), chord_index = 0;
			loop {
				var freq = ~s53.degreeToFreq(~chords[chord_index][anchor % ~chords[chord_index].size], 48.midicps, 1), pan = 0;
				pitch_synth.set(\freq, freq, \amp, 0.1);
				chord_index = (chord_index+1) % ~chords.size;
				5.wait;
			};
		}.fork;
		main_r = {

			1.wait;
			loop {
				var buf, start_offset = rrand(0.0, 0.9), num_voices = 1, repo_length = 30, repo_play_length, grain_mix = 0.0, pan_variation = 0.0;
				("next_repo: " ++ an.repos[an.current_repo].name).postln;
				~auxilliary_voices = [];
				if(an.repos[an.current_repo].is_redacted,
					{
						// buf = a.repos[a.current_repo].glitchy.choose;
						if(an.repos[an.current_repo].num_contributors == nil, {
							("No num_contributors in repo " ++an.repos[an.current_repo].name).postln;
						});
						num_voices = an.repos[an.current_repo].num_contributors.explin(10, 100000, 1, 5).round.asInteger;
						repo_length = an.repos[an.current_repo].num_contributors.explin(10, 100000, 10, 60);
						grain_mix = rrand(0.2, 0.3);
						pan_variation = rrand(0.0, 0.2);
						buf = an.repos[an.current_repo].main_voice;
					},
					{ var length;
						/* frames,
						sampleRate = 22050;
						frames = an.repos[an.current_repo].english[0].numFrames;
						if(frames == nil, {frames = 1000; ("Invalid buffer in main routine for " ++ an.repos[an.current_repo].name + ", current: " ++ an.current_repo ++ ", anchor: " ++ an).postln;});
						sampleRate = if(an.repos[an.current_repo].english[0].sampleRate != nil, {
							an.repos[an.current_repo].english[0].sampleRate
						}, {
							("Invalid buffer sampleRate in main routine for " ++ an.repos[an.current_repo].name).postln;
							22050
						});*/
						buf = [an.repos[an.current_repo].main_voice, an.repos[an.current_repo].main_english_voice].wchoose([3, 1].normalizeSum);

						length = try { buf.duration; } {|error| ("Failed to get duration for buf " ++ buf ++ ": " ++ error).postln;
							try { buf.numFrames/buf.sampleRate } {|error| ("Failed to get fallback duration : " ++ error).postln; 120.0}
						};
						num_voices = length.explin(10, 1000, 1, 5).round.asInteger;
						repo_length = length.explin(10, 1000, 10, 60);
						/*switch(voice_lang,
						\english, { voice_lang = \non_english; buf = a.repos[a.current_repo].english.choose;},
						\non_english, {
						if(rrand(0.0, 1.0) > 0.6, {
						voice_lang = \english;
						});
						buf = a.repos[a.current_repo].non_english.choose;
						},
						\glitchy, { voice_lang = \english; buf = a.repos[a.current_repo].glitchy.choose;}
						);*/
					}
				);

				~main_voice = Synth(\grain_phaser, [\sndbuf, buf, \amp, 0.25, \pan_variation, pan_variation, \start_offset, start_offset, \grain_mix, grain_mix, \out, ~masterBus]);
				if(num_voices > 1, {
					~auxilliary_voices = (num_voices-1).collect {|i|
						Synth(\grain_phaser, [\sndbuf, buf, \amp, 0.010, \amp_range, 0.0, \pan_variation, rrand(0.1, 0.8), \rate, rrand(0.85, 1.1), \start_offset, (start_offset * (i+2)).mod(1.0), \grain_mix, 0.0, \out, ~chorusBus]);
					};
				});
				repo_play_length = ((1.0-rrand(0.0, 1.0).pow(2)) * repo_length + repo_length * 0.2).min(buf.duration);
				("playing repo for " ++ repo_play_length ++ " s").postln;
				repo_play_length.wait;
				~main_voice.set(\playback_speed, exprand(0.3, 0.7), \grain_mix, 1.0);
				~auxilliary_voices.do {|syn| syn.set(\playback_speed, exprand(0.05, 2.3), \grain_mix, 1.0); };
				rrand(0.8, 1.5).wait;
				swich_fx_dur = exprand(1.3, 2.5);
				// windy repo change effect
				3.do{
					{
						var sig, env, freq, clap, popEnv, centerFreq = Rand(50, 300), length = swich_fx_dur;
						env = EnvGen.ar(
							Env(
								levels: [0, 1, 0],
								times: [length * 0.6, length*0.4],
								curve: [4, -6]
							),
							doneAction:2
						);

						freq = [
							EnvGen.ar(Env([centerFreq*Rand(0.1, 0.3), centerFreq], [length], [Rand(4, 7)])),
							EnvGen.ar(Env([centerFreq*Rand(0.1, 0.3), centerFreq], [length], [Rand(2, 8)])),
							EnvGen.ar(Env([centerFreq*Rand(0.1, 1.5), centerFreq], [length], [Rand(2, 8)])),
							EnvGen.ar(Env([centerFreq*Rand(0.4, 1.3), centerFreq], [length], [Rand(2, 8)]))
						];
						sig = Resonz.ar(PinkNoise.ar(), freq, XLine.kr(0.02, 0.1, length))*3;
						sig = Mix(sig);
						sig = Pan2.ar(sig, rrand(-0.2, 0.2));
						sig = sig * env * 0.1;
						Out.ar(~chorusBus, sig);
					}.play;
				};
				(swich_fx_dur-0.9).wait;
				~main_voice.release;
				~auxilliary_voices.do {|syn| syn.release; };
				an.next_repo();
				0.1.wait;
			}
		}.fork;
		aux_r = {
			loop { var wait_time;
				if(an.repos[an.current_repo].is_redacted, {
					wait_time = rrand(1.0, 5.0);
				}, {
					wait_time = rrand(2.0, 30.0);
				});
				wait_time.wait;
				switch(~events.choose,
					\pan_away, {
						rrand(2, 5).do {
							var fade_time = rrand(2, 6), amp = exprand(0.01, 0.035), buf0, buf1;
							if(an.repos[an.current_repo].is_redacted,
								{buf0 = an.repos[an.current_repo].glitchy.choose; buf1 = an.repos[an.current_repo].glitchy.choose;},
								{buf0 = an.repos[an.current_repo].non_english.choose; buf1 = an.repos[an.current_repo].non_english.choose;}
							);
							aux_synths_to_free.add(Synth(\playbuf_pan_away, [\sndbuf, buf0, \amp, amp, \destination_pan, 1.0, \fade_time, fade_time, \start_offset, rrand(0.0, 0.99), \out_verb, ~verbBus, \out, ~masterBus]));
							aux_synths_to_free.add(Synth(\playbuf_pan_away, [\sndbuf, buf1, \amp, amp, \destination_pan, -1.0, \fade_time, fade_time, \start_offset, rrand(0.0, 0.99), \out_verb, ~verbBus, \out, ~masterBus]));
							rrand(0.3, 1.5).wait;
						};
					},
					\granular_swell,  {
						rrand(2, 5).do {
							{
								var s, buf;
								if(an.repos[an.current_repo].is_redacted,
									{buf = an.repos[an.current_repo].glitchy.choose;},
									{buf = an.repos[an.current_repo].non_english.choose;}
								);
								s = Synth(\grain_phaser, [\sndbuf, buf, \amp, exprand(0.02, 0.03), \pan_variation, rrand(0.5, 3.0), \start_offset, rrand(0.0, 0.99), \release_time, 2.0, \preamp, 0.5, \noiseAmp, 0.0, \bwr, 0.5, \out, ~chorusBus]);
								aux_synths_to_free.add(s);
								2.wait;
								s.release;
								aux_synths_to_free.remove(s);
							}.fork;
							rrand(0.2, 0.5).wait;
						}
					},
					\glitch_interruption, {},
					{
						//default
				});
			}
		}.fork;
		(recording_dur-2).wait;
		main_r.stop;
		~main_voice.release;
		~auxilliary_voices.do{ |syn| syn.release; };
		aux_synths_to_free.do{ |syn| syn.release; };
		aux_r.stop;
		pitch_r.stop;
		pitch_synth.release;
		3.wait;
		s.stopRecording();
		s.sync;
		//s.freeAll;
		anchor = anchor + 1;
		if(anchor >= ~anchors.size, {"All anchors played, breaking".postln; break.value(0)});
	}}
}.fork;

)
~main_voice.set(\phase_amount, 10)
(
~synths.add(Synth(\playbuf_pan_away, [\sndbuf, ~viskningar.choose, \amp, 0.1, \destination_pan, 1.0, \fade_time, 5, \out_verb, ~verbBus, \out, ~masterBus]));
~synths.add(Synth(\playbuf_pan_away, [\sndbuf, ~viskningar.choose, \amp, 0.1, \destination_pan, -1.0, \fade_time, 5, \out_verb, ~verbBus, \out, ~masterBus]));
)
(
{
	var s = Synth(\grain_phaser, [\sndbuf, ~viskningar.choose, \amp, 0.1, \pan_variation, 2, \start_offset, rrand(0.0, 0.9), \preamp, 0.5, \noiseAmp, 0.0, \bwr, 0.5, \out, ~verbBus]);
	2.wait;
	s.release;
}.fork;
)
~anchors[7].repos[0].english[0].duration
~verb.set(\wetness, 0.1)
(
Ndef(\fft_test, {
	var sig, chain;
	sig = In.ar(~fftBus, 2);
	chain = FFT(Array.fill(2, { LocalBuf(2048, 1) }), sig);(
{
	var sig, env, freq, clap, popEnv, centerFreq = Rand(400, 700), length = Rand(0.5, 4);
	env = EnvGen.ar(
		Env(
			levels: [0, 1, 0],
			times: [length, 1.5],
			curve: [4, -6]
		),
		doneAction:2
	);

	freq = [
		EnvGen.ar(Env([centerFreq*Rand(0.1, 0.3), centerFreq], [length+1.5], [Rand(4, 7)])),
		EnvGen.ar(Env([centerFreq*Rand(0.2, 0.4), centerFreq], [length+1.5], [Rand(2, 8)]))];
	sig = Resonz.ar(WhiteNoise.ar(), freq, Line.kr(0.03, 0.3, length))*3;
	sig = Mix(sig);
	sig = Pan2.ar(sig, rrand(-1.0, 1.0));
	sig = sig * env * 0.1;
	Out.ar(\out.kr(~verbBus), sig);
}.play;
)
	chain = PV_RandComb(chain, 0.95, Impulse.kr(0.4)); // process
	sig = IFFT(chain); // inverse FF
	Out.ar(~verbBus, sig);
}).play(group: ~ndefGroup);
)
Ndef(\fft_test).clear
Ndef.clear
~nodeAudio.()
~synths.add(Synth(\buf_grain_filter, [\sndbuf, ~viskningar.choose, \amp, 1.0, \preamp, 0.05, \noiseAmp, 0.0, \out, ~verbBus]));
~synths.add(Synth(\buf_grain_filter, [\sndbuf, ~viskningar.choose, \amp, 1.0, \preamp, 0.25, \out, ~chorusBus]));
~setFreq.(1000);
~setBwr.(0.5);
~granulizer.set(\depth, 1.0, \mix, 1.0);
(
{var root = rrand(100, 500);
	[1.0, 5.0/4, 3.0/2.0, 1.5 * 5/4, 1.0 + 9.0/8, 1.0 + 9.0/8 * 5.0/4].scramble.do {|ratio|
		{
			var sig, env, freq = ratio * root;
			env = Env.perc(1.5, 15.0).kr(2);
			freq = freq +[0, SinOsc.kr(Rand(0.5, 4.0)).range(0.0, Rand(0.5, 4.0))];
			sig = DPW3Tri.ar(freq, mul: 0.01);
			Out.ar(~verbBus, Pan2.ar(sig * env, Rand(-1,1)));
		}.play;
		rrand(0.1, 5.3).wait;
	}
}.fork;
)

(
{
	var sig, env, freq, clap, popEnv, centerFreq = Rand(300, 700), length = Rand(0.5, 4);
	env = EnvGen.ar(
		Env(
			levels: [0, 1, 0],
			times: [length, 1.5],
			curve: [4, -6]
		),
		doneAction:2
	);

	freq = [
		EnvGen.ar(Env([centerFreq*Rand(0.1, 0.3), centerFreq], [length+1.5], [Rand(4, 7)])),
		EnvGen.ar(Env([centerFreq*Rand(0.2, 0.4), centerFreq], [length+1.5], [Rand(2, 8)]))];
	sig = Resonz.ar(PinkNoise.ar(), freq, Line.kr(0.03, 0.3, length))*3;
	sig = Mix(sig);
	sig = Pan2.ar(sig, rrand(-1.0, 1.0));
	sig = sig * env * 0.1;
	Out.ar(~chorusBus, sig);
}.play;
)
(
var swich_fx_dur = exprand(1.3, 5.0);
3.do{{
	var sig, env, freq, clap, popEnv, centerFreq = Rand(300, 700), length = swich_fx_dur;
	env = EnvGen.ar(
		Env(
			levels: [0, 1, 0],
			times: [length * 0.6, length*0.4],
			curve: [4, -6]
		),
		doneAction:2
	);

	freq = [
		EnvGen.ar(Env([centerFreq*Rand(0.1, 0.3), centerFreq], [length], [Rand(4, 7)])),
		EnvGen.ar(Env([centerFreq*Rand(0.1, 0.3), centerFreq], [length], [Rand(2, 8)])),
		EnvGen.ar(Env([centerFreq*Rand(0.1, 1.5), centerFreq], [length], [Rand(2, 8)])),
		EnvGen.ar(Env([centerFreq*Rand(0.4, 1.3), centerFreq], [length], [Rand(2, 8)]))
	];
	sig = Resonz.ar(PinkNoise.ar(), freq, Line.kr(0.03, 0.3, length))*3;
	sig = Mix(sig);
	sig = Pan2.ar(sig, rrand(-0.2, 0.2));
	sig = sig * env * 0.1;
	Out.ar(~chorusBus, sig);
}.play;
}
)