let fingerPrints = [];
let headers = [];

let f = [];

function setup() {

    // P5
    // createCanvas(1024, 1024);
    createCanvas(800, 800);
    background(0);

}

var options = { fonts: { extendedJsFonts: true }, excludes: { userAgent: true } }
$(document).ready(async () => {
    if (window.requestIdleCallback) {
        requestIdleCallback(function () {
            Fingerprint2.get(options, fpCallback)
        })
    } else {
        setTimeout(function () {
            Fingerprint2.get(options, fpCallback)
        }, 500)
    }
});

function fpCallback(fingerprint) {
    console.log(fingerprint);

    // 0: {key: "webdriver", value: "not available"}
    // 1: {key: "language", value: "sv-SE"}
    // 2: {key: "colorDepth", value: 24}
    // 3: {key: "deviceMemory", value: 8}
    // 4: {key: "pixelRatio", value: 2}
    // 5: {key: "hardwareConcurrency", value: 8}
    // 6: {key: "screenResolution", value: Array(2)}
    // 7: {key: "availableScreenResolution", value: Array(2)}
    // 8: {key: "timezoneOffset", value: -120}
    // 9: {key: "timezone", value: "Europe/Stockholm"}
    // 10: {key: "sessionStorage", value: true}
    // 11: {key: "localStorage", value: true}
    // 12: {key: "indexedDb", value: true}
    // 13: {key: "addBehavior", value: false}
    // 14: {key: "openDatabase", value: true}
    // 15: {key: "cpuClass", value: "not available"}
    // 16: {key: "platform", value: "MacIntel"}
    // 17: {key: "doNotTrack", value: "not available"}
    // 18: {key: "plugins", value: Array(3)}
    // 19: {key: "canvas", value: Array(2)}
    // 20: {key: "webgl", value: Array(65)}
    // 21: {key: "webglVendorAndRenderer", value: "Intel Inc.~Intel Iris Pro OpenGL Engine"}
    // 22: {key: "adBlock", value: false}
    // 23: {key: "hasLiedLanguages", value: false}
    // 24: {key: "hasLiedResolution", value: false}
    // 25: {key: "hasLiedOs", value: false}
    // 26: {key: "hasLiedBrowser", value: false}
    // 27: {key: "touchSupport", value: Array(3)}
    // 28: {key: "fonts", value: Array(168)}
    // 29: {key: "fontsFlash", value: "swf object not loaded"}
    // 30: {key: "audio", value: "124.04345808873768"}
    // 31: {key: "enumerateDevices", value: Array(14)}

    translate(width / 2, height / 2);

    //////---///---///---///


    // fonts
    fonts = fingerprint[28].value.join();
    allFonts = fingerprint[28].value;
    colorMode(HSB);
    noStroke();
    let fontColor = color(map(allFonts.length, 1, 200, 255, 0), 90, 70);
    fill(fontColor);
    // big circle depending on font quantity
    let fontsX = 200 * cos(allFonts.length);
    let fontsY = 200 * sin(allFonts.length);
    ellipse(fontsX, fontsY, allFonts.length / 2)

    noFill()
    stroke(map(allFonts.length, 1, 200, 255, 0), 90, 90)
    let f = 0;
    let g = 0;
    push()
    rotate(radians(allFonts.length))
    for (var i = 0; i < allFonts.length; i++) {
        // let x = allFonts[i].charCodeAt(5) * cos(allFonts[i].charCodeAt(0));
        // let y = allFonts[i].charCodeAt(5) * sin(allFonts[i].charCodeAt(0));
        if (i % 50 == 0) {
            f = 0;
            g += fonts.length / 100;
        }
        line(-150 + f * 2 + g, 0 + f * 3 + g, -200 + f * 2 + g, 0 + f * 3 + g)
        f++;
    }
    pop()



    colorMode(RGB);
    strokeWeight(1);
    noFill();
    // webdriver
    let webdriver = fingerprint[0].value;
    if (webdriver) {
        stroke(220, 10, 10);
        line(200 * cos(radians(60)), 200 * sin(radians(60)), 200 * cos(radians(130)), 200 * sin(radians(130)));
        ellipse(200 * cos(radians(60)), 200 * sin(radians(60)), 10);
    }
    else {
        stroke(220, 10, 10);
        line(200 * cos(radians(180)), 200 * sin(radians(180)), 200 * cos(radians(130)), 200 * sin(radians(130)));
        ellipse(200 * cos(radians(130)), 200 * sin(radians(130)), 10);
    }

    //         beginShape()
    // for (var i = 0; i < webdriver.length; i++) {
    //     let x = 200 * cos(webdriver.charCodeAt(i));
    //     let y = 200 * sin(webdriver.charCodeAt(i));
    //     vertex(x, y);
    // }
    // endShape()



    // language
    let language = fingerprint[1].value;
    stroke(200, 170, 0);
    // stroke(language.charCodeAt(i),170,0);
    beginShape()
    for (var i = 0; i < language.length; i++) {
        if (language.charAt(i) != '-') {
            let x = 200 * cos(language.charCodeAt(i));
            let y = 200 * sin(language.charCodeAt(i));

            vertex(x, y);
        }
    }
    endShape()

    // colorDepth
    stroke(255);
    let colorDepth = fingerprint[2].value;
    push()
    if (allFonts[colorDepth])
        rotate(radians(allFonts[colorDepth].charCodeAt(0)));
    ellipse(200 * cos(colorDepth), 200 * sin(colorDepth), colorDepth);
    pop()

    //deviceMemory
    fill(255);
    let deviceMemory = fingerprint[3].value;
    push()
    if (allFonts[deviceMemory])
        rotate(radians(allFonts[deviceMemory].charCodeAt(1)));
    ellipse(200 * cos(deviceMemory), 200 * sin(deviceMemory), deviceMemory);
    pop()

    //pixelRatio
    fill(255);
    let pixelRatio = fingerprint[4].value;
    push()
    if (allFonts[pixelRatio])
        rotate(radians(allFonts[pixelRatio].charCodeAt(2)));
    ellipse(200 * cos(pixelRatio), 200 * sin(pixelRatio), pixelRatio);
    pop()

    //hardwareConcurrency
    noFill();
    stroke(255);
    push()
    let hardwareConcurrency = fingerprint[5].value;
    let side = hardwareConcurrency * 4;
    var h = side * (Math.sqrt(3) / 2);
    rotate(colorDepth)
    translate(100 * cos(hardwareConcurrency), 100 * sin(hardwareConcurrency));
    triangle(-side / 2, h / 2, side / 2, h / 2, 0, -h / 2);
    pop()

    //screenResolution
    let screenResolution = fingerprint[6].value;
    // let screenResolution = [4096,2160]; // debug
    let sRx = map(screenResolution[0], 320, 4096, 0, 255);
    let sRy = map(screenResolution[1], 200, 2160, 0, 255);
    stroke(sRx, 100, sRy);
    push();
    rotate(-hardwareConcurrency)
    line(-sRx, 0, sRy, 0);
    // line(-sRx + sRx / 2 * cos(radians(90)), 0 + sRx / 2 * sin(radians(90)), sRy + sRy / 2 * cos(radians(90)), 0 + sRy / 2 * sin(radians(90)));
    ellipse(-sRx, 0, sRx, sRx);
    ellipse(sRy, 0, sRy, sRy);
    pop();

    //availableScreenResolution
    let availableScreenResolution = fingerprint[7].value;
    let aSRx = map(availableScreenResolution[0], 320, 4096, 0, 255);
    let aSRy = map(availableScreenResolution[1], 200, 2160, 0, 255);
    noStroke();
    fill(aSRx, 100, aSRy);
    ellipse(100 * cos(aSRx), 100 * sin(aSRy), 15);

    //timezoneOffset
    let timezoneOffset = fingerprint[8].value;
    let colorTOff = map(timezoneOffset, -840, 840, 0, 255);
    let posTOff = map(timezoneOffset, -840, 840, -200, 200);
    let radTOff = map(timezoneOffset, -840, 840, 50, 200);
    colorMode(HSB);
    stroke(colorTOff, 200, 50);
    fill(colorTOff, 200, 50);
    arc(posTOff, posTOff, radTOff / 2, radTOff / 2, radians(0), radians(timezoneOffset));

    //timezone
    let timezone = fingerprint[9].value;
    stroke(colorTOff, 60, 80);
    fill(colorTOff, 60, 80);
    for (var i = 0; i < timezone.length; i++) {
        let x = posTOff + timezone.charCodeAt(i) * cos(timezone.charCodeAt(i));
        let y = posTOff + timezone.charCodeAt(i) * sin(timezone.charCodeAt(i));
        ellipse(x, y, 5);
        line(x, y, posTOff, posTOff);
    }

    colorMode(RGB);
    noFill();
    //sessionStorage
    if (fingerprint[10].value)
        stroke(20, 100, 30);

    //localStorage
    if (fingerprint[11].value)
        ellipse(140, -155, 5, 5);

    //indexedDb
    if (fingerprint[12].value)
        stroke(200, 170, 0);

    //addBehavior
    if (fingerprint[13].value)
        asterisk(150, -140, 10);

    //openDatabase
    if (fingerprint[14].value)
        asterisk(120, -120, 20)

    //cpuClass


    //platform
    stroke(255);
    noFill();
    let platform = fingerprint[16].value;
    push()
    if (allFonts[platform.charCodeAt(1)])
        rotate(radians(allFonts[platform.charCodeAt(1)].charCodeAt(0)));
    beginShape()
    if (platform.length > 4) {
        for (var i = 0; i < 4; i++) {
            let x = 200 * cos(platform.charCodeAt(i));
            let y = 200 * sin(platform.charCodeAt(i));
            vertex(x, y);
        }
        ellipse(200 * cos(platform.charCodeAt(3)), 200 * sin(platform.charCodeAt(3)), 20);
        if (fingerprint[12].value) {
            strokeWeight(3)
            ellipse(200 * cos(platform.charCodeAt(2)), 200 * sin(platform.charCodeAt(2)), 20);
        }
        if (fingerprint[13].value) {
            strokeWeight(1);
            ellipse(200 * cos(platform.charCodeAt(1)), 200 * sin(platform.charCodeAt(1)), 20);
        }
        strokeWeight(1);
        if (fingerprint[14].value) {
            fill(255);
            ellipse(200 * cos(platform.charCodeAt(0)), 200 * sin(platform.charCodeAt(0)), 20);
        }
        noFill();
    }
    else {
        for (var i = 0; i < platform.length; i++) {
            let x = 200 * cos(platform.charCodeAt(i));
            let y = 200 * sin(platform.charCodeAt(i));
            vertex(x, y);
        }
    }
    endShape()
    pop()

    //doNotTrack

    //plugins

    //canvas
    let canvas = fingerprint[19].value;
    // console.log(canvas[1])
    //webgl

    //webglVendorAndRenderer
    let webglVendorAndRenderer = fingerprint[21].value;


    //adBlock
    let adBlock = fingerprint[22].value;
    push()
    if (allFonts[22])
        rotate(radians(allFonts[22].charCodeAt(1)));
    if (adBlock)
        asterisk(100 * cos(adBlock), 100 * sin(adBlock), 7);
    pop()

    //hasLiedLanguages

    //hasLiedResolution

    //hasLiedOs

    //hasLiedBrowser

    //touchSupport
    push()
    noStroke();
    translate(150 * cos(radians(160)), 150 * sin(radians(160)))
    rotate(radians(platform.charCodeAt(0)));
    let touchSupport = fingerprint[27].value;
    fill(220, 10, 10);
    if (touchSupport[1])
        rect(0, 0, 20, 20)

    noFill();
    stroke(10, 10, 220);
    if (touchSupport[2])
        rect(10, 10, 20, 20)
    pop()

    // fonts
    //// moved up

    //fontsFlash

    // audio
    let audio = fingerprint[30].value;
    push();
    rotate(radians(audio));
    fill(255);
    moon(200 * cos(audio), 200 * sin(audio), 30);
    pop();


    //
    //
    //

    // enumerateDevices
    enumerateDevices = fingerprint[31].value;
    push();
    translate(200 * cos(radians(130)), 200 * sin(radians(130)))
    rotate(radians(enumerateDevices.length));
    if (enumerateDevices.length < 3 || enumerateDevices == "not available") {
        fill(255)
        equiTriangle(0, 0, 30);
    }
    else {
        for (var i = 0; i < enumerateDevices.length; i++) {
            let a1 = 0;
            for (var j = 0; j < enumerateDevices[i].length; j++) {
                a1 = a1 + enumerateDevices[i].charCodeAt(j);
            }
            line(enumerateDevices.length * 10 / 2 - i * 10, -a1 / 200, 0, 0);
            if (enumerateDevices[i].charCodeAt(22) > 60)
                fill(255);
            if (enumerateDevices[i].charCodeAt(31) > 60)
                ellipse(enumerateDevices.length * 10 / 2 - i * 10, -a1 / 200, 5);
        }
    }
    pop();



}

