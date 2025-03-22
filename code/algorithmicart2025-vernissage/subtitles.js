let page, index

function getData() {
    fetch("index.html")
        .then((res) => res.text())
        .then((text) => {
            page = text.split("\n")
        })
        .catch((e) => console.error(e));
}
window.addEventListener("load", function() {
    getData()
    index=0
    window.setInterval(showcode, 3000)

});




function showcode() {
    document.getElementById("sub").innerHTML = "vera" + "<br>" + "molnar "+page[index].toString();
    console.log(page[index])
    index++
}



