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

Lives in `NWL2022/supercollider/`. Running main.scd will load everything and start listening for OSC messages from unfold_control. It is advisable to run JACK before running sclang because starting JACK takes a few seconds. Starting JACK manually also gives more control over starting parameters. The easiest way to start JACK is via the `qjackctl` program which has a graphical user interface. To automatically start JACK in a script, use the `jackd` binary. Suitable parameters depend on the hardware configuration and are beyond the scope of this README. See the startup script for an example.

To start the SuperCollider program:

```sh
sclang path/to/rethread_repo/code/NWL2022/main.scd
```

### Projections

The projection graphics are p5.js programs/sketches to be viewed in a browser. They assume they have access to files in the rethread repo file structure so a local webserver needs to be started in the root of the rethread repository.

The projections we used can then be found at URLs `RETHREAD_REPO/code/NWL2022/window_projections/`

# Software description

The software infrastructure of un|fold consists of several pieces of bespoke software running on tried and tested open technology.

At the core of the network of software is a control center ('unfold_control') which reads the trace data, analyses it using our own algorithms and emits signals for what function call(s) to sonify/visualise. This software is a Rust program making use of the Bevy game engine for an animation preview, the nannou_osc library for communicating with SuperCollider and tokio and tokio-tungstenite for an async WebSocket runtime.

The sound part of un|fold is generated in real time by a SuperCollider program. SuperCollider continually receives data from unfold_control and uses that data to start sounds and change parameters for oscillators and effects.

To communicate with the LED controllers via artnet we are using a JavaScript program running on Node.js to take advantage of the well tested Node.js artnet library.

The projected visualisations are created using web technology with p5.js and are run in a browser. The visualisations can sync with the playback via WebSocket.

Other software we depend on include the Linux kernel, the JACK audio server, tmux and cron.
