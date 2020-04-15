const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
canvas.width = 650;
canvas.height = 220;

ctx.font = "100px Time";
ctx.fillStyle = "rgb(0, 0, 0)";
ctx.strokeStyle = ctx.fillStyle;
ctx.textAlign = "center";
ctx.fillText("😃 🦠 🎉 🚀 🖼️", canvas.width / 2, canvas.height / 2);
console.log(canvas.toDataURL())