class Scene {
    constructor() {}
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
        background(255, 50, 150, 100);
    }
    reset(sections) {
        // This is called to reset the state of the Scene before it is started
    }
    registerPacket(internalData) {

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
}