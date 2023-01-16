#ifndef _USER_GRID_HPP__
#define _USER_GRID_HPP__

#include "constants.h"
#include "ofMain.h"

enum class UserEvent {
  ANSWER = 0,
  USER_ANSWER,
  START,
  EMOTE,
  NEW,
  LEAVE,
  CLICK,
  MOVE,
  PLAY,
  EXIT_ANSWER,
  ENTER_ANSWER,
  NONE
};

class UserData {
public:
  float event_lifetime = 1.0; // in seconds
  vector<pair<UserEvent, float>> events;
  float time_since_last_event = 0.0;
  glm::vec2 position;
  int events_x = 3;
  int events_y = 4;

  UserData(glm::vec2 position) : position(position) {}

  void register_event(string action, string argument) {
    UserEvent event = UserEvent::NONE;
    if (action == "answer") {
      event = UserEvent::ANSWER;
    } else if (action == "userAnswer") {
      event = UserEvent::USER_ANSWER;
    } else if (action == "start") {
      event = UserEvent::START;
    } else if (action == "emote") {
      event = UserEvent::EMOTE;
    } else if (action == "new") {
      event = UserEvent::NEW;
    } else if (action == "leave") {
      event = UserEvent::LEAVE;
    } else if (action == "click") {
      event = UserEvent::CLICK;
    } else if (action == "move") {
      event = UserEvent::MOVE;
    } else if (action == "play") {
      event = UserEvent::PLAY;
    } else if (action == "exitAnswer") {
      event = UserEvent::EXIT_ANSWER;
    } else if (action == "enterAnswer") {
      event = UserEvent::ENTER_ANSWER;
    }

    if (event != UserEvent::NONE) {
      events.push_back(make_pair(event, event_lifetime));
      time_since_last_event = 0;
    }
  }

  void update(float dt) {
    time_since_last_event += dt;
    for (int i = events.size() - 1; i >= 0; i--) {
      auto &ep = events[i];
      ep.second -= dt;
      if (ep.second <= 0.0) {
        // delete the event if it has expired
        events.erase(events.begin() + i);
      }
    }
  }

  void draw(float w, float h) {
    // ofColor color = ofColor::pink;
    // float y_up = h/(float(events_y));
    // laser.drawLine(glm::vec2(position.x, position.y - y_up),
    // glm::vec2(position.x+w, position.y-y_up), color, OFXLASER_PROFILE_FAST);
    // laser.drawLine(glm::vec2(position.x+w, position.y-y_up),
    // glm::vec2(position.x+w, position.y+h), color, OFXLASER_PROFILE_FAST);
    // grid or circle?
    for (auto &ep : events) {
      int event_index = static_cast<int>(ep.second);
      float x = (event_index % events_x) * (w / float(events_x)) + position.x;
      float y =
          floor(float(event_index) / float(events_x)) * (h / float(events_y)) +
          position.y;
#ifdef DEBUG_MODE
      const float intensity = 1.;
#else
      const float intensity = 0.1;
#endif
      ofColor color = ofColor::red;
      ofSetColor(color);
      ofDrawCircle(x, y, dotSize);
    }
  }
};

class UserGrid {
public:
  int cells_x = 5;
  int cells_y = 3;
  float cell_w;
  float cell_h;
  float start_x = 0.0;
  float start_y = 0.0;
  int cell_jump = 7;
  int current_cell = 0;
  unordered_map<string, UserData> user_datas;

  UserGrid() {}
  UserGrid(int width, int height) {
    // make the canvas smaller to save laser time
    width *= 0.5;
    height *= 0.5;
    cell_w = float(width) / float(cells_x);
    cell_h = float(height) / float(cells_y);
    start_x = float(width) / -2.0;
    start_y = float(height) / -2.0;
  }
  void update(float dt) {
    vector<decltype(user_datas)::key_type> keys_to_delete;
    for (auto &ud : user_datas) {
      ud.second.update(dt);
      if (ud.second.time_since_last_event > 60.0) {
        keys_to_delete.push_back(ud.first);
      }
    }
    for (auto &&key : keys_to_delete) {
      user_datas.erase(key);
    }
  }
  void draw() {
    for (auto &ud : user_datas) {
      ud.second.draw(cell_w * 0.5, cell_h * 0.8);
    }
  }
  void register_event(string action, string arguments) {
    // first string of arguments, before ;, is the id
    auto delimiter = arguments.find(";");
    string id;
    if (delimiter != string::npos) {
      id = arguments.substr(0, delimiter);
      arguments.erase(0, delimiter + 1);
    } else {
      id = arguments; // if only the id is provided there is no delimiter
    }
    auto ud = user_datas.find(id);
    if (ud != user_datas.end()) {
      ud->second.register_event(action, arguments);
    } else {
      float x = (current_cell % cells_x) * cell_w + start_x;
      float y = floor(float(current_cell) / float(cells_x)) * cell_h + start_y;
      current_cell = (current_cell + cell_jump) % (cells_x * cells_y);
      auto ud = UserData(glm::vec2(x, y));
      ud.register_event(action, arguments);
      user_datas.insert({id, ud});
    }
  }
};
#endif
