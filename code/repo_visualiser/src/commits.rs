use chrono::{DateTime, NaiveDateTime, Utc};
use serde::{de::Error, Deserialize, Deserializer, Serialize, Serializer};
use serde_with::serde_as;
use serde_with::DisplayFromStr;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

#[derive(Deserialize)]
struct CommitRaw {
    commit: String,
    author: String,
    date: String,
    timestamp: u64,
    message: String,
    repo: String,
}

#[derive(Deserialize)]
struct StatRaw {
    commit: String,
    stats: Vec<FileChange>,
}

#[serde_as]
#[derive(Deserialize)]
pub struct FileChange {
    #[serde_as(as = "DisplayFromStr")]
    pub insertions: i32,
    #[serde_as(as = "DisplayFromStr")]
    pub deletions: i32,
    pub path: String,
}

/// Unified commit object containing all the data we're interested in

pub struct Commit {
    pub commit: String,
    pub author: String,
    pub timestamp: u64,
    pub message: String,
    pub files_changed: Vec<FileChange>,
    pub insertions: i32,
    pub deletions: i32,
    pub impact: i32,
}

pub fn read_commit_data(commit_path: PathBuf, stat_path: PathBuf) -> Vec<Commit> {
    let commit_data = fs::read_to_string(commit_path).expect("couldn't read file");
    let commits: Vec<CommitRaw> = serde_json::from_str(&commit_data).expect("Failed to parse json");

    let stat_data = fs::read_to_string(stat_path).expect("couldn't read file");
    let mut stats: HashMap<String, Vec<FileChange>> =
        serde_json::from_str(&stat_data).expect("Failed to parse json");

    let mut returned_commits = vec![];
    for c in commits {
        let mut commit = Commit {
            commit: c.commit,
            author: c.author,
            timestamp: c.timestamp,
            message: c.message,
            files_changed: Vec::new(),
            insertions: 0,
            deletions: 0,
            impact: 0,
        };
        // remove and return the list of file changes if one exists for the commit
        if let Some(commit_stats) = stats.remove(&commit.commit) {
            for fc in &commit_stats {
                commit.insertions += fc.insertions;
                commit.deletions += fc.deletions;
            }
            commit.files_changed = commit_stats;
            commit.impact = commit.insertions - commit.deletions;
        }
        returned_commits.push(commit);
    }
    returned_commits
}

#[serde_as]
#[derive(Deserialize)]
pub struct CommitGitlogg {
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
