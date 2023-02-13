#ifndef LASERTEXT_H_
#define LASERTEXT_H_

// Draw text as vector graphics

#include "ofMain.h"

class LaserTextOptions {
public:
  ofColor color = ofColor::white;
  float size = 40.0;
  float horizontal_character_margin = 0.6; // in fractions of the size

  LaserTextOptions() {}
  LaserTextOptions(float size) : size(size) {}
  LaserTextOptions(float size, ofColor color) : size(size), color(color) {}

  float get_horizontal_margin() { return horizontal_character_margin * size; }
};

// Returns the width of the character
//
// Draw using lines or from SVGs?
inline float draw_laser_character(char c, LaserTextOptions &options,
                                  glm::vec2 position, bool doDraw) {
  ofPolyline line;
  float w = 0.0;
  float h = options.size;
  glm::vec2 p = position;
  ofColor col = options.color;
  ofPolyline poly;
  ofSetColor(col);
  switch (c) {
  case 'A':
    w = options.size * 0.5;
    if (doDraw) {
      poly.addVertex(p.x, p.y + h);
      poly.addVertex(p.x + w * 0.5, p.y);
      poly.addVertex(p.x + w, p.y + h);
      poly.draw();
      poly.clear();
      poly.addVertex(p.x + w * 0.3, p.y + h * 0.6);
      poly.addVertex(p.x + w * 0.7, p.y + h * 0.6);
      poly.draw();
      poly.clear();
    }
    break;
  case 'B':
    w = options.size * 0.5;
    if (doDraw) {
      poly.addVertex(p.x, p.y + h, 0);
      poly.addVertex(p.x, p.y, 0);
      poly.addVertex(p.x + w, p.y + h * 0.25, 0);
      poly.addVertex(p.x, p.y + h * 0.5, 0);
      poly.addVertex(p.x + w, p.y + h * 0.75, 0);
      poly.addVertex(p.x, p.y + h, 0);
      poly.draw();
    }
    break;
  case 'C':
    w = options.size * 0.5;
    if (doDraw) {
      poly.addVertex(p.x + w, p.y + h, 0);
      poly.addVertex(p.x, p.y + h * 0.75, 0);
      poly.addVertex(p.x, p.y + h * 0.25, 0);
      poly.addVertex(p.x + w, p.y, 0);
      poly.draw();
    }
    break;
  case 'D':
    w = options.size * 0.5;
    if (doDraw) {
      poly.addVertex(p.x, p.y + h, 0);
      poly.addVertex(p.x, p.y, 0);
      poly.addVertex(p.x + w, p.y + h * 0.25, 0);
      poly.addVertex(p.x + w, p.y + h * 0.75, 0);
      poly.addVertex(p.x, p.y + h, 0);
      poly.draw();
    }
    break;
  case 'E':
    w = options.size * 0.5;
    if (doDraw) {
      poly.addVertex(p.x + w, p.y + h, 0);
      poly.addVertex(p.x, p.y + h, 0);
      poly.addVertex(p.x, p.y + h * 0.5, 0);
      poly.addVertex(p.x + w, p.y + h * 0.5, 0);
      poly.addVertex(p.x, p.y + h * 0.5, 0);
      poly.addVertex(p.x, p.y, 0);
      poly.addVertex(p.x + w, p.y, 0);
      poly.draw();
    }
    break;
  case 'F':
    w = options.size * 0.5;
    if (doDraw) {
      poly.addVertex(p.x, p.y + h, 0);
      poly.addVertex(p.x, p.y + h * 0.5, 0);
      poly.addVertex(p.x + w, p.y + h * 0.5, 0);
      poly.addVertex(p.x, p.y + h * 0.5, 0);
      poly.addVertex(p.x, p.y, 0);
      poly.addVertex(p.x + w, p.y, 0);
      poly.draw();
    }
    break;
  case 'G':
    w = options.size * 0.5;
    if (doDraw) {
      poly.addVertex(p.x + w * 0.5, p.y + h * 0.5, 0);
      poly.addVertex(p.x + w, p.y + h * 0.5, 0);
      poly.addVertex(p.x + w, p.y + h, 0);
      poly.addVertex(p.x, p.y + h * 0.75, 0);
      poly.addVertex(p.x, p.y + h * 0.25, 0);
      poly.addVertex(p.x + w, p.y, 0);
      poly.draw();
    }
    break;
  case 'H':
    w = options.size * 0.5;
    if (doDraw) {
      poly.addVertex(p.x, p.y + h, 0);
      poly.addVertex(p.x, p.y, 0);
      poly.addVertex(p.x, p.y + h * 0.5, 0);
      poly.addVertex(p.x + w, p.y + h * 0.5, 0);
      poly.addVertex(p.x + w, p.y, 0);
      poly.addVertex(p.x + w, p.y + h, 0);
      poly.draw();
    }
    break;
  case 'I':
    w = options.size * 0.1;
    if (doDraw) {
      poly.addVertex(p.x + w * 0.5, p.y + h);
      poly.addVertex(p.x + w * 0.5, p.y);
      poly.draw();
    }
    break;
  case 'J':
    w = options.size * 0.4;
    if (doDraw) {
      poly.addVertex(p.x, p.y + h * 0.8, 0);
      poly.addVertex(p.x + w * 0.5, p.y + h, 0);
      poly.addVertex(p.x + w, p.y + h * 0.8, 0);
      poly.addVertex(p.x + w, p.y, 0);
      poly.draw();
    }
    break;
  case 'K':
    w = options.size * 0.5;
    if (doDraw) {
      poly.addVertex(p.x, p.y + h);
      poly.addVertex(p.x, p.y);
      poly.draw();
      poly.clear();
      poly.addVertex(p.x + w, p.y);
      poly.addVertex(p.x, p.y + h * 0.5);
      poly.addVertex(p.x + w, p.y + h);
      poly.draw();
    }
    break;
  case 'L':
    w = options.size * 0.6;
    if (doDraw) {
      poly.addVertex(p.x + w, p.y + h, 0);
      poly.addVertex(p.x, p.y + h, 0);
      poly.addVertex(p.x, p.y, 0);
      poly.draw();
    }
    break;
  case 'M':
    w = options.size * 1.0;
    if (doDraw) {
      poly.addVertex(p.x, p.y + h, 0);
      poly.addVertex(p.x, p.y, 0);
      poly.addVertex(p.x + w * 0.5, p.y + h * 0.5, 0);
      poly.addVertex(p.x + w, p.y, 0);
      poly.addVertex(p.x + w, p.y + h, 0);
      poly.draw();
    }
    break;

  case 'N':
    w = options.size * 0.6;
    if (doDraw) {
      poly.addVertex(p.x, p.y + h, 0);
      poly.addVertex(p.x, p.y, 0);
      poly.addVertex(p.x + w, p.y + h, 0);
      poly.addVertex(p.x + w, p.y, 0);
      poly.draw();
    }
    break;
  case 'O':
    w = options.size * 0.6;
    if (doDraw) {
      poly.addVertex(p.x, p.y + h, 0);
      poly.addVertex(p.x, p.y, 0);
      poly.addVertex(p.x + w, p.y, 0);
      poly.addVertex(p.x + w, p.y + h, 0);
      poly.addVertex(p.x, p.y + h, 0);
      poly.draw();
    }
    break;
  case 'P':
    w = options.size * 0.6;
    if (doDraw) {
      poly.addVertex(p.x, p.y + h, 0);
      poly.addVertex(p.x, p.y, 0);
      poly.addVertex(p.x + w, p.y, 0);
      poly.addVertex(p.x + w, p.y + h * 0.4, 0);
      poly.addVertex(p.x, p.y + h * 0.4, 0);
      poly.draw();
    }
    break;
  case 'Q':
    w = options.size * 0.6;
    if (doDraw) {
      poly.addVertex(p.x, p.y + h, 0);
      poly.addVertex(p.x, p.y, 0);
      poly.addVertex(p.x + w, p.y, 0);
      poly.addVertex(p.x + w, p.y + h, 0);
      poly.addVertex(p.x, p.y + h, 0);
      poly.draw();
      poly.clear();
      poly.addVertex(p.x + w * 0.75, p.y + h * 0.75);
      poly.addVertex(p.x + w, p.y + h);
    }
    break;
  case 'R':
    w = options.size * 0.6;
    if (doDraw) {
      poly.addVertex(p.x, p.y + h, 0);
      poly.addVertex(p.x, p.y, 0);
      poly.addVertex(p.x + w, p.y, 0);
      poly.addVertex(p.x + w, p.y + h * 0.4, 0);
      poly.addVertex(p.x, p.y + h * 0.4, 0);
      poly.addVertex(p.x + w, p.y + h, 0);
      poly.draw();
    }
    break;
  case 'S':
    w = options.size * 0.5;
    if (doDraw) {
      poly.addVertex(p.x, p.y + h, 0);
      poly.addVertex(p.x + w, p.y + h, 0);
      poly.addVertex(p.x + w, p.y + h * 0.65, 0);
      poly.addVertex(p.x, p.y + h * 0.35, 0);
      poly.addVertex(p.x, p.y, 0);
      poly.addVertex(p.x + w, p.y, 0);
      poly.draw();
    }
    break;
  case 'T':
    w = options.size * 0.5;
    if (doDraw) {
      poly.addVertex(p.x, p.y);
      poly.addVertex(p.x + w, p.y);
      poly.draw();
      poly.clear();
      poly.addVertex(p.x + w * 0.5, p.y);
      poly.addVertex(p.x + w * 0.5, p.y + h);
      poly.draw();
    }
    break;
  case 'U':
    w = options.size * 0.5;
    if (doDraw) {
      poly.addVertex(p.x, p.y, 0);
      poly.addVertex(p.x, p.y + h, 0);
      poly.addVertex(p.x + w, p.y + h, 0);
      poly.addVertex(p.x + w, p.y, 0);
      poly.draw();
    }
    break;
  case 'V':
    w = options.size * 0.5;
    if (doDraw) {
      poly.addVertex(p.x, p.y, 0);
      poly.addVertex(p.x + w * 0.5, p.y + h, 0);
      poly.addVertex(p.x + w, p.y, 0);
      poly.draw();
    }
    break;
  case 'X':
    w = options.size * 0.6;
    if (doDraw) {
      poly.addVertex(p.x, p.y);
      poly.addVertex(p.x + w, p.y + h);
      poly.draw();
      poly.clear();
      poly.addVertex(p.x, p.y + h);
      poly.addVertex(p.x + w, p.y);
      poly.draw();
      poly.clear();
    }
    break;
  case 'Y':
    w = options.size * 0.6;
    if (doDraw) {
      poly.addVertex(p.x, p.y);
      poly.addVertex(p.x + w * 0.5, p.y + h * 0.5);
      poly.addVertex(p.x + w * 0.5, p.y + h);
      poly.draw();
      poly.clear();
      poly.addVertex(p.x + w * 0.5, p.y + h * 0.5);
      poly.addVertex(p.x + w, p.y);
      poly.draw();
    }
    break;
  case 'Z':
    w = options.size * 0.5;
    if (doDraw) {
      poly.addVertex(p.x + w, p.y + h, 0);
      poly.addVertex(p.x, p.y + h, 0);
      poly.addVertex(p.x + w, p.y, 0);
      poly.addVertex(p.x, p.y, 0);
      poly.draw();
    }
    break;
  case '.': {
    w = options.size * 0.2;
    if (doDraw) {
      float radius = w * 0.5;
      ofDrawCircle(p + glm::vec2(w * 0.5, h - radius), radius);
    }
    break;
  }
  case ':': {
    w = options.size * 0.2;
    if (doDraw) {
      float radius = w * 0.5;
      ofDrawCircle(p + glm::vec2(w * 0.5, h - radius), radius);
      ofDrawCircle(p + glm::vec2(w * 0.5, radius), radius);
    }
    break;
  }
  case '0':
    w = options.size * 0.6;
    if (doDraw) {
      // laser.drawCircle(p+glm::vec2(w*0.5, h*0.5), w*0.1, col, profile);
      poly.addVertex(p.x + w * 0.5, p.y);
      poly.addVertex(p.x + w, p.y + h * 0.5);
      poly.addVertex(p.x + w * 0.5, p.y + h);
      poly.addVertex(p.x, p.y + h * 0.5);
      poly.addVertex(p.x + w * 0.5, p.y);
      poly.draw();
      poly.clear();
    }
    break;
  case '1':
    w = options.size * 0.1;
    if (doDraw) {
      poly.addVertex(p.x + w * 0.5, p.y + h);
      poly.addVertex(p.x + w * 0.5, p.y);
      poly.draw();
    }
    break;
  case '2':
    w = options.size * 0.6;
    if (doDraw) {
      poly.addVertex(p.x, p.y);
      poly.addVertex(p.x + w, p.y);
      poly.addVertex(p.x + w, p.y + h * 0.2);
      poly.addVertex(p.x, p.y + h * 0.8);
      poly.addVertex(p.x, p.y + h);
      poly.addVertex(p.x + w, p.y + h);
    }
    break;
  case '3':
    w = options.size * 0.6;
    if (doDraw) {
      poly.addVertex(p.x, p.y);
      poly.addVertex(p.x + w, p.y);
      poly.addVertex(p.x + w, p.y + h * 0.5);
      poly.draw();
      poly.clear();
      poly.addVertex(p.x, p.y + h * 0.5);
      poly.addVertex(p.x + w, p.y + h * 0.5);
      poly.addVertex(p.x + w, p.y + h);
      poly.draw();
      poly.clear();
      poly.addVertex(p.x, p.y + h);
      poly.addVertex(p.x + w, p.y + h);
    }
    break;
  case '4':
    w = options.size * 0.7;
    if (doDraw) {
      poly.addVertex(p.x + w * 0.7, p.y + h);
      poly.addVertex(p.x + w * 0.7, p.y);
      poly.addVertex(p.x, p.y + h * 0.7);
      poly.addVertex(p.x + w, p.y + h * 0.7);
      poly.draw();
      poly.clear();
    }
    break;
  case '5':
    w = options.size * 0.6;
    if (doDraw) {
      poly.addVertex(p.x + w, p.y);
      poly.addVertex(p.x, p.y);
      poly.addVertex(p.x, p.y + h * 0.4);
      poly.addVertex(p.x + w, p.y + h * 0.6);
      poly.addVertex(p.x + w, p.y + h);
      poly.addVertex(p.x, p.y + h);
      poly.draw();
    }
    break;
  case '6':
    w = options.size * 0.6;
    if (doDraw) {
      poly.addVertex(p.x + w, p.y);
      poly.addVertex(p.x, p.y + h * 0.6);
      poly.addVertex(p.x + w * 0.5, p.y + h);
      poly.addVertex(p.x + w, p.y + h * 0.7);
      poly.addVertex(p.x + w * 0.5, p.y + h * 0.3);
      poly.draw();
    }
    break;
  case '7':
    w = options.size * 0.7;
    if (doDraw) {
      poly.addVertex(p.x, p.y);
      poly.addVertex(p.x + w, p.y);
      poly.addVertex(p.x + w * 0.2, p.y + h);
      poly.draw();
    }
    break;
  case '8':
    w = options.size * 0.6;
    if (doDraw) {
      poly.addVertex(p.x, p.y);
      poly.addVertex(p.x + w, p.y);
      poly.addVertex(p.x + w, p.y + h);
      poly.addVertex(p.x, p.y + h);
      poly.addVertex(p.x, p.y);
      poly.draw();
      poly.clear();
      poly.addVertex(p.x, p.y + h * 0.5);
      poly.addVertex(p.x + w, p.y + h * 0.5);
      poly.draw();
    }
    break;
  case '9':
    w = options.size * 0.6;
    if (doDraw) {
      poly.addVertex(p.x + w, p.y + h * 0.5);
      poly.addVertex(p.x, p.y + h * 0.5);
      poly.addVertex(p.x, p.y);
      poly.addVertex(p.x + w, p.y);
      poly.addVertex(p.x + w, p.y + h);
      poly.draw();
    }
    break;
  }
  return w + options.get_horizontal_margin();
}

