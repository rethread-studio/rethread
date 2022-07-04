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
  filterShader.load("shaders/filter_shader/shader");
  imageFbo.allocate(vidGrabber.getWidth(), vidGrabber.getHeight());

  gui.setup("parameters");
  gui.add(pixelZoom.set("pixel zoom", 10.0, 0.2, 30.0));
  gui.add(showFeed.set("show feed", false));
  gui.add(showPixels.set("show pixels", true));
  gui.add(showFilterShader.set("show filter shader", true));
  gui.add(filterGain.set("filter gain", 0.0, -0.2, 0.2));
  gui.add(filterExponent.set("filter exponent", 1.0, 0.25, 4.0));

  receiver.setup(PORT);
}

//--------------------------------------------------------------
void ofApp::update() {
  checkOscMessages();
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
  if (showPixels) {
    pixelShader.begin();
    pixelShader.setUniform2f("resolution", imageFbo.getWidth(),
                             imageFbo.getHeight());
    pixelShader.setUniform2f("outputResolution", ofGetWidth(), ofGetHeight());
    pixelShader.setUniformTexture("tex0", imageFbo.getTextureReference(), 1);
    // pixelShader.setUniform1f("zoom", (sin(ofGetElapsedTimef()) + 1.0) *
    // 500.0);
    pixelShader.setUniform1f("zoom", pow(float(pixelZoom), 2.0));
    ofDrawRectangle(0, 0, ofGetWidth(), ofGetHeight());
    pixelShader.end();
  }
  if (showFeed) {
    ofSetHexColor(0xffffff);
    float camZoom = 2.0;
    glm::vec2 camPos =
        glm::vec2((ofGetWidth() - vidGrabber.getWidth() * 2.0) * 0.5,
                  (ofGetHeight() - vidGrabber.getHeight() * 2.0) * 0.5);
    vidGrabber.draw(camPos.x, camPos.y, vidGrabber.getWidth() * camZoom,
                    vidGrabber.getHeight() * camZoom);
  }
  if (showFilterShader) {
    filterShader.begin();
    filterShader.setUniform2f("resolution", imageFbo.getWidth(),
                              imageFbo.getHeight());
    filterShader.setUniform2f("outputResolution", ofGetWidth(), ofGetHeight());
    filterShader.setUniformTexture("tex0", imageFbo.getTextureReference(), 1);
    // pixelShader.setUniform1f("zoom", (sin(ofGetElapsedTimef()) + 1.0) *
    // 500.0);
    filterShader.setUniform1f("zoom", 2.5);
    filterShader.setUniform1f("exponent", filterExponent);
    filterShader.setUniform1f("gain", filterGain);
    ofDrawRectangle(0, 0, ofGetWidth(), ofGetHeight());
    filterShader.end();
  }
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

void ofApp::checkOscMessages() {

  // check for waiting messages
  while (receiver.hasWaitingMessages()) {

    // get the next message
    ofxOscMessage m;
    receiver.getNextMessage(m);

    // check for mouse moved message
    if (m.getAddress() == "/pixelsToProcess") {
      int pixelsToProcess = m.getArgAsInt(0);
    }
    // check for an image being sent
    // note: the size of the image depends greatly on your network buffer
    // sizes, if an image is too big the message won't come through
    else if (m.getAddress() == "/image") {
      ofBuffer buffer = m.getArgAsBlob(0);
    } else {

      // unrecognized message: display on the bottom of the screen
      string msgString;
      msgString = m.getAddress();
      msgString += ":";
      for (size_t i = 0; i < m.getNumArgs(); i++) {

        // get the argument type
        msgString += " ";
        msgString += m.getArgTypeName(i);
        msgString += ":";

        // display the argument - make sure we get the right type
        if (m.getArgType(i) == OFXOSC_TYPE_INT32) {
          msgString += ofToString(m.getArgAsInt32(i));
        } else if (m.getArgType(i) == OFXOSC_TYPE_FLOAT) {
          msgString += ofToString(m.getArgAsFloat(i));
        } else if (m.getArgType(i) == OFXOSC_TYPE_STRING) {
          msgString += m.getArgAsString(i);
        } else {
          msgString += "unhandled argument type " + m.getArgTypeName(i);
        }
      }

      ofLogVerbose() << msgString;
    }
  }
}
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
