use std::{hint::black_box, ops::Mul};

use eyre::Result;
pub use nalgebra::SquareMatrix;
use nalgebra::{ComplexField, DMatrix, U32};
use serde::{Deserialize, Serialize};
include!(concat!(env!("OUT_DIR"), "/matrices.rs"));
use matrices::DIAGONAL;
use matrices::LOWER_TRIANGULAR;
use matrices::RANDOM;
use matrices::UPPER_TRIANGULAR;

#[derive(Clone, Copy, Serialize, Debug)]
enum Operation {
    Inverse,
    Normalize,
    Multiply,
    SVD,
    Hessenberg,
}

impl Operation {
    fn apply<T: ComplexField + std::fmt::Debug + std::fmt::Display>(
        &self,
        m0: DMatrix<T>,
        m1: Option<DMatrix<T>>,
    ) -> Option<Vec<DMatrix<T>>> {
        match self {
            Operation::Inverse => {
                if let Some(m) = m0.try_inverse() {
                    Some(vec![m])
                } else {
                    None
                }
            }
            Operation::Normalize => Some(vec![m0.normalize()]),
            Operation::Multiply => {
                let m1 = m1.unwrap();
                Some(vec![m0.mul(m1)])
            }
            Operation::SVD => {
                let svd = m0.svd(true, true);
                Some(vec![svd.u.unwrap().into(), svd.v_t.unwrap().into()])
            }
            Operation::Hessenberg => {
                let hessenberg = m0.hessenberg();
                Some(vec![hessenberg.h(), hessenberg.q()])
            }
        }
    }
}

type FlatMatrix = Vec<f64>;
#[derive(Serialize)]
struct SourceMatrix {
    matrix: FlatMatrix,
    name: String,
}
#[derive(Serialize)]
struct ScoreObject {
    operation: Operation,
    source: Vec<SourceMatrix>,
    result: Vec<FlatMatrix>,
    trace_name: String,
}

pub fn test_main() -> Result<()> {
    let operation = Operation::Hessenberg;
    // let matrix_values = (0..(32 * 32))
    //     .map(|_| rng.gen_range(0.0..1.0))
    //     .collect::<Vec<f64>>();
    // let matrix_values: Vec<_> = RANDOM[0]
    //     .iter()
    //     .flat_map(|row| row.iter())
    //     .cloned()
    //     .collect();
    let matrix_values0 = LOWER_TRIANGULAR[3];
    let source_matrix0 = DMatrix::<f64>::from_column_slice(32, 32, &matrix_values0[..]);
    let matrix_values1 = LOWER_TRIANGULAR[53];
    let source_matrix1 = DMatrix::<f64>::from_column_slice(32, 32, &matrix_values1[..]);
    let result = operation.apply(source_matrix0, Some(source_matrix1));
    if let Some(res) = result {
        let source_matrix_name = format!("lower_triangular_3");
        let result = res
            .into_iter()
            .map(|mat| mat.data.as_vec().clone())
            .collect();
        let so = ScoreObject {
            operation,
            source: vec![
                SourceMatrix {
                    matrix: matrix_values0.to_vec(),
                    name: source_matrix_name.clone(),
                },
                // SourceMatrix {
                //     matrix: matrix_values1.to_vec(),
                //     name: "lower_triangular_53".to_string(),
                // },
            ],
            result,
            trace_name: format!("{:?}_{source_matrix_name}", operation),
        };
        let json = serde_json::to_string(&so)?;
        println!("{json}");
        // black_box(res); // avoid optimising the whole thing away
    } else {
        // println!("Operation failed");
    }
    // let m1 = DMatrix::<f32>::identity(32, 32);
    Ok(())
}
