
## Compilation

This Rust project is configured for fast compilation speed using methods from the [Bevy guide](https://bevyengine.org/learn/book/getting-started/setup/)

That means that you need to be using a nightly Rust compiler and have lld installed in order to compile the project.

## Generation of commit JSON

Several approaches to rendering the commits and the stats for each commit have been tried. Most of them break at some point or another.

[Gitlogg](https://github.com/dreamyguy/gitlogg)

In the end, the one liners in the following repo worked, with some manual intervention to clean up the data:
https://github.com/context-driven-testing-toolkit/git-log2json
