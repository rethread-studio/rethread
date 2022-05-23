// Matrix text effect from here: https://betterprogramming.pub/how-to-create-the-matrix-text-effect-with-javascript-325c6bb7d96e
var tileSize = 15;
// a higher fade factor will make the characters fade quicker
var fadeFactor = 0.01;
var fadeColor = "0, 0, 0";
var textColor = "rgb(135,50,96)";

var canvas;
var ctx;

var enableMatrix = true;
var enableCodeSnippets = false;

var columns = [];
var maxStackHeight;

var codeToDraw = "";

var image_hexdump = `00002b30  73 75 72 65 4d 6f 64 65  3e 0a 20 20 3c 65 78 69  |sureMode>.  <exi|
00002b40  66 3a 57 68 69 74 65 42  61 6c 61 6e 63 65 3e 4d  |f:WhiteBalance>M|
00002b50  61 6e 75 65 6c 6c 20 76  69 74 62 61 6c 61 6e 73  |anuell vitbalans|
00002b60  3c 2f 65 78 69 66 3a 57  68 69 74 65 42 61 6c 61  |</exif:WhiteBala|
00002b70  6e 63 65 3e 0a 20 20 3c  65 78 69 66 3a 53 63 65  |nce>.  <exif:Sce|
00002b80  6e 65 43 61 70 74 75 72  65 54 79 70 65 3e 53 74  |neCaptureType>St|
00002b90  61 6e 64 61 72 64 3c 2f  65 78 69 66 3a 53 63 65  |andard</exif:Sce|
00002ba0  6e 65 43 61 70 74 75 72  65 54 79 70 65 3e 0a 20  |neCaptureType>. |
00002bb0  20 3c 65 78 69 66 3a 47  50 53 56 65 72 73 69 6f  | <exif:GPSVersio|
00002bc0  6e 49 44 3e 32 2e 33 2e  30 2e 30 3c 2f 65 78 69  |nID>2.3.0.0</exi|
00002bd0  66 3a 47 50 53 56 65 72  73 69 6f 6e 49 44 3e 0a  |f:GPSVersionID>.|
00002be0  20 3c 2f 72 64 66 3a 44  65 73 63 72 69 70 74 69  | </rdf:Descripti|
00002bf0  6f 6e 3e 0a 0a 3c 2f 72  64 66 3a 52 44 46 3e 0a  |on>..</rdf:RDF>.|
00002c00  3c 2f 78 3a 78 6d 70 6d  65 74 61 3e 0a 3c 3f 78  |</x:xmpmeta>.<?x|
00002c10  70 61 63 6b 65 74 20 65  6e 64 3d 27 72 27 3f 3e  |packet end='r'?>|
00002c20  0a ff db 00 43 00 01 01  01 01 01 01 01 01 01 01  |....C...........|
00002c30  01 01 01 01 01 01 01 01  01 01 01 01 01 01 01 01  |................|
*
00002c60  01 01 01 01 01 01 ff db  00 43 01 01 01 01 01 01  |.........C......|
00002c70  01 01 01 01 01 01 01 01  01 01 01 01 01 01 01 01  |................|
*
00002ca0  01 01 01 01 01 01 01 01  01 01 01 ff c2 00 11 08  |................|
00002cb0  05 00 07 80 03 01 21 00  02 11 01 03 11 01 ff c4  |......!.........|
00002cc0  00 1e 00 00 02 03 01 01  01 01 01 01 00 00 00 00  |................|
00002cd0  00 00 00 02 03 00 01 04  05 06 07 08 09 0a ff c4  |................|
00002ce0  00 1c 01 00 03 01 01 01  01 01 01 00 00 00 00 00  |................|
00002cf0  00 00 00 00 01 02 03 04  05 06 07 08 ff da 00 0c  |................|
00002d00  03 01 00 02 10 03 10 00  00 01 fe c0 9f a1 f1 6f  |...............o|
00002d10  6a d5 96 d8 95 37 91 47  4c 28 ec ec 52 c6 71 14  |j....7.GL(..R.q.|
00002d20  34 a4 09 19 14 42 ae 8b  58 85 1a 4a 83 4c 84 c4  |4....B..X..J.L..|
00002d30  b1 b5 6b 0a 15 16 b2 97  56 a8 94 55 b9 b0 6a 89  |..k.....V..U..j.|
00002d40  d5 4d 11 9a 2c 98 c3 29  b6 e9 b7 34 46 33 24 cc  |.M..,..)...4F3$.|
00002d50  93 b2 54 67 34 56 55 92  0a ca 28 55 c4 5d 85 10  |..Tg4VU...(U.]..|
00002d60  5c 1c b1 ca 6a 88 06 04  81 20 31 52 ea 54 54 65  |\...j.... 1R.TTe|
00002d70  41 54 0a 8e 65 32 e8 2a  9a 96 39 41 54 e2 a3 75  |AT..e2.*..9AT..u|
00002d80  1c d4 0a a1 5d 05 50 ae  9a 94 12 85 51 95 1c d4  |....].P.....Q...|
00002d90  64 a6 a4 10 c0 b1 09 02  e8 06 c9 a8 ca 22 aa 29  |d............".)|
00002da0  94 dc a1 55 35 56 3a 8c  a8 28 48 b8 98 8d 15 4d  |...U5V:..(H....M|
00002db0  48 2a 8d 55 0a e9 b9 41  23 55 4c a8 4c a4 ea d9  |H*.U...A#UL.L...|
00002dc0  54 4d d0 41 64 8d 54 14  88 aa 64 b1 58 b2 ac 99  |TM.Ad.T...d.X...|
00002dd0  07 09 03 72 f9 ba 3e 67  b9 cd 5a 38 96 ab 0b 34  |...r..>g..Z8...4|
00002de0  1d 36 b0 b3 b7 44 49 98  01 53 55 4d 0d 13 28 29  |.6...DI..SUM..()|
00002df0  6e 73 dd 49 02 14 bd 32  52 36 9b b2 49 85 c0 40  |ns.I...2R6..I..@|
00002e00  ad cc 16 97 2a 6a 29 5a  b4 8b aa 2e 32 ec 0e 5a  |....*j)Z....2..Z|
00002e10  26 0d 86 53 58 ad 84 9d  9a 46 45 91 cd 9d a4 64  |&..SX....FE....d|
00002e20  a8 a1 47 06 44 82 b5 52  d3 ba 65 da a9 68 bb 1c  |..G.D..R..e..h..|
00002e30  81 20 e0 b5 2c 54 63 a0  15 4a 99 41 20 4a 14 aa  |. ..,Tc..J.A J..|
00002e40  52 20 6e 90 d3 24 0a 21  41 0a 8d 55 0a ac 55 42  |R n..$.!A..U..UB|
00002e50  94 c9 42 ba 68 49 ba a1  54 65 41 54 14 a6 a4 4a  |..B.hI..TeAT...J|
00002e60  aa 9d 41 55 32 5a 06 99  76 2a 82 a8 3b 11 48 ca  |..AU2Z..v*..;.H.|
00002e70  a1 dc 65 41 54 6a d9 16  36 21 1a 41 55 15 19 28  |..eATj..6!.AU..(|
00002e80  72 05 d0 54 14 a1 50 d4  cb 1c a5 35 56 ae d1 42  |r..T..P....5V..B|
00002e90  9d 4a 43 62 90 52 87 20  aa c2 a9 cc 81 28 2e 22  |.JCb.R. .....(."|
00002ea0  1a be 36 9f 96 ed d4 da  d4 ee 2d 17 b2 3d 73 7a  |..6.......-..=sz|
00002eb0  0d dc 31 dc 45 db 72 24  b0 b4 30 91 95 54 0e 14  |..1.E.r$..0..T..|
00002ec0  ba 8a a1 2c 74 85 af 4c  f3 5d c3 18 b4 21 94 10  |...,t..L.]...!..|
00002ed0  00 6a 2d 64 80 db 0a bc  e0 52 b2 a5 66 2b b7 47  |.j-d.....R..f+.G|
00002ee0  75 46 c6 31 91 66 d9 64  c2 cc d2 22 54 64 a8 89  |uF.1.f.d..."Td..|
00002ef0  51 10 5d a0 c8 b3 92 e1  0e e0 ee 27 76 12 d1 20  |Q.]........'v.. |
00002f00  4a 64 a2 64 6e 98 9a aa  a6 40 96 21 20 1a 65 58  |Jd.dn....@.! .eX|
00002f10  8a 2a 5d 54 58 b2 40 a8  22 a0 1a 65 47 15 62 a8  |.*]TX.@."..eG.b.|
00002f20  d8 c1 48 4c a1 d4 65 88  4a 64 a6 aa 9a 90 2a c5  |..HL..e.Jd....*.|
00002f30  54 15 4d 48 3a 84 d4 65  47 37 49 ca 09 61 54 2a  |T.MH:..eG7I..aT*|
00002f40  8d c8 15 05 52 95 b6 1c  15 61 57 23 2a 2a 9c cb  |....R....aW#**..|
00002f50  0a b4 58 95 05 cc 17 32  82 41 0c 60 d5 2b b9 64  |..X....2.A.\`.+.d|
00002f60  28 a1 b5 51 a9 68 b1 4e  50 8a 12 15 4e ac 99 13  |(..Q.h.NP...N...|
00002f70  91 a9 0a f3 fb 3e 53 b7  5b 56 b4 4a 8c b4 d0 f4  |.....>S.[V.J....|
00002f80  83 ec d2 c8 57 0b 10 79  90 35 28 17 55 34 34 ae  |....W..y.5(.U44.|
00002f90  14 2b 25 64 e0 d5 68 32  ea 65 bd 70 60 81 5c b0  |.+%d..h2.e.p\`.\.|
00002fa0  b6 80 1c 81 39 18 c5 d5  a4 d6 99 13 1c 9c 77 71  |....9.........wq|
00002fb0  86 6d 91 3a 8d 06 1c 37  31 68 66 53 0e 68 c9 36  |.m.:...71hfS.h.6|
00002fc0  5c d1 5a 46 4a ac 93 2b  19 45 57 69 dd b7 76 89  |\.ZFJ..+.EWi..v.|
00002fd0  07 22 2e 04 11 48 d5 c5  54 34 aa 89 ba 64 81 62  |."...H..T4...d.b|
00002fe0  2a 31 d8 05 0d 45 d0 4a  64 a1 5c 45 46 55 05 5b  |*1...E.Jd.\EFU.[|
00002ff0  98 21 25 03 02 41 48 ca  88 a9 40 d3 56 22 ba 0a  |.!%..AH...@.V"..|
00003000  8d 4a 0a 17 12 82 a3 2a  13 23 2a 04 b5 52 85 23  |.J.....*.#*..R.#|
00003010  25 0a ac 52 99 56 28 6a  e0 cd 55 54 04 a8 a8 d5  |%..R.V(j..UT....|
00003020  40 b2 1c 88 5d 32 a3 55  42 91 83 09 94 cb 81 22  |@...]2.UB......"|
00003030  06 a9 0c a2 e2 54 45 48  a6 84 2a 52 12 65 50 42  |.....TEH..*R.ePB|
00003040  48 48 af 30 ff 00 94 ea  dc fc b5 92 ef 43 cb b6  |HH.0.........C..|
00003050  55 ba d6 92 54 58 85 03  28 5e 70 28 15 e9 31 40  |U...TX..(^p(..1@|
00003060  f3 1c 04 c4 e6 58 34 d2  9d a1 0b db 21 17 9a e9  |.....X4.....!...|
00003070  40 2e 91 01 36 ba 21 b4  21 6a 2f 48 a6 d4 d9 ba  |@...6.!.!j/H....|
00003080  84 db 49 d1 98 e1 b9 63  63 43 68 cd 93 a9 9c b6  |..I....ccCh.....|
00003090  12 b3 25 46 68 22 4c 8a  68 ad 17 63 64 97 70 ab  |..%Fh"L.h..cd.p.|
000030a0  81 56 39 12 b8 ca 82 90  18 33 6b 9a 4d 58 aa 0a  |.V9......3k.MX..|
000030b0  50 18 a5 46 30 8c 18 c8  2e 6a c7 51 cc b5 50 49  |P..F0....j.Q..PI|
000030c0  aa a2 53 52 99 74 10 42  e9 a9 41 28 56 20 32 a6  |..SR.t.B..A(V 2.|
000030d0  aa 94 89 4a 1c 82 aa 6a  08 a4 15 5b 55 42 ab 09  |...J...j...[UB..|
000030e0  05 74 54 a1 54 a2 44 aa  c7 50 65 69 9a d5 41 79  |.tT.T.D..Pei..Ay|
000030f0  84 a5 54 d5 58 15 95 54  21 a6 86 da 82 2a 83 95  |..T.X..T!....*..|
00003100  53 56 15 07 28 55 4d ca  22 e8 aa 21 54 0a 17 12  |SV..(UM."..!T...|
00003110  87 76 20 8c ba 08 69 f8  6d 1f 29 d1 ab 6c e8 db  |.v ...i.m.)..l..|
00003120  35 73 46 7a 1e 8c 83 a1  b5 40 d0 2e a1 65 72 01  |5sFz.....@...er.|
00003130  53 64 35 2e e0 f4 8e d8  b7 97 12 50 a0 4e d2 9c  |Sd5........P.N..|
00003140  ba e0 9c fa 73 66 0a c6  82 a0 48 4e 02 98 b6 e6  |....sf....HN....|
00003150  7d 93 e9 ab 97 10 ad 35  93 56 d7 a3 0d 5d b5 a3  |}......5.V...]..|
00003160  62 b6 32 74 6b 25 93 66  ec c1 85 16 c2 56 44 51  |b.2tk%.f.....VDQ|
00003170  1c b2 25 47 72 d9 72 ee  d3 96 12 82 46 ae 0e e8  |..%Gr.r.....F...|
00003180  24 07 e7 9a 19 73 51 aa  81 23 9b 8a a8 45 71 94  |$....sQ..#...Eq.|
00003190  34 a0 b5 70 55 07 20 88  46 35 53 54 15 6d 58 85  |4..pU. .F5ST.mX.|
000031a0  53 9b 81 50 55 02 40 a1  73 56 2a a6 e5 13 44 03  |S..PU.@.sV*...D.|
000031b0  44 ca 6e 50 a5 35 50 25  37 22 0a 05 c4 e8 5a ab  |D.nP.5P%7"....Z.|
000031c0  0a a7 32 c7 67 34 41 34  15 70 35 52 30 52 31 b2  |..2.g4A4.p5R0R1.|
000031d0  58 d3 02 a9 0c 73 2c 72  82 a9 94 6a 6a 87 50 55  |X....s,r...jj.PU|
000031e0  56 aa 0e e9 2a a6 ae 00  53 24 15 d8 84 5a bb 44  |V...*...S$...Z.D|
000031f0  62 bf 95 ee f9 64 cd eb  6d 4f 36 73 e6 dc 6b 63  |b....d..mO6s..kc|
00003200  ba 62 9b 85 2b 5c 81 55  98 4b cc 57 6c a8 80 bb  |.b..+\.U.K.Wl...|
00003210  4c 7a d3 6e 9c fa 9b 79  d2 a8 44 8d 21 19 75 c7  |Lz.n...y..D.!.u.|
00003220  9f cc eb e4 e6 cd f8 dc  59 84 61 62 88 77 77 5a  |........Y.ab.wwZ|
00003230  0c 8e 4a 5a 95 4a da c2  60 cd aa cd c6 ac 6c db  |..JZ.J..\`.....l.|`;

