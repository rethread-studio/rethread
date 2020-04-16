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
}

var html = {
    inactiveInstructions: `
    <span style="font-size:36px; line-height: 2.5em; letter-spacing: 1em;">SPATIAL SONIC FINGERPRINTS</span>
    <br/><br/><br/><br/><br/>
    <span style="font-size:24px">Click to activate</span>
    <br /><br />
    Move: WS<br/>
    Look: MOUSE<br/>
    Return here: ESC<br/>
    <br/><br/>
    <span style="font-size:24px; line-height: 2.0em;">Explore browser fingerprints as sonic objects in space. In your presence each device will reveal its sonic identity.</span>`,
}

var state = {
    mobile: false,
}

export { sound, data, html, state }