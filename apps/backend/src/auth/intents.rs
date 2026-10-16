use crate::blockchain::topup::recover_eth_address;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OwnerIntent {
    pub nonce: String,
    pub account: String,
    pub kind: String,
    pub params: HashMap<String, Value>,
    pub message: String,
    pub expires_at: String,
    pub used: bool,
}

static INTENTS: Mutex<Option<HashMap<String, OwnerIntent>>> = Mutex::new(None);

fn with_intents<F, R>(f: F) -> R
where
    F: FnOnce(&mut HashMap<String, OwnerIntent>) -> R,
{
    let mut lock = INTENTS.lock().unwrap();
    if lock.is_none() {
        *lock = Some(HashMap::new());
    }
    f(lock.as_mut().unwrap())
}

pub fn create_owner_intent(
    account_id: &str,
    kind: &str,
    params: HashMap<String, Value>,
    lines: Vec<(&str, String)>,
) -> OwnerIntent {
    let nonce = Uuid::new_v4().to_string();
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let expires_at = chrono::DateTime::from_timestamp((now + 600) as i64, 0)
        .unwrap()
        .to_rfc3339();

    let title = if kind == "policy" {
        "Qerin agent spend policy"
    } else {
        "Qerin wallet withdrawal"
    };

    let mut msg_parts = vec![
        title.to_string(),
        "Domain:qerin.vercel.app".to_string(),
        format!("Account:{}", account_id.to_lowercase()),
    ];

    for (k, v) in lines {
        msg_parts.push(format!("{}:{}", k, v));
    }
    msg_parts.push(format!("Nonce:{}", nonce));
    msg_parts.push(format!("Expires:{}", expires_at));

    let message = msg_parts.join("\n");

    let intent = OwnerIntent {
        nonce: nonce.clone(),
        account: account_id.to_lowercase(),
        kind: kind.to_string(),
        params,
        message,
        expires_at,
        used: false,
    };

    with_intents(|map| {
        map.insert(nonce.clone(), intent.clone());
    });

    intent
}

pub fn redeem_owner_intent(
    account_id: &str,
    kind: &str,
    nonce: &str,
    signature: &str,
) -> Result<OwnerIntent, String> {
    with_intents(|map| {
        let intent = map.get_mut(nonce).ok_or_else(|| "This request is invalid. Start again.".to_string())?;

        if intent.account != account_id.to_lowercase() || intent.kind != kind {
            return Err("This request is invalid. Start again.".to_string());
        }
        if intent.used {
            return Err("This signature was already used.".to_string());
        }

        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
        if let Ok(exp) = chrono::DateTime::parse_from_rfc3339(&intent.expires_at) {
            if (exp.timestamp() as u64) <= now {
                return Err("This request expired. Start again.".to_string());
            }
        }

        let signer = recover_eth_address(&intent.message, signature)
            .map_err(|_| "The signature doesn't match the wallet that owns this Qerin account.".to_string())?;

        if signer != account_id.to_lowercase() {
            return Err("The signature doesn't match the wallet that owns this Qerin account.".to_string());
        }

        intent.used = true;
        Ok(intent.clone())
    })
}
