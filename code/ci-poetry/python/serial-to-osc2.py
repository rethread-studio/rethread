# Import needed modules from osc4py3
from osc4py3.as_eventloop import *
from osc4py3 import oscbuildparse

# Import Adafruit MPR121 stuff
import board
import busio
import time
# Import MPR121 module.
import adafruit_mpr121

# Start the system.
osc_startup()

# Make client channels to send packets.
osc_udp_client("127.0.0.1", 7771, "supercollider")

# Create I2C bus.
i2c = busio.I2C(board.SCL, board.SDA)

# Create MPR121 object.
mpr121 = adafruit_mpr121.MPR121(i2c)

# set the thresholds
for i in range(12):
    print(mpr121[i].threshold)
    mpr121[i].threshold = 3
    mpr121[i].release_threshold = 5
    print(mpr121[i].threshold)


# Loop forever testing each input and printing when they're touched.
while True:
    # Send the sensor data to SuperCollider
    msg = oscbuildparse.OSCMessage("/touched2", None, [mpr121.touched()])
    osc_send(msg, "supercollider")
    osc_process()
    time.sleep(0.05)  # Small delay to keep from spamming output messages.


# Properly close the system.
osc_terminate()
