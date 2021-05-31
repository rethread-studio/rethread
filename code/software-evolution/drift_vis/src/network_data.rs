use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct NetworkData {
    nodes: Vec<NetworkEvent>,
}

#[derive(Serialize, Deserialize)]
pub struct NetworkEvent {
    method: String,
    params: NetworkParams,
}

pub struct NetworkParams {
    request_id: String,
    loader_id: String,
    document_url: String,
    request: Request,
    timestamp: f64,
    wallTime: f64,
}

pub struct Request {
    url: String,
    method: String,
    header: Header,
    #[serde(alias = "mixedContentType")]
    mixedContentType: String,
    #[serde(alias = "initialPriority")]
    initialPriority: String,
    #[serde(alias = "referrerPolicy")]
    referrerPolicy: String,
}

pub struct Header {
    #[serde(alias = "Upgrade-Insecure-Requests")]
    upgrade_insecure_requests: String,
    #[serde(alias = "User-Agent")]
    user_agent: String,
    #[serde(alias = "Sec-Fetch-User")]
    sec_fetch_user: String,
}
