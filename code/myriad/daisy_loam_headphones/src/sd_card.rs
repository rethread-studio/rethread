use embedded_sdmmc::{Controller, Directory, TimeSource, Timestamp, Volume, VolumeIdx};
use log::{info, warn};
use stm32h7xx_hal::sdmmc::SdCard;

use stm32h7xx_hal::time::Hertz;
use stm32h7xx_hal::{
    device::SDMMC1,
    sdmmc::{Sdmmc, SdmmcBlockDevice},
};

struct FakeTime;

impl TimeSource for FakeTime {
    fn get_timestamp(&self) -> Timestamp {
        Timestamp {
            year_since_1970: 52, //2022
            zero_indexed_month: 0,
            zero_indexed_day: 0,
            hours: 0,
            minutes: 0,
            seconds: 1,
        }
    }
}

pub struct SdCardLocal {
    sd_card: Controller<SdmmcBlockDevice<Sdmmc<SDMMC1, SdCard>>, FakeTime, 4, 16>,
    fat_volume: Volume,
    fat_root_dir: Directory,
}

impl SdCardLocal {
    pub fn new(mut sd_card: Sdmmc<SDMMC1, SdCard>) -> Self {
        info!("SdCardLocal::new");
        // setup connection to SD card with 50MHz
        match sd_card.init(Hertz::MHz(50)) {
            Ok(_) => {
                info!("Sd card initiated, creating Controller");
                let mut sd_card =
                    Controller::new_with_limits(sd_card.sdmmc_block_device(), FakeTime);
                if let Ok(fat_volume) = sd_card.get_volume(VolumeIdx(0)) {
                    info!("Volume got");
                    if let Ok(fat_root_dir) = sd_card.open_root_dir(&fat_volume) {
                        SdCardLocal {
                            sd_card,
                            fat_volume,
                            fat_root_dir,
                        }
                    } else {
                        core::panic!("Failed to get root dir");
                    }
                } else {
                    core::panic!("Failed to get volume 0");
                }
            }
            Err(e) => core::panic!("Failed to init SD Card: {e:?}"),
        }
    }

    pub fn print_files_in_root(&mut self) {
        self.sd_card
            .iterate_dir(&self.fat_volume, &self.fat_root_dir, |entry| {
                info!("{:?}", entry);
            })
            .unwrap();
    }

    pub fn file_size(&mut self, file_name: &str) -> Option<usize> {
        if let Ok(file) = self.sd_card.open_file_in_dir(
            &mut self.fat_volume,
            &self.fat_root_dir,
            file_name,
            embedded_sdmmc::Mode::ReadOnly,
        ) {
            let res = file.length() as usize;
            self.sd_card.close_file(&self.fat_volume, file).unwrap();
            Some(res)
        } else {
            None
        }
    }
    pub fn open_file(
        &mut self,
        file_name: &str,
    ) -> Result<
        embedded_sdmmc::File,
        embedded_sdmmc::Error<
            <SdmmcBlockDevice<Sdmmc<SDMMC1, SdCard>> as embedded_sdmmc::BlockDevice>::Error,
        >,
    > {
        self.sd_card.open_file_in_dir(
            &mut self.fat_volume,
            &self.fat_root_dir,
            file_name,
            embedded_sdmmc::Mode::ReadOnly,
        )
    }
    /// Fills the buffer with new i16 values from the File, cycling back to the start if necessary
    pub fn read_i16_from_file_cycling(
        &mut self,
        file: &mut embedded_sdmmc::File,
        buffer: &mut [i16],
    ) {
        const CHUNK_SIZE: usize = 8192; // has to be a multiple of 2, bigger chunks mean faster loading times
        let mut write_pos = 0;
        //file.seek_from_start(2).unwrap(); // offset the reading of the chunks

        // for i in 0..chunk_iterator {
        let mut chunk_buffer = [0u8; CHUNK_SIZE];

        loop {
            match self.sd_card.read(&self.fat_volume, file, &mut chunk_buffer) {
                Ok(bytes_read) => {
                    if bytes_read == 0 {
                        if file.eof() {
                            file.seek_from_start(0).ok();
                        } else {
                            warn!("0 bytes read from file");
                            return;
                        }
                    }
                    // info!("Chunk read, bytes: {}", bytes_read);
                    for k in chunk_buffer[..bytes_read].chunks(2) {
                        // converting every word consisting of four u8 into f32 in buffer
                        let i16_buffer = [k[0], k[1]];
                        buffer[write_pos] = i16::from_le_bytes(i16_buffer);
                        write_pos += 1;
                        if write_pos >= buffer.len() {
                            return;
                        }
                    }
                }
                Err(e) => {
                    warn!(
                        "Error reading from file at pos {}: {e:?}",
                        file.length() - file.left()
                    );
                    if file.eof() {
                        file.seek_from_start(0).ok();
                    }
                }
            }
        }
    }
    pub fn write_file_in_sdram(&mut self, file_name: &str, sdram: &mut [f32]) -> usize {
        info!("Loading file");
        let file_length_in_samples;

        let mut file = self
            .sd_card
            .open_file_in_dir(
                &mut self.fat_volume,
                &self.fat_root_dir,
                file_name,
                embedded_sdmmc::Mode::ReadOnly,
            )
            .unwrap();

        let file_length_in_bytes = file.length() as usize;
        file_length_in_samples = file_length_in_bytes / core::mem::size_of::<f32>();

        // load wave file in chunks of CHUNK_SIZE samples into sdram

        const CHUNK_SIZE: usize = 10_000; // has to be a multiple of 4, bigger chunks mean faster loading times
        let mut write_pos = 0;
        //file.seek_from_start(2).unwrap(); // offset the reading of the chunks

        // for i in 0..chunk_iterator {
        let mut chunk_buffer = [0u8; CHUNK_SIZE];

        while let Ok(bytes_read) = self
            .sd_card
            .read(&self.fat_volume, &mut file, &mut chunk_buffer)
        {
            if bytes_read == 0 {
                break;
            }
            info!("Chunk read, bytes: {}", bytes_read);
            for k in chunk_buffer[..bytes_read].chunks(4) {
                // converting every word consisting of four u8 into f32 in buffer
                let f32_buffer = [k[0], k[1], k[2], k[3]];
                sdram[write_pos] = f32::from_le_bytes(f32_buffer);
                write_pos += 1;
                if write_pos >= sdram.len() {
                    return write_pos - 1;
                }
            }
        }
        // }

        file_length_in_samples
    }
}
