#include "ofApp.h"

//--------------------------------------------------------------
void ofApp::setup() {

  string_state_map["idle"] = State::IDLE;
  string_state_map["countdown"] = State::COUNTDOWN;
  string_state_map["transition_to_filter"] = State::TRANSITION;
  string_state_map["apply_filter"] = State::APPLY_FILTER;
  string_state_map["end_screen"] = State::END_SCREEN;

  numberFont.load("fonts/Millimetre-Regular_web.ttf", 50);
  endScreenFont.load("fonts/Millimetre-Light_web.ttf", 25);
  traceFont.load("fonts/Millimetre-Light_web.ttf", 10);

  ofSetVerticalSync(true);
  ofEnableAlphaBlending();

  postprocessingShader.load("shaders/postprocessing/shader");

  gui.setup("parameters");

  receiver.setup(PORT);
  sender.setup("localhost", SEND_PORT);

  ofSetBackgroundAuto(false);
  ofBackground(0);

  float w = 50;
  float h = 70;
  float x = 0.0;
  float y = 0.0;
  int num = (ofGetWidth() / w) * (ofGetHeight() / h);
  for (int i = 0; i < num; i++) {
    string s = "0";
    if (ofRandom(1.0) > 0.5) {
      s = "1";
    }
    binaryData.push_back(BinaryChar{s, x, y});
    x += w;
    if (x >= ofGetWidth() - w) {
      y += h;
      x = 0.0;
    }
  }

  executionCode.push_back("pixels[i].r += c.r");
  executionCode.push_back("pixels[i].g += c.g");
  executionCode.push_back("pixels[i].b += c.b");
  executionCode.push_back("float luminosity = luma(pixel[i]);");
  executionCode.push_back("if(luminosity > 0.5) {");
  executionCode.push_back("pixels[i].r = c.r * luminosity");
  executionCode.push_back("pixels[i].g = c.g * luminosity");
  executionCode.push_back("pixels[i].b = c.b * luminosity");
  executionCode.push_back("");
  executionCode.push_back("}");
}

//--------------------------------------------------------------
void ofApp::update() { checkOscMessages(); }

//--------------------------------------------------------------
void ofApp::draw() {
  ofSetColor(0, 6);
  ofRect(0, 0, ofGetWidth(), ofGetHeight());
  ofSetColor(255);
  // drawBinaryData();
  if (state == State::IDLE || state == State::COUNTDOWN) {
    numberFont.drawString("IDLE", ofGetWidth() * 0.75, ofGetHeight() * 0.9);
    executionTrace.push_back(
        executionCode[ofRandom(0, executionCode.size() - 1)]);
    drawExecutionTrace();
    if (state == State::COUNTDOWN) {
    }
  } else if (state == State::TRANSITION) {
    numberFont.drawString("TRANSITION", ofGetWidth() * 0.75,
                          ofGetHeight() * 0.9);
    drawBinaryData();
  } else if (state == State::APPLY_FILTER) {
    numberFont.drawString("APPLY FILTER", ofGetWidth() * 0.75,
                          ofGetHeight() * 0.9);
    drawExecutionTrace();
  } else if (state == State::END_SCREEN) {
    numberFont.drawString("END_SCREEN", ofGetWidth() * 0.75,
                          ofGetHeight() * 0.9);
    drawBinaryData();
  }
  // videoTexture.draw(20 + camWidth, 20, camWidth, camHeight);
  if (executionTrace.size() * traceFont.getLineHeight() > ofGetHeight()) {
    executionTrace.clear();
    executionTraceColumn++;
    if (executionTraceColumn >= numExecutionTraceColumns) {
      executionTraceColumn = 0;
    }
  }

  gui.draw();
}

void ofApp::drawBinaryData() {

  ofSetColor(0, 255, 0);
  // for (int i = 0; i < binaryData.size(); i++) {
  //   numberFont.drawString(binaryData[i].s, binaryData[i].x, binaryData[i].y);
  // }
  int i = ofRandom(0, binaryData.size());
  numberFont.drawString(binaryData[i].s, binaryData[i].x, binaryData[i].y);
}

void ofApp::drawExecutionTrace() {
  ofSetColor(0, 255, 0);
  float lineHeight = traceFont.getLineHeight();
  float x =
      ofGetWidth() * 0.05 + (ofGetWidth() * (0.9 / 4.0) * executionTraceColumn);
  float y = 0.0;
  for (int i = 0; i < executionTrace.size(); i++) {
    auto &s = executionTrace[i];
    traceFont.drawString(s, x, y);
    y += lineHeight;
    if (y > ofGetHeight()) {
      x += ofGetWidth() * 0.2;
      y = 0.0;
    }
  }
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
          executionTraceColumn = 0;
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
      for (int i = 0; i < 10; i++)
        executionTrace.push_back(
            executionCode[ofRandom(0, executionCode.size() - 1)]);
    }
    // check for an image being sent
    // note: the size of the image depends greatly on your network buffer
    // sizes, if an image is too big the message won't come through
    else if (m.getAddress() == "/image") {
      ofBuffer buffer = m.getArgAsBlob(0);
    } else {

      // unrecognized message: log it
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