var image_hexdump_matrix = [];
var numColumns = 78;
var image_hexdump_offset_y = 0;
var image_hexdump_offset_counter = 0;

function initBg() {
  const hex_lines = image_hexdump.split('\n');
  for(let line of hex_lines) {
    image_hexdump_matrix.push(line.split(''));
  }

  if (window.socket) window.socket.on("picture_hexdump", (data) => {
    image_hexdump = data;
    const hex_lines = image_hexdump.split('\n');
    image_hexdump_matrix = [];
    for(let line of hex_lines) {
      image_hexdump_matrix.push(line.split(''));
    }
  });
  canvas = document.querySelector("#bg");

  const resize = () => {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
  };

  resize();
  window.addEventListener("resize", resize);
  ctx = canvas.getContext("2d");

  initMatrix();

  // setTimeout(changePreset, 3000);
  // start the main loop
  tick();
  console.log("background initiated");
}



function initMatrix() {
  maxStackHeight = Math.ceil(canvas.height / tileSize);

  // numColumns = canvas.width / tileSize;
  let column_offset_x = ((canvas.width / tileSize) - numColumns) * 0.5;
  if(column_offset_x < 0) {
    column_offset_x = 0;
  }
  // divide the canvas into columns
  for (let i = 0; i < numColumns; ++i) {
    var column = {};
    // save the x position of the column
    column.x = (i + column_offset_x) * tileSize;
    // create a random stack height for the column
    column.stackHeight = 10 + Math.random() * maxStackHeight;
    // add a counter to count the stack height
    column.stackCounter = 0;
    // add the column to the list
    columns.push(column);
  }
}

