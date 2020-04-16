let hasConsented = false;
getFingerPrint(fpDone);

getSession((session) => {
    hasConsented = session.terms;
    console.log("has consented? " + hasConsented);
});

function fpDone(fingerprint) {
    // Check consent
    console.log("fingerprint is random? " + fingerprint.random);
}

let canvas, canvasC;
let width = 0;
let height = 0;

let c = 200;
let myFP;

function setup() {

    width = windowWidth;
    height = windowHeight;
    canvas = createCanvas(width / 2, height / 2);
    $("canvas").hide();
    canvas.position(width / 4, height / 4);

    // createCanvas(800, 800);
    background(0);
    c = width * 0.10;


    if (hasConsented) {
        // get my fingerprint
        getFingerPrint(fpCallback);
    }
    else {
        // no consent
        // get and show random fp
        console.log("no consent, use random")
        getRandomFingerPrint(noConsentCallback);
    }

}

$(document).ready(function () {
    if (hasConsented) {
        $("#seeAnother").click(function () {
            // erase old one and show another
            push();
            translate(width / 4, height / 4);
            noStroke();
            fill(0);
            rect(width / 4, -height / 4, width / 2, height / 2);
            translate(width / 2, 0);
            another();
            pop();
        });

        $("#seeGallery").click(function () {
            // first time getting a new fp
            canvas.position(0, height / 4);
            resizeCanvas(width, height / 2);
            push();
            translate(width / 4, height / 4);
            constellation(myFP);
            translate(width / 2, 0);
            another();
            pop();
        });
    }
    else if (!hasConsented) {

        $("#seeAnother").click(function () {
            $("#seeAnother").hide();
            // erase old one and show another
            push();
            noStroke();
            fill(0);
            rect(-width / 4, -height / 4, width / 2, height / 2);
            another();
            pop();
        });

    }

    // Show and hide stuff

    if (hasConsented) {
        $("#participate").hide();
    }
    else {
        $("#participate").fadeIn();
    }
    $("#participate").click(function () {
        window.location.href = "../index.html#consentInfo";
    });

    $("#seeArt").click(function () {
        $("canvas").toggleClass('art');
        $("#info").fadeOut();
        $("#galleryButton").delay("2500").fadeIn();
        if (hasConsented) {
            $("#seeAnother").hide();
        }
        else {

            $("#seeGallery").hide();
            $("#seeAnother").fadeIn();
        }
    });

    $("#seeGallery").click(function () {
        // $("canvas").toggleClass('compare');
        $("#seeGallery").hide();
        $("#seeAnother").show();
    });

});



function noConsentCallback(fingerprint) {
    myFP = fingerprint;
    $("canvas").fadeIn();
    $("#seeArt").text("see someone else's constellation (not my data)");

    // 36 is the length of the fingerprint -- at the moment
    if (Object.keys(fingerprint.original).length < 36) {
        // strange data, get a new one
        getRandomFingerPrint(noConsentCallback);
    }
    else {
        translate(width / 4, height / 4);
        constellation(fingerprint);
    }
}

function another() {
    // get random fp
    getRandomFingerPrint(anotherfpCallback);
}

function fpCallback(fingerprint) {

    myFP = fingerprint;

    $("canvas").fadeIn();
    $("#seeArt").text("see my constellation");

    translate(width / 4, height / 4);
    constellation(fingerprint);
}

function anotherfpCallback(fingerprint) {
    // 36 is the length of the fingerprint -- at the moment
    if (Object.keys(fingerprint.original).length < 36) {
        // strange data, get a new one
        getRandomFingerPrint(anotherfpCallback);
    }
    else {
        constellation(fingerprint);
        $("#seeAnother").show();
    }
}



