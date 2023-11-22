// build.rs

use std::env;
use std::fs;
use std::path::Path;


type JsonMatrix = Vec<Vec<f64>>;
#[derive(serde::Deserialize)]
struct Matrices {
    random: Vec<JsonMatrix>,
    lower_triangular: Vec<JsonMatrix>,
    upper_triangular: Vec<JsonMatrix>,
    vandermonde: Vec<JsonMatrix>,
    diagonal: Vec<JsonMatrix>,
}

fn main() {
    let out_dir = env::var_os("OUT_DIR").unwrap();
    let dest_path = Path::new(&out_dir).join("matrices.rs");
    let all_matrices = include_str!("/home/erik/Dokument/reinverse/matrices.json");
    let matrices: Matrices = serde_json::from_str(all_matrices).unwrap();

    let random_arrays: String = matrices.random.iter().map(|mat| {
        let mut s = String::from("[");
        for v in mat.iter().flat_map(|row|row.iter()) {
            s.push_str(&v.to_string());
            s.push_str(", ");
        }
        s.push_str("],");
        s
    }).collect();
    let lower_triangular_arrays: String = matrices.lower_triangular.iter().map(|mat| {
        let mut s = String::from("[");
        for v in mat.iter().flat_map(|row|row.iter()) {
            s.push_str(&format!("{:?}", v));
            s.push_str(", ");
        }
        s.push_str("],");
        s
    }).collect();
    let upper_triangular_arrays: String = matrices.upper_triangular.iter().map(|mat| {
        let mut s = String::from("[");
        for v in mat.iter().flat_map(|row|row.iter()) {
            s.push_str(&format!("{:?}", v));
            s.push_str(", ");
        }
        s.push_str("],");
        s
    }).collect();
    let diagonal_arrays: String = matrices.diagonal.iter().map(|mat| {
        let mut s = String::from("[");
        for v in mat.iter().flat_map(|row|row.iter()) {
            s.push_str(&format!("{:?}", v));
            s.push_str(", ");
        }
        s.push_str("],");
        s
    }).collect();
    let random_const = format!("pub const RANDOM: [[f64; 1024]; {}] = [{random_arrays}];", matrices.random.len());
    let lower_const = format!("pub const LOWER_TRIANGULAR: [[f64; 1024]; {}] = [{lower_triangular_arrays}];", matrices.lower_triangular.len());
    let upper_const = format!("pub const UPPER_TRIANGULAR: [[f64; 1024]; {}] = [{upper_triangular_arrays}];", matrices.upper_triangular.len());
    let diagonal_const = format!("pub const DIAGONAL: [[f64; 1024]; {}] = [{diagonal_arrays}];", matrices.diagonal.len());

    fs::write(
        &dest_path,
        &format!("mod matrices {{
          {random_const}
          {lower_const}
          {upper_const}
          {diagonal_const}
        }}")
        
    ).unwrap();
    println!("cargo:rerun-if-changed=build.rs");
}