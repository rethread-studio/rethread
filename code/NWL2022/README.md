Parent folder for the Nobel Week Lights 2022 project

# Usage

To run the installation, run the `startup_script.sh` script. This script currently uses absolute paths that need to be adapted to the computer you are running on.

The startup script uses tmux to start everything in the background, but give you the possibility of seeing all the terminal output later for debugging by attaching to the session:

```sh
tmux attach-session -t unfold-session
```

## Starting automatically on boot

cron is not the ideal tool for this since it will start the script before the graphical environment which causes a race condition. Instead, use whatever method your desktop environment offers to start the script _after_ the graphical interface has started. For i3, this can be achieved by adding the following line to the i3 configuration, normall placed in `$HOME/.config/i3/config`

``` sh
exec_always $HOME/Documents/rethread/code/NWL2022/startup_script.sh
```

## Starting automatically at a specific time

To schedule the program to start at a specific time, edit the root crontab by running `sudo crontab -e` and add an running the script for the user "reth"

Example running 09:30:
``` sh
30 09 * * * su -l reth -c "sh /home/reth/Documents/rethread/code/NWL2022/startup_script.sh >> /home/reth/Documents/cron_test_log.txt"
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

## Autostarting

### Browser windows

For a scriptable window assignment we have chosen to go with the i3 window manager together with xrandr.

A new fullscreen chromium window can be opened using

``` sh
chromium --new-window --start-fullscreen rethread.art
```
i3 can be scripted using the `i3-msg` binary
``` sh
i3-msg move container to workspace number 6
```

Another option is to use the i3 config file to start everything.

#### Moving a workspace to a specific screen

The available monitor outputs are shown by running `xrandr --current`

Set up a newly connected screen by e.g.

``` sh
xrandr --output HDMI-0 --mode 1920x1080 --right-of DP-2
```
This usually moves some of the workspaces to the new screen. You can manually select which screen a workspace should be on in the config file. You can also move a workspace to an output.

``` sh
i3-msg workspace 6
i3-msg move workspace to output HDMI-0
```
 

