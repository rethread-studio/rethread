#include "ofApp.h"
#include "constants.h"

//--------------------------------------------------------------
void ofApp::setup(){

    // OSC setup
    receiver.setup(PORT);

    // No need to set anything up with the laser manager, it's all done automatically
    // Change canvas size
    laser.setCanvasSize(width, height);

    // Set up triangle positions
    triangle_positions[0] = glm::vec2(width * 0.3 - halfw, height * 0.85 - halfh); // visualisation
    triangle_positions[1] = glm::vec2(width * 0.5 - halfw, height * 0.15 - halfh); // server
    triangle_positions[2] = glm::vec2(width * 0.7 - halfw, height * 0.85 - halfh); // user

    for(int i = 0; i < 3; i++) {
        event_line_columns.push_back(EventLineColumn(glm::vec2(i*(width/3) - halfw, -halfh), width/3, height));
    }

    user_grid = UserGrid(width, height);
    overview = Overview(triangle_positions);
    text_flow = TextFlow(width, height);
    transition.type = TransitionType::NONE; // disable the transition at startup
    ftrace_rising_vis = FtraceVis(true);

    auto text_options = LaserTextOptions();
    text_options.size = 80.0;
    text_options.color = ofColor::red;

    laser_texts.push_back(LaserText("ABCDEFGHIJKLMNOPQ", text_options, 5, glm::vec2(width * 0.05 - halfw, height * 0.5 - halfh)));
    laser_texts.push_back(LaserText("RSTUVXY0123456789", text_options, 5, glm::vec2(width * 0.05 - halfw, height * 0.2 - halfh)));
    // laser_texts.push_back(LaserText("MOVE OPEN FILE", text_options, 4, glm::vec2(width * 0.2 - halfw, height * 0.2 - halfh + (text_options.size * 2))));

    laser.update();

    // Connect to etherdream dac
    cout << "Update dacs" << endl;
    laser.dacAssigner.updateDacList();
    {
    const vector<ofxLaser::DacData>& dacList = laser.dacAssigner.getDacList();
    for(const ofxLaser::DacData& dacdata : dacList) {

        // get the dac label (usually type + unique ID)
        string itemlabel = dacdata.label;
        cout << "DAC: " << itemlabel << endl;
        if(itemlabel == "Etherdream 66E6349EFA66") {
            laser.dacAssigner.assignToLaser(dacdata.label, laser.getLaser(0));
        }
    }
    }
    // Arm lasers and increase brightness
    laser.armAllLasers();
    laser.globalBrightness.set(1.0);

    // for(auto& l : laser.lasers) {
    //     l->intensity.set(0.5);
    // }
}

//--------------------------------------------------------------
void ofApp::update(){
    // Get the specific ofxLaser object that we are using
    ofxLaser::Laser& specific_laser = laser.getLaser(0);
    if(!specific_laser.hasDac()) {
        dac_connected_last_frame = false;
        cout << "No DAC assigned, looking for new DACs" << endl;
        laser.dacAssigner.updateDacList(); // Eventually this connects to the Etherdream. How to test when it has?
    } else if(!dac_connected_last_frame) {
        dac_connected_last_frame = true;
        laser.armAllLasers();
    }
    static float last_time = 0;
    if(last_time == 0) {
        last_time = ofGetElapsedTimef();
    }
    float now = ofGetElapsedTimef();
    float dt = now - last_time;
    last_time = now;

    // Checking for OSC messages should be done even if paused to discard messages and avoid a large peak
    checkOscMessages();

    if(!is_paused) {
        if(automatic_transitions && !(transition_at_new_question || transition_at_answer) && !idle_mode_on) {
            next_transition_countdown -= dt;
            if(next_transition_countdown <= 0.0) {
                activateTransitionToNext();
                next_transition_countdown = time_per_vis;
            }
        }
        transition.update(dt);

        // For some visualisations, transition to self automatically
        if(!transition.active() && transition_chain.size() == 0 &&
           (vis_mode == VisMode::FTRACE )) {
            transitionToFrom(vis_mode, vis_mode);
        }


        overview.update();

        scan_x += 10;
        if(scan_x > halfw) {
            scan_x = -halfw;
        }

        noise_counter += 0.001;
        rot_x = ofNoise(noise_counter, ofGetElapsedTimef() * 0.01) * 2.0 - 1.0;
        rot_y = ofNoise(noise_counter, ofGetElapsedTimef() * 0.01 + 2534.0) * 2.0 - 1.0;

        for(auto& ap : activity_points) {
            ap.update();
        }
        // remove expired activity points
        for(int i = activity_points.size()-1; i >= 0; i--) {
            if(activity_points[i].frames_to_live <= 0) {
                activity_points.erase(activity_points.begin() + i);
            }
        }

        for(size_t i = 0; i < 3; i++) {
            if(i == TriangleVIS) {
                triangle_activity[i] *= 0.8;
            } else {
                triangle_activity[i] *= 0.95;
            }
            if(triangle_activity[i] > 1.0) {
                triangle_activity[i] = 1.0;
            }
        }

        for(auto& lt : laser_texts) {
            lt.update();
        }
        text_flow.update(width);
        ftrace_vis.update(dt);
        ftrace_rising_vis.update(dt);
        user_grid.update(dt);

        auto pt = player_trails.find(current_player_trail_id);
        if(pt != player_trails.end()) {
            if(pt->second.finished_cycle) {
                pickRandomPlayerTrail();
            }
        } else {
            pickRandomPlayerTrail();
        }
        //Update event line columns
        for(auto& elc : event_line_columns) {
            elc.update();
        }
        web_server_vis.update();
    }
    // prepares laser manager to receive new graphics
    laser.update();
}