inline void draw_laser_text(string text, LaserTextOptions &options,
                            glm::vec2 position) {

  for (char c : text) {
    float width = draw_laser_character(c, options, position, true);
    position.x += width;
  }
}

class LaserText {
public:
  string text;
  LaserTextOptions options;
  int charPtr = 0;  // the currently drawn character
  int numChars = 3; //
  int moveCounter = 0;
  int framesPerChar = 5;
  bool off = false;
  int offFrames = 2;
  int offFrameCounter = 0;
  bool resetFrame = true; // If this is the frame the text was reset
  glm::vec2 pos;
  LaserText(string text, LaserTextOptions options, int numCharacters,
            glm::vec2 pos)
      : text(text), options(options), numChars(numCharacters), pos(pos) {
    moveCounter = framesPerChar;
  }

  void update() {
    moveCounter--;
    resetFrame = false;
    if (moveCounter <= 0) {
      if (off) {
        offFrameCounter++;
        if (offFrameCounter >= offFrames) {
          off = false;
          charPtr = 0;
          resetFrame = true;
        }
      } else {
        charPtr += 1;
        if (charPtr >= text.size() + numChars) {
          if (offFrames > 0) {
            off = true;
            offFrameCounter = 0;
          } else {
            charPtr = 0;
            resetFrame = true;
          }
        }
      }
      moveCounter = framesPerChar;
    }
  }
  // TODO: Remove the laser requirement by separating the width of characters
  // from drawing them
  float get_width() {
    float total_width = 0.0;

    for (char c : text) {
      total_width += draw_laser_character(c, options, glm::vec2(0, 0), false);
    }
    return total_width;
  }
  void draw() {
    glm::vec2 position = pos;
    for (int i = 0; i < text.size(); i++) {
      char &c = text[i];
      bool doDraw = false;
      if (i <= charPtr && i > charPtr - numChars) {
        doDraw = true;
      }
      float width = draw_laser_character(c, options, position, doDraw);
      position.x += width;
    }
  }
};

#endif // LASERTEXT_H_
