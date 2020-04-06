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
        $("#myFP").hide();
    });

    //No thanks
    $("#noThanksAgain").click(function () {
        $("#main").fadeIn();
        $("#dotMenu").show();
        $("#consentInfo").hide();
        $("#participateStill").show();
        $("#myFP").hide();
    });


    // Agree consent
    $("#consentButton").click(function () {
        hasConsented = true;
        // Go to main page

        // document.body.style.backgroundColor = "red";
        // $(document.body).animate({ backgroundColor: "red" }, 1000);
        console.log($("body"))
        $("body").toggleClass('mainPage');

        $("#consentInfo").fadeOut();
        $("#main").fadeIn();
        $("#dotMenu").show();
        $("#participateStill").hide();
        $("#myFP").show();


    });


    // see my fingerprint
    $("#myFP").click(function () {
        // Show a dashboard with the "raw" fingerprint data, hover to reveal what each thing means
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