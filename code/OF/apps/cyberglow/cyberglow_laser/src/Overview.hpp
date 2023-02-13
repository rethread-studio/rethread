#ifndef _OVERVIEW_HPP_
#define _OVERVIEW_HPP_

#include "ofMain.h"
#include "ofxLaserManager.h"
#include "constants.h"
#include "LaserText.hpp"

class Overview {
    public:
		glm::vec2 triangle_positions[3];
        vector<LaserText> location_texts;

        bool finished_init = false;
        int text_index = 0;

        Overview() {}

        Overview(glm::vec2 triangle_positions_[3]) {

            for(int i = 0; i < 3; i++) {
                triangle_positions[i] = triangle_positions_[i];
            }
            LaserTextOptions options;
            options.size = 40.0;
            options.color = ofColor(255, 0, 255);
            glm::vec2 o = glm::vec2(-10, 10);
            location_texts.push_back(LaserText("VISUALISATION", options, 4, triangle_positions[TriangleVIS]+o));
            location_texts.push_back(LaserText("SERVER", options, 3, triangle_positions[TriangleSERVER]+o));
            location_texts.push_back(LaserText("USER", options, 3, triangle_positions[TriangleUSER]+o));

            for(auto& text : location_texts) {
                text.offFrames = 12;
            }
        }

        void draw_symbols(ofxLaser::Manager &laser) {
            ofColor color = ofColor(128, 0, 255);
            auto profile = OFXLASER_PROFILE_DEFAULT;
            // Draw cloud at server position
            auto p = triangle_positions[TriangleSERVER];
            float w = 300;
            float h = 150;
            ofPolyline poly;
            poly.addVertex(p.x-w*0.5, p.y, 0);
            poly.addVertex(p.x, p.y-h*0.5, 0);
            poly.addVertex(p.x+w*0.5, p.y, 0);
            poly.addVertex(p.x, p.y+h*0.5, 0);
            poly.addVertex(p.x-w*0.5, p.y, 0);
            laser.drawPoly(poly, color, profile);



            // Draw a smartphone
            p = triangle_positions[TriangleUSER];
            w = 300;
            h = 150;
            poly;
            poly.addVertex(p.x-w*0.5, p.y, 0);
            poly.addVertex(p.x, p.y-h*0.5, 0);
            poly.addVertex(p.x+w*0.5, p.y, 0);
            poly.addVertex(p.x, p.y+h*0.5, 0);
            poly.addVertex(p.x-w*0.5, p.y, 0);
            laser.drawPoly(poly, color, profile);
        }

        void update() {
            if(finished_init) {
                // for(auto& text : location_texts) {
                //     text.update();
                // }
                location_texts[text_index].update();
                if(location_texts[text_index].resetFrame) {
                    text_index = (text_index+1)%location_texts.size();
                }
            }
        }

        void draw_text(ofxLaser::Manager &laser) {
            if(!finished_init) {
                // location_texts[TriangleUSER].pos.x -= location_texts[TriangleUSER].get_width(laser) + 20;
                location_texts[TriangleUSER].pos.x += 90;
                location_texts[TriangleVIS].pos.x -= location_texts[TriangleVIS].get_width(laser) + 20;
                location_texts[TriangleSERVER].pos.x -= location_texts[TriangleSERVER].get_width(laser) * 0.5;
                location_texts[TriangleSERVER].pos.y -= 120;
                finished_init = true;
            }

            // for(auto& text : location_texts) {
            //     text.draw(laser);
            // }
            location_texts[text_index].draw(laser);
        }
};

#endif
