use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::sync::Mutex;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiKeyRecord {
    pub key_hash: String,
    pub key_prefix: String,
    pub label: Option<String>,
    pub created_at: String,
    pub revoked: bool,
}

static API_KEYS: Mutex<Option<HashMap<String, ApiKeyRecord>>> = Mutex::new(None);

pub fn hash_key(raw_key: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(raw_key.as_bytes());
    hex::encode(hasher.finalize())
}

pub fn issue_api_key(label: Option<&str>) -> (String, String) {
    let raw_key = format!("qk_live_{}", Uuid::new_v4().to_string().replace('-', ""));
    let key_hash = hash_key(&raw_key);
    let key_prefix = raw_key.chars().take(14).collect::<String>();

    let record = ApiKeyRecord {
        key_hash: key_hash.clone(),
        key_prefix: key_prefix.clone(),
        label: label.map(|s| s.to_string()),
        created_at: chrono::Utc::now().to_rfc3339(),
        revoked: false,
    };

    let mut lock = API_KEYS.lock().unwrap();
    if lock.is_none() {
        *lock = Some(HashMap::new());
    }
    lock.as_mut().unwrap().insert(key_hash, record);

    (raw_key, key_prefix)
}

pub fn authenticate_api_key(raw_key: &str) -> bool {
    let hash = hash_key(raw_key);
    let lock = API_KEYS.lock().unwrap();
    if let Some(map) = lock.as_ref() {
        if let Some(rec) = map.get(&hash) {
            return !rec.revoked;
        }
    }
    false
}
