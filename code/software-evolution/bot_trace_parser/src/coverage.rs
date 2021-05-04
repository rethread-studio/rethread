/*!
# Coverage
Deserializing of the coverage.json file and conversion of the data within it to other formats.
 */

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Coverage {
    scripts: Option<Vec<CoverageScript>>,
    pub vector: Vec<(i64, i32)>,
    pub total_length: i64,
    pub total_count: i32,
}

impl Coverage {
    pub fn from_data(data: String) -> Self {
        let scripts: Vec<CoverageScript> = serde_json::from_str(&data).unwrap();
        // Convert the data into a vector of pairs (function_length, count) and sort
        let mut vector = Vec::with_capacity(scripts.len() * 4);
        let mut total_length = 0;
        let mut total_count = 0;
        for script in &scripts {
            for function in &script.functions {
                for range in &function.ranges {
                    let length = range.end_offset - range.start_offset;
                    vector.push((length, range.count));
                    total_length += length;
                    total_count += range.count;
                }
            }
        }
        // vector.sort_by_key(|item| item.1);
        // vector.sort_by_key(|item| item.0);

        Self {
            scripts: Some(scripts),
            vector,
            total_length,
            total_count,
        }
    }
    pub fn from_vector(vector: Vec<(i64, i32)>) -> Self {
        let mut total_length = 0;
        let mut total_count = 0;
        for pair in &vector {
            total_length += pair.0;
            total_count += pair.1;
        }
        Self {
            scripts: None,
            vector,
            total_length,
            total_count,
        }
    }
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CoverageScript {
    script_id: String,
    url: String,
    functions: Vec<CoverageFunction>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CoverageFunction {
    function_name: String,
    ranges: Vec<CoverageRange>,
    is_block_coverage: bool,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CoverageRange {
    start_offset: i64,
    end_offset: i64,
    count: i32,
}
