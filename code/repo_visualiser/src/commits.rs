use chrono::{DateTime, NaiveDateTime, Utc};
use serde::{de::Error, Deserialize, Deserializer, Serialize, Serializer};
use serde_with::serde_as;
use serde_with::DisplayFromStr;

#[serde_as]
#[derive(Deserialize)]
pub struct Commit {
    pub repository: String,
    pub commit_nr: i32,
    pub commit_hash: String,
    pub author_name: String,
    pub author_email: String,
    #[serde_as(as = "DisplayFromStr")]
    pub author_date_unix_timestamp: u64,
    pub subject: String,
    pub subject_sanitized: String,
    pub stats: String,
    pub time_hour: u8,
    pub time_minutes: u8,
    pub time_seconds: u8,
    pub time_gmt: String,
    pub date_day_week: String,
    pub date_month_day: u8,
    pub date_month_name: String,
    pub date_month_number: u8,
    #[serde_as(as = "DisplayFromStr")]
    pub date_year: u16,
    pub date_iso_8601: String,
    pub files_changed: u32,
    pub insertions: u32,
    pub deletions: u32,
    pub impact: i32,
}

mod date_serializer {
    use chrono::{DateTime, NaiveDateTime, Utc};
    use serde::{de::Error, Deserialize, Deserializer, Serialize, Serializer};
    fn time_to_json(t: NaiveDateTime) -> String {
        DateTime::<Utc>::from_utc(t, Utc).to_rfc3339()
    }

    pub fn serialize<S: Serializer>(
        time: &NaiveDateTime,
        serializer: S,
    ) -> Result<S::Ok, S::Error> {
        time_to_json(time.clone()).serialize(serializer)
    }

    pub fn deserialize<'de, D: Deserializer<'de>>(
        deserializer: D,
    ) -> Result<NaiveDateTime, D::Error> {
        let time: String = Deserialize::deserialize(deserializer)?;
        Ok(NaiveDateTime::parse_from_str(&time, "%Y-%m-%dT%H:%M:%SZ").map_err(D::Error::custom)?)
    }
}
