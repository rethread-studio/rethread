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
            if (currentPage != 'myFp') {
                $("#emojis").show();
            } else {
                $("#emojis").hide();
            }
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

function howToPage() {
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

function getKeyValues(key, callback) {
    $.get(HOST + "/api/fp/keys/" + key, (data) => {
        if (callback) {
            callback(data);
        }
    });
}

function fpHighlightHover(element) {
    const id = element.id;
    $("#fpHighlight").remove();
    element.onmouseout = () => {
        $("#fpHighlight").remove();
    };
    const offset = $(element).offset();
    $("#fpHighlight").remove();
    $("body").append('<div id="fpHighlight" style="top: ' + (offset.top + 25) + "px; left: " + offset.left + 'px;"></div>');
    function callback(data) {
        let totalUsage = 0;
        let usage = 0;
        let acutalValue = null;
        for (let value of data) {
            totalUsage += value.used;
            if (window.fp.original[value.key] == value.value) {
                usage = value.used;
                acutalValue = value.value;
            }
        }
        $("#fpHighlight").addClass('loaded')
        $("#fpHighlight").html(Math.round((usage * 100) / totalUsage) +
            '% of the visitors also have the value <span class="value">"' + element.innerText + '"</span>. At the moment we have collected ' + data.length + " different values."
        );
    }
    if ("fpBrowserName" == id) {
        getKeyValues("browser_name", callback);
    } else if ("fpOSName" == id) {
        getKeyValues("os_name", callback);
    } else if ("fpPlatform" == id) {
        getKeyValues("platform", callback);
    } else if ("fpWebGLRenderer" == id) {
        getKeyValues("webGLRenderer", callback);
    } else if ("fpFont" == id) {
        getKeyValues("font-js", callback);
    } else if ("fpScreenWidth" == id) {
        getKeyValues("screen_width", callback);
    } else if ("fpLanguage" == id) {
        getKeyValues("languages-js", callback);
    } else if ("fpTimezone" == id) {
        getKeyValues("timezone", callback);
    }
}

function generateFPText(fp) {
    let s =
        "You are using <span class = 'fpHighlight' id='fpBrowserName' onmouseover='fpHighlightHover(this);'>" +
        fp.original.browser_name +
        "</span> with <span class = 'fpHighlight' id='fpOSName' onmouseover='fpHighlightHover(this);'>" +
        fp.original.os_name +
        "</span> on a <span class = 'fpHighlight' id='fpPlatform' onmouseover='fpHighlightHover(this);'>" +
        fp.original.platform +
        "</span> machine with <span class = 'fpHighlight' id='fpWebGLRenderer' onmouseover='fpHighlightHover(this);'>" +
        fp.original.webGLRenderer +
        "</span> GPU on a <span class = 'fpHighlight' id='fpScreenWidth' onmouseover='fpHighlightHover(this);'>" +
        fp.original.screen_width +
        "x" +
        fp.original.screen_height +
        "</span> screen. You have <span class = 'fpHighlight' id='fpFont' onmouseover='fpHighlightHover(this);'>" +
        fp.original["font-js"].split(",").length +
        "</span> fonts installed. Your language is set to <span class = 'fpHighlight' id='fpLanguage'  onmouseover='fpHighlightHover(this);'> " +
        ISO6391.getName(fp.original["languages-js"].split("-")[0]) +
        "</span>. You are in <span class = 'fpHighlight' id='fpTimezone' onmouseover='fpHighlightHover(this);'>" +
        fp.original.timezone.split("/")[0] +
        "</span>, specifically, in <span class = 'fpHighlight' id='fpTimezone' onmouseover='fpHighlightHover(this);'>" +
        fp.original.timezone.split("/")[1] +
        "</span>." +
        "<p>Your emojis are drawn in a specific style, depending on your device's operating system. This is the emoji that represents you during the exhibition:</p>";
    return s;
}
function myFpPage() {
    displayPage("myFp");
    $("#goToResources").hide();
    $("#goToMainPage").hide();
    $("#main").fadeOut();
    $("#consentInfo").fadeOut();
    $("#participateStill").hide();
    $("#myFp").fadeIn();

    let currentText = "";

    const opts = {
        element: document.getElementById("fptext"),
        html: currentText,
        callback: () => {
            // execute the fadeIn
            console.log("typing done");
            getEmoji((e) => {
                const canvas = document.getElementById("myEmoji");
                const ctx = canvas.getContext("2d");
                canvas.width = 125;
                canvas.height = 125;
                ctx.font = "100px Time";
                ctx.fillStyle = "rgb(0, 0, 0)";
                ctx.strokeStyle = ctx.fillStyle;
                ctx.textAlign = "center";
                ctx.fillText(e, 50, 100);
            });
            $("#goToResources").fadeIn();
            $("#goToMainPage").fadeIn();
            $("#emojis").fadeIn();
        },
    };
    const canvas = document.getElementById("myEmoji");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    getFingerPrint(async (fp) => {
        window.fp = fp;
        $("#fptext").text("");
        const text = generateFPText(fp);
        opts.html = text;
        typewriter = setupTypewriter(opts);
        typewriter.type();
    });
}

let questions = [
    "are you unique on the internet?",
    "what's left of you when you leave a web page?",
    "how entangled are you and your device?",
    "how often do you change your device settings?",
    "if you switch devices, are you still the same person?",
    "top 25 things your BROWSER says about YOU",
    '"we have no secrets my browser and I"',
    "where do all these fonts come from?",
    "why save everything that is visible?"
];

function mainPage() {
    displayPage('main');
    $("#myFp").fadeOut();
    $("#consentInfo").fadeOut();
    $("#howToDot").fadeOut();

    // update questions here
    var randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    $("#question").text(randomQuestion);

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

    // go to resources
    $("#goToResources").click(function () {
        window.open('https://amiunique.org/tools/');
        return false;
    });

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
        window.location.href = "font/";
    });
});
