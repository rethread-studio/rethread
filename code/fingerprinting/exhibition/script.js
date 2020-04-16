loadFont()
let hasConsented = false;
getSession((session) => {
    hasConsented = session.terms;
    goToPage();
});

function fade(element, func) {
    if (element.length == 0) {
        func()
    } else {
        element.fadeOut(func)
    }
}

const pages = ['welcome', 'howTo', 'consentInfo', 'myFp', 'main']

function getCurrentPage() {
    if (window.location.hash) {
        return window.location.hash.substring(1);
    } else {
        return 'welcome';
    }
}
function goToPage() {
    const currentPage = getCurrentPage();
    for (let page of pages) {
        if (page != currentPage) {
            $("#" + page).hide();
        }
    }

    if (hasConsented) {
        $("body").addClass("blueBackground");
        $("#dot").addClass("pinkDot");
    } else {
        $("body").removeClass("blueBackground");
        $("#dot").removeClass("pinkDot");
    }
    
    page = window[currentPage + 'Page'];
    if (page) {
        page();
    } else {
        $("#welcome").fadeIn();
    }
    if (currentPage != 'welcome') {
        $("#bgCanvas").hide();
        if (hasConsented) {
            $("#emojis").show();
        }
        $("#dotMenu").show();
    } else {
        $("#bgCanvas").show();
        $("#emojis").hide();
    }
}
window.addEventListener("hashchange", goToPage, false);

function displayPage(name) {
    window.location.hash = name;
    if (hasConsented) {
        $("body").addClass("blueBackground");
        $("#dot").addClass("pinkDot");
    } else {
        $("body").removeClass("blueBackground");
        $("#dot").removeClass("pinkDot");
    }
}

function welcomePage() {
    displayPage('welcome');
    $("#welcome").fadeIn();
}

function howToPage(){
    if (hasConsented) {
        return displayPage('main');
    }
    fade($("#welcome"), function () {
        $("#howTo").fadeIn();
        $("#howToDot").fadeIn();
        $("#dotMenu").fadeIn();
    });
}

function consentInfoPage() {
    if (hasConsented) {
        return displayPage('main');
    }
    fade($("#bgCanvas"), function () {
        displayPage('consentInfo');
        $("#main").fadeOut();
        $("#howTo").fadeOut();
        $("#howToDot").fadeOut();
        $("#consentInfo").fadeIn();
    });

}

function generateFPText(fp) {
    var parser = new UAParser();
    var result = parser.getResult();
    console.log(parser.device);
    let s = "You are using <span class = 'fpHighlight'>"
        + result.browser.name + "</span> with <span class = 'fpHighlight'>" + result.os.name + " </span> on a <span class = 'fpHighlight'>" + fp.original.platform + "</span> machine with <span class = 'fpHighlight'>"
        + fp.original.webGLRenderer + "</span> GPU on a <span class = 'fpHighlight'>" + fp.original.screen_width + "x" + fp.original.screen_height
        + "</span> screen. You have <span class = 'fpHighlight'>" + fp.original['font-js'].split(',').length + "</span> fonts installed. Your language is set to <span class = 'fpHighlight'> "
        + ISO6391.getName(fp.original['languages-js'].split('-')[0]) + "</span>. You are in <span class = 'fpHighlight'>" + fp.original.timezone.split('/')[0] + "</span>, specifically, in <span class = 'fpHighlight'>"
        + fp.original.timezone.split('/')[1] + "</span>." + "<p>Your emojis are drawn in a specific style, depending on your device's operating system. This is the emoji that represents you during the exhibition:</p>"
    return s;
    // return `Your browser fingerprint is everything a website can know about you without using cookies. 
    // You are using ${fp.original['user-agent']} browser on a ${fp.original.platform} platform with 
    // a ${fp.original.webGLRenderer} GPU on a ${fp.original.screen_width}x${fp.original.screen_height} screen. 
    // You have ${fp.original['font-js'].split(',').length} fonts installed.`
}
function myFpPage() {
    displayPage('myFp');
    $("#main").fadeOut();
    $("#consentInfo").fadeOut();
    $("#participateStill").hide();
    $("#myFp").fadeIn();

    var parser = new UAParser();
    var result = parser.getResult();
    let currentText = "You are using <span class = 'fpHighlight'>"
        + result.browser.name + "</span> with <span class = 'fpHighlight'>" + result.os.name + " </span>";

    const opts = { element: document.getElementById("fptext"), html: currentText }
    typewriter = setupTypewriter(opts)
    typewriter.type();
    getFingerPrint(async fp => {
        // $("#fptext").text(generateFPText(fp));
        const text = generateFPText(fp);
        opts.html = text
        console.log(fp);
    })
}

function mainPage() {
    displayPage('main');
    $("#myFp").fadeOut();
    $("#consentInfo").fadeOut();
    $("#howToDot").fadeOut();
    console.log("consent: " + hasConsented);
    if (hasConsented) {
        $("#participateStill").hide();
        $("#seeMyFP").fadeIn();
    } else {
        $("#participateStill").show();
        $("#seeMyFP").hide();
    }
    $("#dotMenu").show();
    $("#main").fadeIn();
}

function enterButton() {
    displayPage('howTo');
}

function participateButton() {
    displayPage('consentInfo');
}
function participateStillButton() {
    displayPage('consentInfo');
}
function noThanksButton() {
    fade($("#bgCanvas"), function () {
        displayPage('main');
        $("#participateStill").show();
        $("#seeMyFP").hide();
    });
}
function noThanksAgainButton() {
    displayPage('main');
    $("#dotMenu").show();
    $("#consentInfo").hide();
    $("#howToDot").fadeOut();
}
function consentInfoButton() {
    acceptCondition(() => {
        hasConsented = true;
        // Go to fingerprint with animation
        displayPage('myFp');
    })
}
function mainButton() {
    displayPage('main');

    if (hasConsented) {
        $("#myFp").fadeOut();
        $("#consentInfo").fadeOut();
        $("#dotMenu").show();
        $("#participateStill").hide();
        $("#seeMyFP").show();
    } else {
        console.log("no consent!)");
    }
}
function myFpButton() {
    // Show fingerprint WITHOUT animation
    displayPage('myFp');
}

$(document).ready(function () {
    if (window.location.hash) {
        goToPage()
    }

    // Enter
    $("#enter").click(enterButton);

    // Participate
    $("#participate").click(participateButton);

    $("#participateStill").click(participateStillButton);

    //No thanks
    $("#noThanks").click(noThanksButton);

    //No thanks
    $("#noThanksAgain").click(noThanksAgainButton);

    // Agree consent --- See fingerprint
    $("#consentButton").click(consentInfoButton);

    // Seen fingerprint - continue experience
    $("#goToMainPage").click(mainButton);

    // see my fingerprint
    $("#seeMyFP").click(myFpButton);

    ////// ARTWORK

    $("#3Dart").click(function () {
        // Go to 3D art
        window.location.href = "https://rethread.art/code/fingerprinting/exhibition/fingerprint-3d/index.html";
    });

    $("#2Dart").click(function () {
        // Go to 2D art
        window.location.href = "p5-fingerprinting/index.html";
    });

    $("#Sky").click(function () {
        // Go to 2D art
        window.location.href = "https://rethread.art/code/fingerprinting/server/backend/static/sky.html";
    });

    $("#Font").click(function () {
        // Go to 2D art
        window.location.href = "https://rethread.art/code/fingerprinting/server/backend/static/font.html";
    });
});
