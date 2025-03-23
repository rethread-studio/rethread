let page, index, nblines


window.addEventListener("load", function() {
    // on page load: fetch text in index.html and display two lines every 3 second
    getData()
    index=0
    window.setInterval(showcode, 3000)
});

function getData() {
    fetch("index.html")
        .then((res) => res.text())
        .then((text) => {
            //page is an array that includes all text found in "index.html"; each line in the file is a separate element in the array
            page = text.split("\n")
            nblines = page.length
        })
        .catch((e) => console.error(e));
}

function showcode() {
    document.getElementById("sub1").innerHTML = escapeHTML(page[index]);
    document.getElementById("sub2").innerHTML = escapeHTML(page[index+1]);
    page[index].length!=0
    console.log(page[index])
    console.log(page[index+1])
    if(index+1==nblines-1){
        index=0
    }
    else{
        index+=2
    }
}



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