//--------------------------------------------------------------
void ofApp::draw(){

    ofPushMatrix();
    ofTranslate(halfw, halfh, 0.0);
    // ofRotateRad(rot_x * 0.5, 0.0, 1.0, 0.0);
    // ofRotateRad(rot_y * 0.5, 1.0, 0.0, 0.0);
    // Draw using
    // laser.drawLine()
    // laser.drawDot()
    // laser.drawCircle()
    // laser.drawPoly()
    //
    // Translating the coordinate system also works

    if(transition.active()) {
        if((transition.from_vis != VisMode::ZOOMED_OUT || transition.phase < 0.65)
           && (transition.to_vis != VisMode::ZOOMED_OUT || transition.phase < 0.45)
        ) {
            ofPushMatrix();
            transition.applyTransitionFrom();
            drawVisualisation(transition.from_vis, 1.0);
            ofPopMatrix();
        }
        if(transition.from_vis != VisMode::ZOOMED_OUT || transition.phase > 0.25) {
            ofPushMatrix();
            transition.applyTransitionTo();
            drawVisualisation(transition.to_vis, 1.0);
            ofPopMatrix();
        }
    } else {
        if(transition_chain.size() > 0) {
            // pick the next transition from the chain
            transition = transition_chain[0];
            vis_mode = transition.to_vis;
            transition_chain.erase(transition_chain.begin());
            // draw
            ofPushMatrix();
            transition.applyTransitionFrom();
            drawVisualisation(transition.from_vis, 1.0);
            ofPopMatrix();
            ofPushMatrix();
            transition.applyTransitionTo();
            drawVisualisation(transition.to_vis, 1.0);
            ofPopMatrix();
        } else {
            drawVisualisation(vis_mode, 1.0);
        }
    }

    ofPopMatrix();
    // sends points to the DAC
    laser.send();
    // draw the laser UI elements
    laser.drawUI();
}


void ofApp::addRandomActivityPoint() {

    size_t tri = ofRandom(0, 2.99);
    float offset_angle = ofRandom(0, TWO_PI);
    float offset = ofRandom(0, width*0.07);
    glm::vec2 position = triangle_positions[tri] - glm::vec2(cos(offset_angle) * offset, sin(offset_angle) * offset);
    // Velocity out from center point
    float vel_angle = offset_angle + PI;
    float vel_amp = ofRandom(0.5, 4.0);
    glm::vec2 vel = glm::vec2(cos(vel_angle) * vel_amp, sin(vel_angle) * vel_amp);
    auto ap = ActivityPoint(position, vel, ofColor::green);
    // Velocity towards neighbouring point
    glm::vec2 destination = glm::vec2(0, 0);
    switch(tri) {
        case 0:
            destination = triangle_positions[1];
            break;
        case 1:
            if(ofRandom(0, 1) > 0.5) {
                destination = triangle_positions[0];
            } else {
                destination = triangle_positions[2];
            }
            break;
        case 2:
            destination = triangle_positions[1];
            break;
    }
    ap.launch_towards(destination, vel_amp);
    ap.grow(ofRandom(0.0, 0.5));
    activity_points.push_back(ap);
}