function draw() {
  // draw a semi transparent black rectangle on top of the scene to slowly fade older characters
  ctx.fillStyle = "rgba( " + fadeColor + " , " + fadeFactor + " )";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // pick a font slightly smaller than the tile size
  ctx.font = tileSize - 2 + "px monospace";
  // ctx.fillStyle = " rgb(64,224,208)";
  ctx.fillStyle = textColor;
  if (enableMatrix) {
    for (let i = 0; i < columns.length; ++i) {
      // pick a random ascii character (change the 94 to a higher number to include more characters)
      // var randomCharacter = String.fromCharCode(
      //   33 + Math.floor(Math.random() * 94)
      // );
      var randomCharacter = "";
      const line = image_hexdump_matrix[columns[i].stackCounter + image_hexdump_offset_y]
      if(line != undefined) {
        randomCharacter = line[i];
      }
      if(randomCharacter == undefined) {
        randomCharacter = "";
      }
      ctx.fillText(
        randomCharacter,
        columns[i].x,
        columns[i].stackCounter * tileSize + tileSize
      );

      // if the stack is at its height limit, pick a new random height and reset the counter
      if (++columns[i].stackCounter >= columns[i].stackHeight) {
        columns[i].stackHeight = 10 + Math.random() * maxStackHeight;
        columns[i].stackCounter = 0;
      }
    }
  }
}

