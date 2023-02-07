async function loadImage(path) {
  var img = new Image();
  img.src = path;
  return new Promise((resolve) => {
    img.onload = () => {
      img.style.width = `${img.width}px`;
      img.style.height = `${img.height}px`;
      resolve(img);
    };
  });
}

function percent(current, min, max) {
  if (current < min) return 0;
  if (current > max) return 1;

  const range = max - min;
  return (current - min) / range;
}

function updateBatch(batch, cb) {
  for (const e of batch) {
    cb(e);
  }
}

function shuffle(array) {
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex != 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}
