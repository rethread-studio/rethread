#!/usr/bin/env bash
set -euo pipefail

# This script should be run in the parent of the renders folder
this_dir = "$(pwd)"
conv_dir = $this_dir/renders_small
echo "Rendering new files to $conv_dir"
read -p "Press Enter to continue" </dev/tty
mkdir -p $conv_dir
cd renders
for SITE in */; do
    for VIS in */; do
        for PHOTO in $SITE/*.png
        do
            BASE=`basename $PHOTO`
            echo "$PHOTO to $conv_dir/$BASE.jpg"
            #convert "$PHOTO[800x>]" "$conv_dir/$BASE.jpg"
        done
    done
done
