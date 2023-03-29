use std::collections::HashMap;

use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct Config {
    pub osc_receivers: HashMap<String, OscReceiver>,
}

impl Config {
    pub fn empty() -> Self {
        Self {
            osc_receivers: HashMap::from([
                (
                    "supercollider".to_owned(),
                    OscReceiver {
                        ip: "127.0.0.1".to_string(),
                        port: 57120,
                    },
                ),
                (
                    "supercollider2".to_owned(),
                    OscReceiver {
                        ip: "127.0.0.1".to_string(),
                        port: 57120,
                    },
                ),
            ]),
        }
    }
    #[allow(unused)]
    pub fn save_to_file(&self) -> anyhow::Result<()> {
        // Check if there is already a config file and rename it if so
        let path = "Settings.toml";
        std::fs::rename(path, "Settings.toml.old").ok();
        // Deserialize self
        let data = toml::to_string_pretty(self)?;
        std::fs::write(path, data.as_bytes())?;
        Ok(())
    }
    pub fn load_from_file() -> anyhow::Result<Self> {
        let data = std::fs::read_to_string("Settings.toml")?;
        Ok(toml::from_str(&data)?)
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, Hash, PartialEq)]
pub struct OscReceiver {
    pub ip: String,
    pub port: u16,
}
