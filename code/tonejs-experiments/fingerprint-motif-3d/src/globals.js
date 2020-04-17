var sound = {
    schedulingIds: [],
    synths: [],
    numParametersUsed: 24,
    // chorus,
    // globalSynthLPF,
    // reverb,
    // longverb,
    // midverb,
    oscillators: ["sine", "square", "triangle", "sawtooth"],
    // pitchSet = [60, 59, 62, 64, 65, 67, 69, 71, 72, 74];
    pitchSet: [60, 59, 62, 64, 67, 69, 72, 74],
    stablePitches: [60, 67],
    pitchSets: [
        [60, 59, 62, 64, 67, 69, 72, 74], // C major maj7
        [60, 59, 62, 67, 66, 62, 64], // lydian
        [60, 59, 62, 64, 67, 68], // C major b13
        [60, 59, 62, 64, 67, 68],
        // minor
        [60, 58, 62, 63, 65, 67, 70, 69, 67, 69],// dorian
        [60, 59, 62, 63, 65, 67, 70, 68], // harmonic
        [60, 61, 63, 58, 65, 67, 70, 68, 67], // locrian
        [60, 61, 63, 58, 65, 67, 70, 68, 67], // locrian
    ]
}


var data = {
    loadedData: false,
    loadedLocal: false,
    loadedConnected: false,
    fingerprints: [], // the Fingerprint objects created
    rawFingerprints: [], // the raw data strings
    headers: [],
    localFingerprint: undefined,
    localRawFingerprint: undefined,
    //localRawFingerprint is set in index.js
    minimumMarkersInCommon: 0,
}

var html = {
    inactiveInstructions: `
    <span style="font-size:36px; line-height: 2.5em; letter-spacing: 1em;">SPATIAL SONIC FINGERPRINTS</span>
    <br/><br/><br/><br/><br/>
    <span style="font-size:24px">Click to activate</span>
    <br /><br />
    Move: W/S <i class="fa fa-keyboard-o" aria-hidden="true"></i>
    <br/>
    Look: MOUSE 

    <i class="fa fa-mouse-pointer" aria-hidden="true"></i>
    <i class="fa fa-arrows-alt" aria-hidden="true"></i>
    <br/>
    Return here: ESC <i class="fa fa-keyboard-o" aria-hidden="true"></i><br/>
    <br/><span style="font-size:36px;"><i class="fa fa-volume-up" aria-hidden="true"></i></span>
    <br/>
    <span style="font-size:24px; line-height: 2.0em;">Explore browser fingerprints as sonic objects in space. In your presence each device will reveal its sonic identity.</span>`,
}

var messages = {
    darkSpaceMessages: [
        "When a website collects and stores a browser fingerprint, it puts a tiny little trace of the human-computer cyborg on its server. Just the faintest hint of an identity, but oftentimes enough to pinpoint you in a group of hundreds of thousands. Until your human-computer cyborg configuration changes.",
        "Welcome to the archive",
    ],
    insideFingerprintMessages: [
        "The browser fingerprint contains a reflection of the human behind it: their languages, preferred fonts, location, choice of browser.",
        "The browser fingerprint reflects its device through the molecules of its graphics card producing slightly different visual noise, the size of the screen, the depth of its pixels.",
        "The human-computer cyborg is reflected in their data.",
        "~~~abstract features of HumanConciousness~~~",
        "Can you hear how similar you are?",
        "I'm afraid we have no way of putting you in touch with this particular human-computer cyborg.",
        "Have you ever been attracted to the visual noise of a graphics card?",
        
    ],
    insideSphereMessages: [
        "The browser fingerprint contains a reflection of the human behind it: their languages, preferred fonts, location, choice of browser. Likewise it reflects the device through the molecules of its graphics card producing slightly different visual noise, the size of the screen, the depth of its pixels.",
    ]
}

function getRandomDarkSpaceMessage() {
    let i = Math.floor(Math.random() * messages.darkSpaceMessages.length);
    return messages.darkSpaceMessages[i];
}
function getRandomInsideFingerprintMessage() {
    let i = Math.floor(Math.random() * messages.insideFingerprintMessages.length);
    return messages.insideFingerprintMessages[i];
}
function getRandomInsideSphereMessage() {
    let i = Math.floor(Math.random() * messages.insideSphereMessages.length);
    return messages.insideSphereMessages[i];
}

var state = {
    mobile: false,
}

export { sound, data, html, state, getRandomDarkSpaceMessage, getRandomInsideFingerprintMessage, getRandomInsideSphereMessage }