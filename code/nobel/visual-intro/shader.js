// This line is used for auto completion in VSCode
/// <reference path="../../node_modules/@types/p5/global.d.ts" />
//this variable will hold our shader object
var s = function (p) {
    let myShader;
    let noise;
    const size = {
        width: 208,
        height: 360
    }

    p.preload = function () {
        // a shader is composed of two parts, a vertex shader, and a fragment shader
        // the vertex shader prepares the vertices and geometry to be drawn
        // the fragment shader renders the actual pixel colors
        // loadShader() is asynchronous so it needs to be in preload
        // loadShader() first takes the filename of a vertex shader, and then a frag shader
        // these file types are usually .vert and .frag, but you can actually use anything. .glsl is another common one
        myShader = p.loadShader("shader.vert", "shader.frag");

        noise = p.loadImage("noise.png");
    }

    p.setup = function () {
        // shaders require WEBGL mode to work
        let canvas = p.createCanvas(size.width, size.height, WEBGL);
        // Send canvas to CSS class through HTML div
        // canvas.parent("shader-holder");
        p.noStroke();
    }

    p.draw = function () {
        p.background(0);
        // shader() sets the active shader with our shader
        p.shader(myShader);

        // Send the frameCount to the shader
        myShader.setUniform("uFrameCount", frameCount);
        myShader.setUniform("uNoiseTexture", noise);

        p.translate(0, -70)
        // Rotate our geometry on the X and Y axes
        p.rotateX(frameCount * 0.01);
        p.rotateY(frameCount * 0.005);

        // Draw some geometry to the screen
        // We're going to tessellate the sphere a bit so we have some more geometry to work with
        p.sphere(size.width / 3, 200, 100);
    }


}
var myp5 = new p5(s, 'shader-holder');
