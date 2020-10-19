#!/bin/bash

export DISPLAY=:0.0

echo "Update Pellow";
cd $HOME/git/rethread/;
git pull;

echo "Start Pellow Server";
cd code/BCM/browser;
docker-compose build;
docker-compose up -d;

echo "Start Pellow Audio";
./startAudio.sh;

echo "Start Pellow Visualization";
sleep 4;
chromium-browser --ignore-gpu-blacklist --enable-gpu-rasterization --enable-native-gpu-memory-buffers --password-store=basic --kiosk http://localhost:8873;