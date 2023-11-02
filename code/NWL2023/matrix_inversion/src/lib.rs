use std::{hint::black_box, ops::Mul};

use eyre::Result;
pub use nalgebra::SquareMatrix;
use nalgebra::{ComplexField, DMatrix, U32};
use serde::{Deserialize, Serialize};
include!(concat!(env!("OUT_DIR"), "/matrices.rs"));
use matrices::RANDOM;
use matrices::LOWER_TRIANGULAR;
use matrices::DIAGONAL;
use matrices::UPPER_TRIANGULAR;


#[derive(Clone, Copy, Serialize, Debug)]
enum Operation {
    Inverse,
    Normalize,
    Multiply,
}

impl Operation {
    fn apply<T: ComplexField + std::fmt::Debug + std::fmt::Display>(
        &self,
        m0: DMatrix<T>,
        m1: Option<DMatrix<T>>,

    ) -> Option<DMatrix<T>> {
        match self {
            Operation::Inverse => m0.try_inverse(),
            Operation::Normalize => Some(m0.normalize()),
            Operation::Multiply => {
                let m1 = m1.unwrap();
                Some(m0.mul(m1))
            },
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

    let operation = Operation::Inverse;
    // let matrix_values = (0..(32 * 32))
    //     .map(|_| rng.gen_range(0.0..1.0))
    //     .collect::<Vec<f64>>();
    // let matrix_values: Vec<_> = RANDOM[0]
    //     .iter()
    //     .flat_map(|row| row.iter())
    //     .cloned()
    //     .collect();
    let matrix_values = DIAGONAL[0];
    let source_matrix = DMatrix::<f64>::from_column_slice(32, 32, &matrix_values[..]);
    let result = operation.apply(source_matrix, None);
    if let Some(res) = result {
        // let source_matrix_name = format!("diagonal_0");
        // let so = ScoreObject {
        //     operation,
        //     source: vec![SourceMatrix{ matrix: matrix_values.to_vec(), name: source_matrix_name.clone() }],
        //     result: vec![res.data.as_vec().clone()],
        //     trace_name: format!("{:?}_{source_matrix_name}", operation),
        // };
        // let json = serde_json::to_string(&so)?;
        // println!("{json}");
        black_box(res); // avoid optimising the whole thing away
    } else {
        // println!("Operation failed");
    }
    // let m1 = DMatrix::<f32>::identity(32, 32);
    Ok(())
}
