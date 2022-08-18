#include "ofApp.h"

//--------------------------------------------------------------
void ofApp::setup() {

  string_state_map["idle"] = State::IDLE;
  string_state_map["countdown"] = State::COUNTDOWN;
  string_state_map["transition_to_filter"] = State::TRANSITION;
  string_state_map["apply_filter"] = State::APPLY_FILTER;
  string_state_map["end_screen"] = State::END_SCREEN;

  icons.foreach_icon.load("icons/foreach_logo.png");
  icons.filter.load("icons/filter.png");
  icons.heart.load("icons/heart.png");
  icons.resend.load("icons/resend.png");
  icons.camera.load("icons/camera.png");

  // try to grab at this size.
  camWidth = 1920;
  camHeight = 1080;

  gui.setup("parameters");
  gui.add(pixelZoom.set("pixel zoom", 10.0, 0.2, 30.0));
  gui.add(idleMaxZoom.set("idle pixel max zoom", 100.0, 10.0, 1000.0));
  gui.add(showFeed.set("show feed", true));
  gui.add(showPixels.set("show pixels", true));
  gui.add(showFilterShader.set("show filter shader", true));
  gui.add(filterGain.set("filter gain", 0.0, -0.2, 0.2));
  gui.add(filterExponent.set("filter exponent", 1.0, 0.25, 4.0));

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

  numberFont.load("fonts/Millimetre-Regular_web.ttf", 350);
  endScreenFont.load("fonts/Millimetre-Bold_web.ttf", 25);
  titleFont.load("fonts/Noto Mono Nerd Font Complete.ttf", 35);

  int w, h;
  if (!useStaticImage) {
    vidGrabber.setDeviceID(0);
    vidGrabber.setDesiredFrameRate(30);
    vidGrabber.setup(camWidth, camHeight);

    videoInverted.allocate(vidGrabber.getWidth(), vidGrabber.getHeight(),
                           OF_PIXELS_RGB);
    videoTexture.allocate(videoInverted);
    w = vidGrabber.getWidth();
    h = vidGrabber.getHeight();
  } else {

    staticImage.load("static_image.jpg");
    videoInverted.allocate(staticImage.getWidth(), staticImage.getHeight(),
                           OF_PIXELS_RGB);
    videoTexture.allocate(videoInverted);
    w = staticImage.getWidth();
    h = staticImage.getHeight();
  }
  if (squareImage) {
    w = h;
  }
  if (!flipWebcam) {
    imageFbo.allocate(w, h);
  } else {
    imageFbo.allocate(h, w);
  }
  filteredImageFbo.allocate(imageFbo.getWidth(), imageFbo.getHeight());
  halfFilteredImageFbo.allocate(imageFbo.getWidth(), imageFbo.getHeight());
  roundedCornersMaskFbo.allocate(imageFbo.getWidth(), imageFbo.getHeight());
  ofImage codeImg;
  codeImg.load("code_image.jpg");
  codeDisplayFbo.allocate(imageFbo.getWidth(),
                          codeImg.getHeight() * (float(imageFbo.getWidth()) /
                                                 float(codeImg.getWidth())));
  roundedCornersMaskCodeFbo.allocate(codeDisplayFbo.getWidth(),
                                     codeDisplayFbo.getHeight());
  codeDisplayFbo.begin();
  codeImg.draw(0, 0, codeDisplayFbo.getWidth(), codeDisplayFbo.getHeight());
  codeDisplayFbo.end();

  roundedCornersMaskFbo.begin();
  ofClear(0, 0, 0);
  ofSetColor(255);
  ofDrawRectRounded(0, 0, roundedCornersMaskFbo.getWidth(),
                    roundedCornersMaskFbo.getHeight(), 50);
  roundedCornersMaskFbo.end();
  roundedCornersMaskCodeFbo.begin();
  ofClear(0, 0, 0);
  ofSetColor(255);
  ofDrawRectRounded(0, 0, roundedCornersMaskCodeFbo.getWidth(),
                    roundedCornersMaskCodeFbo.getHeight(), 50);
  roundedCornersMaskCodeFbo.end();

  endScreen.left_margin = ofGetWidth() * 0.15;
  endScreen.scroll_position = 0.0;
  endScreen.width = ofGetWidth() - (endScreen.left_margin * 2);
  endScreen.height =
      imageFbo.getHeight() * (endScreen.width / float(imageFbo.getWidth())) +
      ofGetHeight() * 0.1;

  endScreenFbo.allocate(ofGetWidth(), ofGetHeight());
  pixelShader.load("shaders/pixel_shader/shader");
  filterShader.load("shaders/filter_shader/shader");

  receiver.setup(PORT);
  sender.setup("localhost", 12371);
  // send image resolution to the server
  ofxOscMessage m;
  m.setAddress("/image_resolution");
  m.addIntArg(imageFbo.getWidth());
  m.addIntArg(imageFbo.getHeight());
  sender.sendMessage(m, false);
  ofLog() << "Setup finished";

  imageFbo.begin();
  if (useStaticImage) {
    staticImage.draw(0, 0);
  } else {
    vidGrabber.draw(0, 0);
  }
  imageFbo.end();
  filteredImageFbo.begin();
  ofPushMatrix();
  if (flipWebcam) {
    ofRotateDeg(180);
  }
  filterShader.begin();
  filterShader.setUniform2f("resolution", imageFbo.getWidth(),
                            imageFbo.getHeight());
  filterShader.setUniform2f("outputResolution", filteredImageFbo.getWidth(),
                            filteredImageFbo.getHeight());
  filterShader.setUniformTexture("tex0", imageFbo.getTextureReference(), 1);
  filterShader.setUniform1f("invertY", 0);
  filterShader.setUniform1f("exponent", filterExponent);
  filterShader.setUniform1f("gain", filterGain);
  filterShader.setUniform1f("pixelsProcessed", 99999999);
  ofDrawRectangle(0, 0, filteredImageFbo.getWidth(),
                  filteredImageFbo.getHeight());
  filterShader.end();
  ofPopMatrix();
  filteredImageFbo.end();

  ofSetVerticalSync(true);
  ofEnableAlphaBlending();
  ofSetBackgroundAuto(false);
}