void ofApp::addActivityPoint(int source) {
    if(source >= 3) {
        return;
    }
    if(source != TriangleVIS) {
    float offset_angle = ofRandom(0, TWO_PI);
    float offset = ofRandom(0, width*0.07);
    glm::vec2 position = triangle_positions[source] - glm::vec2(cos(offset_angle) * offset, sin(offset_angle) * offset);
    auto ap = ActivityPoint(position, glm::vec2(0, 0), ofColor::green);
    glm::vec2 destination = glm::vec2(0, 0);
    switch(source) {
        case 0:
            destination = triangle_positions[1];
            break;
        case 1:
            if(ofRandom(0, 1) > 0.5) {
                destination = triangle_positions[0];
            } else {
                destination = triangle_positions[2];
            }
            break;
        case 2:
            destination = triangle_positions[1];
            break;
    }
    float vel_amp = ofRandom(0.5, 4.0);
    ap.launch_towards(destination, vel_amp);
    ap.grow(ofRandom(0.0, 0.5));
    activity_points.push_back(ap);
    while(activity_points.size() > max_num_activity_points) {
        activity_points.erase(activity_points.begin());
    }
    }
    float activity_level_increase = 0.1;
    if(source == TriangleVIS) {
        activity_level_increase = 0.00006;
    }
    triangle_activity[source] += activity_level_increase;
}

void ofApp::pickRandomPlayerTrail() {
    vector<string> keys;
    for(auto it = player_trails.begin(); it != player_trails.end(); ++it) {
        keys.push_back(it->first);
    }
    if(keys.size() > 0) {
        current_player_trail_id = keys[rand() % keys.size()];
        auto pt = player_trails.find(current_player_trail_id);
        if(pt != player_trails.end()) {
            pt->second.reset_cycle();
        }

    }
}

void ofApp::activateTransitionToNext() {

    VisMode next_vis;
    if(use_fixed_order_transitions) {
        next_vis = vis_mode_order[vis_mode_order_index];
        vis_mode_order_index = (vis_mode_order_index + 1) % vis_mode_order.size();
    } else {
        do {
            int next_vis_num = int(ofRandom(0, static_cast<int>(VisMode::LAST)));
            next_vis = static_cast<VisMode>(next_vis_num);
        } while(next_vis == vis_mode);
    }
    transitionToFrom(vis_mode, next_vis);
}


void ofApp::checkOscMessages() {
    // check for waiting messages
	while( receiver.hasWaitingMessages() )
	{
		// get the next message
		ofxOscMessage m;
		receiver.getNextMessage( &m );

        // cout << "message: " << m << endl;

        // Only parse the message if we are not paused
		if(!is_paused) {
            // check for mouse moved message
            if (m.getAddress() == "/cyberglow"  )
            {
                string origin = m.getArgAsString(0);
                string action = m.getArgAsString(1);
                string arguments = m.getArgAsString(2);
                // cout << "OSC mess: " << origin << ", " << action << ", " << arguments << endl;
                parseOscMessage(origin, action, arguments);
            }
            else if(m.getAddress() == "/ftrace") {
                ftrace_vis.register_event(m.getArgAsString(0));
                ftrace_rising_vis.register_event(m.getArgAsString(0));
                // cout << "ftrace: " << m.getArgAsString(0) << endl;
                addActivityPoint(TriangleVIS);
            }

            else if(m.getAddress() == "/idle") {
                // cout << "/idle: " << m.getArgAsString(0) << endl;
                auto arg = m.getArgAsString(0);
                if(arg == "on") {
                    idle_mode_on = true;
                    transition_chain.clear();
                    transitionToFrom(vis_mode, idle_vis_mode);
                } else {
                    // off
                    idle_mode_on = false;
                    transitionToFrom(idle_vis_mode, VisMode::ZOOMED_OUT);
                }
            }
            else
            {
                // cout << "Received unknown message to " << m.getAddress() << endl;
                // unrecognized message

            }
        }
    }
}

