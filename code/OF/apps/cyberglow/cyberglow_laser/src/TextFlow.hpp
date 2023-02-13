#ifndef __TEXTFLOW_HPP_
#define __TEXTFLOW_HPP_

#include "ofMain.h"
#include "LaserText.hpp"

/// A TextFlow is used to display text messages flying across the screen
class TextFlow {
    public:
        vector<LaserText> texts;
        LaserTextOptions options;
        float velocity = 18.0;
        int max_num_texts = 11;
        // scrambled list of y positions to distribute messages equally across the y
        vector<float> y_options;
        int y_option_index = 0;

        TextFlow() {}

        TextFlow(int width, int height) {
            options = LaserTextOptions();
            options.size = 40.0;
            options.color = ofColor::red;

            int num_y = height/(options.size*2) - 1;
            for(int i = 0; i < num_y; i++) {
                y_options.push_back(i * options.size * 2.);
            }
        }

        void add_text(string text, ofxLaser::Manager &laser, int width, int height) {
            if(texts.size() >= max_num_texts) {
                // Remove a random text first if there are too many
                texts.erase(texts.begin() + int(floor(ofRandom(texts.size()))));
            }
            if(text == "enterAnswer") {
                text = "ENTER ANSWER";
            } else if (text == "userAnswer") {
                text = "USER ANSWER";
            }
            transform(text.begin(), text.end(), text.begin(), ::toupper);
            // float y = floor(ofRandom(0, (height / (options.size * 2)) -1)) * options.size * 2.0;
            float y = y_options[y_option_index];
            y_option_index += 1;
            if(y_option_index >= y_options.size()) {
                std::random_shuffle ( y_options.begin(), y_options.end() );
                y_option_index = 0;
            }
            LaserText lt = LaserText(text, options, 3, glm::vec2(0, y - (height/2)));
            float text_width = lt.get_width(laser);
            // Start to the left of the canvas
            lt.pos.x = width/-2 - text_width;
            texts.push_back(std::move(lt));
        }

        void update(int width) {
            for(auto& t : texts) {
                t.pos.x += velocity;
                t.update();
            }
            // Remove texts that are out of bounds
            for(size_t i = 0; i < texts.size(); i++) {
                if(texts[i].pos.x > width) {
                    texts.erase(texts.begin() + i);
                    i--;
                }
            }
        }
        void draw(ofxLaser::Manager &laser) {

            for(auto& t : texts) {
                t.draw(laser);
            }
        }

};

#endif
