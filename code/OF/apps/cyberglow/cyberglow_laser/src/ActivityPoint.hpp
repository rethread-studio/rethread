#ifndef ACTIVITYPOINT_H_
#define ACTIVITYPOINT_H_

#include "ofMain.h"
#include "ofxLaserManager.h"

class ActivityPoint {
    public:
        glm::vec2 position;
        glm::vec2 velocity;
        ofColor color;
        int frames_to_live = 120;
        float radius = 1.0;
        float growth_speed = 0.0;

        ActivityPoint(glm::vec2 position, glm::vec2 velocity, ofColor color): position(position), velocity(velocity), color(color) {
            radius = ofRandom(1.0, 5.0);
        }

        void update() {
            position += velocity;
            frames_to_live--;
            radius += growth_speed;
        }

        void draw(ofxLaser::Manager &laser, float scale) {
            // laser.drawCircle(position.x, position.y, radius, color, OFXLASER_PROFILE_FAST);
            laser.drawDot(position.x * scale, position.y * scale, color, 0.1, OFXLASER_PROFILE_FAST);
        }

        void launch_towards(glm::vec2 destination, float speed) {
            auto direction = destination - position;
            velocity = glm::normalize(direction) * speed;
        }
        void grow(float growth_speed) {
            this->growth_speed = growth_speed;
        }
};

#endif // ACTIVITYPOINT_H_
