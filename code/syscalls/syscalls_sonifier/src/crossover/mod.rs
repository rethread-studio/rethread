// This code was adapted from a nih_plug example plugin to a (simplified) Knyst Gen
//
// Crossover: clean crossovers as a multi-out plugin
// Copyright (C) 2022-2024 Robbert van der Helm
// Copyright (C) 2024 Erik Natanael Gustafsson
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

use iir::{IirCrossover, IirCrossoverType};
use knyst::gen::GenState;
use knyst::prelude::impl_gen;
use knyst::{Sample, SampleRate};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

mod iir;

/// The number of channels this plugin supports. Hard capped at 2 for SIMD reasons.
pub const NUM_CHANNELS: u32 = 2;

/// The number of bands. Not used directly here, but this avoids hardcoding some constants in the
/// crossover implementations.
pub const NUM_BANDS: usize = 5;

const MIN_CROSSOVER_FREQUENCY: f32 = 40.0;
const MAX_CROSSOVER_FREQUENCY: f32 = 20_000.0;

pub struct Crossover {
    params: CrossoverParams,

    /// Provides the LR24 crossover.
    iir_crossover: IirCrossover,
    /// Set when the number of bands has changed and the filters must be updated.
    should_update_filters: Arc<AtomicBool>,
}

#[derive(Copy, Clone, Debug)]
struct CrossoverParams {
    /// The number of bands between 2 and 5
    pub num_bands: usize,

    pub crossover_1_freq: Sample,
    pub crossover_2_freq: Sample,
    pub crossover_3_freq: Sample,
    pub crossover_4_freq: Sample,
}
impl Default for CrossoverParams {
    fn default() -> Self {
        Self {
            num_bands: 5,
            crossover_1_freq: 200.,
            crossover_2_freq: 500.,
            crossover_3_freq: 2000.,
            crossover_4_freq: 7000.,
        }
    }
}

// The `non_exhaustive` is to prevent adding cases for latency compensation when adding more types
// later
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[non_exhaustive]
enum CrossoverType {
    LinkwitzRiley24,
}

impl Default for Crossover {
    fn default() -> Self {
        let should_update_filters = Arc::new(AtomicBool::new(false));

        Crossover {
            params: CrossoverParams::default(),

            iir_crossover: IirCrossover::new(IirCrossoverType::LinkwitzRiley24),
            should_update_filters,
        }
    }
}

#[impl_gen]
impl Crossover {
    pub fn init(&mut self, sample_rate: SampleRate) {
        // Make sure the filter states match the current parameters
        self.update_filters(1, *sample_rate);
        self.iir_crossover.reset();
    }
    /// If not all bands are used, this Gen uses only the first N first outputs
    pub fn process(
        &mut self,
        input: &[Sample],
        out0: &mut [Sample],
        out1: &mut [Sample],
        out2: &mut [Sample],
        out3: &mut [Sample],
        out4: &mut [Sample],
    ) -> GenState {
        // Snoclists for days
        for (
            (
                (
                    ((main_channel_samples, band_1_channel_samples), band_2_channel_samples),
                    band_3_channel_samples,
                ),
                band_4_channel_samples,
            ),
            band_5_channel_samples,
        ) in input
            .iter()
            .zip(out0.iter_mut())
            .zip(out1.iter_mut())
            .zip(out2.iter_mut())
            .zip(out3.iter_mut())
            .zip(out4.iter_mut())
        {
            // We can avoid a lot of hardcoding and conditionals by restoring the original array structure
            let bands = [
                band_1_channel_samples,
                band_2_channel_samples,
                band_3_channel_samples,
                band_4_channel_samples,
                band_5_channel_samples,
            ];

            self.iir_crossover
                .process(self.params.num_bands, *main_channel_samples, bands);
        }
        GenState::Continue
    }
}

impl Crossover {
    /// Update the filter coefficients for the crossovers. The step size can be used when the filter
    /// coefficietns aren't updated every sample.
    fn update_filters(&mut self, step_size: u32, sample_rate: f32) {
        let crossover_frequencies = [
            self.params.crossover_1_freq,
            self.params.crossover_2_freq,
            self.params.crossover_3_freq,
            self.params.crossover_4_freq,
        ];

        self.iir_crossover
            .update(sample_rate, self.params.num_bands, crossover_frequencies);
    }
}
