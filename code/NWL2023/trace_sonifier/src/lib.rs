use fxhash::FxHashMap;

pub mod binary_instructions;
pub mod instances_of_instruction;

use color_eyre::Result;

pub fn instruction_occurrence_by_name(trace: &str) -> Result<FxHashMap<String, usize>> {
    let mut map = FxHashMap::default();
    let lines = trace.lines();
    for line in lines.into_iter().filter(|l| &l[0..3] == "[I]") {
        // Instruction name
        let name = &line[33..];
        let name = name.split_ascii_whitespace().next();
        if let Some(name) = name {
            *map.entry(name.to_string()).or_insert(0) += 1;
        }
    }

    Ok(map)
}
