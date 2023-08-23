pub use nalgebra::SquareMatrix;
use nalgebra::{Const, DMatrix, U32};

pub fn test_main() {
    // let m1 = Matrix3::new(2.0, 1.0, 1.0, 3.0, 2.0, 1.0, 2.0, 1.0, 2.0);
    // let m1 = DMatrix::repeat(32, 32, 2.2);
    let m1 = DMatrix::<f32>::identity(32, 32);
}

pub fn my_inverse(m1: DMatrix<f32>) {
    // println!("m1 = {}", m1);
    let inverse_result = m1.try_inverse();
    match inverse_result {
        Some(inv) => {
            // println!("The inverse of m1 is: {}", inv);
        }
        None => {
            // println!("m1 is not invertible!");
        }
    }
}
