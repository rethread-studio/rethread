#ifndef _FTRACE_VIS_HPP
#define _FTRACE_VIS_HPP

#include "ofMain.h"
#include "ofxLaserManager.h"

class EventStats {
    public:
        int num_occurrences = 0;
        float time_since_trigger = 0.0;
        float time_since_last_event = 0.0;
        int occurrencies_to_trigger = 100;
        int triggers_without_release = 0;
        int max_triggers_without_release = 20;
        float ratio_to_trigger_without_release = 1.0;
        float dot_on_time = 0.05;
        int event_num = 0;
        ofColor color = ofColor::white;

        EventStats(int event_num): event_num(event_num) {}

        void register_event() {
            num_occurrences += 1;
        }

        void update(float dt) {
            time_since_last_event += dt;
            time_since_trigger += dt;
            if(num_occurrences >= occurrencies_to_trigger) {
                num_occurrences = 0;
                if(time_since_trigger < (dot_on_time * ratio_to_trigger_without_release)) {
                    triggers_without_release += 1;
                    if(triggers_without_release > max_triggers_without_release) {
                        occurrencies_to_trigger += 10;
                    }
                } else {
                    triggers_without_release = 0;
                }
                time_since_trigger = 0.0;
            }
        }

        void draw_dot(ofxLaser::Manager &laser) {
            // if(time_since_last_event < 0.5) {
            if(time_since_trigger < dot_on_time) {
                float angle = -PI + event_num*0.45;
                float radius = 100.0 + (event_num % 16) * 23.5;
                float x = cos(angle) * radius;
                float y = sin(angle) * radius;
#ifdef DEBUG_MODE
                const float intensity = 1.;
#else
                const float intensity = 0.1;
#endif
                laser.drawDot(x, y, color, intensity, OFXLASER_PROFILE_DEFAULT);
            }
        }
        void draw_rising(ofxLaser::Manager &laser, int width, int height) {
            // if(time_since_last_event < 0.5) {
            if(time_since_trigger < dot_on_time) {
                float x = (event_num * 173) % width;
                float y = height - (time_since_trigger / dot_on_time) * height;
#ifdef DEBUG_MODE
                const float intensity = 1.;
#else
                const float intensity = 0.01;
#endif
                laser.drawDot(x - width/2, y-height/2, color, intensity, OFXLASER_PROFILE_DEFAULT);
            }
        }
};

class FtraceVis {
    public:

        ofColor color = ofColor::blue;
        map<string, EventStats> event_stats;
        bool rising = false;
        bool category_colors = false; // TODO
        float dot_on_time = 0.05;

        FtraceVis(bool rising): rising(rising) {
            if(rising) {
                dot_on_time = 1.0;
            } else {
                dot_on_time = 0.05;
            }
        }
        FtraceVis(): FtraceVis(false) {}


        void register_event(string event) {
            // process;timestamp;event;pid?;cpu?
            // event type until ' ' or '()'
            string event_copy = event;
            vector<string> tokens;
            string delimiter = ";";
            auto i = event.find(delimiter);
            while(i != string::npos) {
                tokens.push_back(event.substr(0, i));
                event.erase(0, i+delimiter.size());
                i = event.find(delimiter);
            }
            tokens.push_back(event); // add the last token

            string event_type;
            i = tokens[2].find("(");
            if(i != string::npos) {
                event_type = tokens[2].substr(0, i);
            } else {
                i = tokens[2].find(" ");
                event_type = tokens[2].substr(0, i);
            }

            auto es = event_stats.find(event_type);
            if(es != event_stats.end()) {
                es->second.register_event();
            } else {
                // cout << "ftrace type: \"" << event_type << "\" event: " << event_copy << endl;
                EventStats e = EventStats(event_stats.size());
                    string event_prefix;
                    i = event_type.find("_");
                    if(i != string::npos) {
                        event_prefix = event_type.substr(0, i);
                    }
                    // Set color of event based on its type
                    if(event_prefix == "random" || event_prefix == "dd" || event_prefix == "redit") {
                        // random type
                        e.color = ofColor::red;
                    } else if(event_prefix == "ys") {
                        // syscall type
                        e.color = ofColor::white;
                    } else if(event_prefix == "cp") {
                        // tcp type
                        e.color = ofColor::green;
                    } else if(event_prefix == "ix") {
                        // irq_matrix type
                        e.color = ofColor::blue;
                    } else {
                        e.color = ofColor(255, 0, 255);
                    }
                if(rising) {
                    e.occurrencies_to_trigger = 20;
                    e.max_triggers_without_release = 2;
                    e.ratio_to_trigger_without_release = 3.0;
                }
                e.dot_on_time = dot_on_time;
                event_stats.insert({event_type, e});
            }
        }

        void update(float dt) {
            for(auto& es: event_stats) {
                es.second.update(dt);
            }
        }

        void draw(ofxLaser::Manager &laser, int width, int height) {
                // laser.drawDot(0, 0 , color, 0.5, OFXLASER_PROFILE_FAST);
            if(rising) {

                for(auto& es: event_stats) {
                    es.second.draw_rising(laser, width, height);
                }
            } else {

                for(auto& es: event_stats) {
                    es.second.draw_dot(laser);
                }
            }
        }
};


#endif
