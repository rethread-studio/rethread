use std::{collections::HashSet, fs::read_to_string};

use self::asm_parser::parse_asm_file;

#[derive(Debug, Clone, PartialEq)]
pub struct Asm {
    pub full_text: String,
    pub functions: Vec<AsmFunction>,
}

impl Asm {
    pub fn from_string(data: String) -> Self {
        Self {
            full_text: data.clone(),
            functions: todo!(),
        }
    }
    pub fn all_instructions(&self) -> HashSet<String> {
        let mut instructions = HashSet::new();
        for f in &self.functions {
            for i in &f.instructions {
                instructions.insert(i.instruction.clone());
            }
        }
        instructions
    }
}

pub fn load_asm() -> Asm {
    let data = read_to_string("../matrix_inversion/asm2.txt").unwrap();
    let functions = parse_asm_file(&data);
    Asm {
        full_text: data,
        functions,
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct AsmFunction {
    pub name: String,
    pub instructions: Vec<AsmInstruction>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct AsmInstruction {
    pub instruction: String,
    pub arguments: Vec<String>,
}

mod asm_parser {
    use nom::{
        branch::alt,
        bytes::complete::{tag, take, take_till},
        bytes::{
            self,
            complete::{is_not, take_till1, take_until, take_while1},
        },
        character::{complete::char, is_alphanumeric, is_newline, is_space},
        combinator::opt,
        error::{Error, ErrorKind},
        multi::many_till,
        sequence::delimited,
        Err, IResult, Needed,
    };

    use super::{AsmFunction, AsmInstruction};
    pub fn parse_asm_file(mut src: &str) -> Vec<AsmFunction> {
        let mut functions = vec![];
        let mut current_func = None;
        while src.len() > 0 {
            if let Ok((new_src, func)) = asm_function(src) {
                src = new_src;
                if let Some(f) = current_func.take() {
                    functions.push(f);
                }
                current_func = Some(func);
            } else if let Ok((new_src, instruction)) = asm_instruction(src) {
                src = new_src;
                if let Some(f) = &mut current_func {
                    f.instructions.push(instruction);
                }
            } else {
                // skip to next line
                let (new_src, _) = skip_line(src).unwrap();
                src = new_src;
            }
        }
        if let Some(func) = current_func {
            functions.push(func);
        }
        functions
    }

    fn skip_line(src: &str) -> IResult<&str, &str> {
        let (src, _) = take_till(|c| c == '\n')(src)?;
        tag("\n")(src)
    }

    fn asm_function(src: &str) -> IResult<&str, AsmFunction> {
        let (src, _) = tag(".")(src)?;
        let (src, func_name) = is_not(":")(src)?;
        let (src, _) = tag(":")(src)?;
        let func = AsmFunction {
            name: func_name.to_string(),
            instructions: vec![],
        };
        Ok((src, func))
    }

    fn asm_instruction(src: &str) -> IResult<&str, AsmInstruction> {
        let (src, instruction_name) =
            delimited(tag("\t"), take_while1(is_alphanumeric_char), tag(" "))(src)?;
        let (src, (arguments, _)) = many_till(asm_instruction_argument, char('\n'))(src)?;

        Ok((
            src,
            AsmInstruction {
                instruction: instruction_name.to_string(),
                arguments,
            },
        ))
    }

    fn is_alphanumeric_char(chr: char) -> bool {
        is_alphanumeric(chr as u8)
    }

    fn asm_instruction_argument(src: &str) -> IResult<&str, String> {
        let (src, argument) = alt((
            delimited(tag("["), is_not("]"), tag("]")),
            take_till1(is_space_or_newline),
        ))(src)?;
        let (src, _) = opt(tag(" "))(src)?;
        Ok((src, argument.to_owned()))
    }

    // fn is_char(chr: char)

    fn is_space_or_newline(b: char) -> bool {
        is_space(b as u8) || is_newline(b as u8)
    }

    #[cfg(test)]
    mod tests {
        use crate::asm_data::{
            asm_parser::{asm_function, asm_instruction, asm_instruction_argument},
            AsmFunction, AsmInstruction,
        };

        #[test]
        fn test_asm_function_parser() {
            let src = ".LBB9_4:";
            assert_eq!(
                asm_function(src),
                Ok((
                    "",
                    AsmFunction {
                        name: "LBB9_4".to_string(),
                        instructions: Vec::new()
                    }
                ))
            )
        }
        #[test]
        fn test_asm_instruction_parser() {
            let src = "	mov rbx, qword ptr [rsp + 192]\n";
            assert_eq!(
                asm_instruction(src),
                Ok((
                    "",
                    AsmInstruction {
                        instruction: "mov".to_string(),
                        arguments: vec![
                            "rbx,".to_string(),
                            "qword".to_string(),
                            "ptr".to_string(),
                            // "[rsp + 192]".to_string()
                            "rsp + 192".to_string()
                        ]
                    }
                ))
            )
        }
        #[test]
        fn test_asm_instruction_argument_parser() {
            let src = "rbx, qword ptr [rsp + 192]\n";
            assert_eq!(
                asm_instruction_argument("rbx, qword ptr [rsp + 192]\n"),
                Ok(("qword ptr [rsp + 192]\n", "rbx,".to_string()))
            );
            assert_eq!(
                asm_instruction_argument("qword ptr [rsp + 192]\n"),
                Ok(("ptr [rsp + 192]\n", "qword".to_string()))
            );
        }
    }
}
