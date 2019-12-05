# Generative poetry based on CI

The interactive installation ci-poetry simulates the concept of collaborative coding or continuous integration (CI) through generative poetry creation. The installation has been designed for the specific context of R1, the first experimental nuclear reactor in Sweden, now dismantled and used as a cultural venue. In the installation, a collective poem is composed and sonified by 12 “poets” who each contribute with a line of their own source poem.

## Sensors
Using Raspberry Pi 4: [Adafruit_MPR121](https://circuitpython.readthedocs.io/projects/mpr121/en/latest/index.html)

(old) Tests using Arduino: Requires libraries [Adafruit_MPR121](https://github.com/adafruit/Adafruit_MPR121) and [CapacitiveSensor](https://playground.arduino.cc/Main/CapacitiveSensor/)

Run `pip3 install -r requirements.txt` in the `python` folder and then run `python3 serial-to-osc.py` to send th sensor data to SuperCollider via OSC.

## Visualization
Uses Processing, requires library [oscP5](http://www.sojamo.de/libraries/oscP5/)


## Sonification and editing of poem

This is done through a SuperCollider program. The sonification implementation is in `sonification.scd` which is loaded and run by `main.scd`. `main.scd` also includes the logic for having the virtual poets edit the master poem and transfer the results to Processing via OSC.

For the TTS part of the sonification, the [Festival Speech Synthesis System](http://www.cstr.ed.ac.uk/projects/festival/) needs to be installed as well as the [festvox CMU ARCTIC voices](http://www.festvox.org/cmu_arctic/).