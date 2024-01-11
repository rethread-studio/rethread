#pragma once

#include "ofMain.h"
#include "ofxOsc.h"

// send host (aka ip address)
#define HOST "localhost"

/// send port
#define SEND_PORT 12345
#define RECEIVE_PORT 12346

class Button {
public:
  string m_text;
  string m_osc_name;
  glm::vec2 m_center_pos;
  bool hovered = false;
  bool active = false;
  Button(string t, string o) : m_text(t), m_osc_name(o) {}
};

class Trail {
public:
  glm::vec2 m_center_pos;
  float m_alpha;
  Trail(glm::vec2 pos) : m_center_pos(pos) { m_alpha = 200; }
};

class ofApp : public ofBaseApp {

public:
  void setup();
  void update();
  void draw();

  void keyPressed(int key);
  void keyReleased(int key);
  void mouseMoved(int x, int y);
  void mouseDragged(int x, int y, int button);
  void mousePressed(int x, int y, int button);
  void mouseReleased(int x, int y, int button);
  void mouseEntered(int x, int y);
  void mouseExited(int x, int y);
  void windowResized(int w, int h);
  void dragEvent(ofDragInfo dragInfo);
  void gotMessage(ofMessage msg);

  float m_cursor_size_target = 20.;
  float m_cursor_size = 0.;
  float m_click_phase = 100.;

  vector<Button> m_buttons;
  glm::vec2 m_last_mouse_pos;
  float m_button_height = 160.;
  float m_button_width = 1200.;
  float m_button_gap = 80.;
  ofTrueTypeFont m_font;
  vector<Trail> m_trail;

  ofxOscSender sender;
  ofxOscReceiver receiver;
};
