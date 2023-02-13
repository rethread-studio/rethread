#ifndef EVENTLINE_H_
#define EVENTLINE_H_

// Represents an event happening in a certain column
// Scan across the wall to draw every event

#include "constants.h"
#include "ofMain.h"

class EventLine {
public:
  glm::vec2 position;
  float length = 10.0;
  float max_length = 50.0;
  float length_growth = 0.5;
  ofColor color;

  EventLine(glm::vec2 position, ofColor color, float max_length)
      : position(position), color(color), max_length(max_length) {
    length = ofRandom(0, max_length);
  }

  void update() {
    length += length_growth;
    if (length < 0.0 || length > max_length)
      length_growth *= -1.0;
  }

  void draw(glm::vec2 offset) {
    ofPolyline poly;
    ofSetColor(color);
    glm::vec2 p1 = position + offset;
    glm::vec2 p2 = position + offset + glm::vec2(0, length);
    poly.addVertex(p1.x, p1.y);
    poly.addVertex(p2.x, p2.y);
    poly.draw();
  }

  bool overlaps(glm::vec2 other_pos, float length) {
    if ((abs(position.x - other_pos.x) < 4.0) &&
        abs(position.y - other_pos.y) < length) {
      return true;
    } else {
      return false;
    }
  }
};

class EventLineColumn {
public:
  vector<EventLine> lines;
  glm::vec2 offset;

  EventLineColumn(glm::vec2 offset, int width, int height) : offset(offset) {
    const int num_lines = 100;
    const float length = 50.0;
    const float margin = 0.1;
    for (int i = 0; i < num_lines; i++) {
      bool overlaps = false;
      glm::vec2 pos;
      do {
        pos = glm::vec2(ofRandom(width * margin, width * (1.0 - margin)),
                        ofRandom(0, height - length));
        overlaps = false;
        for (auto &l : lines) {
          if (l.overlaps(pos, length)) {
            overlaps = true;
            break;
          }
        }
      } while (overlaps);
      lines.push_back(EventLine(pos, ofColor::green, length));
    }
  }

  void update() {
    for (auto &l : lines) {
      l.update();
    }
  }

  void draw(float scan_x, float scan_width) {
    for (auto &l : lines) {
      float x = l.position.x + offset.x;
      if (x < scan_x && x > scan_x - scan_width)
        l.draw(offset);
    }
  }
};

#endif // EVENTLINE_H_
