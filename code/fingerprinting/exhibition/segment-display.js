function initSegmentDisplay (parent, nbDigit) {
    const displays = []
    function createHTML() {
        for (let index = 0; index < nbDigit; index++) {
            displays[index] = document.createElement('div');
            displays[index].className = "digit dig0"
            displays[index].innerHTML ='<div class="segment segA"></div>\
            <div class="segment segB"></div>\
            <div class="segment segC"></div>\
            <div class="segment segD"></div>\
            <div class="segment segE"></div>\
            <div class="segment segF"></div>\
            <div class="segment segG"></div>';
            parent.appendChild(displays[index])
        }
    }
    createHTML();
    this.update = function (value) {
        const strValue = value + "";
        for (let index = 0; index < nbDigit; index++) {
            displays[index].className = "digit dig0"
        }
        for (let index = 0; index < strValue.length; index++) {
            displays[nbDigit - 1 - index].className = "digit dig" + strValue[index];
        }
    }
    return this;
}