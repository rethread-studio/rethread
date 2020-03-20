
function draw() {
  background(244, 164, 96);
  let indices = screen_size_grid.indices;
  let size = 12;
  let y = 0;
  let x = 0;
  textSize(size);
  fill(0); text('screen size grid', x, y + size*0.8); y += size;
  y += visualise_indices(screen_size_grid.indices, x, y, size, screen_size_grid.grid);
  fill(0); text('browser grid', x, y + size*0.8); y += size;
  y += visualise_indices(browser_grid.indices, x, y, size, browser_grid.grid);
  fill(0); text('language grid', x, y + size*0.8); y += size;
  y += visualise_indices(language_grid.indices, x, y, size, language_grid.grid);
  fill(0); text('canvas grid', x, y + size*0.8); y += size;
  y += visualise_indices(canvas_grid.indices, x, y, size, canvas_grid.grid);

  textSize(size*1.5)
  fill(0); text('Bright colour = high value\n\nThe lit up boxes is the current position of each index into the array of browser fingerprint values. The values in the arrays are the percentage of participants with that exact value for that fingerprint category.\n\nBy moving through the data at different speeds simultaneously we end up with quite a rich sonification from simple parameters.\n\nDepending on the number of participants and their devices the values will change. Simulate a different set of devices by clicking "Randomize grids".', 300, 0 + size*0.8, 340, 400);
}

function visualise_indices(indices, x,  y, size, grid) {
  let resulting_height = 0;
  for(let i = 0; i < indices.length; i++) {
    let index = indices[i];
    for(let j = 0; j < index.length; j++) {
      if(index.v == j) {
        fill(255);
      } else {
        fill(grid[j]*220 + 30, grid[j]*200+30, grid[j]*200);
      }
      rect(x + size*j, y + size*i, size, size);
    }
    resulting_height += size;
  }
  return resulting_height;
}