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

# Note you can optionally change the address of the device:
#mpr121 = adafruit_mpr121.MPR121(i2c, address=0x91)

# Loop forever testing each input and printing when they're touched.
while True:
    # Loop through all 12 inputs (0-11).
    for i in range(12):
        # Send the sensor data to SuperCollider
        msg = oscbuildparse.OSCMessage("/touched", None, [i, mpr121.filtered_data(i), mpr121.baseline_data(i), mpr121[i].value])
        osc_send(msg, "supercollider")
        osc_process()
    time.sleep(0.01)  # Small delay to keep from spamming output messages.


# Properly close the system.
osc_terminate()
