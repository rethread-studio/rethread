use knyst::prelude::*;
use knyst::{gen::GenState, Sample};

// Ported from ReaperEffects, originally written by schwa
pub struct SoftClipper;
#[impl_gen]
impl SoftClipper {
    pub fn new() -> SoftClipper {
        SoftClipper
    }
    pub fn process(
        &mut self,
        in0: &[Sample],
        in1: &[Sample],
        in2: &[Sample],
        in3: &[Sample],
        boost_db: &[Sample],
        limit_db: &[Sample],
        out0: &mut [Sample],
        out1: &mut [Sample],
        out2: &mut [Sample],
        out3: &mut [Sample],
    ) -> GenState {
        const AMP_DB: Sample = 8.6562;
        const A: Sample = 1.017;
        const B: Sample = -0.025;
        let threshold = limit_db[0] - 9.;
        let boost_db = boost_db[0];
        let limit_db = limit_db[0];
        for (inp, out) in [in0, in1, in2, in3]
            .into_iter()
            .zip([out0, out1, out2, out3].into_iter())
        {
            for (in_sample, out_sample) in inp.iter().zip(out.iter_mut()) {
                let mut db = AMP_DB * in_sample.abs().ln() + boost_db;
                if db > threshold {
                    let over_db = db - threshold;
                    let over_db = A * over_db + B * over_db * over_db;
                    db = (threshold + over_db).min(limit_db);
                }
                *out_sample = (db / AMP_DB).exp() * in_sample.signum()
            }
        }
        GenState::Continue
    }
}

// dB0 = amp_dB * log(abs(spl0)) + boost_dB;
// dB1 = amp_dB * log(abs(spl1)) + boost_dB;

// (dB0 > threshold_dB) ? (
//   over_dB = dB0 - threshold_dB;
//   over_dB = a * over_dB + b * over_dB * over_dB;
//   dB0 = min(threshold_dB + over_dB, limit_dB);
// );

// (dB1 > threshold_dB) ? (
//   over_dB = dB1 - threshold_dB;
//   over_dB = a * over_dB + b * over_dB * over_dB;
//   dB1 = min(threshold_dB + over_dB, limit_dB);
// );

// spl0 = exp(dB0 / amp_dB) * sign(spl0);
// spl1 = exp(dB1 / amp_dB) * sign(spl1);
