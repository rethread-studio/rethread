// This scene is only used to create title 

class TitleScene extends Scene {
  constructor() {
    super();
    this.textSize = 24;
  }
  preload() {
      // This function is called from the p5 preload function. Use it 
      // to load assets such as fonts and shaders.
  }
  setup() {
      // This function is called from the p5 setup function. Use it to init
      // all the state that requires p5 to be loaded (such as instantiating
      // p5 types like p5.Vector or createGraphics).
  }
  draw(dt) {
      // Update state and draw. dt is the time since last frame in seconds.
      colorMode(HSL, 100);
      background(0, 100, 100, 100);

      const lines = [
        48 * subsampling,
        130 * subsampling,
        214 * subsampling,
        297 * subsampling,
      ];

      textSize(this.textSize);
      textAlign(CENTER, CENTER);
      let texts = ["VII", "SPEAKING", "NETWORK"];
      if (typeof texts === "string" || texts instanceof String) {
        let y = lines[this.line];
        text(texts, width / 2, y);
      } else if (Array.isArray(texts)) {
        let startLine = 1;
        if (texts.length < 3) {
          startLine = 1;
        } else {
          startLine = 0;
        }
        for (let i = 0; i < texts.length; i++) {
          let y = lines[startLine + i];
          text(texts[i], width / 2, y);
        }
      }
  }
  reset(sections) {
      // This is called to reset the state of the Scene before it is started
  }
  registerPacket(internalData, country, continent) {

  }
  fadeIn(duration) {
      // Called when the previous scene is starting to fade out
  }
  fadeOut(duration) {
      // Called from within the Scene when the "fade out" section starts
  }
  play() {
      // Called when this Scene becomes the current Scene (after teh crossfade)
  }
  zIndex() {
      // Return the z index of the scene when in a transition. The higher z index is drawn on top of the lower one.
      return 0;
  }
}