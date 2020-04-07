let hasConsented = false;

if (localStorage.getItem('hasConsented') != null) {
    hasConsented = localStorage.getItem('hasConsented');
}

if (hasConsented) {
    $("body").toggleClass('mainPage');
}

const pages = ['welcome', 'consentInfo', 'myFp', 'main']

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

    page = window[window.location.hash.substring(1) + 'Page'];
    if (page) {
        page();
    } else {
        $("#welcome").fadeIn();
    }
}
window.addEventListener("hashchange", goToPage, false);

function displayPage(name) {
    window.location.hash = name;
}

function welcomePage() {
    displayPage('welcome');
}

function consentInfoPage() {
    displayPage('consentInfo');
    $("#main").fadeOut();
    $("#welcome").fadeOut();
    $("#consentInfo").fadeIn();
}

function generateFPText(fp) {
    return `Your browser fingerprint is everything a website can know about you without using cookies. You are using ${fp.original['user-agent']} browser on a ${fp.original.platform} platform with a ${fp.original.webGLRenderer} GPU on a ${fp.original.screen_width}x${fp.original.screen_height} screen. You have ${fp.original['font-js'].length} fonts installed.`
}
function myFpPage() {
    displayPage('myFp');
    $("#main").fadeOut();
    $("#consentInfo").fadeOut();
    $("#participateStill").hide();

    getFingerPrint(fp => {
        $("#myFp").fadeIn();
        $("#fptext").text(generateFPText(fp))
    })
}

function mainPage() {
    displayPage('main');
    $("#myFp").fadeOut();
    $("#consentInfo").fadeOut();
    console.log("consent: " + hasConsented);
    if (hasConsented) {
        $("#participateStill").hide();
        $("#seeMyFP").show();
    } else {
        $("#participateStill").show();
        $("#seeMyFP").hide();
    }
    $("#dotMenu").show();
    $("#main").fadeIn();
}

function participateButton() {
    consentInfoPage();
}
function participateStillButton() {
    consentInfoPage();
}
function noThanksButton() {
    mainPage();
    $("#participateStill").show();
    $("#seeMyFP").hide();
}
function noThanksAgainButton() {
    mainPage();
    $("#dotMenu").show();
    $("#consentInfo").hide();
}
function consentInfoButton() {
    myFpPage();
    hasConsented = true;
    localStorage.setItem('hasConsented', true)
    // Go to fingerprint with animation

    $("body").toggleClass('mainPage');
}
function mainButton() {
    displayPage('main');
    // Go to main page
    mainPage();

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
    myFpPage()
}

$(document).ready(function () {
    if (window.location.hash) {
        goToPage()
    }

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
    });

    $("#2Dart").click(function () {
        // Go to 2D art
        window.location.href = "p5-fingerprinting/index.html";
    });
});
