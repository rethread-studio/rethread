#pragma once

// Flag for seeing everything on the computer screen
#define DEBUG_MODE false



#include "ofMain.h"
#include "constants.h"
#include <unordered_map>
#include "ofxOsc.h"
#include "ofxLaserManager.h"
#include "ActivityPoint.hpp"
#include "EventLine.hpp"
#include "LaserText.hpp"
#include "TextFlow.hpp"
#include "PlayerTrail.hpp"
#include "WebServerVis.h"
#include "RainDrop.hpp"
#include "UserGrid.hpp"
#include "FtraceVis.hpp"
#include "Overview.hpp"


enum class VisMode {
WEBSERVER = 0,
USER,
USER_GRID,
ZOOMED_OUT,
TEXT_DEMO,
FTRACE,
FTRACE_RISING,
LAST,
};

enum class TransitionType {
NONE,
SPIN,
ZOOM_IN,
ZOOM_OUT,
};


class Transition {
	public:
		TransitionType type;
		VisMode from_vis;
		VisMode to_vis;
		float phase = 0.0;
		float duration = 10.0; // set in constructor
		glm::vec3 spin_axis = glm::vec3(0, 0, 1.0);
		float spin_radians = 0.0;
		glm::vec2 zoom_target = glm::vec2(0, 0);
		float zoom_distance = 4000;

		Transition() {
			type = TransitionType::SPIN;
			from_vis = VisMode::ZOOMED_OUT;
			to_vis = VisMode::WEBSERVER;
			spin_axis= glm::vec3(0, 1.0, 0);
			phase = 0.0;
			duration = 10.0;
		}


		void update(float dt) {
			phase += dt/duration;
			if(phase >= 1.0) {
				type = TransitionType::NONE;
			}

			switch(type) {
				case TransitionType::SPIN:
				{
					spin_radians = phase * PI * 0.5;
					break;
				}
				case TransitionType::ZOOM_IN:
				{
					break;
				}
				case TransitionType::ZOOM_OUT:
				{
					break;
				}
				case TransitionType::NONE:
					break;
			}

		}

		float applyTransitionFrom() {
			switch(type) {
				case TransitionType::SPIN:
				{
					ofRotateRad(spin_radians, spin_axis.x, spin_axis.y, spin_axis.z);
					break;
				}
				case TransitionType::ZOOM_IN:
				{
					//
					float scale = 1.0 + powf(max(phase-0.25, 0.0), 2.0) * 300.;
					float target_phase = min(phase * 4.0, 1.0) * -1 * scale;
					ofTranslate(zoom_target.x*target_phase, zoom_target.y*target_phase, 0.0);
					// return scale;
					ofScale(scale, scale, 0.);
					break;
				}
				case TransitionType::ZOOM_OUT:
				{
					float target_phase = max(min(phase * 4.0 - 3.0, 1.0), 0.0);
					float scale = powf(min(max((1.0-phase/0.75), 0.0), 1.0), 3.0);
					// cout << "target y: " << zoom_target.y * target_phase << endl;
					// ofTranslate(0., 0., zoom_distance * phase * -1);
					ofTranslate(zoom_target.x*target_phase, zoom_target.y*target_phase, 0.);
					ofScale(scale, scale, 0);
					break;
				}
			}
			return 1.0;
		}

