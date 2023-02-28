#!/usr/bin/env sh

# This script must run as the user, not as root
#
echo "Browser startup script for $USER"

export DISPLAY=:0
export DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/$(id -u)/bus
export XDG_RUNTIME_DIR=/run/user/$(id -u)
PRIMARY=DP-2
PROJECTION_1=HDMI-0
PROJECTION_2=DP-2

sleep 1
xrandr --output $PROJECTION_1 --mode 1920x1080 --right-of $PRIMARY
echo "Outputs set up via xrandr"
sleep 1
i3-msg workspace 6
i3-msg move workspace to output $PROJECTION_1
chromium --new-window --start-fullscreen rethread.art &
sleep 3 # Sleep so that the browser window has time to start
i3-msg move container to workspace number 6
sleep 1
i3-msg workspace 7
i3-msg move workspace to output $PROJECTION_2
chromium --new-window --start-fullscreen record.rethread.art &
sleep 3 # Sleep so that the browser window has time to start
i3-msg move container to workspace number 7
# Move back so that the mouse is not on any of the display screens
i3-msg workspace 1
echo "Done!\n"
