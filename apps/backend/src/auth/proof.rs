use crate::blockchain::topup::recover_eth_address;
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Deserialize, Serialize)]
pub struct AccountProofPayload {
    pub expires_at: String,
    pub signature: String,
}

pub fn account_access_message(account_id: &str, expires_at: &str) -> String {
    format!(
        "Qerin account access\nDomain:qerin.vercel.app\nAccount:{}\nExpires:{}",
        account_id.to_lowercase(),
        expires_at
    )
}

pub fn verify_account_proof(account_id: &str, raw_proof: Option<&str>) -> bool {
    let proof_str = match raw_proof {
        Some(p) if !p.is_empty() && p.len() <= 1024 => p,
        _ => return false,
    };

    let parsed: AccountProofPayload = match serde_json::from_str(proof_str) {
        Ok(p) => p,
        Err(_) => return false,
    };

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(&parsed.expires_at) {
        let exp_ts = dt.timestamp() as u64;
        if exp_ts <= now || exp_ts > now + 86400 {
            return false;
        }
    } else {
        return false;
    }

    let message = account_access_message(account_id, &parsed.expires_at);
    match recover_eth_address(&message, &parsed.signature) {
        Ok(recovered) => recovered.to_lowercase() == account_id.to_lowercase(),
        Err(_) => false,
    }
}
