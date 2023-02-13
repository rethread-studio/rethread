#ifndef LASERTEXT_H_
#define LASERTEXT_H_

// Draw text as vector graphics

#include "ofMain.h"
#include "ofxLaserManager.h"


class LaserTextOptions {
    public:
        ofColor color = ofColor::white;
        float size = 40.0;
        float horizontal_character_margin = 0.6; // in fractions of the size

        LaserTextOptions() {}
        LaserTextOptions(float size): size(size) {}
        LaserTextOptions(float size, ofColor color): size(size), color(color) {}

        float get_horizontal_margin() {
            return horizontal_character_margin * size;
        }
};

// Returns the width of the character
//
// Draw using lines or from SVGs?
inline float draw_laser_character(ofxLaser::Manager &laser, char c, LaserTextOptions &options, glm::vec2 position, bool doDraw) {
    ofPolyline line;
    float w = 0.0;
    float h = options.size;
    glm::vec2 p = position;
    ofColor col = options.color;
    ofPolyline poly;
    auto profile = OFXLASER_PROFILE_DEFAULT;
    switch(c) {
        case 'A':
            w = options.size * 0.5;
            if(doDraw){
                laser.drawLine(glm::vec2(p.x, p.y+h), glm::vec2(p.x+w*0.5, p.y), col, profile);
                laser.drawLine(glm::vec2(p.x+w*0.5, p.y), glm::vec2(p.x+w, p.y+h), col, profile);
                laser.drawLine(glm::vec2(p.x+w*0.3, p.y+h*0.6), glm::vec2(p.x+w*0.7, p.y+h*0.6), col, profile);
            }
            break;
        case 'B':
            w = options.size * 0.5;
            if(doDraw){
                poly.addVertex(p.x, p.y+h, 0);
                poly.addVertex(p.x, p.y, 0);
                poly.addVertex(p.x+w, p.y+h*0.25, 0);
                poly.addVertex(p.x, p.y+h*0.5, 0);
                poly.addVertex(p.x+w, p.y+h*0.75, 0);
                poly.addVertex(p.x, p.y+h, 0);
                laser.drawPoly(poly, col, profile);
            }
            break;
        case 'C':
            w = options.size * 0.5;
            if(doDraw){
                poly.addVertex(p.x+w, p.y+h, 0);
                poly.addVertex(p.x, p.y+h*0.75, 0);
                poly.addVertex(p.x, p.y+h*0.25, 0);
                poly.addVertex(p.x+w, p.y, 0);
                laser.drawPoly(poly, col, profile);
            }
            break;
        case 'D':
            w = options.size * 0.5;
            if(doDraw){
                poly.addVertex(p.x, p.y+h, 0);
                poly.addVertex(p.x, p.y, 0);
                poly.addVertex(p.x+w, p.y+h*0.25, 0);
                poly.addVertex(p.x+w, p.y+h*0.75, 0);
                poly.addVertex(p.x, p.y+h, 0);
                laser.drawPoly(poly, col, profile);
            }
            break;
        case 'E':
            w = options.size * 0.5;
            if(doDraw){
                poly.addVertex(p.x+w, p.y+h, 0);
                poly.addVertex(p.x, p.y+h, 0);
                poly.addVertex(p.x, p.y+h*0.5, 0);
                poly.addVertex(p.x+w, p.y+h*0.5, 0);
                poly.addVertex(p.x, p.y+h*0.5, 0);
                poly.addVertex(p.x, p.y, 0);
                poly.addVertex(p.x+w, p.y, 0);
                laser.drawPoly(poly, col, profile);
            }
            break;
        case 'F':
            w = options.size * 0.5;
            if(doDraw){
            poly.addVertex(p.x, p.y+h, 0);
            poly.addVertex(p.x, p.y+h*0.5, 0);
            poly.addVertex(p.x+w, p.y+h*0.5, 0);
            poly.addVertex(p.x, p.y+h*0.5, 0);
            poly.addVertex(p.x, p.y, 0);
            poly.addVertex(p.x+w, p.y, 0);
            laser.drawPoly(poly, col, profile);
            }
            break;
        case 'G':
            w = options.size * 0.5;
            if(doDraw){
                poly.addVertex(p.x+w*0.5, p.y+h*0.5, 0);
                poly.addVertex(p.x+w, p.y+h*0.5, 0);
                poly.addVertex(p.x+w, p.y+h, 0);
                poly.addVertex(p.x, p.y+h*0.75, 0);
                poly.addVertex(p.x, p.y+h*0.25, 0);
                poly.addVertex(p.x+w, p.y, 0);
                laser.drawPoly(poly, col, profile);
            }
            break;
        case 'H':
            w = options.size * 0.5;
            if(doDraw){
                poly.addVertex(p.x, p.y+h, 0);
                poly.addVertex(p.x, p.y, 0);
                poly.addVertex(p.x, p.y+h*0.5, 0);
                poly.addVertex(p.x+w, p.y+h*0.5, 0);
                poly.addVertex(p.x+w, p.y, 0);
                poly.addVertex(p.x+w, p.y+h, 0);
                laser.drawPoly(poly, col, profile);
            }
            break;
        case 'I':
            w = options.size * 0.1;
            if(doDraw){
            laser.drawLine(glm::vec2(p.x+w*0.5, p.y+h), glm::vec2(p.x+w*0.5, p.y), col, profile);
            }
            break;
        case 'J':
            w = options.size * 0.4;
            if(doDraw){
                poly.addVertex(p.x, p.y+h*0.8, 0);
                poly.addVertex(p.x+w*0.5, p.y+h, 0);
                poly.addVertex(p.x+w, p.y+h*0.8, 0);
                poly.addVertex(p.x+w, p.y, 0);
                laser.drawPoly(poly, col, profile);
            }
            break;
        case 'K':
            w = options.size * 0.5;
            if(doDraw){
                laser.drawLine(glm::vec2(p.x, p.y+h), glm::vec2(p.x, p.y), col, profile);
                laser.drawLine(glm::vec2(p.x+w, p.y), glm::vec2(p.x, p.y+h*0.5), col, profile);
                laser.drawLine(glm::vec2(p.x, p.y+h*0.5), glm::vec2(p.x+w, p.y+h), col, profile);
            }
            break;
        case 'L':
            w = options.size * 0.6;
            if(doDraw){
            poly.addVertex(p.x+w, p.y+h, 0);
            poly.addVertex(p.x, p.y+h, 0);
            poly.addVertex(p.x, p.y, 0);
            laser.drawPoly(poly, col, profile);
            }
            break;
        case 'M':
            w = options.size * 1.0;
            if(doDraw){
            poly.addVertex(p.x, p.y+h, 0);
            poly.addVertex(p.x, p.y, 0);
            poly.addVertex(p.x+w*0.5, p.y+h*0.5, 0);
            poly.addVertex(p.x+w, p.y, 0);
            poly.addVertex(p.x+w, p.y+h, 0);
            laser.drawPoly(poly, col, profile);
            }
            break;

        case 'N':
            w = options.size * 0.6;
            if(doDraw){
            poly.addVertex(p.x, p.y+h, 0);
            poly.addVertex(p.x, p.y, 0);
            poly.addVertex(p.x+w, p.y+h, 0);
            poly.addVertex(p.x+w, p.y, 0);
            laser.drawPoly(poly, col, profile);
            }
            break;
        case 'O':
            w = options.size * 0.6;
            if(doDraw){
            poly.addVertex(p.x, p.y+h, 0);
            poly.addVertex(p.x, p.y, 0);
            poly.addVertex(p.x+w, p.y, 0);
            poly.addVertex(p.x+w, p.y+h, 0);
            poly.addVertex(p.x, p.y+h, 0);
            laser.drawPoly(poly, col, profile);
            }
            break;
        case 'P':
            w = options.size * 0.6;
            if(doDraw){
            poly.addVertex(p.x, p.y+h, 0);
            poly.addVertex(p.x, p.y, 0);
            poly.addVertex(p.x+w, p.y, 0);
            poly.addVertex(p.x+w, p.y+h*0.4, 0);
            poly.addVertex(p.x, p.y+h*0.4, 0);
            laser.drawPoly(poly, col, profile);
            }
            break;
        case 'Q':
            w = options.size * 0.6;
            if(doDraw){
                poly.addVertex(p.x, p.y+h, 0);
                poly.addVertex(p.x, p.y, 0);
                poly.addVertex(p.x+w, p.y, 0);
                poly.addVertex(p.x+w, p.y+h, 0);
                poly.addVertex(p.x, p.y+h, 0);
                laser.drawPoly(poly, col, profile);
                laser.drawLine(glm::vec2(p.x+w*0.75, p.y+h*0.75), glm::vec2(p.x+w, p.y+h), col, profile);
            }
            break;
        case 'R':
            w = options.size * 0.6;
            if(doDraw){
                poly.addVertex(p.x, p.y+h, 0);
                poly.addVertex(p.x, p.y, 0);
                poly.addVertex(p.x+w, p.y, 0);
                poly.addVertex(p.x+w, p.y+h*0.4, 0);
                poly.addVertex(p.x, p.y+h*0.4, 0);
                poly.addVertex(p.x+w, p.y+h, 0);
                laser.drawPoly(poly, col, profile);
            }
            break;
        case 'S':
            w = options.size * 0.5;
            if(doDraw){
                poly.addVertex(p.x, p.y+h, 0);
                poly.addVertex(p.x+w, p.y+h, 0);
                poly.addVertex(p.x+w, p.y+h*0.65, 0);
                poly.addVertex(p.x, p.y+h*0.35, 0);
                poly.addVertex(p.x, p.y, 0);
                poly.addVertex(p.x+w, p.y, 0);
                laser.drawPoly(poly, col, profile);
            }
            break;
        case 'T':
            w = options.size * 0.5;
            if(doDraw){
                laser.drawLine(glm::vec2(p.x, p.y), glm::vec2(p.x+w, p.y), col, profile);
                laser.drawLine(glm::vec2(p.x+w*0.5, p.y), glm::vec2(p.x+w*0.5, p.y+h), col, profile);
            }
            break;
        case 'U':
            w = options.size * 0.5;
            if(doDraw){
            poly.addVertex(p.x, p.y, 0);
            poly.addVertex(p.x, p.y+h, 0);
            poly.addVertex(p.x+w, p.y+h, 0);
            poly.addVertex(p.x+w, p.y, 0);
            laser.drawPoly(poly, col, profile);
            }
            break;
        case 'V':
            w = options.size * 0.5;
            if(doDraw){
            poly.addVertex(p.x, p.y, 0);
            poly.addVertex(p.x + w*0.5, p.y+h, 0);
            poly.addVertex(p.x+w, p.y, 0);
            laser.drawPoly(poly, col, profile);
            }
            break;
        case 'X':
            w = options.size * 0.6;
            if(doDraw){
            laser.drawLine(glm::vec2(p.x, p.y), glm::vec2(p.x+w, p.y+h), col, profile);
            laser.drawLine(glm::vec2(p.x, p.y+h), glm::vec2(p.x+w, p.y), col, profile);
            }
            break;
        case 'Y':
            w = options.size * 0.6;
            if(doDraw){
            laser.drawLine(glm::vec2(p.x, p.y), glm::vec2(p.x+w*0.5, p.y+h*0.5), col, profile);
            laser.drawLine(glm::vec2(p.x+w*0.5, p.y+h*0.5), glm::vec2(p.x+w*0.5, p.y+h), col, profile);
            laser.drawLine(glm::vec2(p.x+w*0.5, p.y+h*0.5), glm::vec2(p.x+w, p.y), col, profile);
            }
            break;
        case 'Z':
            w = options.size * 0.5;
            if(doDraw){
                poly.addVertex(p.x+w, p.y+h, 0);
                poly.addVertex(p.x, p.y+h, 0);
                poly.addVertex(p.x+w, p.y, 0);
                poly.addVertex(p.x, p.y, 0);
                laser.drawPoly(poly, col, profile);
            }
            break;
        case '.':
        {
            w = options.size * 0.2;
            if(doDraw){
            float radius = w * 0.5;
            laser.drawCircle(p+glm::vec2(w*0.5, h-radius), radius, col, profile);
            }
            break;
        }
        case ':':
        {
            w = options.size * 0.2;
            if(doDraw){
            float radius = w * 0.5;
            laser.drawCircle(p+glm::vec2(w*0.5, h-radius), radius, col, profile);
            laser.drawCircle(p+glm::vec2(w*0.5, radius), radius, col, profile);
            }
            break;
        }
        case '0':
            w = options.size*0.6;
            if(doDraw){
            // laser.drawCircle(p+glm::vec2(w*0.5, h*0.5), w*0.1, col, profile);
            laser.drawLine(glm::vec2(p.x+w*0.5, p.y), glm::vec2(p.x + w, p.y+h*0.5), col, profile);
            laser.drawLine(glm::vec2(p.x+w, p.y+h*0.5), glm::vec2(p.x + w*0.5, p.y+h), col, profile);
            laser.drawLine(glm::vec2(p.x+w*0.5, p.y+h), glm::vec2(p.x, p.y+h*0.5), col, profile);
            laser.drawLine(glm::vec2(p.x, p.y+h*0.5), glm::vec2(p.x + w*0.5, p.y), col, profile);
            }
            break;
        case '1':
            w = options.size * 0.1;
            if(doDraw){
            laser.drawLine(glm::vec2(p.x+w*0.5, p.y+h), glm::vec2(p.x+w*0.5, p.y), col, profile);
            }
            break;
        case '2':
            w = options.size * 0.6;
            if(doDraw){
            laser.drawLine(glm::vec2(p.x, p.y), glm::vec2(p.x + w, p.y), col, profile);
            laser.drawLine(glm::vec2(p.x+w, p.y), glm::vec2(p.x + w, p.y + h*0.2), col, profile);
            laser.drawLine(glm::vec2(p.x+w, p.y+h*0.2), glm::vec2(p.x, p.y+h*0.8), col, profile);
            laser.drawLine(glm::vec2(p.x, p.y+h*0.8), glm::vec2(p.x, p.y+h), col, profile);
            laser.drawLine(glm::vec2(p.x, p.y+h), glm::vec2(p.x + w, p.y+h), col, profile);
            }
            break;
        case '3':
            w = options.size * 0.6;
            if(doDraw){
            laser.drawLine(glm::vec2(p.x, p.y), glm::vec2(p.x + w, p.y), col, profile);
            laser.drawLine(glm::vec2(p.x+w, p.y), glm::vec2(p.x+w, p.y+h*0.5), col, profile);
            laser.drawLine(glm::vec2(p.x, p.y+h*0.5), glm::vec2(p.x+w, p.y+h*0.5), col, profile);
            laser.drawLine(glm::vec2(p.x+w, p.y+h*0.5), glm::vec2(p.x+w, p.y+h), col, profile);
            laser.drawLine(glm::vec2(p.x, p.y+h), glm::vec2(p.x + w, p.y+h), col, profile);
            }
            break;
        case '4':
            w = options.size * 0.7;
            if(doDraw){
            laser.drawLine(glm::vec2(p.x+w*0.7, p.y+h), glm::vec2(p.x+w*0.7, p.y), col, profile);
            laser.drawLine(glm::vec2(p.x+w*0.7, p.y), glm::vec2(p.x, p.y+h*0.7), col, profile);
            laser.drawLine(glm::vec2(p.x, p.y+h*0.7), glm::vec2(p.x+w, p.y+h*0.7), col, profile);
            }
            break;
        case '5':
            w = options.size * 0.6;
            if(doDraw){
            laser.drawLine(glm::vec2(p.x+w, p.y), glm::vec2(p.x, p.y), col, profile);
            laser.drawLine(glm::vec2(p.x, p.y), glm::vec2(p.x, p.y + h*0.4), col, profile);
            laser.drawLine(glm::vec2(p.x, p.y+h*0.4), glm::vec2(p.x+w, p.y+h*0.6), col, profile);
            laser.drawLine(glm::vec2(p.x+w, p.y+h*0.6), glm::vec2(p.x+w, p.y+h), col, profile);
            laser.drawLine(glm::vec2(p.x+w, p.y+h), glm::vec2(p.x, p.y+h), col, profile);
            }
            break;
        case '6':
            w = options.size * 0.6;
            if(doDraw){
            laser.drawLine(glm::vec2(p.x+w, p.y), glm::vec2(p.x, p.y+h*0.6), col, profile);
            laser.drawLine(glm::vec2(p.x, p.y+h*0.6), glm::vec2(p.x+w*0.5, p.y+h), col, profile);
            laser.drawLine(glm::vec2(p.x+w*0.5, p.y+h), glm::vec2(p.x+w, p.y+h*0.7), col, profile);
            laser.drawLine(glm::vec2(p.x+w, p.y+h*0.7), glm::vec2(p.x+w*0.5, p.y+h*0.3), col, profile);
            }
            break;
        case '7':
            w = options.size * 0.7;
            if(doDraw){
            laser.drawLine(glm::vec2(p.x, p.y), glm::vec2(p.x + w, p.y), col, profile);
            laser.drawLine(glm::vec2(p.x+w, p.y), glm::vec2(p.x+w*0.2, p.y+h), col, profile);
            }
            break;
        case '8':
            w = options.size * 0.6;
            if(doDraw){
            laser.drawLine(glm::vec2(p.x, p.y), glm::vec2(p.x + w, p.y), col, profile);
            laser.drawLine(glm::vec2(p.x+w, p.y), glm::vec2(p.x+w, p.y+h), col, profile);
            laser.drawLine(glm::vec2(p.x+w, p.y+h), glm::vec2(p.x, p.y+h), col, profile);
            laser.drawLine(glm::vec2(p.x, p.y+h), glm::vec2(p.x, p.y), col, profile);
            laser.drawLine(glm::vec2(p.x, p.y+h*0.5), glm::vec2(p.x+w, p.y+h*0.5), col, profile);
            }
            break;
        case '9':
            w = options.size * 0.6;
            if(doDraw){
            laser.drawLine(glm::vec2(p.x+w, p.y+h*0.5), glm::vec2(p.x, p.y+h*0.5), col, profile);
            laser.drawLine(glm::vec2(p.x, p.y+h*0.5), glm::vec2(p.x, p.y), col, profile);
            laser.drawLine(glm::vec2(p.x, p.y), glm::vec2(p.x+w, p.y), col, profile);
            laser.drawLine(glm::vec2(p.x+w, p.y), glm::vec2(p.x+w, p.y+h), col, profile);
            }
            break;
    }
    return w + options.get_horizontal_margin();
}

