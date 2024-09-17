// https://www.videoproc.com/resource/wav-file.htm
// Unfinished

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct WavSpec {
    pub channels: u16,
    pub sample_rate: u32,
    pub bitrate: u16,
}

pub enum WavError {
    InvalidHeader,
}

pub struct WavParser {
    spec: Option<WavSpec>,
}

impl WavParser {
    pub fn from_header_bytes(header: [u8; 44]) -> Result<Self, WavError> {
        let h = StreamReader(&header);
        if h.quad_bytes() != b"RIFF" {
            return Err(WavError::InvalidHeader);
        }
        let file_len = h.u32();
        if h.quad_bytes() != b"WAVE" {
            return Err(WavError::InvalidHeader);
        }
    }
}

struct StreamReader<'a>(&'a [u8]);
impl StreamReader {
    fn quad_bytes(&mut self) -> [u8; 4] {
        let bytes = [self.0[0], self.0[1], self.0[2], self.0[3]];
        self.0 = &self.0[4..];
        bytes
    }
    fn u32(&mut self) -> u32 {
        let v = u32::from_le_bytes([self.0[0], self.0[1], self.0[2], self.0[3]]);
        self.0 = &self.0[4..];
    }
}
