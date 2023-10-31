use std::hint::black_box;

pub use nalgebra::SquareMatrix;
use nalgebra::{Const, DMatrix, U32};
use rand::{thread_rng, Rng};

pub fn test_main() {
    // let m1 = Matrix3::new(2.0, 1.0, 1.0, 3.0, 2.0, 1.0, 2.0, 1.0, 2.0);
    // let m1 = DMatrix::repeat(32, 32, 2.2);
    let mut rng = thread_rng();
    for _ in 0..1 {
        let matrix_values = (0..(32 * 32))
            .map(|_| rng.gen_range(0.0..4.0))
            .collect::<Vec<f32>>();
        let matrix = DMatrix::<f32>::from_column_slice(32, 32, &matrix_values);
        // let m1 = DMatrix::<f32>::identity(32, 32);
        my_inverse(matrix);
    }
}

pub fn my_inverse(m1: DMatrix<f32>) {
    // println!("m1 = {}", m1);
    let inverse_result = m1.try_inverse();
    match inverse_result {
        Some(inv) => {
            // println!("The inverse of m1 is: {}", inv);
            black_box(inv);
        }
        None => {
            // println!("m1 is not invertible!");
        }
    }
}
