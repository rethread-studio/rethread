#!/usr/bin/env bash

tmux kill-session -t unfold-session
pkill -9 node
# pkill -9 sclang
# pkill -9 scsynth
sleep 2
node /home/reth/Documents/rethread/code/NWL2022/artnet_shutdown/index.js
