#[derive(Clone, Debug)]
pub struct InstructionInstance {
    pub bytes: [u8; 10],
    pub num_bytes: usize,
    pub num_ignored_instructions_until_next: usize,
}
impl Default for InstructionInstance {
    fn default() -> Self {
        Self {
            bytes: Default::default(),
            num_bytes: Default::default(),
            num_ignored_instructions_until_next: Default::default(),
        }
    }
}

#[derive(Clone, Debug)]
pub struct InstructionInstanceAbsolute {
    pub bytes: [u8; 10],
    pub num_bytes: usize,
    pub absolute_position_in_list: u64,
}
impl InstructionInstanceAbsolute {
    pub fn from_instruction_instance(ins: InstructionInstance, position: u64) -> Self {
        Self {
            bytes: ins.bytes,
            num_bytes: ins.num_bytes,
            absolute_position_in_list: position,
        }
    }
}

use std::mem;

use color_eyre::{eyre::Context, Result};
use hex::FromHex;

pub fn instances_by_name(instruction: &str, trace: &str) -> Result<Vec<InstructionInstance>> {
    let mut current_instruction = None;
    let mut instructions = vec![];
    let lines = trace.lines();
    for line in lines.into_iter().filter(|l| &l[0..3] == "[I]") {
        // Instruction name
        let name = &line[33..];
        let name = name.split_ascii_whitespace().next();
        if let Some(name) = name {
            // println!("name: {name}");
            if name == instruction {
                // println!("names match");
                if let Some(ins) = current_instruction.take() {
                    instructions.push(ins);
                }
                let mut new_instr = InstructionInstance::default();
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
                    let byte =
                        hex::decode(b).wrap_err_with(|| format!("byte: {b}, line: {line}"))?;
                    let i = new_instr.num_bytes;
                    new_instr.bytes[i] = byte[0];
                    new_instr.num_bytes += 1;
                }
                current_instruction = Some(new_instr);
            } else {
                if let Some(instr) = &mut current_instruction {
                    instr.num_ignored_instructions_until_next += 1;
                }
            }
        }
    }

    Ok(instructions)
}
