#include "ofApp.h"
#include "ofMain.h"

//========================================================================
int main() {

  ofGLFWWindowSettings settings;
  settings.setGLVersion(4, 1);
#if (OF_VERSION_MINOR == 9)
  settings.width = 1920;
  settings.height = 1080;
#else
  settings.setSize(1920, 1080);
  settings.setSize(1080, 1920);
  // settings.setSize(3840, 2160);
#endif
  settings.numSamples = 4;

  ofCreateWindow(settings);

  ofRunApp(new ofApp());
}
