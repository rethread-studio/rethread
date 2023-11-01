use std::hint::black_box;

pub use nalgebra::SquareMatrix;
use nalgebra::{DMatrix, U32};
use rand::{Rng, SeedableRng};
use rand_chacha::ChaCha8Rng;

enum Operation {
    Inverse,
    Normalize,
}

impl Operation {
    fn apply(&self, m: DMatrix<f32>) -> Option<DMatrix<f32>> {
        match self {
            Operation::Inverse => m.try_inverse(),
            Operation::Normalize => Some(m.normalize()),
        }
    }
}

pub fn test_main() {
    // let m1 = Matrix3::new(2.0, 1.0, 1.0, 3.0, 2.0, 1.0, 2.0, 1.0, 2.0);
    // let m1 = DMatrix::repeat(32, 32, 2.2);
    // let mut rng = thread_rng();

    let mut rng = ChaCha8Rng::seed_from_u64(2);
    for _ in 0..1 {
        let operation = Operation::Normalize;
        let matrix_values = (0..(32 * 32))
            .map(|_| rng.gen_range(0.0..1.0))
            .collect::<Vec<f32>>();
        let matrix = DMatrix::<f32>::from_column_slice(32, 32, &matrix_values);
        println!("source_matrix: {matrix_values:?}");
        let result = operation.apply(matrix);
        if let Some(res) = result {
            println!("result_matrix: {res:?}");
            black_box(res); // avoid optimising the whole thing away
        } else {
            println!("Operation failed");
        }
        // let m1 = DMatrix::<f32>::identity(32, 32);
    }
}
