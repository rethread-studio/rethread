#ifndef PLAYERTRAIL_H_
#define PLAYERTRAIL_H_

#include "LaserText.hpp"
#include "constants.h"
#include "ofMain.h"

inline void draw_player(glm::vec2 position, ofColor color) {

  auto p = position;
  ofColor col = color;
  float radius = 30.0;
  ofNoFill();
  ofSetColor(col);
  ofDrawCircle(p, radius);
  std::ostringstream os;
  // os << "X: " << floor(p.x) << " Y: " << floor(p.y);
  auto text_options = LaserTextOptions(15.0, color);
  draw_laser_text(os.str(), text_options, p + glm::vec2(radius, -radius));
}

class PlayerTrail {
public:
  glm::vec2 current_position;
  vector<glm::vec2> trail_positions;
  ofColor color = ofColor::green;
  int display_index = 0;
  int index_counter = 0;
  int frames_between = 15;
  bool finished_cycle = false;
  bool first_pos_added = false;

  PlayerTrail() {
    current_position = glm::vec2(0.0, 0.0);
    // trail_positions.push_back(glm::vec2(300.0, 500.0));
    // trail_positions.push_back(glm::vec2(500.0, 500.0));
    // trail_positions.push_back(glm::vec2(700.0, 500.0));
  }

  void move_to_point(int x, int y) {
    // Don't store the default starting position
    if (first_pos_added) {
      trail_positions.insert(trail_positions.begin(), current_position);
    }
    first_pos_added = true;
    current_position = glm::vec2(x, y);
    while (trail_positions.size() > 3) {
      trail_positions.erase(trail_positions.begin() + 3);
    }
  }

  void randomize_positions() {
    current_position = glm::vec2(ofRandom(-9, 9) * 100, ofRandom(-9, 9) * 100);
    glm::vec2 pos = current_position;
    for (auto &tp : trail_positions) {
      pos += glm::vec2(ofRandom(-10, 10) * 20, ofRandom(-10, 10) * 20);
      tp = pos;
    }
  }

  void reset_cycle() {
    finished_cycle = false;
    display_index = 0;
  }

  void draw(float scale) {
    if (!finished_cycle) {
      if (index_counter >= frames_between) {
        index_counter = 0;
        display_index += 1;
        if (display_index > trail_positions.size() * 2) {
          display_index = 0;
          finished_cycle = true;
        }
      }
      index_counter++;
      // 3 - 1 - 0; 2 2 2 1 0
      int start = trail_positions.size() - 1 -
                  max(display_index - int(trail_positions.size()), 0);
      // 3 - 1 - 0; 2 1 0 0 0
      int end = max(int(trail_positions.size()) - 1 - display_index, 0);
      for (int i = start; i >= end; i--) {
        auto p = trail_positions[i];
        draw_player(p, color);
        auto op = current_position;
        if (i != 0) {
          op = trail_positions[i - 1];
        }
        if (i != end) {
          ofPolyline poly;
          poly.addVertex(p.x, p.y);
          poly.addVertex(op.x, op.y);
          poly.draw();
        }
      }
      if (display_index >= trail_positions.size() &&
          trail_positions.size() > 0) {
        if (display_index != trail_positions.size() * 2) {
          auto p = trail_positions[0];
          auto op = current_position;
          ofSetColor(color);
          ofPolyline poly;
          poly.addVertex(p.x, p.y);
          poly.addVertex(op.x, op.y);
          poly.draw();
        }
        draw_player(current_position, color);
      }
    }
  }
};

#endif // PLAYERTRAIL_H_
