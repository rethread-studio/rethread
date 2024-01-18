#include "ofApp.h"

#define PI 3.14159

//--------------------------------------------------------------
void ofApp::setup() {

  ofHideCursor();

  m_font.load("zx-spectrum.ttf", 24, true, true);
  m_font.setLineHeight(18.0f);
  m_font.setLetterSpacing(1.037);

  m_buttons.push_back(
      Button("Work on your poetry collection", "Stop writing poetry", "gedit"));
  m_buttons.push_back(
      Button("Answer emails", "Stop answering poetry", "thunderbird"));
  m_buttons.push_back(
      Button("Check the news", "Stop checking the news", "konqueror"));
  m_buttons.push_back(
      Button("Monitor computer resources", "Stop monitoring", "htop"));
  m_buttons.push_back(
      Button("Play full piece through", "Play freely", "play_score"));

  float total_height =
      m_buttons.size() * m_button_height + ((m_buttons.size()) * m_button_gap);
  float y = total_height * -0.5;
  for (uint i = 0; i < m_buttons.size(); i++) {
    y += m_button_height * 0.5;
    m_buttons[i].m_center_pos = glm::vec2(0., y);
    y += m_button_height * 0.5 + m_button_gap;
    if (i == 3) {
      y += m_button_gap;
    }
  }

  // OSC
  // open an outgoing connection to HOST:PORT
  sender.setup(HOST, SEND_PORT);

  // Request the active actions to be sent at the start of the program
  ofxOscMessage m;
  m.setAddress("/display_request_active_actions");
  sender.sendMessage(m, false);

  // listen on the given port
  ofLog() << "listening for osc messages on port " << RECEIVE_PORT;
  receiver.setup(RECEIVE_PORT);

  ofBackground(0, 255);
}

//--------------------------------------------------------------
void ofApp::update() {
  m_cursor_size += (m_cursor_size_target - m_cursor_size) * 0.1;
  bool cursor_is_inside_h = false;
  int hovered_button = 0;
  for (uint i = 0; i < m_buttons.size(); i++) {
    m_buttons[i].hovered = false;
    float y = m_buttons[i].m_center_pos.y + ofGetHeight() * 0.5;
    if (ofGetMouseY() > (y - (m_button_height * 0.5)) &&
        ofGetMouseY() < (y + (m_button_height * 0.5))) {
      cursor_is_inside_h = true;
      hovered_button = i;
    }
  }
  if (cursor_is_inside_h &&
      (ofGetMouseX() > ofGetWidth() / 2 - (m_button_width * 0.5)) &&
      (ofGetMouseX() < ofGetWidth() / 2 + (m_button_width * 0.5))) {
    m_cursor_size_target = 30.;
    m_buttons[hovered_button].hovered = true;
  } else {
    m_cursor_size_target = 10.;
  }
  if (m_click_phase < PI) {
    m_click_phase += PI / 40;
  }

  // OSC
  // check for waiting messages
  while (receiver.hasWaitingMessages()) {

    // get the next message
    ofxOscMessage m;
    receiver.getNextMessage(m);

    cout << "OSC: " << m.getAddress() << endl;

    // check for mouse moved message
    if (m.getAddress() == "/display_activate_program") {

      string button_name = m.getArgAsString(0);
      cout << "program: " << button_name << endl;
      for (int i = 0; i < m_buttons.size(); i++) {
        if (button_name == m_buttons[i].m_osc_name) {
          m_buttons[i].active = true;
        }
      }
    }
    // check for mouse button message
    else if (m.getAddress() == "/display_deactivate_program") {

      // first argument is int32, second is a string
      string button_name = m.getArgAsString(0);
      cout << "program: " << button_name << endl;
      for (int i = 0; i < m_buttons.size(); i++) {
        if (button_name == m_buttons[i].m_osc_name) {
          m_buttons[i].active = false;
        }
      }
    }
  }
}

