# Visualise and sonify traces of web apps

## Convert image sequence to video file

``` shell
ffmpeg -r 8 -start_number 0 -i %04d.png -c:v libx264 -crf 20 -preset veryslow -s 1080x1051 ../bing_coverage_rings.mp4
```