void ofApp::parseOscMessage(string origin, string action, string arguments) {
    std::string delimiter = ";";
    if(origin == "node") {
        web_server_vis.register_node(action);

        if(action == "async after Timeout") {
            addActivityPoint(TriangleSERVER);

        } else if(action == "async after FSREQCALLBACK") {
            addActivityPoint(TriangleSERVER);

        } else if(action == "async after TCPWRAP") {
            addActivityPoint(TriangleSERVER);

        }
    } else if(origin == "gameEngine") {
        if(action == "stateChanged") {
            addActivityPoint(TriangleSERVER);

        } else if(action == "newQuestion") {
            string question = arguments;
            if(automatic_transitions && transition_at_new_question && !idle_mode_on ) {
                activateTransitionToNext();
            }
            answer_for_current_question_received = false;
        }

    } else if(origin == "user") {

        string text = action; // + " " + arguments;
        if(action != "userAnswer") {
            text_flow.add_text(text, laser, width, height);
        }
        if(action == "userAnswer") {
            if(automatic_transitions && transition_at_answer && !answer_for_current_question_received) {
                activateTransitionToNext();
            }
            answer_for_current_question_received = true;
        }
        user_grid.register_event(action, arguments);
        addActivityPoint(TriangleUSER);
        if(action == "move") {
            // id, x, y, width_cells, height_cells
            arguments += ';';
            string user_id = "";
            int x = 0, y = 0;
            int w = 1, h = 1;

            size_t pos = 0;
            std::string token;
            int token_num = 0;
            while ((pos = arguments.find(delimiter)) != std::string::npos) {
                token = arguments.substr(0, pos);
                switch(token_num) {
                    case 0:
                        user_id = token;
                        break;
                    case 1:
                        x = stoi(token);
                        break;
                    case 2:
                        y = stoi(token);
                        break;
                    case 3:
                        w = stoi(token);
                        break;
                    case 4:
                        h = stoi(token);
                        break;
                }
                token_num++;
                arguments.erase(0, pos + delimiter.length());
            }
            if(token_num >= 3) {
                float grid_x, grid_y;
                if(token_num == 3) { // message without w/h
                    grid_x = width/45;
                    grid_y =  height/25;
                } else if(token_num == 5) { // message with w/h
                    grid_x = float(width)/float(w + 2);
                    grid_y = float(height)/float(h + 2);
                }
                auto it = player_trails.find(user_id);
                // The + grid_x at the end is for margins
                float calc_x = (x * grid_x) - halfw + grid_x;
                float calc_y = (y * grid_y) - halfh + grid_y;
                if(it == player_trails.end()) {
                    auto pt = PlayerTrail();
                    pt.move_to_point(calc_x, calc_y);
                    player_trails.insert(make_pair<string, PlayerTrail>(move(user_id), move(pt)));
                } else {
                    it->second.move_to_point(calc_x, calc_y);
                }
            }

        } else if(action == "enterAnswer") {
            // user moves inside the answer zone

        } else if(action == "userAnswer") {
            // the time has ended and the user has answered

        } else if(action == "new") {
            string user_id = arguments;
            player_trails.insert(make_pair<string, PlayerTrail>(move(user_id), PlayerTrail()));
        }
    } else if(origin == "server") {
        web_server_vis.register_server(action);
        addActivityPoint(TriangleSERVER);
        if(action == "file") {

        }
    } else if(origin == "mongodb") {
        web_server_vis.register_mongodb(action);
    }
}


