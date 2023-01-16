#ifndef __RAIN_DROP_HPP_
#define __RAIN_DROP_HPP_

#include "ofMain.h"
#include "ofxLaserManager.h"

class RainDrop {
    public:
        glm::vec2 position;
        glm::vec2 velocity;
        float intensity = 0.2;
        ofColor color;

        RainDrop(int width, int height, ofColor col) {
            position = glm::vec2(ofRandom(width/-4, width/2), height/-2);
            velocity = glm::vec2(0.0, height/2);
            color = col;
        }

        void update(float dt) {
            position += velocity * dt;
        }

        void draw(ofxLaser::Manager &laser) {
                laser.drawDot(position.x, position.y, ofColor::white, intensity, OFXLASER_PROFILE_DEFAULT);
        }
};

#endif
