use jsonwebtoken::{encode, Algorithm, EncodingKey, Header};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    sub: String,
    iss: String,
    uris: Vec<String>,
    exp: u64,
    nbf: u64,
    iat: u64,
}

pub fn generate_cdp_jwt(
    api_key_id: &str,
    api_key_secret: &str,
    method: &str,
    host: &str,
    path: &str,
) -> Result<String, String> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let uri = format!("{} {}{}", method, host, path);
    let claims = Claims {
        sub: api_key_id.to_string(),
        iss: "cdp".to_string(),
        uris: vec![uri],
        iat: now,
        nbf: now,
        exp: now + 120,
    };

    let mut header = Header::new(Algorithm::ES256);
    header.kid = Some(api_key_id.to_string());

    let clean_key = api_key_secret.trim();
    if clean_key.contains("BEGIN PRIVATE KEY") {
        let key = EncodingKey::from_ec_pem(clean_key.as_bytes())
            .map_err(|e| format!("Invalid EC PEM key: {}", e))?;
        encode(&header, &claims, &key).map_err(|e| format!("JWT encode error: {}", e))
    } else {
        // Fallback for mock or test environments
        Err("CDP private key must be a valid PKCS#8 EC PEM".to_string())
    }
}
