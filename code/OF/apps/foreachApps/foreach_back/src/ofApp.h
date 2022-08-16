#pragma once

#include "ofMain.h"
#include "ofxGui.h"
#include "ofxOsc.h"

// listening port
#define PORT 12346
#define SEND_PORT 12372

// This openFrameworks example is designed to demonstrate how to access the
// webcam.
//
// For more information regarding this example take a look at the README.md.
//

enum class State { IDLE, COUNTDOWN, TRANSITION, APPLY_FILTER, END_SCREEN };

static map<string, State> string_state_map;

struct BinaryChar {
  string s;
  float x = 0.0;
  float y = 0.0;
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

  void drawBinaryData();
  void drawExecutionTrace();

  void transition_to_state(State new_state);

  State state = State::IDLE;

  ofShader postprocessingShader;
  ofFbo imageFbo; // the live or captured image

  ofxPanel gui;
  ofParameter<float> pixelZoom;
  ofParameter<bool> showFeed;
  ofParameter<bool> showFilterShader;
  ofParameter<bool> showPixels;
  ofParameter<float> filterGain;
  ofParameter<float> filterExponent;

  ofTrueTypeFont numberFont;
  ofTrueTypeFont endScreenFont;
  ofTrueTypeFont traceFont;

  vector<string> executionCode;

  vector<string> executionTrace;
  int executionTraceColumn = 0;
  int numExecutionTraceColumns = 4;
  vector<BinaryChar> binaryData;

  struct {
    int num = -1;
    float size = 0;
  } countdownData;

  struct {
    float duration;
    float startTime;
    float zoom;
    float maxZoom = 10.0;
  } transitionData;

  struct {
    long pixelsProcessed = 0;
    long instructionsPerformed = 0;
  } applyFilterData;

  ofxOscReceiver receiver;
  ofxOscSender sender;
  void checkOscMessages();
};
