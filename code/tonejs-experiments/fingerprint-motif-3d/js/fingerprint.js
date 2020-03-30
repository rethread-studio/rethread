let pitchSet = [60, 59, 62, 64, 65, 67, 69, 71, 72, 74];
class Motif {
    pitches;
    // Duration is the number of 16th notes the pitch spans
    durations;
    schedulingIds;
    constructor(){
        this.pitches = [];
        this.durations = [];
        this.schedulingIds = [];
    }
    schedulePlayback(synth, transport, material){
        for(let id of this.schedulingIds) {
            // console.log("clearing id: " + id);
            Tone.Transport.clear(id);
        }
        this.schedulingIds = [];
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
                // console.log("pitch: " + pitch + " dur: " + dur + " time: " + time);
                synth.triggerAttackRelease(
                    pitch,
                    "16n",//dur16ToTransport(dur/2),
                    time
                );
                material.color.setRGB(Math.random(), Math.random(), Math.random());
                // material.color.setScalar(1.0);
            }, schedTime);
            // For later removing the event from scheduling
            this.schedulingIds.push(id);
            // Add the scheduling time so the next note is scheduled after this one.
            totalDur += this.durations[i];
        }
    }
    addDur(v) {
        this.pitches.push(pitchSet[5]);
        // this.pitches.push(110);
        this.durations.push(v%6 + 1);
    }
    changePitch(i, newPitchIndex) {
        let index =  Math.floor(i) % (this.pitches.length);
        this.pitches[index] = pitchSet[newPitchIndex%pitchSet.length];
    }
    addPitch(i) {
        this.pitches.push(pitchSet[i%pitchSet.length]);
        this.durations.push(2);
    }
    changeDur(i, newDur) {
        let index =  Math.floor(i) % (this.durations.length);
        this.durations[index] = newDur;
    }
    clear() {
        this.pitches = [];
        this.durations = [];
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

function amp2db(amp) {
    20 * log10(amp);
} 

class Fingerprint {
    motif; // a Motif
    position; // a THREE.Vector3
    material;
    geometry;
    mesh; // the 3D mesh that represents this
    synth; // the synth playing this fingerprint's motif
    numParametersUsed;
    rawFingerprint;
    constructor(fingerprint, x, y, z) {
        const vs = fingerprint.split(",");
        this.rawFingerprint = vs;
        this.position = new THREE.Vector3( x, y, -z );
        this.material = new THREE.MeshStandardMaterial({color: 0x00cccc})
        this.geometry = new THREE.TetrahedronGeometry( 5, vs[0]);
        this.mesh = new THREE.Mesh( this.geometry, this.material );
        this.mesh.position.x = this.position.x;
        this.mesh.position.y = this.position.y;
        this.mesh.position.z = this.position.z;
        scene.add(this.mesh);
        this.motif = new Motif();
        this.numParametersUsed = 24;
        this.synth = newSynth();
        objects.push(this.mesh);
        this.updateMotif();
    }
    updateMotif() {
        this.motif.clear();
        for (let i = 0; i < this.rawFingerprint.length && i < this.numParametersUsed; i++) {
            let v = headers[i] + "_" + this.rawFingerprint[i];
            // switch(i%2) {
            //     case 0:
            //         motif.addPitch(vs[i]);
            //         break;
            //     case 1:
            //         motif.changeDur(i/2, vs[i]%6 + 1);
            //         break;

            // }
            if(i < Math.floor(headers.length/2)) {
                this.motif.addDur(this.rawFingerprint[i]);
            } else {
                this.motif.changePitch(i-Math.floor(headers.length/2), this.rawFingerprint[i]);
            }
        }
        this.motif.schedulePlayback(this.synth, Tone.Transport, this.material);
    }
    setAmp(amp) {
        this.synth.volume.value = amp2db(amp);
    }
    setDb(db) {
        this.synth.volume.value = db;
    }
    updateDistanceSquared(distance2) {
        this.setDb(distance2 * -0.02 - 10);
        if(distance2 < 100) {
            this.material.transparent = true;
            this.material.opacity = distance2/100;
        }
        this.synth.harmonicity.value = Math.floor(Math.max(12 - (distance2/100), 1.0));
        this.synth.envelope.release = Math.max(0.5 - distance2/500, 0.002);
        let numParameters = 24 - (distance2/40);
        if(numParameters != this.numParameters) {
            this.numParametersUsed = numParameters;
            this.updateMotif();
        }

        this.material.color.multiplyScalar(0.9);
    }
}