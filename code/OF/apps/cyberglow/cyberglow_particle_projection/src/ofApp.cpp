#include "ofApp.h"
#include "constants.h"

//--------------------------------------------------------------
void ofApp::setup() {

  last_transition_enable_time = ofGetElapsedTimef();
  // OSC setup
  receiver.setup(PORT);
  osc_sender.setup("127.0.0.1", 57121);

  // Set up triangle positions
  triangle_positions[0] =
      glm::vec2(width * 0.2 - halfw, height * 0.65 - halfh); // visualisation
  triangle_positions[1] =
      glm::vec2(width * 0.5 - halfw, height * 0.15 - halfh); // server
  triangle_positions[2] =
      glm::vec2(width * 0.8 - halfw, height * 0.85 - halfh); // user

  font.load("FT88-Expanded.otf", 20);
  large_font.load("FT88-Expanded.otf", 60);

  ftrace_vis.init(width, height);
  overview.init(triangle_positions, width, height, font);
  transition.type = TransitionType::NONE; // disable the transition at startup

  switch (vis_mode) {
  case VisMode::FTRACE:
    ftrace_vis.enable();
    break;
  case VisMode::ZOOMED_OUT:
    overview.enable();
    break;
  }

  vignetteShader.load("shaders/vignette/shader");
  ofBackground(0);
}

//--------------------------------------------------------------
void ofApp::update() {
  static float last_time = 0;
  if (last_time == 0) {
    last_time = ofGetElapsedTimef();
  }
  float now = ofGetElapsedTimef();
  dt = now - last_time;
  last_time = now;

  // Checking for OSC messages should be done even if paused to discard messages
  // and avoid a large peak
  checkOscMessages();

  if (!is_paused) {
    if (automatic_transitions &&
        !(transition_at_new_question || transition_at_answer) &&
        !idle_mode_on) {
      next_transition_countdown -= dt;
      if (next_transition_countdown <= 0.0) {
        cout << "transition timing met, going to the next vis mode" << endl;
        activateTransitionToNext();
        next_transition_countdown = time_per_vis;
      }
    }

    switch (vis_mode) {
    case VisMode::FTRACE: {
      ftrace_vis.update(dt);
      break;
    }
    case VisMode::ZOOMED_OUT: {
      overview.update(dt);
      break;
    }
    }

    noise_counter += 0.001;
    rot_x = ofNoise(noise_counter, ofGetElapsedTimef() * 0.01) * 2.0 - 1.0;
    rot_y =
        ofNoise(noise_counter, ofGetElapsedTimef() * 0.01 + 2534.0) * 2.0 - 1.0;
  }
}

//--------------------------------------------------------------
void ofApp::draw() {

  ofClear(0);
  ofBackground(0);

  ofPushMatrix();
  ofTranslate(halfw, halfh, 0.0);

  if (transition.active()) {
    transition.update(dt);
    if (!transition.active()) {
      cout << "transition was just finished, activate" << endl;
      vis_mode = transition.to_vis;
      switch (vis_mode) {
      case VisMode::FTRACE:
        ftrace_vis.enable();
        break;
      case VisMode::ZOOMED_OUT:
        overview.enable();
        break;
      }
    }
  }
  drawVisualisation(vis_mode, 1.0);


  ofPlanePrimitive plane;
  plane.set(width, height, 2, 2, OF_PRIMITIVE_TRIANGLES);

  ofEnableAlphaBlending();
  ofSetColor(255, 255);
  vignetteShader.begin();
  vignetteShader.setUniform2f("resolution", width, height);
  vignetteShader.setUniform1f("margin", 30);
  vignetteShader.setUniform1f("time", ofGetElapsedTimef());
  // ofDrawRectangle(0, 0, width, height);
  plane.draw();
  vignetteShader.end();

  ofPopMatrix();
}

void ofApp::addActivityPoint(int source) {
  if (source >= 3) {
    return;
  }
  overview.trigger_activity(source);
}

void ofApp::activateTransitionToNext() {

  VisMode next_vis;
  if (use_fixed_order_transitions) {
    next_vis = vis_mode_order[vis_mode_order_index];
    vis_mode_order_index = (vis_mode_order_index + 1) % vis_mode_order.size();
  } else {
    do {
      int next_vis_num = int(ofRandom(0, static_cast<int>(VisMode::LAST)));
      next_vis = static_cast<VisMode>(next_vis_num);
    } while (next_vis == vis_mode);
  }
  transitionToFrom(vis_mode, next_vis);
}

