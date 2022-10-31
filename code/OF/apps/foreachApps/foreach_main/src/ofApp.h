#pragma once

#include "ofMain.h"
#include "ofxGui.h"
#include "ofxOsc.h"

// listening port
#define PORT 12345
#define SEND_PORT 12371

// This openFrameworks example is designed to demonstrate how to access the
// webcam.
//
// For more information regarding this example take a look at the README.md.
//

enum class State { IDLE, COUNTDOWN, TRANSITION, APPLY_FILTER, END_SCREEN };

static map<string, State> string_state_map;

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

  void transition_to_state(State new_state);
  int drawEndScreenCard(int x, int y, ofFbo fbo, ofFbo mask,
                        vector<string> tags);

  State state = State::IDLE;

  ofVideoGrabber vidGrabber;
  ofPixels videoInverted;
  ofTexture videoTexture;
  int camWidth;
  int camHeight;
  ofImage staticImage;
  bool useStaticImage = true;

  ofShader pixelShader;
  ofShader filterShader;
  ofFbo imageFbo; // the live or captured image
  ofFbo roundedCornersMaskFbo;
  ofFbo roundedCornersMaskCodeFbo;
  ofFbo filteredImageFbo;
  ofFbo halfFilteredImageFbo;
  ofFbo codeDisplayFbo;
  ofFbo easterEggFbo;
  ofFbo endScreenFbo;
  float endScreenFade = 255.0;
  int halfProcessedNumPixels = 0;

  struct {
    float width;
    float height;
    float left_margin;
    float scroll_position;
    float max_scroll_position;
    bool display_easter_egg = false;
    bool prepare_display_easter_egg = false;
  } endScreen;

  ofxPanel gui;
  ofParameter<float> pixelZoom;
  ofParameter<bool> showFeed;
  ofParameter<bool> showFilterShader;
  ofParameter<bool> showPixels;
  bool flipWebcam = false;
  bool squareImage = true;
  ofParameter<float> filterGain;
  ofParameter<float> filterExponent;
  bool showGui = false;

  ofTrueTypeFont numberFont;
  ofTrueTypeFont endScreenFont;
  ofTrueTypeFont titleFont;

  ofParameter<float> idleMaxZoom = 50.0;

  float timeToTimeout = 20.0;

  struct {
    int num = -1;
    float size = 0;
  } countdownData;

  struct {
    float duration;
    float startTime;
    float zoom;
    float maxZoom = 1000.0;
    int numDots;
    int maxNumDots = 3;
    float lastDotTs = 0;
  } transitionData;

  struct {
    long pixelsProcessed = 0;
    long crankSteps = 0;
  } applyFilterData;

  struct {
    ofImage filter;
    ofImage resend;
    ofImage foreach_icon;
    ofImage heart;
    ofImage camera;
  } icons;
  ofxOscReceiver receiver;
  ofxOscSender sender;
  void checkOscMessages();
};
