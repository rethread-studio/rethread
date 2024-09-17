const MIX = 0, PUNCTUATION = 1, LEET = 2, HEXADECIMAL = 3, S_PLUS_7 = 4, ACCENTS = 5, CASE = 6; // types of glitch
let glitchType;

let glitchableElements; // all the HTML elements that can be glitched (with equal probability)
let glitchedElement; // the current element being glitched

let originalText, originalHTML; // the original text and HTML content of glitchedElement 
let elementChars; // all the characters present in originalText (without " ")
let progress = 0;

window.addEventListener('load', function() {
    let paragraphs = document.getElementsByTagName("p");
    let links = document.getElementsByTagName("a");
    let italics = document.getElementsByTagName("i");
    let headers2 = document.getElementsByTagName("h2");
    let headers3 = document.getElementsByTagName("h3");
    let listItems = document.getElementsByTagName("li");
    glitchableElements = [...links, ...italics, ...headers2, ...headers3];
    glitchElements();
});

function glitchElements() {
    if (Math.random() < 1/250 && progress == 0) glitchOneElement();
    requestAnimationFrame(glitchElements);
}

function glitchOneElement() {
    let newGlitchedElement;
    do {
        newGlitchedElement = randArr(glitchableElements);
    } while (newGlitchedElement === glitchedElement || newGlitchedElement.innerHTML === "")
    glitchedElement = newGlitchedElement;
    originalText = glitchedElement.innerText;
    originalHTML = glitchedElement.innerHTML;

    elementChars = originalText.split("");
    // remove spaces
    let i = 0;
    while (i < elementChars.length) {
        if (elementChars[i] == " ") elementChars.splice(i, 1);
        else i++;
    }

    glitchType = ~~(Math.random()*7);
    glitchAnimation();
}

function glitchAnimation() {
    if (progress >= originalText.length) {
        progress = 0;
        pauseAnimation();
        return;
    }
    let newText = glitchedElement.innerText;
    let newChar = chooseChar(newText[progress]);
    newText = newText.replaceAt(progress, newChar);
    glitchedElement.innerText = newText;
    progress++;
    requestAnimationFrame(glitchAnimation);
}