void ofApp::checkOscMessages() {
  // check for waiting messages
  while (receiver.hasWaitingMessages()) {
    // get the next message
    ofxOscMessage m;
    receiver.getNextMessage(&m);

    // cout << "message: " << m << endl;

    // Only parse the message if we are not paused
    if (!is_paused) {
      // check for mouse moved message
      if (m.getAddress() == "/cyberglow") {
        string origin = m.getArgAsString(0);
        string action = m.getArgAsString(1);
        string arguments = m.getArgAsString(2);
        // cout << "OSC mess: " << origin << ", " << action << ", " << arguments
        // << endl;
        parseOscMessage(origin, action, arguments);
      } else if (m.getAddress() == "/ftrace") {
        ftrace_vis.register_event(m.getArgAsString(0));
        // cout << "ftrace: " << m.getArgAsString(0) << endl;
        addActivityPoint(TriangleVIS);
      } else if (m.getAddress() == "/ftrace_trigger") {
        overview.register_ftrace_trigger(m.getArgAsString(0));
        ftrace_vis.register_ftrace_trigger(m.getArgAsString(0));
      } else if (m.getAddress() == "/transition") {
        float time_to_next_transition = m.getArgAsFloat(0);
        if (visualisation_enabled) {
          if (ofGetElapsedTimef() - last_transition_enable_time >
              time_per_vis) {
            // Stay in one vis for a longer time
            transition_from_current_visualisation(time_to_next_transition);
            ofxOscMessage mess;
            switch (vis_mode) {
            case VisMode::FTRACE:
              mess.addStringArg("ftrace");
              break;
            case VisMode::ZOOMED_OUT:
              mess.addStringArg("overview");
              break;
            }
            mess.setAddress("/transition_from_vis");
            osc_sender.sendMessage(mess, false);
          } else {
            switch (vis_mode) {
            case VisMode::FTRACE:
              ftrace_vis.activate_between_transition();
              break;
            case VisMode::ZOOMED_OUT:
              overview.activate_between_transition();
              break;
            }
          }
        } else {
          enable_next_visualisation();
          last_transition_enable_time = ofGetElapsedTimef();
        }
      } else {
        // cout << "Received unknown message to " << m.getAddress() << endl;
        // unrecognized message
      }
    }
  }
}

void ofApp::transition_from_current_visualisation(float transition_time) {
  visualisation_enabled = false;
  switch (vis_mode) {
  case VisMode::ZOOMED_OUT:
    overview.disable(transition_time);
    break;
  case VisMode::FTRACE:
    ftrace_vis.disable(transition_time);
    break;
  }
}
void ofApp::enable_next_visualisation() {

  switch (vis_mode) {
  case VisMode::ZOOMED_OUT:
    vis_mode = VisMode::FTRACE;
    ftrace_vis.enable();
    break;
  case VisMode::FTRACE:
    vis_mode = VisMode::ZOOMED_OUT;
    overview.enable();
    break;
  }
  visualisation_enabled = true;
}

void ofApp::parseOscMessage(string origin, string action, string arguments) {
  std::string delimiter = ";";
  if (origin == "node") {

    if (action == "async after Timeout") {
      addActivityPoint(TriangleSERVER);

    } else if (action == "async after FSREQCALLBACK") {
      addActivityPoint(TriangleSERVER);

    } else if (action == "async after TCPWRAP") {
      addActivityPoint(TriangleSERVER);
    }
  } else if (origin == "gameEngine") {
    if (action == "stateChanged") {
      addActivityPoint(TriangleSERVER);

    } else if (action == "newQuestion") {
      string question = arguments;
      if (automatic_transitions && transition_at_new_question &&
          !idle_mode_on) {
        activateTransitionToNext();
      }
      answer_for_current_question_received = false;
    }

  } else if (origin == "user") {

    string text = action; // + " " + arguments;
    if (action != "userAnswer") {
    }
    if (action == "userAnswer") {
      if (automatic_transitions && transition_at_answer &&
          !answer_for_current_question_received) {
        activateTransitionToNext();
      }
      answer_for_current_question_received = true;
    }
    addActivityPoint(TriangleUSER);
    overview.register_user_event_name(action);
    if (action == "move") {

    } else if (action == "enterAnswer") {
      // user moves inside the answer zone

    } else if (action == "userAnswer") {
      // the time has ended and the user has answered

    } else if (action == "new") {
      string user_id = arguments;
    }
  } else if (origin == "server") {
    addActivityPoint(TriangleSERVER);
    if (action == "file") {
    }
  } else if (origin == "mongodb") {
  }
}

