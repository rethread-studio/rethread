//! Extract the binary instructions from the trace data, with some options.
//! - All assembly data as bytes as if machine code/executable
//! - Only the instruction
//!
use color_eyre::{eyre::Context, Result};
use hex::FromHex;
use knyst::prelude::Buffer;

pub fn machine_code(trace: &str) -> Result<Vec<u8>> {
    let mut buf = vec![];
    let lines = trace.lines();
    for line in lines.into_iter().filter(|l| &l[0..3] == "[I]") {
        // Find the bytes
        let mut byte_str = &line[73..];
        while let Some(b) = byte_str.chars().nth(0) {
            if b != ' ' {
                byte_str = &byte_str[1..];
            } else {
                break;
            }
        }
        byte_str = &byte_str[1..];

        for b in byte_str.split_ascii_whitespace() {
            let byte = hex::decode(b).wrap_err_with(|| format!("byte: {b}, line: {line}"))?;
            buf.push(byte[0]);
        }
    }

    Ok(buf)
}

pub fn machine_code_instruction_only(trace: &str) -> Result<Vec<u8>> {
    let mut buf = vec![];
    let lines = trace.lines();
    for line in lines.into_iter().filter(|l| &l[0..3] == "[I]") {
        // Find the bytes
        let mut byte_str = &line[73..];
        while let Some(b) = byte_str.chars().nth(0) {
            if b != ' ' {
                byte_str = &byte_str[1..];
            } else {
                break;
            }
        }
        byte_str = &byte_str[1..];
        for b in byte_str.split_ascii_whitespace().take(1) {
            let byte = hex::decode(b).wrap_err_with(|| format!("byte: {b}, line: {line}"))?;
            buf.push(byte[0]);
        }
    }

    Ok(buf)
}

pub fn machine_code_to_buffer(trace: &str, instruction_only: bool) -> Result<Buffer> {
    let machine_code = if instruction_only {
        machine_code_instruction_only(trace)?
    } else {
        machine_code(trace)?
    };

    let buffer: Vec<_> = machine_code
        .chunks(2)
        .map(|byte| {
            if byte.len() == 2 {
                let v = byte[0] as i32 * byte[1] as i32;
                (v - (u16::MAX / 2) as i32) as f32 / (u16::MAX / 2) as f32
            } else {
                0.0
            }
        })
        .collect();

    let mut buffer = Buffer::from_vec(buffer, 48000.);
    // let mut buffer = Buffer::from_vec_interleaved(buffer, 1, 48000.);
    buffer.remove_dc();
    Ok(buffer)
}
