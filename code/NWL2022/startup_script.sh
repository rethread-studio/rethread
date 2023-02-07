#!/usr/bin/env sh

session="unfold-session"
tmux new-session -d -s $session

window=0
tmux rename-window -t $session:$window 'git'
tmux send-keys -t $session:$window "cd /home/reth/Documents/rethread/code/NWL2022/artnet_controller && node index.js" C-m
tmux split-window -t $session:$window -v
tmux send-keys -t $session:$window "cd /home/reth/Documents/rethread/code/NWL2022/rust/unfold_control && cargo run --release -- --trace /home/reth/Documents/unfold_traces/data-varna-startup-shutdown --osc --headless
" C-m
tmux split-window -t $session:$window -v
# tmux send-keys -t $session:$window "export XAUTHORITY=/home/reth/.Xauthority" C-m
tmux send-keys -t $session:$window "export DISPLAY=:1" C-m
tmux send-keys -t $session:$window "cd /home/reth/Documents/rethread/code/NWL2022/supercollider && sclang -D main.scd" C-m
tmux split-window -t $session:$window -v
tmux send-keys -t $session:$window "cd /home/reth/Documents/rethread/ && python3 -m http.server 8800" C-m

# tmux attach-session -t $session