void ofApp::drawVisualisation(VisMode vis, float scale) {

  switch (vis) {
  case VisMode::FTRACE: {
    ftrace_vis.draw(width, height, large_font);
    break;
  }
  case VisMode::ZOOMED_OUT: {
    // draw triangle positions
    // float intensity = 0.2;
    // for (size_t i = 0; i < 3; i++) {
    //   ofFill();
    //   ofSetColor(ofColor::blue);
    //   ofDrawCircle(triangle_positions[i].x * scale,
    //                triangle_positions[i].y * scale, dotSize);
    //   float radius = powf(triangle_activity[i], 0.5) * height * 0.08 + 10;
    //   if (transition.active()) {
    //     radius = 15.0;
    //   }
    //   ofNoFill();
    //   ofSetColor(ofColor::blue);
    //   ofDrawCircle(triangle_positions[i].x, triangle_positions[i].y,
    //   radius);
    // }
    // for(auto& elc : event_line_columns) {
    //     elc.draw(laser, scan_x, scan_width);
    // }
    // overview.draw_symbols(laser);
    // if (!transition.active()) {
    //   overview.draw_text();
    //   // draw point activity
    //   for (auto &ap : activity_points) {
    //     ap.draw(scale);
    //   }
    // }
    overview.draw(width, height, font, large_font);
    break;
  }
  }
}

//--------------------------------------------------------------
void ofApp::keyPressed(int key) {
  switch (key) {
  case OF_KEY_RIGHT: {
    auto from = vis_mode;
    vis_mode = static_cast<VisMode>((static_cast<int>(vis_mode) + 1) %
                                    static_cast<int>(VisMode::LAST));
    auto to = vis_mode;
    transitionToFrom(from, to);

    break;
  }
  case OF_KEY_LEFT:
    if (static_cast<int>(vis_mode) != 0) {
      auto from = vis_mode;
      vis_mode = static_cast<VisMode>(static_cast<int>(vis_mode) - 1);
      auto to = vis_mode;
      transitionToFrom(from, to);
    }
    break;
  case ' ': {
    is_paused = !is_paused;
    break;
  }
  case '1': {
    auto from = vis_mode;
    vis_mode = static_cast<VisMode>(0);
    auto to = vis_mode;
    transitionToFrom(from, to);
    break;
  }
  case '2': {
    auto from = vis_mode;
    vis_mode = static_cast<VisMode>(1);
    auto to = vis_mode;
    transitionToFrom(from, to);
    break;
  }
  case '3': {
    auto from = vis_mode;
    vis_mode = static_cast<VisMode>(2);
    auto to = vis_mode;
    transitionToFrom(from, to);
    break;
  }
  case '4': {
    auto from = vis_mode;
    vis_mode = static_cast<VisMode>(3);
    auto to = vis_mode;
    transitionToFrom(from, to);
    break;
  }
  case '5': {
    auto from = vis_mode;
    vis_mode = static_cast<VisMode>(4);
    auto to = vis_mode;
    transitionToFrom(from, to);
    break;
  }
  case '6': {
    auto from = vis_mode;
    vis_mode = static_cast<VisMode>(5);
    auto to = vis_mode;
    transitionToFrom(from, to);
    break;
  }
  case '7': {
    auto from = vis_mode;
    vis_mode = static_cast<VisMode>(6);
    auto to = vis_mode;
    transitionToFrom(from, to);
    break;
  }
  }
}

//--------------------------------------------------------------
void ofApp::keyReleased(int key) {}

//--------------------------------------------------------------
void ofApp::mouseMoved(int x, int y) {

  // scan_x = (float(x)/float(ofGetWidth())) * float(width) - halfw;
  mouse_rel_x = (float(x) / float(ofGetWidth())) * 2.0 - 1.0;
  mouse_rel_y = (float(y) / float(ofGetHeight())) * 2.0 - 1.0;
}

//--------------------------------------------------------------
void ofApp::mouseDragged(int x, int y, int button) {

  // addRandomActivityPoint();
}

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

int visModeCategory(VisMode vis) {
  if (vis == VisMode::FTRACE) {
    return TriangleVIS;
  } else if (vis == VisMode::ZOOMED_OUT) {
    return 3;
  }
  return -1;
}

bool vismodesAreInTheSamePlace(VisMode vis1, VisMode vis2) {
  return visModeCategory(vis1) == visModeCategory(vis2);
}

void ofApp::transitionToFrom(VisMode from, VisMode to) {
  Transition t = Transition();
  t.type = TransitionType::DISABLE_AND_FADE;
  t.from_vis = from;
  t.to_vis = to;
  transition = t;
  if (from == VisMode::ZOOMED_OUT) {
    overview.disable(3.0);
  } else {
    ftrace_vis.disable(3.0);
  }
}
