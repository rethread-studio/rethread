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
        $("#consentInfo").hide();
        $("#participateStill").show();
        $("#myFP").hide();
    });


    // Agree consent
    $("#consentButton").click(function () {
        // Go to main page

        // document.body.style.backgroundColor = "red";
        // $(document.body).animate({ backgroundColor: "red" }, 1000);
        console.log($("body"))
        $("body").toggleClass('mainPage');

        $("#consentInfo").fadeOut();
        $("#main").fadeIn();
        $("#participateStill").hide();
        $("#myFP").show();


    });

});