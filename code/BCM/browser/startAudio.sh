#!/bin/bash

trap "kill 0" SIGINT

JACK_LOG="$HOME/jack.log";
SC_LOG="$HOME/sclang.log";

# Reset log
echo '' > $JACK_LOG;
echo '' > $SC_LOG;

while :; do 
  echo "Start jackd" >> $JACK_LOG;
  killall jackd;
  killall sclang;
  /usr/bin/jackd -R -P95 -dalsa -dhw:US20x20 -p512 -n3 -s -r48000 >> $JACK_LOG 2>&1;
done &
while :; do 
  echo "Start SC" >> $SC_LOG;
  killall jackd;
  killall scsynth;  
  sleep 5;
  cd /home/thomas/git/rethread/code/BCM/supercollider_src/tekniska/;
  sclang -r -D main_auto.scd >> $SC_LOG 2>&1;
done &