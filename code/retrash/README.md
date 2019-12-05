# retrash
interactive installation for kids made from scrap electronics

## Sensors
Using Raspberry Pi 4: [Adafruit_MPR121](https://circuitpython.readthedocs.io/projects/mpr121/en/latest/index.html)

(old) Tests using Arduino: Requires libraries [Adafruit_MPR121](https://github.com/adafruit/Adafruit_MPR121) and [CapacitiveSensor](https://playground.arduino.cc/Main/CapacitiveSensor/)

## Getting data from the sensors

Run `pip3 install -r requirements.txt` in the `python` folder and then run `python3 serial-to-osc.py` to send th sensor data to SuperCollider via OSC.

## p5.js generative shapes
Demo only visuals by pressing keys (q w e r t y u i o p a s d and c to clear) here: [https://editor.p5js.org/nadiacw/full/t9UswxDz4](https://editor.p5js.org/nadiacw/full/t9UswxDz4)

To demo with the full installation:
Uses [osc in p5.js](https://github.com/genekogan/p5js-osc)
install libraries 
~~~
$ npm install
~~~
to start the visuals run 
~~~
$ node bridge.js
~~~
and open index.html on a browser to view locally.

You can also run the visuals on a different machine by putting the IP address of the machine running the visuals in the `~visosc` `NetAddr` object in `main.scd` and running the node bridge and opening index.html on that machine.



## SuperCollider sonification

Run the code in main.scd