//--------------------------------------------------------------
void ofApp::draw() {

  ofBackground(0, 255);
  ofSetRectMode(OF_RECTMODE_CENTER); // set rectangle mode to the center
  ofNoFill();
  ofSetLineWidth(4);
  // ofTranslate(ofGetWidth() / 2, ofGetHeight() / 2);
  glm::vec2 middle_screen = glm::vec2(ofGetWidth() * 0.5, ofGetHeight() * 0.5);
  for (uint i = 0; i < m_buttons.size(); i++) {
    if (m_buttons[i].active) {
      ofSetColor(255, 0, 0, 255);
    } else {
      if (m_buttons[i].hovered) {
        ofSetColor(50, 255, 255, 255);
      } else {
        ofSetColor(0, 255, 0, 255);
      }
    }
    ofDrawRectangle(m_buttons[i].m_center_pos + middle_screen, m_button_width,
                    m_button_height);

    auto text = m_buttons[i].m_text;
    if (m_buttons[i].active) {
      text = m_buttons[i].m_on_text;
    }
    ofRectangle rect = m_font.getStringBoundingBox(text, 0, 0);
    m_font.drawString(
        text,
        m_buttons[i].m_center_pos.x + middle_screen.x - (rect.width * 0.5),
        m_buttons[i].m_center_pos.y + middle_screen.y + (rect.height * 0.5));
  }

  // Mouse cursor
  float size = m_cursor_size;
  if (m_click_phase < PI) {
    size += sin(m_click_phase) * 10.;
  }

  ofSetColor(0, 255, 0);
  ofFill();
  float mouse_x = floor(ofGetMouseX() / m_button_gap) * m_button_gap;
  float mouse_y = floor(ofGetMouseY() / m_button_gap) * m_button_gap;
  ofDrawEllipse(mouse_x, mouse_y, size, size);
  auto mouse_pos = glm::vec2(mouse_x, mouse_y);
  if (mouse_pos != m_last_mouse_pos) {
    m_last_mouse_pos = mouse_pos;
    m_trail.push_back(Trail(mouse_pos));
  }

  // Trail
  for (int i = 0; i < m_trail.size(); i++) {
    ofSetColor(0, 255, 0, m_trail[i].m_alpha);
    ofDrawRectangle(m_trail[i].m_center_pos, m_button_gap, m_button_gap);
    m_trail[i].m_alpha *= 0.9;
  }
  for (int i = m_trail.size() - 1; i > 0; i--) {
    if (m_trail[i].m_alpha < 1.0) {
      m_trail.erase(m_trail.begin() + i);
    }
  }
}

//--------------------------------------------------------------
void ofApp::keyPressed(int key) {}

//--------------------------------------------------------------
void ofApp::keyReleased(int key) {}

//--------------------------------------------------------------
void ofApp::mouseMoved(int x, int y) {}

//--------------------------------------------------------------
void ofApp::mouseDragged(int x, int y, int button) {}

//--------------------------------------------------------------
void ofApp::mousePressed(int mouse_x, int mouse_y, int button) {
  bool cursor_is_inside_h = false;

  int hovered_button = 0;
  for (uint i = 0; i < m_buttons.size(); i++) {
    float y = m_buttons[i].m_center_pos.y + ofGetHeight() * 0.5;
    if (mouse_y > (y - (m_button_height * 0.5)) &&
        mouse_y < (y + (m_button_height * 0.5))) {
      cursor_is_inside_h = true;
      hovered_button = i;
    }
  }
  if (cursor_is_inside_h &&
      (mouse_x > ofGetWidth() / 2 - (m_button_width * 0.5)) &&
      (mouse_x < ofGetWidth() / 2 + (m_button_width * 0.5))) {
    m_buttons[hovered_button].active = !m_buttons[hovered_button].active;
    ofxOscMessage m;
    if (m_buttons[hovered_button].active) {
      m.setAddress("/display_send_activate_action");
    } else {
      m.setAddress("/display_send_deactivate_action");
    }
    m.addStringArg(m_buttons[hovered_button].m_osc_name);
    sender.sendMessage(m, false);
  }
}

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
