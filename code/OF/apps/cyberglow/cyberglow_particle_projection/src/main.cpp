#include "ofApp.h"
#include "ofMain.h"

//========================================================================
int main() {
    ofGLFWWindowSettings settings;
    settings.setGLVersion(4, 1);
    settings.setSize(1920, 1080);
    settings.numSamples = 4;
    // settings.windowMode = OF_GAME_MODE;

    ofCreateWindow(settings);

  // this kicks off the running of my app
  // can be OF_WINDOW or OF_FULLSCREEN
  // pass in width and height too:
  ofRunApp(new ofApp());
}
