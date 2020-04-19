const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
canvas.width = 750;
canvas.height = 200;

// ctx.font = "100px Time";
// ctx.fillStyle = "rgb(0, 0, 0)";
// ctx.strokeStyle = ctx.fillStyle;
// ctx.textAlign = "center";
// ctx.fillText("😃 🦠 🎉 🚀 🖼️", canvas.width / 2, canvas.height / 2);

let nbCell = 0;
for (let row = 1; row <= Math.ceil(window.innerHeight / canvas.height); row++) {
  const rowe = document.createElement("div");
  document.getElementById('content').appendChild(rowe)
  rowe.className = "w3-cell-row";
  for (
    let column = 1;
    column <= Math.ceil(window.innerWidth / canvas.width);
    column++
  ) {
    const cell = document.createElement("div");
    rowe.appendChild(cell);
    cell.className = "w3-container w3-cell w3-cell-middle";

    const img = document.createElement("img");
    nbCell++;
    img.id = "emoji" + nbCell;
    img.width = canvas.width;
    img.height = canvas.height;
    cell.appendChild(img);
  }
}
for (let i = 1; i <= nbCell; i++) {
  ((i) => {
    getRandomFingerPrint((fp) => {
      document.getElementById("emoji" + i).src = fp.original.emojis;
    });
  })(i);
}
setInterval(() => {
  getRandomFingerPrint((fp) => {
    const i = Math.round(Math.random() * nbCell);
    document.getElementById("emoji" + i).src = fp.original.emojis;
  });
}, 25);

$("#seeArt").click(() => {
  $("#content").toggleClass("art");
  $("#info").fadeOut();
});
