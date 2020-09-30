# Softwear

## P5.js creations

### First
```js
function setup() {
  createCanvas(400, 600);
  
  
  const bg = "#152A84" // random(palette)
  const fg = "#CDE4CF" // random(palette)
  
  background(bg);
  fill(fg);
  stroke(bg);
  strokeWeight(10);
  
  for (let i=0;i<400;i++) {
    x = random(width)
    y = random(height)
    h = random(height)
    
    triangle(x, y, x + random(50), y + random(50), x, y + h); 
    rect(x, y, x + random(50), y + random(50));
    
    rotate(PI/random(8));
  }
}
```
![download](https://user-images.githubusercontent.com/5577568/94275310-19de9580-ff47-11ea-86ab-a8f94983320e.png)

### Second

```js
function setup() {
  createCanvas(400, 600);
  
  const step = 25;
  const bg = "#152A84";
  const fg = "#CDE4CF";
  
  
  background(bg);
  stroke(fg);
  strokeWeight(7);

  
  for (let x=0; x < width; x += step) {
    for (let y = 0; y < height; y += step) {
      if(random(1) >= 0.5) {
        line(x, y, x + step, y + step);
      } else {
        line(x+ step, y, x, y + step);
      }
    }
  }
}
```
![download (1)](https://user-images.githubusercontent.com/5577568/94276994-3da2db00-ff49-11ea-9e64-67e619b4e6b1.png)
