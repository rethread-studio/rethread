#!/usr/bin/env sh

tmux send-keys "cd artnet_controller && node index.js" C-m
tmux split-window -v -p 20
tmux send-keys "cd data_exploration/led_matrix_simulator && cargo run --release -- --trace ~/Hämtningar/nwl2022/data-jedit-with-marker.postcard --osc --headless
" C-m
tmux split-window -v -p 50
tmux send-keys "cd supercollider && sclang main.scd" C-m