//--------------------------------------------------------------
void ofApp::update() {
  checkOscMessages();
  if (!useStaticImage) {
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
}

//--------------------------------------------------------------
void ofApp::draw() {
  float x = 0, y = 0;
  float black_bar_height = ofGetHeight() * 0.1;
  float left_margin = ofGetWidth() * 0.05;
  ostringstream top_text;
  ostringstream bottom_text;

  bottom_text.precision(2);
  bottom_text << fixed;
  if (state == State::APPLY_FILTER) {

    filteredImageFbo.begin();
    filterShader.begin();
    filterShader.setUniform2f("resolution", imageFbo.getWidth(),
                              imageFbo.getHeight());
    filterShader.setUniform2f("outputResolution", filteredImageFbo.getWidth(),
                              filteredImageFbo.getHeight());
    filterShader.setUniformTexture("tex0", imageFbo.getTextureReference(), 1);
    filterShader.setUniform1f("invertY", 0);
    filterShader.setUniform1f("exponent", filterExponent);
    filterShader.setUniform1f("gain", filterGain);
    filterShader.setUniform1f("pixelsProcessed",
                              applyFilterData.pixelsProcessed);

    ofDrawRectangle(0, 0, filteredImageFbo.getWidth(),
                    filteredImageFbo.getHeight());
    filterShader.end();
    filteredImageFbo.end();
  }

  ofSetColor(255);
  if (state == State::IDLE || state == State::COUNTDOWN) {

    ofBackground(0);
    // Draw the live image on the imageFbo
    imageFbo.begin();
    ofPushMatrix();
    if (flipWebcam) {
      ofTranslate(imageFbo.getWidth() / 2, imageFbo.getHeight() / 2);
      ofRotateDeg(-90);
      ofTranslate(imageFbo.getHeight() / -2, imageFbo.getWidth() / -2);
    }
    if (useStaticImage) {
      staticImage.draw(0, 0);
    } else {
      vidGrabber.draw(0, 0);
    }
    ofPopMatrix();
    imageFbo.end();

    if (showPixels) {
      pixelZoom = sin(ofGetElapsedTimef() * 1.7) * 0.125 + 0.125 +
                  (sin(ofGetElapsedTimef() * 0.43374) * 0.75 + 0.75);
      pixelZoom = 2 + pow(float(pixelZoom), 3.0) * idleMaxZoom;
      pixelShader.begin();
      pixelShader.setUniform2f("resolution", imageFbo.getWidth(),
                               imageFbo.getHeight());
      pixelShader.setUniform2f("outputResolution", ofGetWidth(), ofGetHeight());
      pixelShader.setUniformTexture("tex0", imageFbo.getTextureReference(), 1);
      // pixelShader.setUniform1f("zoom", (sin(ofGetElapsedTimef()) + 1.0) *
      // 500.0);
      pixelShader.setUniform1f("zoom", pixelZoom);
      pixelShader.setUniform1f("alpha", 1.0);
      pixelShader.setUniform1f("invertY", 1);
      ofDrawRectangle(0, 0, ofGetWidth(), ofGetHeight());
      pixelShader.end();
    }
    if (showFeed) {
      ofSetHexColor(0xffffff);
      float camZoom = (float(ofGetWidth()) * 0.8) / float(imageFbo.getWidth());
      glm::vec2 camPos =
          glm::vec2((ofGetWidth() - imageFbo.getWidth() * camZoom) * 0.5,
                    (ofGetHeight() - imageFbo.getHeight() * camZoom) * 0.5);
      imageFbo.draw(camPos.x, camPos.y, imageFbo.getWidth() * camZoom,
                    imageFbo.getHeight() * camZoom);
    }
    if (state == State::COUNTDOWN) {
      ostringstream s;
      s << countdownData.num;
      float w = numberFont.stringWidth(s.str());
      float h = numberFont.getLineHeight();
      numberFont.drawString(s.str(), (ofGetWidth() - w) * 0.5,
                            (ofGetHeight() + h * 0.75) * 0.5);
    }
    top_text << "for|each: take a selfie";
    // bottom bar
    ofSetColor(0);
    ofDrawRectangle(0, ofGetHeight() - black_bar_height, ofGetWidth(),
                    ofGetHeight());

    float cameraw = icons.camera.getWidth() * 2.0;
    float camerah = icons.camera.getHeight() * 2.0;
    float camerax = ofGetWidth() * 0.5 - cameraw * 0.5;
    float cameray = ofGetHeight() * 0.5 + ofGetWidth() * 0.4;
    cameray = cameray + (ofGetHeight() - cameray - black_bar_height) * 0.5 -
              camerah * 0.5;
    ofSetColor(255);
    icons.camera.draw(camerax, cameray, cameraw, camerah);
  } else if (state == State::TRANSITION) {
    ofBackground(0);
    if (ofGetElapsedTimef() - transitionData.lastDotTs > 0.5) {
      transitionData.numDots =
          (transitionData.numDots + 1) % (transitionData.maxNumDots + 1);
      transitionData.lastDotTs = ofGetElapsedTimef();
    }

    // Draw the star of the show, the pixels
    float phase = (ofGetElapsedTimef() - transitionData.startTime) /
                  transitionData.duration;
    float s_phase = atan(phase);
    pixelZoom = pow(sin(phase * PI), 8) * (transitionData.maxZoom);

    filteredImageFbo.begin();
    pixelShader.begin();
    pixelShader.setUniform2f("resolution", imageFbo.getWidth(),
                             imageFbo.getHeight());
    pixelShader.setUniform2f("outputResolution", filteredImageFbo.getWidth(),
                             filteredImageFbo.getHeight());
    pixelShader.setUniformTexture("tex0", imageFbo.getTextureReference(), 1);
    pixelShader.setUniform1f("zoom", pixelZoom);
    pixelShader.setUniform1f("invertY", 0);
    // pixelShader.setUniform1f("alpha", 1.0 - pow(phase, 10));
    pixelShader.setUniform1f("alpha", 1.0);
    ofDrawRectangle(0, 0, filteredImageFbo.getWidth(),
                    filteredImageFbo.getHeight());
    pixelShader.end();
    filteredImageFbo.end();

    if (squareImage) {
      filteredImageFbo.draw(0, ofGetHeight() * 0.5 - ofGetWidth() * 0.5,
                            ofGetWidth(), ofGetWidth());
    } else {
      filteredImageFbo.draw(0, 0, ofGetWidth(), ofGetHeight());
    }

    float dotSize = ofGetWidth() * 0.1;
    float dotMargin = dotSize * 0.3;
    float y = ofGetHeight() * 0.5 - dotSize * 0.5;
    float x = ofGetWidth() * 0.5 -
              (dotSize * transitionData.maxNumDots +
               dotMargin * (transitionData.maxNumDots - 1) - dotSize) *
                  0.5;
    ofSetColor(255);
    for (int i = 0; i < transitionData.numDots; i++) {
      ofDrawEllipse(x, y, dotSize, dotSize);
      x += dotSize + dotMargin;
    }
    top_text << "for|each: loading pixels...";
  } else if (state == State::APPLY_FILTER) {
    endScreenFbo.begin();

    ofBackground(0);
    if (squareImage) {
      filteredImageFbo.draw(0, ofGetHeight() * 0.5 - ofGetWidth() * 0.5,
                            ofGetWidth(), ofGetWidth());
    } else {
      filteredImageFbo.draw(0, 0, ofGetWidth(), ofGetHeight());
    }

    // Draw icons
    ofSetColor(255);
    x = left_margin;
    y = ofGetHeight() * 0.5 + ofGetWidth() * 0.5 + 20;
    icons.heart.draw(x, y);
    x += icons.heart.getWidth() + 5;
    icons.resend.draw(x, y);
    x += icons.resend.getWidth() + 5;
    icons.filter.draw(x, y);
    y += icons.resend.getHeight() + 10;
    // Draw stats
    ostringstream s;
    int loops = applyFilterData.pixelsProcessed;
    int turns = float(applyFilterData.crankSteps) / 48.0;
    ofSetColor(255);
    if (loops == 0) {
      s << "#nofilter";
    } else {
      s << "#" << loops << "loops #" << turns << "turns";
    }
    endScreenFont.drawString(s.str(), left_margin,
                             y + endScreenFont.getLineHeight());

    top_text << "for|each: loop through every pixel";
    if (timeToTimeout < 6.0) {
      bottom_text << "Restarting in " << timeToTimeout << " seconds";
    }
  } else if (state == State::END_SCREEN) {
    ofBackground(0);

    // TEMP this can be removed when we are sure the states are progressed
    // through in order

    filteredImageFbo.begin();
    filterShader.begin();
    filterShader.setUniform2f("resolution", imageFbo.getWidth(),
                              imageFbo.getHeight());
    filterShader.setUniform2f("outputResolution", filteredImageFbo.getWidth(),
                              filteredImageFbo.getHeight());
    filterShader.setUniformTexture("tex0", imageFbo.getTextureReference(), 1);
    filterShader.setUniform1f("invertY", 0);
    filterShader.setUniform1f("exponent", filterExponent);
    filterShader.setUniform1f("gain", filterGain);
    filterShader.setUniform1f("pixelsProcessed", 99999999);
    ofDrawRectangle(0, 0, filteredImageFbo.getWidth(),
                    filteredImageFbo.getHeight());
    filterShader.end();
    filteredImageFbo.end();
    halfFilteredImageFbo.begin();
    filterShader.begin();
    filterShader.setUniform2f("resolution", imageFbo.getWidth(),
                              imageFbo.getHeight());
    filterShader.setUniform2f("outputResolution", filteredImageFbo.getWidth(),
                              filteredImageFbo.getHeight());
    filterShader.setUniformTexture("tex0", imageFbo.getTextureReference(), 1);
    filterShader.setUniform1f("invertY", 0);
    filterShader.setUniform1f("exponent", filterExponent);
    filterShader.setUniform1f("gain", filterGain);
    int halfProcessedNumPixels =
        imageFbo.getWidth() * imageFbo.getHeight() * 0.6;
    filterShader.setUniform1f("pixelsProcessed", halfProcessedNumPixels);
    ofDrawRectangle(0, 0, filteredImageFbo.getWidth(),
                    filteredImageFbo.getHeight());
    filterShader.end();
    halfFilteredImageFbo.end();
    // END TEMP

    ofSetColor(255);
    while (endScreen.scroll_position > endScreen.max_scroll_position) {
      endScreen.scroll_position -= endScreen.max_scroll_position;
    }

    x = endScreen.left_margin;
    y = endScreen.left_margin - endScreen.scroll_position;
    int i = 0;
    while (y < ofGetHeight()) {
      y = drawEndScreenCard(x, y, imageFbo, roundedCornersMaskFbo,
                            vector<string>{"#selfie", "#nofilter"});
      y = drawEndScreenCard(x, y, codeDisplayFbo, roundedCornersMaskCodeFbo,
                            vector<string>{"#code", "#loop", "#foreach"});
      ostringstream halfNumPixels;
      halfNumPixels << "#" << halfProcessedNumPixels << "loops";
      y = drawEndScreenCard(x, y, halfFilteredImageFbo, roundedCornersMaskFbo,
                            vector<string>{halfNumPixels.str(), "#filter"});
      y = drawEndScreenCard(x, y, filteredImageFbo, roundedCornersMaskFbo,
                            vector<string>{"#behindthefilter"});
      if (i == 0) {
        endScreen.max_scroll_position = y + endScreen.scroll_position -
                                        ofGetHeight() + endScreen.left_margin;
      }
    }
    top_text << "for|each: thank you for applying a filter";

    if (timeToTimeout < 6.0) {
      bottom_text << "Restarting in " << timeToTimeout << " seconds";
    }

    // float camZoom =
    //     (float(ofGetWidth()) * 0.5) / float(imageFbo.getWidth()) * 0.8;
    // float margin = imageFbo.getWidth() * 0.05;
    // glm::vec2 r =
    //     glm::vec2(imageFbo.getWidth() * camZoom + (margin * 2),
    //     ofGetHeight());
    // ofDrawRectangle((ofGetWidth() - r.x) * 0.5, (ofGetHeight() - r.y) * 0.5,
    //                 r.x, r.y);
    // // draw unaltered image
    // glm::vec2 camPos =
    //     glm::vec2((ofGetWidth() - imageFbo.getWidth() * camZoom) * 0.5,
    //     margin);
    // imageFbo.draw(camPos.x, camPos.y, imageFbo.getWidth() * camZoom,
    //               imageFbo.getHeight() * camZoom);
    // camPos.y += filteredImageFbo.getHeight() * camZoom + margin;
    // filteredImageFbo.draw(camPos.x, camPos.y,
    //                       filteredImageFbo.getWidth() * camZoom,
    //                       filteredImageFbo.getHeight() * camZoom);
    // camPos.y += filteredImageFbo.getHeight() * camZoom + margin;

    // // endScreenFont.drawString(
    // //     "Du applicerade filtret på\nbilden genom att köra\n"
    // //     "1 728 000 instruktioner!",
    // //     50, ofGetHeight() * 0.5);
    // ostringstream s;
    // long pixels = imageFbo.getWidth() * imageFbo.getHeight();
    // ofSetColor(0);
    // s << "#" << pixels * 5 << " instruktioner     #" << pixels
    //   << " pixlar\n#filter";
    // endScreenFont.drawString(s.str(), camPos.x,
    //                          (ofGetHeight() - camPos.y) * 0.5 + camPos.y);
  }

  // Draw header
  ofSetColor(0);
  ofDrawRectangle(0, 0, ofGetWidth(), black_bar_height);

  ofSetColor(255);
  float height = titleFont.getLineHeight() * 1.5;
  float width =
      icons.foreach_icon.getWidth() * (height / icons.foreach_icon.getHeight());
  y = black_bar_height * 0.5 - (height * 0.5);
  x = left_margin;
  icons.foreach_icon.draw(x, y, width, height);
  titleFont.drawString(top_text.str(), left_margin + width + left_margin,
                       black_bar_height * 0.5 +
                           titleFont.getLineHeight() * 0.3);
  float bottom_width = titleFont.stringWidth(bottom_text.str());
  titleFont.drawString(bottom_text.str(), (ofGetWidth() - bottom_width) * 0.5,
                       ofGetHeight() - black_bar_height * 0.5 +
                           titleFont.getLineHeight() * 0.3);
  if (state == State::APPLY_FILTER) {
    endScreenFbo.end();
    ofSetColor(255, 255);
    endScreenFbo.draw(0, 0);
  }

  if (state == State::END_SCREEN && endScreenFade > 1) {
    ofSetColor(255, int(endScreenFade));
    endScreenFbo.draw(0, 0);
    endScreenFade *= 0.98;
  }

  // videoTexture.draw(20 + camWidth, 20, camWidth, camHeight);

  // gui.draw();
}

int ofApp::drawEndScreenCard(int startx, int starty, ofFbo fbo, ofFbo mask,
                             vector<string> tags) {
  float x = startx;
  float y = starty;
  float zoom = endScreen.width / float(fbo.getWidth());
  fbo.getTexture().setAlphaMask(mask.getTexture());
  fbo.draw(x, y, fbo.getWidth() * zoom, fbo.getHeight() * zoom);
  y += fbo.getHeight() * zoom + 20;

  icons.heart.draw(x, y);
  x += icons.heart.getWidth() + 5;
  icons.resend.draw(x, y);
  x += icons.resend.getWidth() + 5;
  icons.filter.draw(x, y);
  y += icons.resend.getHeight() + 10;
  x = startx;

  y += endScreenFont.getLineHeight();
  for (auto &tag : tags) {
    endScreenFont.drawString(tag, x, y);
    x += endScreenFont.stringWidth(tag) + 10;
  }
  y += ofGetHeight() * 0.07;
  return y;
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
          ofxOscMessage m;
          m.setAddress("/image_resolution");
          m.addIntArg(imageFbo.getWidth());
          m.addIntArg(imageFbo.getHeight());
          sender.sendMessage(m, false);
        } else if (it->second == State::APPLY_FILTER) {
          applyFilterData.pixelsProcessed = 0;
          applyFilterData.crankSteps = 0;
        } else if (it->second == State::END_SCREEN) {
          endScreen.scroll_position = 0;
          endScreenFade = 255.0;
          // Draw filtered image to fbo
          filteredImageFbo.begin();
          filterShader.begin();
          filterShader.setUniform2f("resolution", imageFbo.getWidth(),
                                    imageFbo.getHeight());
          filterShader.setUniform2f("outputResolution",
                                    filteredImageFbo.getWidth(),
                                    filteredImageFbo.getHeight());
          filterShader.setUniformTexture("tex0", imageFbo.getTextureReference(),
                                         1);
          filterShader.setUniform1f("invertY", 0);
          filterShader.setUniform1f("exponent", filterExponent);
          filterShader.setUniform1f("gain", filterGain);
          filterShader.setUniform1f("pixelsProcessed", 99999999);
          ofDrawRectangle(0, 0, filteredImageFbo.getWidth(),
                          filteredImageFbo.getHeight());
          filterShader.end();
          filteredImageFbo.end();
        }
        ofLog() << "Changed state to " << state_name;
      } else {
        ofLog() << "ERROR: unparsable state name: " << state_name;
      }
      // State new_state = string_state_map[state_name];
      // switch (state_name) {
      // case "idle":
      //   new_state = State::IDLE;
      //   break;
      // case "transition_to_filter":
      //   new_state = State::TRANSITION;
      //   break;
      // case "countdown":
      //   new_state = State::COUNTDOWN;
      //   break;
      // case "apply_filter":
      //   new_state = State::APPLY_FILTER;
      //   break;
      // case "end_screen":
      //   new_state = State::END_SCREEN;
      //   break;
      // }
    } else if (m.getAddress() == "/countdown") {
      countdownData.num = m.getArgAsInt(0);
    } else if (m.getAddress() == "/timeout") {
      timeToTimeout = m.getArgAsFloat(0);
    } else if (m.getAddress() == "/pixels_processed") {
      applyFilterData.pixelsProcessed = m.getArgAsInt(0);
      applyFilterData.crankSteps = m.getArgAsInt(1);
    } else if (m.getAddress() == "/scroll") {
      endScreen.scroll_position += float(m.getArgAsInt(0) * 20);
      endScreen.scroll_position =
          ofClamp(endScreen.scroll_position, 0, endScreen.max_scroll_position);

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
void ofApp::windowResized(int w, int h) { endScreenFbo.allocate(w, h); }

//--------------------------------------------------------------
void ofApp::gotMessage(ofMessage msg) {}

//--------------------------------------------------------------
void ofApp::dragEvent(ofDragInfo dragInfo) {}
