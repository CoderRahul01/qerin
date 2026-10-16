use crate::blockchain::topup::verify_crypto_deposit;
use crate::db::{get_balance, get_or_create_account, record_deposit};
use axum::http::{HeaderMap, StatusCode};
use axum::response::IntoResponse;
use axum::Json;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct TopupRequest {
    pub tx_hash: String,
    pub signature: String,
    pub network: Option<String>,
}

pub async fn get_account_me(headers: HeaderMap) -> impl IntoResponse {
    let account_id = headers.get("X-Qerin-Account-Id").and_then(|v| v.to_str().ok());
    let account = get_or_create_account(account_id);
    (StatusCode::OK, Json(account)).into_response()
}

pub async fn get_account_balance(headers: HeaderMap) -> impl IntoResponse {
    let account_id = headers.get("X-Qerin-Account-Id").and_then(|v| v.to_str().ok()).unwrap_or("");
    let bal = get_balance(account_id);
    (StatusCode::OK, Json(serde_json::json!({ "balance": bal }))).into_response()
}

pub async fn account_topup(
    headers: HeaderMap,
    Json(payload): Json<TopupRequest>,
) -> impl IntoResponse {
    let account_id = match headers.get("X-Qerin-Account-Id").and_then(|v| v.to_str().ok()) {
        Some(a) => a,
        None => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "Account ID header missing" }))).into_response(),
    };

    let outcome = verify_crypto_deposit(account_id, &payload.tx_hash, &payload.signature, payload.network.as_deref()).await;
    if !outcome.verified {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "verified": false,
                "reason": outcome.reason.unwrap_or_else(|| "Verification failed".to_string())
            })),
        ).into_response();
    }

    let net_key = payload.network.unwrap_or_else(|| "8453".to_string());
    match record_deposit(account_id, &payload.tx_hash, outcome.amount_usd, &net_key) {
        Ok(new_bal) => (StatusCode::OK, Json(serde_json::json!({ "verified": true, "balance": new_bal }))).into_response(),
        Err(err) => (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "verified": false, "reason": err }))).into_response(),
    }
}