function equiTriangle(x, y, side) {
    var h = side * (Math.sqrt(3) / 2);
    translate(x, y);
    triangle(-side / 2, h / 2, side / 2, h / 2, 0, -h / 2);
}

function moon(x, y, size, curve = 0.8) {
    let w = size * curve;
    let h = size;
    let a = size * 0.3;
    beginShape()
    vertex(x, y);
    bezierVertex(x + w, y, x + w, y + h, x, y + h);
    bezierVertex(x + w - a, y + h - a, x + w - a, y + a, x, y);
    endShape()
}

function asterisk(x, y, r) {
    line(x + r * cos(radians(0)), y + r * sin(radians(0)), x + r * cos(radians(180)), y + r * sin(radians(180)));
    line(x + r * cos(radians(90)), y + r * sin(radians(90)), x + r * cos(radians(270)), y + r * sin(radians(270)));
    line(x + r * cos(radians(45)), y + r * sin(radians(45)), x + r * cos(radians(225)), y + r * sin(radians(225)));
    line(x + r * cos(radians(315)), y + r * sin(radians(315)), x + r * cos(radians(135)), y + r * sin(radians(135)));
}

// function mouseClicked() {
//     img = save('shape.png');
// }

// $("#download").click(function () {
//     img = save('shape.png');
// });