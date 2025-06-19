let page, index, nblines


window.addEventListener("load", function() {
    // on page load, fetch text in index.html 
    getData()
    index=0
    // display two lines of the index.html every 3 second
    // it looks like subtitles
    window.setInterval(showcode, 2000)
});

function getData() {
    fetch("index.html")
        .then((res) => res.text())
        .then((text) => {
            // page is an array that includes all text found in "index.html"
            // each line in the file is a separate element in the array
            page = text.split("\n")
            nblines = page.length
        })
        .catch((e) => console.error(e));
}

function showcode() {
    document.getElementById("sub1").innerHTML = escapeHTML(page[index]);
    document.getElementById("sub2").innerHTML = escapeHTML(page[index+1]);
    page[index].length!=0
    // if we've shown all lines, reset the index to 0, increment
    if(index+1==nblines-1){
        index=0
    }
    else{
        index+=2
    }
}

// https://www.30secondsofcode.org/js/s/escape-unescape-html/
// escapes special html characters so they can be displayed as text
const escapeHTML = str =>
    str.replace(
      /[&<>'"]/g,
      tag =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;'
        }[tag] || tag)
    );