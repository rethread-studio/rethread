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
