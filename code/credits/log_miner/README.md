Reads data from pipe and output JSON.

# usage

1. Build the program using `cargo build --release`

2. Pipe the output of git log with a certain format to the log_miner program e.g.

```sh
git log --pretty=format:"%an;%ae" --all | ~/code/kth/rethread/code/credits/log_miner/target/release/log_miner
```

Currently, name comes first followed by an email address separated by a semicolon.
