# Loam - Daisy Seed code

Voices are played by mixing between the 2 closest anchor. A third buffer is used for buffering the third closest anchor in case it becomes the second closest anchor.

## Switching buffers

Store all distances.
Buffer the 3 closest.
Mix between them.

When switching one out, send a message "New anchor on index N"
Maybe waiting for the next frame to buffer is enough.





