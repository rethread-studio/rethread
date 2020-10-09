const challenges = [
    {
        se: "",

    }
]





const captionEl = document.getElementById("message-se"), //Header element
    eParagraph = document.getElementById("message-en"); //Subheader element

let captionLength = 0;
let captionLength_en = 0;
let caption_se = '';
let caption_en = '';

const speed = 100;

let erasetimeout;
let typeTiemout;

function typeMessage(message) {
    caption_se = message.se;
    caption_en = message.en;
    captionLength = 0;
    captionLength_en = 0;
    clearTimeout(erasetimeout);
    type();
}

function type() {
    captionEl.innerHTML = caption_se.substr(0, captionLength++);
    eParagraph.innerHTML = caption_en.substr(0, captionLength_en++);
    if (captionLength < caption_se.length + 1 && captionLength_en < caption_en.length + 1) {
        typeTiemout = setTimeout('type()', speed);
    } else {
        clearTimeout(typeTiemout);
        erasetimeout = setTimeout(() => { erase(); }, 4000);

    }
}



function erase() {
    captionEl.innerHTML = caption_se.substr(0, captionLength--);
    eParagraph.innerHTML = caption_en.substr(0, captionLength_en--);
    if (captionLength >= 0 && captionLength_en >= 0) {
        erasetimeout = setTimeout('erase()', speed);
    } else {
        clearTimeout(typeTiemout);
        clearTimeout(erasetimeout);
        captionLength = 0;
        caption_se = '';
        captionLength_en = 0;
        caption_en = '';
    }
}


// const message = {
//     se: "Det äar en experiment för alt",
//     en: "This is an experimetn for all"
// }
// typeMessage(message)