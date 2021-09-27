# BCM 2021

## Compositional implementations

Currently, the following aspects can be turned on or off on a per device basis:

- instant sonification (happens right when a packet is received)
- service whisper (once per tick)
- service tone (once per tick)
- packet size (once per tick)

## Spatialisation effect

The basic spatialisation consists of the data from each hotspot being placed close to that hotspot. In addition, some effects can be toggled on or off:

- spin around the circle at very high activity levels
- hover with a smooth random walk around the position
- elevation based on activity level for the device