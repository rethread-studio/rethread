
# Using the pintool

Put the wasm executable in the `host_based/tracer/pintool` folder.

from the folder `host_based/tracer/pintool`, run
```
./pin/pin -t obj-intel64/tracer.so -o trace.txt -i 1 -m 1 -- ../../target/release/tracer ./matrix_inversion.wasm
```

## Troubleshooting

Try running `make all` in the pintool folder. If it fails, some paths may not be set. Make the following absolute paths:

PIN_ROOT = tawasco/host_based/tracer/pintool/pin
TOOLS_ROOT = tawasco/host_based/tracer/pintool/pin/source/tools


# [re|in]verse structure

Features:
- flowing