void ofApp::drawVisualisation(VisMode vis, float scale) {

    switch(vis) {
        case VisMode::WEBSERVER:
            {
                web_server_vis.draw(laser, width, height);
            }
            break;
        case VisMode::TEXT_DEMO:
        {
            // auto text_options = LaserTextOptions();
            // text_options.size = 80.0;
            // text_options.color = ofColor::red;
            // draw_laser_text(laser, "AXY0123456789", text_options, glm::vec2(width * 0.4 - halfw, height * 0.5 - halfh));
            // draw_laser_text(laser, "57131", text_options, glm::vec2(width * 0.2 - halfw, height * 0.2 - halfh));
            // draw_laser_text(laser, "MOVE OPEN FILE", text_options, glm::vec2(width * 0.2 - halfw, height * 0.2 - halfh + (text_options.size * 2)));

            // for(auto& lt : laser_texts) {
            //     lt.draw(laser);
            // }
            text_flow.draw(laser);
        }
            break;
        case VisMode::USER:
        {
            auto pt = player_trails.find(current_player_trail_id);
            if(pt != player_trails.end()) {
                pt->second.draw(laser, scale);
            }
            break;
        }
        case VisMode::USER_GRID:
        {
            user_grid.draw(laser);
            break;
        }
        case VisMode::FTRACE:
        {
            ftrace_vis.draw(laser, width, height);
            break;
        }
        case VisMode::FTRACE_RISING:
        {
            ftrace_rising_vis.draw(laser, width, height);
            break;
        }
        case VisMode::ZOOMED_OUT:
        {
            // draw triangle positions
            float intensity = 0.2;
            for(size_t i = 0; i < 3; i++) {
                laser.drawDot(triangle_positions[i].x * scale, triangle_positions[i].y * scale, ofColor::blue, intensity, OFXLASER_PROFILE_FAST);
                float radius = powf(triangle_activity[i], 0.5) * height * 0.08 + 10;
                if(transition.active()) {
                    radius = 15.0;
                }
                laser.drawCircle(triangle_positions[i].x , triangle_positions[i].y, radius, ofColor::blue, OFXLASER_PROFILE_FAST);
            }
            // for(auto& elc : event_line_columns) {
            //     elc.draw(laser, scan_x, scan_width);
            // }
            // overview.draw_symbols(laser);
            if(!transition.active()) {
                overview.draw_text(laser);
                // draw point activity
                for(auto& ap : activity_points) {
                    ap.draw(laser, scale);
                }
            }
            break;
        }
    }
}


//--------------------------------------------------------------
void ofApp::keyPressed(int key){
    switch(key) {
        case OF_KEY_RIGHT:
        {
            auto from = vis_mode;
            vis_mode = static_cast<VisMode>((static_cast<int>(vis_mode)+1)%static_cast<int>(VisMode::LAST));
            auto to = vis_mode;
            transitionToFrom(from, to);

            break;
        }
        case OF_KEY_LEFT:
            if(static_cast<int>(vis_mode) != 0) {
                auto from = vis_mode;
                vis_mode = static_cast<VisMode>(static_cast<int>(vis_mode)-1);
                auto to = vis_mode;
                transitionToFrom(from, to);
            }
            break;
        case 'c':
        {
            if(vis_mode == VisMode::WEBSERVER) {
                web_server_vis.change_mode();
            }
            break;
            }
        case ' ':
        {
            is_paused = !is_paused;
            break;
        }
        case '1':
        {
                auto from = vis_mode;
                vis_mode = static_cast<VisMode>(0);
                auto to = vis_mode;
                transitionToFrom(from, to);
                break;
        }
        case '2':
        {
                auto from = vis_mode;
                vis_mode = static_cast<VisMode>(1);
                auto to = vis_mode;
                transitionToFrom(from, to);
                break;
        }
        case '3':
        {
                auto from = vis_mode;
                vis_mode = static_cast<VisMode>(2);
                auto to = vis_mode;
                transitionToFrom(from, to);
                break;
        }
        case '4':
        {
                auto from = vis_mode;
                vis_mode = static_cast<VisMode>(3);
                auto to = vis_mode;
                transitionToFrom(from, to);
                break;
        }
        case '5':
        {
                auto from = vis_mode;
                vis_mode = static_cast<VisMode>(4);
                auto to = vis_mode;
                transitionToFrom(from, to);
                break;
        }
        case '6':
        {
                auto from = vis_mode;
                vis_mode = static_cast<VisMode>(5);
                auto to = vis_mode;
                transitionToFrom(from, to);
                break;
        }
        case '7':
        {
                auto from = vis_mode;
                vis_mode = static_cast<VisMode>(6);
                auto to = vis_mode;
                transitionToFrom(from, to);
                break;
        }
    }
}

//--------------------------------------------------------------
void ofApp::keyReleased(int key){

}

//--------------------------------------------------------------
void ofApp::mouseMoved(int x, int y ){

    // scan_x = (float(x)/float(ofGetWidth())) * float(width) - halfw;
    mouse_rel_x = (float(x)/float(ofGetWidth())) * 2.0 - 1.0;
    mouse_rel_y = (float(y)/float(ofGetHeight())) * 2.0 - 1.0;
}

