const challenges = [
    {
        se: "🌍 Kan du ansluta till en webbsida som aktiveras på kartan Afrika, Ryssland eller Sverige?",
        en: "Can you connect to a webpage that activates in the map Africa, Russia, or Sweden?"
    },
    {
        se: "🔵 Kan du hitta en webbsida som bara visar en enda blå punkt?",
        en: "Can you find a website that shows only one blue dot?"
    },
    {
        se: "🔎 Hitta en webbplats med så många punkter som möjligt!",
        en: "Find a website that activates as many dots as possible!"
    },
    {
        se: "🎵 Hitta en webbplats med så mycket ljud som möjligt!",
        en: "Find a website with as much sound as possible!"
    },
    {
        se: "🤔 Besök din favoritwebbplats. Hur många andra sidor besöker du på samma gång?",
        en: "Visit your favorite website. How many other websites do you visit at the same time?"
    },
]

let challengePos = 0;
const sendChallenge = 5000;
const challengeTime = Date.now();
const clicks = 0;

function getChallenge() {
    challengePos = challengePos + 1 >= challenges.length ? 0 : challengePos + 1;
    typeMessage(challenges[challengePos])
    document.getElementById('message').classList.add("visible");
}





const captionEl = document.getElementById('message-se'), //Header element
    eParagraph = document.getElementById('message-en'); //Subheader element

let captionLength = 0;
let captionLength_en = 0;
let caption_se = '';
let caption_en = '';

const speed = 20;

let erasetimeout;
let typeTiemout;

function typeMessage(message) {
    caption_se = message.se;
    caption_en = message.en;
    captionLength = 0;
    captionLength_en = 0;
    clearTimeout(erasetimeout);
    clearTimeout(typeTiemout);
    type();
}



function type() {
    captionEl.innerHTML = caption_se;
    eParagraph.innerHTML = caption_en;
}

function sendReport(report) {

    const inMesage = document.getElementById("innerMessage")
    const popSe = document.getElementById("popUp-se")
    const popEn = document.getElementById("pupUp-en")

    inMesage.classList.add("inScreen");
    popSe.innerHTML = String(report.se);
    popEn.innerHTML = String(report.en);

    setTimeout(deleteReport, 8000);
}

function deleteReport() {
    const inMesage = document.getElementById("innerMessage")
    inMesage.classList.remove("inScreen");
}


function eraseMessage() {
    captionEl.innerHTML = "";
    eParagraph.innerHTML = "";
    document.getElementById('message').classList.remove("visible");
}

document.addEventListener("keyup", function (event) {
    // Number 13 is the "Enter" key on the keyboard
    if (event.keyCode === 13) {
        getChallenge()
    }

});

function testMessage() {

    captionEl.innerHTML = challenges[0].se
    eParagraph.innerHTML = challenges[0].en
    document.getElementById('message').classList.add("visible");

}


