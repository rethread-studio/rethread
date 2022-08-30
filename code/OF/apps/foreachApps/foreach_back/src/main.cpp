#include "ofApp.h"
#include "ofMain.h"

//========================================================================
int main() {

  ofGLFWWindowSettings settings;
  settings.setGLVersion(4, 1);
  // settings.setSize(1920, 1080);
  // settings.setSize(3840, 2160);
  settings.setSize(1080, 1920);
  settings.numSamples = 4;
  settings.windowMode = OF_FULLSCREEN;

  ofCreateWindow(settings);

  ofRunApp(new ofApp());
}
