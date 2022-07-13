#include "ofApp.h"

//--------------------------------------------------------------
void ofApp::setup() {

  string_state_map["idle"] = State::IDLE;
  string_state_map["countdown"] = State::COUNTDOWN;
  string_state_map["transition_to_filter"] = State::TRANSITION;
  string_state_map["apply_filter"] = State::APPLY_FILTER;
  string_state_map["end_screen"] = State::END_SCREEN;

  numberFont.load("fonts/Millimetre-Regular_web.ttf", 100);
  endScreenFont.load("fonts/Millimetre-Light_web.ttf", 50);

  ofSetVerticalSync(true);

  postprocessingShader.load("shaders/postprocessing/shader");

  gui.setup("parameters");

  receiver.setup(PORT);
  sender.setup("localhost", SEND_PORT);
}

//--------------------------------------------------------------
void ofApp::update() {
  checkOscMessages();
  ofBackground(100, 100, 100);
}

//--------------------------------------------------------------
void ofApp::draw() {
  ofBackground(0);
  ofSetColor(255);
  ofSetColor(0, 255, 0);
  float lineHeight = endScreenFont.getLineHeight();
  for (int i = 0; i < executionTrace.size(); i++) {
    auto &s = executionTrace[i];
    endScreenFont.drawString(s, 20, i * lineHeight);
  }
  if (state == State::IDLE || state == State::COUNTDOWN) {
    if (state == State::COUNTDOWN) {
    }
  } else if (state == State::TRANSITION) {
  } else if (state == State::APPLY_FILTER) {
  } else if (state == State::END_SCREEN) {
  }
  // videoTexture.draw(20 + camWidth, 20, camWidth, camHeight);

  gui.draw();
}

//--------------------------------------------------------------
void ofApp::keyPressed(int key) {
  if (key == 's' || key == 'S') {
  }
}

//--------------------------------------------------------------
void ofApp::keyReleased(int key) {}

void ofApp::transition_to_state(State new_state) { state = new_state; }

void ofApp::checkOscMessages() {

  // check for waiting messages
  while (receiver.hasWaitingMessages()) {

    // get the next message
    ofxOscMessage m;
    receiver.getNextMessage(m);

    // check for mouse moved message
    if (m.getAddress() == "/pixelsToProcess") {
      int pixelsToProcess = m.getArgAsInt(0);
    } else if (m.getAddress() == "/transition_to_state") {
      string state_name = m.getArgAsString(0);
      auto it = string_state_map.find(state_name);
      if (it != string_state_map.end()) {
        transition_to_state(it->second);
        if (it->second == State::TRANSITION) {
          transitionData.duration = m.getArgAsFloat(1);
          transitionData.zoom = 1;
          transitionData.startTime = ofGetElapsedTimef();
          // send image resolution to the server
        } else if (it->second == State::APPLY_FILTER) {
          applyFilterData.pixelsProcessed = 0;
          applyFilterData.instructionsPerformed = 0;
        }
        ofLog() << "Changed state to " << state_name;
      } else {
        ofLog() << "ERROR: unparsable state name: " << state_name;
      }
    } else if (m.getAddress() == "/countdown") {
      countdownData.num = m.getArgAsInt(0);
    } else if (m.getAddress() == "/pixels_processed") {
      applyFilterData.pixelsProcessed = m.getArgAsInt(0);
    } else if (m.getAddress() == "/instructions_performed") {
      applyFilterData.instructionsPerformed = m.getArgAsInt(0);
      executionTrace.push_back("pixels[i] += c.r;");
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
