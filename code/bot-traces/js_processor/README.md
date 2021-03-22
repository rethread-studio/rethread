# JS processor

This program processes collected JavaScript by auto formatting/deobfuscating and concatenating multiple script files in a directory.

## Install

``` shell
sudo npm -g install js-beautify
```

## Usage

Point the system folder dialog to the root of the trace data. It will collect and format all js, write it to `full_source.js` and write the indentation data as csv to `indent_profile.csv`.
