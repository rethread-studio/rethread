#!/bin/bash

GITHUB_URL="git@github.com:processing/p5.js.git"
GIT_DIR="p5.js"
CURRENT_DIR=$(pwd)

echo "::::::::[°^°)clone repo(°^°]::::::::::"
git clone --quiet "$GITHUB_URL"

echo ":::[°^°)cd in repo directory(°^°]:::::"
cd "$CURRENT_DIR"/$GIT_DIR

echo "::::::::[°^°)npm install(°^°]:::::::::"
npm install

echo "::::::::::[°^°)npm list(°^°]::::::::::"
npm list -all -json > all-deps.json

echo ":::how many dependencies for p5.js?:::"
jq '.. |.resolved?' all-deps.json | sort -u | wc -l




