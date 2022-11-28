#!/usr/bin/env sh

session="unfold-session"
tmux new-session -d -s $session

window=0
tmux rename-window -t $session:$window 'git'
tmux send-keys -t $session:$window "cd artnet_controller && node index.js" C-m
tmux split-window -t $session:$window -v
tmux send-keys -t $session:$window "cd data_exploration/led_matrix_simulator && cargo run --release -- --trace ~/Hämtningar/nwl2022/data-jedit-with-marker.postcard --osc --headless
" C-m
tmux split-window -t $session:$window -v
tmux send-keys -t $session:$window "cd supercollider && sclang main.scd" C-m

tmux attach-session -t $session
