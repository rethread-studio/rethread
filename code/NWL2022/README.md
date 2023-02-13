Parent folder for the Nobel Week Lights 2022 project

# Usage

To run the installation, run the `startup_script.sh` script. This script currently uses absolute paths that need to be adapted to the computer you are running on.

The startup script uses tmux to start everything in the background, but give you the possibility of seeing all the terminal output later for debugging by attaching to the session:

```sh
tmux attach-session -t unfold-session
```

## Manual start and experimentation

### unfold_control

Formerly "led_matrix_simulator". Reads a trace, optionally draws the LED animation, and sends OSC data for the SuperCollider sonification and to the artnet_controller Node.js program which sends controls the animation of the LEDs. The colours of the LEDs are decided by unfold_control, artnet_controller just passes on the data to the LEDs.

### artnet_controller

Receives LED colour data from unfold_control and sends it on to the LED controllers. The IP addresses of the LED controllers are hardcoded in index.js and need to match the IP addresses manually configured on the hardware controllers.

### artnet_shutdown

Sometimes, the artnet_controller program fails to shut the LEDs off at exit. Therefore, we run this program after shutting everything else off to make sure the LEDs are turned off. The only thing it does is to set all LEDs to black.

### SuperCollider sonification

Lives in `NWL2022/supercollider/`. Running main.scd will load everything and start listening for OSC messages from unfold_control. It is advisable to run JACK before running sclang because starting JACK takes a few seconds. Starting JACK manually also gives more control over starting parameters.

```sh
sclang path/to/rethread_repo/code/NWL2022/main.scd
```

### Projections

The projection graphics are p5.js programs/sketches to be viewed in a browser. They assume they have access to files in the rethread repo file structure so a local webserver needs to be started in the root of the rethread repository.

The projections we used can then be found at URLs `RETHREAD_REPO/code/NWL2022/window_projections/`