//--------------------------------------------------------------
void ofApp::mouseDragged(int x, int y, int button){

    // addRandomActivityPoint();
}

//--------------------------------------------------------------
void ofApp::mousePressed(int x, int y, int button){

}

//--------------------------------------------------------------
void ofApp::mouseReleased(int x, int y, int button){

}

//--------------------------------------------------------------
void ofApp::mouseEntered(int x, int y){

}

//--------------------------------------------------------------
void ofApp::mouseExited(int x, int y){

}

//--------------------------------------------------------------
void ofApp::windowResized(int w, int h){

}

//--------------------------------------------------------------
void ofApp::gotMessage(ofMessage msg){

}

//--------------------------------------------------------------
void ofApp::dragEvent(ofDragInfo dragInfo){ 

}

int visModeCategory(VisMode vis) {
	if(vis == VisMode::WEBSERVER) {
		return TriangleSERVER;
	} else if(vis == VisMode::USER
			  || vis == VisMode::USER_GRID
			  || vis == VisMode::TEXT_DEMO) {
		return TriangleUSER;
	} else if(vis == VisMode::FTRACE || vis == VisMode::FTRACE_RISING) {
		return TriangleVIS;
	} else if(vis == VisMode::ZOOMED_OUT) {
		return 3;
	}
	return -1;
}

bool vismodesAreInTheSamePlace(VisMode vis1, VisMode vis2) {
	return visModeCategory(vis1) == visModeCategory(vis2);
}

void ofApp::transitionToFrom(VisMode from, VisMode to) {
    vis_mode = to; // the vis_mode should now be the new target mode
    // Update the mode we're transitioning to
    switch(to) {
        case VisMode::WEBSERVER:
        {
            web_server_vis.change_mode(); // randomly change to a different mode
            break;
        }
    }
    if(to == VisMode::ZOOMED_OUT || from == VisMode::ZOOMED_OUT || vismodesAreInTheSamePlace(from, to)) {
        Transition t = getTransitionToFrom(from, to);
        transition = t;
    } else {
        Transition t = getTransitionToFrom(from, VisMode::ZOOMED_OUT);
        transition = t;
        transition_chain.push_back(getTransitionToFrom(VisMode::ZOOMED_OUT, to));
    }
}

Transition ofApp::getTransitionToFrom(VisMode from, VisMode to) {
    Transition t = Transition();
    if (from == VisMode::ZOOMED_OUT) {
        t.type = TransitionType::ZOOM_IN;
        switch(to) {
            case VisMode::WEBSERVER:
            {
                t.zoom_target = triangle_positions[TriangleSERVER];
                break;
            }
            case VisMode::USER:
            {
                t.zoom_target = triangle_positions[TriangleUSER];
                break;
            }
            case VisMode::USER_GRID:
            {
                t.zoom_target = triangle_positions[TriangleUSER];
                break;
            }
            case VisMode::TEXT_DEMO:
            {
                t.zoom_target = triangle_positions[TriangleUSER];
                break;
            }
            case VisMode::FTRACE:
            {
                t.zoom_target = triangle_positions[TriangleVIS];
                break;
            }
            case VisMode::FTRACE_RISING:
            {
                t.zoom_target = triangle_positions[TriangleVIS];
                break;
            }
        }
    }
    if (to == VisMode::ZOOMED_OUT) {
        t.type = TransitionType::ZOOM_OUT;
        switch(from) {
            case VisMode::WEBSERVER:
            {
                t.zoom_target = triangle_positions[TriangleSERVER];
                break;
            }
            case VisMode::USER:
            {
                t.zoom_target = triangle_positions[TriangleUSER];
                break;
            }
            case VisMode::USER_GRID:
            {
                t.zoom_target = triangle_positions[TriangleUSER];
                break;
            }
            case VisMode::TEXT_DEMO:
            {
                t.zoom_target = triangle_positions[TriangleUSER];
                break;
            }
            case VisMode::FTRACE:
            {
                t.zoom_target = triangle_positions[TriangleVIS];
                break;
            }
        }
    }
    t.from_vis = from;
    t.to_vis = to;
    return t;
}
