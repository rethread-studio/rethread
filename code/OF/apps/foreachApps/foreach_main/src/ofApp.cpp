#include "ofApp.h"

//--------------------------------------------------------------
void ofApp::setup() {

  // try to grab at this size.
  camWidth = 640;
  camHeight = 480;

  // get back a list of devices.
  vector<ofVideoDevice> devices = vidGrabber.listDevices();

  for (size_t i = 0; i < devices.size(); i++) {
    if (devices[i].bAvailable) {
      // log the device
      ofLogNotice() << devices[i].id << ": " << devices[i].deviceName;
    } else {
      // log the device and note it as unavailable
      ofLogNotice() << devices[i].id << ": " << devices[i].deviceName
                    << " - unavailable ";
    }
  }

  vidGrabber.setDeviceID(0);
  vidGrabber.setDesiredFrameRate(30);
  vidGrabber.initGrabber(camWidth, camHeight);

  videoInverted.allocate(vidGrabber.getWidth(), vidGrabber.getHeight(),
                         OF_PIXELS_RGB);
  videoTexture.allocate(videoInverted);
  ofSetVerticalSync(true);

  pixelShader.load("shaders/pixel_shader/shader");
  imageFbo.allocate(vidGrabber.getWidth(), vidGrabber.getHeight());

  gui.setup("parameters");
  gui.add(pixelZoom.set("pixel zoom", 10.0, 0.2, 30.0));
}

//--------------------------------------------------------------
void ofApp::update() {
  ofBackground(100, 100, 100);
  vidGrabber.update();

  if (vidGrabber.isFrameNew()) {
    ofPixels &pixels = vidGrabber.getPixels();
    for (size_t i = 0; i < pixels.size(); i++) {
      // invert the color of the pixel
      videoInverted[i] = 255 - pixels[i];
    }
    // load the inverted pixels
    videoTexture.loadData(videoInverted);
  }
}

//--------------------------------------------------------------
void ofApp::draw() {
  ofSetColor(255);
  imageFbo.begin();
  vidGrabber.draw(0, 0);
  imageFbo.end();
  pixelShader.begin();
  pixelShader.setUniform2f("resolution", imageFbo.getWidth(),
                           imageFbo.getHeight());
  pixelShader.setUniform2f("outputResolution", ofGetWidth(), ofGetHeight());
  pixelShader.setUniformTexture("tex0", imageFbo.getTextureReference(), 1);
  // pixelShader.setUniform1f("zoom", (sin(ofGetElapsedTimef()) + 1.0) * 500.0);
  pixelShader.setUniform1f("zoom", pow(float(pixelZoom), 2.0));
  ofDrawRectangle(0, 0, ofGetWidth(), ofGetHeight());
  pixelShader.end();
  ofSetHexColor(0xffffff);
  float camZoom = 2.0;
  glm::vec2 camPos =
      glm::vec2((ofGetWidth() - vidGrabber.getWidth() * 2.0) * 0.5,
                (ofGetHeight() - vidGrabber.getHeight() * 2.0) * 0.5);
  vidGrabber.draw(camPos.x, camPos.y, vidGrabber.getWidth() * camZoom,
                  vidGrabber.getHeight() * camZoom);
  videoTexture.draw(20 + camWidth, 20, camWidth, camHeight);

  gui.draw();
}

//--------------------------------------------------------------
void ofApp::keyPressed(int key) {
  // in fullscreen mode, on a pc at least, the
  // first time video settings the come up
  // they come up *under* the fullscreen window
  // use alt-tab to navigate to the settings
  // window. we are working on a fix for this...

  // Video settings no longer works in 10.7
  // You'll need to compile with the 10.6 SDK for this
  // For Xcode 4.4 and greater, see this forum post on instructions on
  // installing the SDK http://forum.openframeworks.cc/index.php?topic=10343
  if (key == 's' || key == 'S') {
    vidGrabber.videoSettings();
  }
}

//--------------------------------------------------------------
void ofApp::keyReleased(int key) {}

//--------------------------------------------------------------
void ofApp::mouseMoved(int x, int y) {}

//--------------------------------------------------------------
void ofApp::mouseDragged(int x, int y, int button) {}

//--------------------------------------------------------------
void ofApp::mousePressed(int x, int y, int button) {}

//--------------------------------------------------------------
void ofApp::mouseReleased(int x, int y, int button) {}

//--------------------------------------------------------------
void ofApp::mouseEntered(int x, int y) {}

//--------------------------------------------------------------
void ofApp::mouseExited(int x, int y) {}

//--------------------------------------------------------------
void ofApp::windowResized(int w, int h) {}

//--------------------------------------------------------------
void ofApp::gotMessage(ofMessage msg) {}

//--------------------------------------------------------------
void ofApp::dragEvent(ofDragInfo dragInfo) {}