function constellation(fingerprint) {

    let fp = fingerprint.original;
    // console.log(fp);

    // host: "fp.durieux.me"
    // dnt: "not available"
    // user-agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36"
    // accept: "*/*"
    // accept-encoding: "gzip,identity"
    // accept-language: "sv-SE,sv,en-US,en,es-ES,es"
    // ad: false
    // canvas: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAB9AA"
    // font-js: "Andale Mono,Arial,Arial Black,Arial Hebrew,Arial Narrow,Arial Rounded MT Bold,Arial Unicode MS,Book Antiqua,Bookman Old Style,Calibri,Cambria,Cambria Math,Century,Century Gothic,Century Schoolbook,Comic Sans MS,Consolas,Courier,Courier New,Geneva,Georgia,Helvetica,Helvetica Neue,Impact,Lucida Bright,Lucida Calligraphy,Lucida Console,Lucida Fax,LUCIDA GRANDE,Lucida Handwriting,Lucida Sans,Lucida Sans Typewriter,Lucida Sans Unicode,Microsoft Sans Serif,Monaco,Monotype Corsiva,MS Gothic,MS PGothic,MS Reference Sans Serif,MYRIAD PRO,Palatino,Palatino Linotype,Tahoma,Times,Times New Roman,Trebuchet MS,Verdana,Wingdings,Wingdings 2,Wingdings 3,Abadi MT Condensed Light,ADOBE CASLON PRO,ADOBE GARAMOND PRO,American Typewriter,Apple Chancery,Apple Color Emoji,Apple SD Gothic Neo,AVENIR,Ayuthaya,Bangla Sangam MN,Baskerville,Baskerville Old Face,Batang,Bauhaus 93,Bell MT,Bernard MT Condensed,Big Caslon,Bodoni 72,Bodoni 72 Oldstyle,Bodoni 72 Smallcaps,Bookshelf Symbol 7,Bradley Hand,Britannic Bold,Brush Script MT,Calisto MT,Candara,Chalkboard,Chalkboard SE,Chalkduster,Cochin,Colonna MT,Constantia,Cooper Black,Copperplate,Copperplate Gothic Bold,Copperplate Gothic Light,Corbel,Curlz MT,Didot,Edwardian Script ITC,Engravers MT,Euphemia UCAS,EUROSTILE,Footlight MT Light,Futura,Gabriola,Geeza Pro,Gill Sans,Gill Sans MT,Gloucester MT Extra Condensed,GOTHAM BOLD,Goudy Old Style,Gujarati Sangam MN,Gulim,Gurmukhi MN,Haettenschweiler,Harrington,Heiti SC,Heiti TC,Hiragino Kaku Gothic ProN,Hiragino Mincho ProN,Hoefler Text,Imprint MT Shadow,INCONSOLATA,Kailasa,Kannada Sangam MN,Khmer UI,Krungthep,Malayalam Sangam MN,Marion,Marker Felt,Marlett,Matura MT Script Capitals,Meiryo,Microsoft Himalaya,Microsoft Tai Le,Microsoft Yi Baiti,MingLiU,MingLiU_HKSCS,MingLiU_HKSCS-ExtB,MingLiU-ExtB,Minion Pro,Mistral,Modern No. 20,Mongolian Baiti,MS Mincho,MS PMincho,MS Reference Specialty,MT Extra,Nadeem,Noteworthy,Onyx,OPTIMA,Oriya Sangam MN,Papyrus,Perpetua,Perpetua Titling MT,Plantagenet Cherokee,Playbill,PMingLiU,PMingLiU-ExtB,Rockwell,Rockwell Extra Bold,Savoye LET,SimHei,SimSun,SimSun-ExtB,Sinhala Sangam MN,Skia,Snell Roundhand,Stencil,Tamil Sangam MN,Telugu Sangam MN,Thonburi,TRAJAN PRO,Tw Cen MT,Wide Latin,Zapfino,.Aqua Kana,Abadi MT Condensed Extra Bold,Adobe Arabic,Al Bayan,Al Nile,Al Tarikh,Apple Braille,Apple Symbols,AppleGothic,AppleMyungjo,AquaKana,Avenir,Avenir Black,Avenir Book,Avenir Next,Avenir Next Condensed,Avenir Next Demi Bold,Avenir Next Heavy,Baghdad,Bangla MN,Beirut,Birch Std,Blackoak Std,Bodoni Ornaments,Braggadocio,Brush Script Std,Chaparral Pro,Chaparral Pro Light,Charlemagne Std,Charter,Cooper Std Black,Corsiva Hebrew,Cutive Mono,DIN Alternate,DIN Condensed,Damascus,DecoType Naskh,Desdemona,Devanagari MT,Devanagari Sangam MN,Diwan Kufi,Diwan Thuluth,Eurostile,Farah,Farisi,Franklin Gothic Book,Franklin Gothic Medium,GB18030 Bitmap,Garamond,Giddyup Std,Gujarati MT,Gurmukhi MT,Gurmukhi Sangam MN,Herculanum,Hiragino Kaku Gothic Pro W3,Hiragino Kaku Gothic Pro W6,Hiragino Kaku Gothic ProN W3,Hiragino Kaku Gothic ProN W6,Hiragino Kaku Gothic Std W8,Hiragino Kaku Gothic StdN W8,Hiragino Maru Gothic Pro W4,Hiragino Maru Gothic ProN W4,Hiragino Mincho Pro W3,Hiragino Mincho Pro W6,Hiragino Mincho ProN W3,Hiragino Mincho ProN W6,Hiragino Sans GB W3,Hiragino Sans GB W6,Hiragino Sans W0,Hiragino Sans W1,Hiragino Sans W2,Hiragino Sans W3,Hiragino Sans W4,Hiragino Sans W5,Hiragino Sans W6,Hiragino Sans W7,Hiragino Sans W8,Hiragino Sans W9,Hobo Std,ITF Devanagari,ITF Devanagari Marathi,InaiMathi,Kannada MN,Kefa,Khmer MN,Khmer Sangam MN,Kino MT,Kohinoor Bangla,Kohinoor Devanagari,Kohinoor Telugu,Kokonor,Kozuka Gothic Pr6N B,KufiStandardGK,Lao MN,Lao Sangam MN,LastResort,Letter Gothic Std,Lithos Pro Regular,Lucida Blackletter,Lucida Grande,Luminari,Malayalam MN,Menlo,Mesquite Std,Mishafi,Mishafi Gold,Monotype Sorts,Mshtakan,Muna,Myanmar MN,Myanmar Sangam MN,Myriad Arabic,Myriad Hebrew,Myriad Pro,NanumGothicCoding,New Peninim MT,News Gothic MT,Noto Nastaliq Urdu,Nueva Std,Nueva Std Cond,OCR A Std,Optima,Orator Std,Oriya MN,PT Mono,PT Sans,PT Serif,Phosphate,PingFang HK,PingFang SC,PingFang TC,Poplar Std,Prestige Elite Std,Raanana,Roboto,Rosewood Std Regular,STIXGeneral,STIXGeneral-Bold,STIXGeneral-Regular,STIXIntegralsD,STIXIntegralsD-Bold,STIXIntegralsSm,STIXIntegralsSm-Bold,STIXIntegralsUp,STIXIntegralsUp-Bold,STIXIntegralsUp-Regular,STIXIntegralsUpD,STIXIntegralsUpD-Bold,STIXIntegralsUpD-Regular,STIXIntegralsUpSm,STIXIntegralsUpSm-Bold,STIXNonUnicode,STIXNonUnicode-Bold,STIXSizeFiveSym,STIXSizeFiveSym-Regular,STIXSizeFourSym,STIXSizeFourSym-Bold,STIXSizeOneSym,STIXSizeOneSym-Bold,STIXSizeThreeSym,STIXSizeThreeSym-Bold,STIXSizeTwoSym,STIXSizeTwoSym-Bold,STIXVariants,STIXVariants-Bold,STSong,Sana,Sathu,Shree Devanagari 714,SignPainter-HouseScript,Silom,Sinhala MN,Songti SC,Songti TC,Source Code Pro,Stencil Std,Sukhumvit Set,Symbol,System Font,Tamil MN,Tekton Pro,Tekton Pro Cond,Tekton Pro Ext,Telugu MN,Trajan Pro,Trattatello,Waseem,Webdings"
    // languages-js: "sv-SE"
    // platform: "MacIntel"
    // plugins: "[["Chrome PDF Plugin","Portable Document Format",[["application/x-google-chrome-pdf","pdf"]]],["Chrome PDF Viewer","",[["application/pdf","pdf"]]],["Native Client","",[["application/x-nacl",""],["application/x-pnacl",""]]]]"
    // screen_width: 1440
    // screen_height: 900
    // screen_depth: 24
    // pixelRatio: 2
    // hardwareConcurrency: 8
    // availableScreenResolution: "877,1440"
    // indexedDb: true
    // addBehavior: false
    // openDatabase: true
    // touchSupport: "0,false,false"
    // audio: "124.04345808873768"
    // enumerateDevices: "id=default;gid=2c0c17c465e3e95528994c24b9d11d856d86b91d3f8d9dcc8178b4cf5d624e63;audioinput;,id=adc12e632c5336318c9093d3952e29385956ffa5d64174284cb80f04a2043323;gid=2c0c17c465e3e95528994c24b9d11d856d86b91d3f8d9dcc8178b4cf5d624e63;audioinput;,id=8c5ccc6c2d6b6d2b2986832a00d904e5df3289f67355fead7e6c28533ff16b73;gid=45500fe2e7a6905fd6b4373c16274da86fd8740e1c9967b7b2a02c4266732685;audioinput;,id=5085b20c0c54bcd0a197c8fdde13d908f9563fecf5fbea1405dfa9a6eb8f503e;gid=29453a2a4306838b9bba53c311d793d35a25a78595271fae6e738e5827c29410;audioinput;,id=e9a8b57f4bb7dfc1589f9eb55347c1ce234dac5dc80e6c50a1467bdff0295e94;gid=601de1535837e44d5c1cc147d4549661356a7d03ac9c78f51fc581e4d9b96697;audioinput;,id=3171e538301e445e350f26f5674c8311eba9c59e9e4f8258c6ba2c517d3ec54e;gid=c5d9105fa363d3133ba61e599ecd130c02a5ab6e3212579f876f48904e660bc3;audioinput;,id=43be55d76124cc2cc163b0cf3826f85a404ad0f3f86625f0b5a41fd35feceaf4;gid=5487a3d5d12d009086a2e72aa1783725ebc06174bb1e436cdc00c5b62525e705;videoinput;,id=default;gid=2c0c17c465e3e95528994c24b9d11d856d86b91d3f8d9dcc8178b4cf5d624e63;audiooutput;,id=f36e65f01bc09b793a41929fa099421068e18070806d2c495ee7ce5f27fba379;gid=2c0c17c465e3e95528994c24b9d11d856d86b91d3f8d9dcc8178b4cf5d624e63;audiooutput;,id=9d32a82c3c4536eedb807689a395e85386c3448ae56748d44bfae40ae9a50a55;gid=45500fe2e7a6905fd6b4373c16274da86fd8740e1c9967b7b2a02c4266732685;audiooutput;,id=5085b20c0c54bcd0a197c8fdde13d908f9563fecf5fbea1405dfa9a6eb8f503e;gid=3b46fdaa7bc350ff3c1affadfb48e4764ccd223b96434123359e631c25ccbeaa;audiooutput;,id=e9a8b57f4bb7dfc1589f9eb55347c1ce234dac5dc80e6c50a1467bdff0295e94;gid=a10eae772ab6458c4eca60616817a89b75a5360e968f8c20b5a761d37fba9a1b;audiooutput;,id=3171e538301e445e350f26f5674c8311eba9c59e9e4f8258c6ba2c517d3ec54e;gid=c5d9105fa363d3133ba61e599ecd130c02a5ab6e3212579f876f48904e660bc3;audiooutput;,id=213585c865bf4d3f171da28ae2878800dff4c871a100e01de77ee8993262968a;gid=b58351bd976de8752b257cdae6b595f4c0a0d41ecfd5f7356856940ad8e30402;audiooutput;"
    // storage_local: true
    // storage_session: true
    // timezone: "Europe/Stockholm"
    // timezoneOffset: -120
    // userAgent-js: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36"
    // webGLVendor: "Intel Inc."
    // webGLRenderer: "Intel Iris Pro OpenGL Engine"
    // _id: "5e8c7e74a24de50028d3b44f"


    //////---///---///---///


    // fonts
    // fonts = fingerprint.original['font-js'];
    allFonts = fp['font-js'].split(',');
    fonts = allFonts.join('');
    colorMode(HSB);
    noStroke();
    let fontColor = color(map(allFonts.length, 1, 400, 255, 0), 70, 190);
    fill(fontColor);
    // big circle depending on font quantity
    let fontsX = c * cos(allFonts.length);
    let fontsY = c * sin(allFonts.length);
    push()
    translate(0, 0, -c * 0.05);
    ellipse(fontsX, fontsY, allFonts.length * c * 0.0015);
    pop()

    noFill()
    stroke(map(allFonts.length, 1, 400, 255, 0), 60, 200)
    let f = 0;
    let g = 0;
    push()
    rotate(radians(allFonts.length))
    for (var i = 0; i < allFonts.length; i++) {
        // let x = allFonts[i].charCodeAt(5) * cos(allFonts[i].charCodeAt(0));
        // let y = allFonts[i].charCodeAt(5) * sin(allFonts[i].charCodeAt(0));
        if (i % 50 == 0) {
            f = 0;
            g += fonts.length / 300;
        }
        line(-0.9 * c + f * 1 + g, 0 + f * 2 + g, -c + f * 1 + g, 0 + f * 2 + g)
        f++;
    }
    pop()



    colorMode(RGB);
    strokeWeight(1);
    noFill();
    // do not track
    let dnt = fp['dnt'];
    if (dnt == "not available") {
        stroke(220, 10, 110);
        line(c * cos(radians(60)), c * sin(radians(60)), c * cos(radians(130)), c * sin(radians(130)));
        ellipse(c * cos(radians(60)), c * sin(radians(60)), c * 0.05);
    }
    else if (dnt == "unspecified") {
        stroke(220, 10, 110);
        line(c * cos(radians(180)), c * sin(radians(180)), c * cos(radians(130)), c * sin(radians(130)));
        ellipse(c * cos(radians(130)), c * sin(radians(130)), c * 0.05);
    }
    else if (dnt == "true") {
        stroke(220, 10, 110);
        line(c * cos(radians(270)), c * sin(radians(270)), c * cos(radians(0)), c * sin(radians(0)));
        ellipse(c * cos(radians(0)), c * sin(radians(0)), c * 0.1);
    }
    else if (dnt == "false") {
        stroke(220, 10, 110);
        line(c * cos(radians(0)), c * sin(radians(0)), c * cos(radians(10)), c * sin(radians(10)));
        ellipse(c * cos(radians(0)), c * sin(radians(0)), c * 0.05);
    }

    // old
    //         beginShape()
    // for (var i = 0; i < webdriver.length; i++) {
    //     let x = c * cos(webdriver.charCodeAt(i));
    //     let y = c * sin(webdriver.charCodeAt(i));
    //     vertex(x, y);
    // }
    // endShape()



    // language
    let language = fp['languages-js'];
    stroke(250, 230, 100);
    // stroke(language.charCodeAt(i),170,0);
    beginShape()
    for (var i = 0; i < language.length; i++) {
        if (language.charAt(i) != '-') {
            let x = c * cos(language.charCodeAt(i));
            let y = c * sin(language.charCodeAt(i));

            vertex(x, y);
        }
    }
    endShape()

    // colorDepth
    stroke(255);
    let colorDepth = fp['screen_depth'];
    push()
    if (allFonts[colorDepth])
        rotate(radians(allFonts[colorDepth].charCodeAt(0)));
    ellipse(c * cos(colorDepth), c * sin(colorDepth), c * colorDepth);
    pop()

    //plugins
    fill(255);
    let plugins = fp['plugins'].split(',');
    push()
    if (allFonts[plugins.length])
        rotate(radians(allFonts[plugins.length].charCodeAt(1)));
    ellipse(c * cos(plugins.length), c * sin(plugins.length), c * 0.01 * plugins.length);
    pop()

    //pixelRatio
    fill(255);
    if (fp['pixelRatio']) {
        let pixelRatio = fp['pixelRatio'];
        push()
        if (allFonts[pixelRatio])
            rotate(radians(allFonts[pixelRatio].charCodeAt(2)));
        ellipse(c * cos(pixelRatio), c * sin(pixelRatio), c * 0.01 * pixelRatio);
        pop();
    }

    //hardwareConcurrency
    noFill();
    stroke(255);
    push()
    let hardwareConcurrency = fp['hardwareConcurrency'];
    let side = c * 0.03 * hardwareConcurrency;
    var h = side * (Math.sqrt(3) / 2);
    rotate(colorDepth)
    translate(c * cos(hardwareConcurrency), c * sin(hardwareConcurrency));
    triangle(-side / 2, h / 2, side / 2, h / 2, 0, -h / 2);
    pop()

    //screenResolution
    // let screenResolution = [4096,2160]; // debug
    let sRx = map(fp['screen_width'], 320, 4096, 0, 255);
    let sRy = map(fp['screen_height'], 200, 2160, 0, 255);
    stroke(sRy * 0.5, 40, sRx);
    push();
    rotate(-hardwareConcurrency);
    let c_ = 0.0045;
    line(-sRx * c * c_, 0, sRy * c * c_, 0);
    // line(-sRx + sRx / 2 * cos(radians(90)), 0 + sRx / 2 * sin(radians(90)), sRy + sRy / 2 * cos(radians(90)), 0 + sRy / 2 * sin(radians(90)));
    ellipse(-sRx * c * c_, 0, sRx * c * c_ * 1.5, sRx * c * c_ * 1.5);
    ellipse(sRy * c * c_, 0, sRy * c * c_ * 1.5, sRy * c * c_ * 1.5);
    pop();

    //availableScreenResolution
    if (fp['availableScreenResolution']) {
        let availableScreenResolution = fp['availableScreenResolution'].split(',');
        let aSRx = map(availableScreenResolution[0], 320, 4096, 0, 255);
        let aSRy = map(availableScreenResolution[1], 200, 2160, 0, 255);
        noStroke();
        fill(sRy * 0.5, 40, sRx);
        ellipse(c / 2 * cos(aSRx), c / 2 * sin(aSRy), c * 0.1);
    }

    //timezoneOffset
    let colorTOff = map(0, -840, 840, 0, 255);
    let posTOff = map(0, -840, 840, -c, c);
    if (fp['timezoneOffset']) {
        let timezoneOffset = fp['timezoneOffset'];
        colorTOff = map(timezoneOffset, -840, 840, 0, 255);
        posTOff = map(timezoneOffset, -840, 840, -c, c);
        let radTOff = map(timezoneOffset, -840, 840, 50, c);
        colorMode(HSB);
        stroke(colorTOff, 20, 150);
        fill(colorTOff, 20, 150);
        arc(posTOff, posTOff, radTOff / 2, radTOff / 2, radians(0), radians(timezoneOffset));
    }

    //timezone
    let timezone = fp['timezone'];
    stroke(colorTOff, 50, 110);
    fill(colorTOff, 50, 110);
    for (var i = 0; i < timezone.length; i++) {
        let x = posTOff + c * 0.005 * timezone.charCodeAt(i) * cos(timezone.charCodeAt(i));
        let y = posTOff + c * 0.005 * timezone.charCodeAt(i) * sin(timezone.charCodeAt(i));
        ellipse(x, y, 0.025 * c);
        line(x, y, posTOff, posTOff);
    }

    colorMode(RGB);
    noFill();
    //sessionStorage
    if (fp['storage_session'])
        stroke(170, 250, 190);

    //localStorage
    if (fp['storage_local'])
        ellipse(c * 0.7, -c * 0.75, c * 0.035);

    //indexedDb
    if (fp['indexedDb'])
        stroke(250, 230, 100);

    //addBehavior
    if (fp['addBehavior'])
        asterisk(c * 0.75, -c * 0.7, c * 0.05);

    //openDatabase
    if (fp['openDatabase'])
        asterisk(c * 0.6, -c * 0.6, c * 0.1);

    //cpuClass


    //platform
    stroke(255);
    noFill();
    let platform = fp['platform'];
    push()
    if (allFonts[platform.charCodeAt(1)])
        rotate(radians(allFonts[platform.charCodeAt(1)].charCodeAt(0)));
    beginShape()
    if (platform.length > 4) {
        for (var i = 0; i < 4; i++) {
            let x = c * cos(platform.charCodeAt(i));
            let y = c * sin(platform.charCodeAt(i));
            vertex(x, y);
        }
        ellipse(c * cos(platform.charCodeAt(3)), c * sin(platform.charCodeAt(3)), c * 0.1);
        if (fp['indexedDB']) {
            strokeWeight(3)
            ellipse(c * cos(platform.charCodeAt(2)), c * sin(platform.charCodeAt(2)), c * 0.1);
        }
        if (fp['addBehavior']) {
            strokeWeight(1);
            ellipse(c * cos(platform.charCodeAt(1)), c * sin(platform.charCodeAt(1)), c * 0.1);
        }
        strokeWeight(1);
        if (fp['openDatabase']) {
            fill(255);
            ellipse(c * cos(platform.charCodeAt(0)), c * sin(platform.charCodeAt(0)), c * 0.1);
        }
        noFill();
    }
    else {
        for (var i = 0; i < platform.length; i++) {
            let x = c * cos(platform.charCodeAt(i));
            let y = c * sin(platform.charCodeAt(i));
            vertex(x, y);
        }
    }
    endShape()
    pop()

    //doNotTrack

    //plugins

    //canvas
    let canvas = fp['canvas'];
    // console.log(canvas[1])
    //webgl

    //webglVendor
    let webglVendor = fp['webglVendor'];
    //webglRenderer
    let webglRenderer = fp['webglRenderer'];


    //adBlock
    let adBlock = fp['ad'];
    push()
    if (allFonts[22])
        rotate(radians(allFonts[22].charCodeAt(1)));
    if (adBlock)
        asterisk(c / 2 * cos(adBlock), c / 2 * sin(adBlock), c * 0.035);
    pop()

    //hasLiedLanguages

    //hasLiedResolution

    //hasLiedOs

    //hasLiedBrowser

    //touchSupport
    push()
    noStroke();
    translate(0.75 * c * cos(radians(160)), 0.75 * c * sin(radians(160)))
    rotate(radians(platform.charCodeAt(0)));
    if (fp['touchSupport']) {
        let touchSupport = fp['touchSupport'].split(',');
        // touchSupport = [0,"true","true"]; // debug
        fill(220, 10, 110);
        if (touchSupport[1] == "true")
            rect(0, 0, 0.1 * c, 0.1 * c)
        noFill();
        stroke(110, 110, 220);
        if (touchSupport[2] == "true")
            rect(10, 10, 0.1 * c, 0.1 * c)
        pop()
    }

    // fonts
    //// moved up

    //fontsFlash

    // audio
    let audio = fp['audio'];
    push();
    rotate(radians(audio));
    fill(255);
    moon(c * cos(audio), c * sin(audio), 0.15 * c);
    pop();


    //
    //
    //

    // enumerateDevices
    if (fp['enumerateDevices']) {
        enumerateDevices = fp['enumerateDevices'].split(',');
        push();
        translate(c * cos(radians(130)), c * sin(radians(130)));
        rotate(radians(enumerateDevices.length));
        if (enumerateDevices.length < 3 || enumerateDevices == "not available") {
            fill(255)
            equiTriangle(0, 0, c * 0.15);
        }
        else {
            // for (var i = 0; i < enumerateDevices.length; i++) {
            //     let a1 = 0;
            //     for (var j = 0; j < enumerateDevices[i].length; j++) {
            //         a1 = a1 + enumerateDevices[i].charCodeAt(j);
            //     }
            //     let x_start = c * 0.01 * enumerateDevices.length - i * 5;
            //     let y_start = -a1 / c;
            //     line(x_start, y_start, 0, 0);
            //     if (enumerateDevices[i].charCodeAt(22) > 60)
            //         fill(255);
            //     if (enumerateDevices[i].charCodeAt(31) > 60)
            //         ellipse(x_start, y_start, c * 0.025);
            // }
            for (var i = 0; i < enumerateDevices.length; i++) {
                let a1 = 0;
                let last_a1 = 0;
                for (var j = 0; j < enumerateDevices[i].length; j++) {
                    last_a1 = a1;
                    a1 = a1 + enumerateDevices[i].charCodeAt(j);
                }
                let x = c * 0.00002 * a1 * cos(a1);
                let y = c * 0.00002 * a1 * sin(a1);
                if (enumerateDevices[i].charCodeAt(22) > 60)
                    fill(255);
                if (enumerateDevices[i].charCodeAt(31) > 60)
                    ellipse(x, y, 0.025 * c);

                line(x, y, 0, 0);
            }
        }
        pop();
    }


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