use chrono::{DateTime, NaiveDateTime, Utc};
use serde::{de::Error, Deserialize, Deserializer, Serialize, Serializer};

#[derive(Deserialize)]
pub struct CommitObject {
    sha: String,
    node_id: String,
    commit: Commit,
    // url: String,
    // html_url: String,
    // comments_url: String,
    author: Author,
}
#[derive(Deserialize)]
pub struct Commit {
    author: SimpleAuthor,
    committer: SimpleAuthor,
    message: String,
    tree: Tree,
    url: String,
    comment_count: i32,
    // verification: Verification,
}

#[derive(Deserialize)]
pub struct SimpleAuthor {
    name: String,
    email: String,
    #[serde(with = "date_serializer")] // declaring custom deserializer
    date: NaiveDateTime,
}

#[derive(Deserialize)]
pub struct Tree {
    sha: String,
    url: String,
}

#[derive(Deserialize)]
pub struct Author {
    login: String,
    id: u64,
    node_id: String,
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
