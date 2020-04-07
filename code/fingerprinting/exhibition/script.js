let hasConsented = false;

$(document).ready(function () {
    // Participate
    $("#participate").click(function () {
        $("#welcome").fadeOut();
        $("#consentInfo").fadeIn();
    });

    $("#participateStill").click(function () {
        $("#main").fadeOut();
        $("#consentInfo").fadeIn();
    });


    //No thanks
    $("#noThanks").click(function () {

        $("#welcome").fadeOut();
        $("#main").fadeIn();
        $("#participateStill").show();
        $("#seeMyFP").hide();
    });

    //No thanks
    $("#noThanksAgain").click(function () {
        $("#main").fadeIn();
        $("#dotMenu").show();
        $("#consentInfo").hide();
        $("#participateStill").show();
        $("#seeMyFP").hide();
    });

    // Agree consent --- See fingerprint
    $("#consentButton").click(function () {
        hasConsented = true;
        // Go to fingerprint with animation

        $("body").toggleClass('mainPage');

        $("#consentInfo").fadeOut();
        $("#myFp").fadeIn();
        $("#participateStill").hide();


    });


    // Seen fingerprint - continue experience
    $("#goToMainPage").click(function () {
        // Go to main page

        if (hasConsented) {
            $("#myFp").fadeOut();
            $("#consentInfo").fadeOut();
            $("#main").fadeIn();
            $("#dotMenu").show();
            $("#participateStill").hide();
            $("#seeMyFP").show();
        }
        else {
            console.log("no consent!)");
        }


    });


    // see my fingerprint
    $("#seeMyFP").click(function () {
        // Show fingerprint WITHOUT animation
        $("#main").fadeOut();
        $("#myFp").fadeIn();
    });

    ////// ARTWORK

    $("#3Dart").click(function () {
        // Go to 3D art
    });


    $("#2Dart").click(function () {
        // Go to 2D art
        window.location.href = "p5-fingerprinting/index.html";
    });

});
