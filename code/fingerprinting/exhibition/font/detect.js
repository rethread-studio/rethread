$(document).ready(() => {
  getFingerPrint((fingerprint) => {
    if (fingerprint.random) {
      $("#seeArt").text('Visualize the fonts of a random user')
    } else {
      $("#seeArt").text('Visualize your fonts')
    }
    var canvas = document.getElementById("canvas");
    var ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    for (let font of fingerprint.original['font-js'].split(',')) {
      ctx.font = "100px " + font;
      ctx.strokeStyle = "rgba(243, 238, 234, 0.1)";
      ctx.fillStyle = "rgba(68, 68, 68, 0.001)";
      ctx.textAlign = "center";
      ctx.strokeText("FingerPrinting", canvas.width / 2, canvas.height / 2 - 60);
      ctx.fillText("FingerPrinting", canvas.width / 2, canvas.height / 2 - 60);

      ctx.font = "50px " + font;
      ctx.fillStyle = "rgba(243, 238, 234, 0.1)";
      ctx.fillText("by Re|Thread", canvas.width / 2, canvas.height / 2 + 60);
      // ctx.fillText("Re|Threat", canvas.width/2, canvas.height/2);
    }
  });
});

$("#seeArt").click(() => {
  $("canvas").toggleClass('art');
  $("#info").fadeOut();
})

function myFunction() {
  document.getElementById("myDropdown").classList.toggle("show");
}

// Close the dropdown menu if the user clicks outside of it
window.onclick = function (event) {
  if (!event.target.matches('.dropbtn')) {
      var dropdowns = document.getElementsByClassName("dropdown-content");
      var i;
      for (i = 0; i < dropdowns.length; i++) {
          var openDropdown = dropdowns[i];
          if (openDropdown.classList.contains('show')) {
              openDropdown.classList.remove('show');
          }
      }
  }
}