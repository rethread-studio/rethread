//! Extract the binary instructions from the trace data, with some options.
//! - All assembly data as bytes as if machine code/executable
//! - Only the instruction
//!
use color_eyre::{eyre::Context, Result};
use hex::FromHex;

pub fn machine_code(trace: &str) -> Result<Vec<u8>> {
    let mut buf = vec![];
    let lines = trace.lines();
    for line in lines.into_iter().filter(|l| &l[0..3] == "[I]") {
        // Find the bytes
        let mut byte_str = &line[74..];
        if byte_str.chars().nth(0) == Some(']') {
            byte_str = &byte_str[1..];
        }
        for b in byte_str.split_ascii_whitespace() {
            let byte = hex::decode(b).wrap_err_with(|| format!("byte: {b}, line: {line}"))?;
            buf.push(byte[0]);
        }
    }

    Ok(buf)
}
