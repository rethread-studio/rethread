
## Installation

Prerequisites:
- node.js
- npm

Node and npm can be installed from https://nodejs.org/en/

Install all of the dependencies by navigating to the folder containing this file and run
```
npm install
```

## Running the program

It is best to run this program with `pm2` so that it is automatically restarted when needed

To install pm2, run the following (you may need super user privileges i.e. sudo):
```
npm install pm2 -g
```

To run the program using pm2, run
```
pm2 start index.js
```

To stop pm2 from running the program, run
```
pm2 delete index.js
```

## Listening to the OSC messages

By default, the osc messages will be sent to localhost i.e. 127.0.0.1 port 57120. To use a different port, start the program with the following command
```
pm2 start index.js -- -p 57130
```
and substitute 57130 for the port you want to use.

In MAX you should be able to use the [`udpreceive`](https://docs.cycling74.com/max5/refpages/max-ref/udpreceive.html) object to receive the votes as strings ("room", "both", "tutorials"). The votes are sent to the OSC address "/vote".

In SuperCollider, the following line can be used to receive and print the votes:
```
o = OSCFunc({ arg msg, time, addr, recvPort; [msg, time, addr, recvPort].postln; }, '/vote');
```
