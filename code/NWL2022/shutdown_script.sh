#!/usr/bin/env bash

tmux kill-session -t unfold-session
pkill -9 node
pkill -9 sclang
pkill -9 scsynth