function chooseChar(c) {
    if (c == " ") return " ";
    switch (glitchType) {
        case MIX:
            return randArr(elementChars);
        case PUNCTUATION:
            let characters = ["!", "\"", "#", "$", "%", "&", "\'", "(", ")", "*", "+", ",", "-", ".", "/", ":", ";", "<", "=", ">", "?", "@", "[", "\\", "]", "^", "_", "`", "{", "|", "}", "~"];
            return randArr(characters);
        case LEET:
            switch (c.toUpperCase()) {
                case "A":
                    return "4";
                case "B":
                    return "8";
                case "E":
                    return "3";
                case "G":
                    return "6";
                case "L":
                    return "1";
                case "O":
                    return "0";
                case "Q":
                    return "9";
                case "S":
                    return "5";
                case "T":
                    return "7";
                case "Z":
                    return "2";
                default:
                    return c;
            }
        case HEXADECIMAL:
            return (c.codePointAt(0)%16).toString(16);
        case S_PLUS_7:
            let cod = c.codePointAt(0)+7;
            if (c.toUpperCase() == c.toLowerCase()) {
                // not a letter
                return c;
            } else if (c.toUpperCase() == c) {
                // upper case
                if (cod > "Z".codePointAt(0)) cod = cod - "Z".codePointAt(0) + "A".codePointAt(0) - 1;
            } else {
                // lower case
                if (cod > "z".codePointAt(0)) cod = cod - "z".codePointAt(0) + "a".codePointAt(0) - 1;
            }
            return String.fromCodePoint(cod);
        case ACCENTS:
            if (Math.random() < 1/2) return c;
            switch (c) {
                case "A": return randArr(["Ā", "Ă", "Ą", "À", "Á", "Â", "Ã", "Ä", "Å"]);
                case "a": return randArr(["ā", "ă", "ą", "à", "á", "â", "ã", "ä", "å"]);
                case "C": return randArr(["Ç", "Ć", "Ĉ", "Ċ", "Č"]);
                case "c": return randArr(["ç", "ć", "ĉ", "ċ", "č"]);
                case "D": return randArr(["Ď", "Đ"]);
                case "d": return randArr(["ď", "đ"]);
                case "E": return randArr(["È", "É", "Ê", "Ë", "Ē", "Ĕ", "Ė", "Ę", "Ě"]);
                case "e": return randArr(["è", "é", "ê", "ë", "ē", "ĕ", "ė", "ę", "ě"]);
                case "G": return randArr(["Ĝ", "Ğ", "Ġ", "Ģ"]);
                case "g": return randArr(["ĝ", "ğ", "ġ", "ģ"]);
                case "H": return randArr(["Ĥ", "Ħ"]);
                case "h": return randArr(["ĥ", "ħ"]);
                case "I": return randArr(["Ì", "Í", "Î", "Ï", "Ĩ", "Ī", "Ĭ", "Į", "İ"]);
                case "i": return randArr(["ì", "í", "î", "ï", "ĩ", "ī", "ĭ", "į", "ı"]);
                case "J": return "Ĵ";
                case "j": return "ĵ";
                case "K": return "Ķ";
                case "k": return "ķ";
                case "L": return randArr(["Ĺ", "Ļ", "Ľ", "Ŀ", "Ł"]);
                case "l": return randArr(["ĺ", "ļ", "ľ", "ŀ", "ł"]);
                case "N": return randArr(["Ñ", "Ń", "Ņ", "Ň"]);
                case "n": return randArr(["ñ", "ń", "ņ", "ň"]);
                case "O": return randArr(["Ò", "Ó", "Ô", "Õ", "Ö", "Ø", "Ō", "Ŏ", "Ő"]);
                case "o": return randArr(["ò", "ó", "ô", "õ", "ö", "ø", "ō", "ŏ", "ő"]);
                case "R": return randArr(["Ŕ", "Ŗ", "Ř"]);
                case "r": return randArr(["ŕ", "ŗ", "ř"]);
                case "S": return randArr(["Ś", "Ŝ", "Ş", "Š"]);
                case "s": return randArr(["ś", "ŝ", "ş", "š"]);
                case "T": return randArr(["Ţ", "Ť", "Ŧ"]);
                case "t": return randArr(["ţ", "ť", "ŧ"]);
                case "U": return randArr(["Ù", "Ú", "Û", "Ü", "Ũ", "Ū", "Ŭ", "Ů", "Ű", "Ų"]);
                case "u": return randArr(["ù", "ú", "û", "ü", "ũ", "ū", "ŭ", "ů", "ű", "ų"]);
                case "W": return "Ŵ";
                case "w": return "ŵ";
                case "Y": return randArr(["Ý", "Ŷ", "Ÿ"]);
                case "y": return randArr(["ý", "ŷ", "ÿ"]);
                case "Z": return randArr(["Ź", "Ż", "Ž"]);
                case "z": return randArr(["ź", "ż", "ž"]);
                default: return c;
            }
        case CASE:
            let up = c.toUpperCase();
            let low = c.toLowerCase();
            if (up == low) {
                // not a letter
                return c;
            } else if (up == c) {
                // upper case
                return low;
            } else {
                // lower case
                return up;
            }
    }
}

function pauseAnimation() {
    if (progress >= 100) {
        progress = 0;
        restoreAnimation();
        return;
    }
    progress++;
    requestAnimationFrame(pauseAnimation);
}

function restoreAnimation() {
    if (progress >= originalText.length) {
        progress = 0;
        glitchedElement.innerHTML = originalHTML;
        return;
    }
    glitchedElement.innerText = glitchedElement.innerText.replaceAt(progress, originalText[progress]);
    progress++;
    requestAnimationFrame(restoreAnimation);
}

function randInt(a) {
    return ~~(Math.random()*a);
}

function randArr(arr) {
    return arr[randInt(arr.length)];
}

// from https://stackoverflow.com/questions/1431094/how-do-i-replace-a-character-at-a-particular-index-in-javascript
String.prototype.replaceAt = function(index, replacement) {
    return this.substring(0, index) + replacement + this.substring(index + replacement.length);
}