inline void draw_laser_text(ofxLaser::Manager &laser, string text, LaserTextOptions &options, glm::vec2 position) {

    for(char c : text) {
        float width = draw_laser_character(laser, c, options, position, true);
        position.x += width;
    }
}

class LaserText {
    public:
        string text;
        LaserTextOptions options;
        int charPtr = 0; // the currently drawn character
        int numChars = 3; //
        int moveCounter = 0;
        int framesPerChar = 5;
        bool off = false;
        int offFrames = 2;
        int offFrameCounter = 0;
        bool resetFrame = true; // If this is the frame the text was reset
        glm::vec2 pos;
        LaserText(string text, LaserTextOptions options, int numCharacters, glm::vec2 pos):
            text(text), options(options), numChars(numCharacters), pos(pos)  {
            moveCounter = framesPerChar;
        }

        void update() {
            moveCounter--;
            resetFrame = false;
            if(moveCounter <= 0) {
                if(off) {
                    offFrameCounter++;
                    if(offFrameCounter >= offFrames) {
                        off = false;
                        charPtr = 0;
                        resetFrame = true;
                    }
                } else {
                    charPtr += 1;
                    if(charPtr >= text.size() + numChars) {
                        if(offFrames > 0) {
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
        // TODO: Remove the laser requirement by separating the width of characters from drawing them
        float get_width(ofxLaser::Manager &laser) {
            float total_width = 0.0;

            for(char c : text) {
                total_width += draw_laser_character(laser, c, options, glm::vec2(0, 0), false);
            }
            return total_width;
        }
        void draw(ofxLaser::Manager &laser) {
            glm::vec2 position = pos;
            for(int i = 0; i < text.size(); i++) {
                char& c = text[i];
                bool doDraw = false;
                if(i <= charPtr && i > charPtr-numChars) {
                    doDraw = true;
                }
                float width = draw_laser_character(laser, c, options, position, doDraw);
                position.x += width;
            }
        }
};


#endif // LASERTEXT_H_
