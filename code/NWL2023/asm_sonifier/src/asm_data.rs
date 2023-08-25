pub struct Asm {
    full_text: String,
    functions: Vec<AsmFunction>,
}

impl Asm {
    pub fn from_string(data: String) -> Self {
        Self {
            full_text: data.clone(),
            functions: todo!(),
        }
    }
}

struct AsmFunction {
    name: String,
    instructions: Vec<AsmInstruction>,
}

struct AsmInstruction {
    instruction: String,
    arguments: Vec<String>,
}