// MAIN LOOP
function tick() {
  draw();
  if (Math.random() > 0.99) {
    if (Math.random() > 0.5) {
      textColor = "rgb(255,193,204)";
    } else {
      textColor = "rgb(64,224,208)";
    }
    // if (fadeColor == "255, 255, 255") {
    //   fadeColor = "0, 0, 0";
    //   if (Math.random() > 0.5) {
    //     textColor = "rgb(255,193,204)";
    //   } else {
    //     textColor = "rgb(64,224,208)";
    //   }
    // } else {
    //   fadeColor = "255, 255, 255";
    //   if (Math.random() > 0.5) {
    //     textColor = "rgb(54,117,136)";
    //   } else {
    //     textColor = " rgb(135,50,96)";
    //   }
    // }
  }
  image_hexdump_offset_counter += 1;
  if(image_hexdump_offset_counter >= 50) {
    image_hexdump_offset_counter = 0;
    image_hexdump_offset_y += 1;
    if(image_hexdump_offset_y + maxStackHeight + 10 >= image_hexdump_matrix.length) {
      image_hexdump_offset_y = 0;
    }
  }
  setTimeout(tick, 50);
}

function changePreset() {
  if (enableCodeSnippets && !enableMatrix) {
    enableCodeSnippets = false;
    enableMatrix = true;
  } else if (enableMatrix && !enableCodeSnippets) {
    enableCodeSnippets = true;
    enableMatrix = true;
  } else {
    enableMatrix = false;
    enableCodeSnippets = true;
  }
  setTimeout(changePreset, 10000);
}