		/// Returns the scale that the visualisation should be drawn with
		float applyTransitionTo() {
			switch(type) {
				case TransitionType::SPIN:
				{
					ofRotateRad(PI * -0.5 + spin_radians, spin_axis.x, spin_axis.y, spin_axis.z);
					break;
				}
				case TransitionType::ZOOM_IN:
				{
					float target_phase = (1.0 - min(phase * 4.0, 1.0)) * -1;
					// float z_zoom = zoom_distance * -4 + (zoom_distance * phase * 4);
					float scale = powf(max(phase-0.25, 0.0)/0.75, 3.0);
					ofTranslate(zoom_target.x*target_phase*-1, zoom_target.y*target_phase*-1, 0);
					// ofTranslate(0, 0, z_zoom);
					// return scale;
					ofScale(scale, scale, 0);
					break;
				}
				case TransitionType::ZOOM_OUT:
				{
					// *-1 because we want to move opposite to the target to put it at the origin
					float scale = 1.0 + powf(max(1.0 - ((phase/0.75)), 0.0), 2.0) * 100.;
					float target_phase = (1.0 - max(min(phase * 4.0 - 3.0, 1.0), 0.0)) * -1;
					target_phase *= scale;
					// cout << "scale out: " << scale << endl;
					// ofTranslate(0., 0., zoom_distance  - (zoom_distance * phase ));
					ofTranslate(zoom_target.x*target_phase, zoom_target.y*target_phase, 0.);
					ofScale(scale, scale, 0);
					break;
				}
			}
			return 1.0;
		}

		bool active() {
			return type != TransitionType::NONE;
		}
};

class ofApp : public ofBaseApp{

	public:
		void setup();
		void update();
		void draw();

		void keyPressed(int key);
		void keyReleased(int key);
		void mouseMoved(int x, int y );
		void mouseDragged(int x, int y, int button);
		void mousePressed(int x, int y, int button);
		void mouseReleased(int x, int y, int button);
		void mouseEntered(int x, int y);
		void mouseExited(int x, int y);
		void windowResized(int w, int h);
		void dragEvent(ofDragInfo dragInfo);
		void gotMessage(ofMessage msg);

		void addRandomActivityPoint();
		void pickRandomPlayerTrail();
		void addActivityPoint(int source);

		void drawTransition(Transition transition_);
		void drawVisualisation(VisMode vis, float scale);

		void activateTransitionToNext();
		void transitionToFrom(VisMode from, VisMode to);
		Transition getTransitionToFrom(VisMode from, VisMode to);


		VisMode vis_mode = VisMode::WEBSERVER;
		Transition transition;
		bool is_paused = false; // When paused, the image should be static (for photography)

		ofxLaser::Manager laser;
		glm::vec2 triangle_positions[3];
		float triangle_activity[3];
		vector<ActivityPoint> activity_points;
		size_t max_num_activity_points = 20;
		vector<EventLineColumn> event_line_columns;
		unordered_map<string, PlayerTrail> player_trails;
		FtraceVis ftrace_vis;
		FtraceVis ftrace_rising_vis;
		Overview overview;

		WebServerVis web_server_vis;
		UserGrid user_grid;
		vector<LaserText> laser_texts;
		TextFlow text_flow;
		string current_player_trail_id = "";
		// Dimensions of the laser canvas
		int width = 2000;
		int halfw = width/2;
		int height = 1000;
		int halfh = height/2;

		float scan_x = 0.0;
		float scan_width = 100.0;
		float mouse_rel_x = 0.0;
		float mouse_rel_y = 0.0;
		float noise_counter = 0.0;
		float rot_y = 0.0;
		float rot_x = 0.0;

		bool automatic_transitions = true;
		bool use_fixed_order_transitions = true;
		bool transition_at_new_question = false;
		bool transition_at_answer = false;
		bool answer_for_current_question_received = false;
		vector<VisMode> vis_mode_order{VisMode::ZOOMED_OUT, VisMode::WEBSERVER, VisMode::USER, VisMode::USER_GRID, VisMode::FTRACE, VisMode::WEBSERVER, VisMode::TEXT_DEMO};
		VisMode idle_vis_mode = VisMode::FTRACE;
		bool idle_mode_on = false;
		int vis_mode_order_index = 0;
		float next_transition_countdown = 0.0;
		float time_per_vis = 90.0;
		vector<Transition> transition_chain;

		bool dac_connected_last_frame = false;

		// **************** OSC ****************
		ofxOscReceiver receiver;
		int PORT = 57130;
		void checkOscMessages();
		void parseOscMessage(string origin, string action, string arguments);
};
