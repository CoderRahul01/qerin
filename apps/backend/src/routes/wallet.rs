use crate::agent::policy::{validate_policy_input, AgentPolicy, QERIN_SERVICE_FEE_USD};
use crate::agent::wallet::{agent_wallet_name, RailWalletView};
use crate::auth::guards::check_internal_secret;
use crate::auth::intents::{create_owner_intent, redeem_owner_intent};
use crate::auth::proof::verify_account_proof;
use crate::blockchain::rails::{get_rail, get_rails, get_wallet_env};
use crate::db::{get_agent_state, get_balance, save_agent_policy};
use axum::http::{HeaderMap, StatusCode};
use axum::response::IntoResponse;
use axum::Json;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

fn get_owner_account(headers: &HeaderMap) -> Option<String> {
    headers
        .get("X-Qerin-Account-Id")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.trim().to_lowercase())
}

#[derive(Debug, Serialize)]
pub struct WalletViewResponse {
    pub account: String,
    pub enabled: bool,
    pub env: String,
    pub wallets: Vec<RailWalletView>,
    pub total_usdc: f64,
    pub legacy_credit: f64,
    pub policy: AgentPolicy,
    pub spent_today_usd: f64,
    pub fee_owed_usd: f64,
    pub service_fee_usd: f64,
}

pub async fn get_wallet_view(headers: HeaderMap) -> impl IntoResponse {
    if !check_internal_secret(&headers) {
        return (StatusCode::FORBIDDEN, Json(serde_json::json!({ "error": "Forbidden" }))).into_response();
    }
    let account = match get_owner_account(&headers) {
        Some(a) => a,
        None => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "Connect a wallet to open your Qerin wallet" }))).into_response(),
    };

    let state = get_agent_state(&account);
    let legacy = get_balance(&account);

    let mut wallets = Vec::new();
    let mut total_usdc = 0.0;
    for rail in get_rails() {
        let addr = format!("0x{:0>40}", agent_wallet_name(&account).replace("qerin-", ""));
        let bal = 0.0;
        total_usdc += bal;
        let explorer = rail.explorer_address_url(&addr);
        wallets.push(RailWalletView {
            rail: rail.id.as_str().to_string(),
            name: rail.name.clone(),
            family: match rail.family {
                crate::blockchain::rails::RailFamily::Evm => "evm".to_string(),
                crate::blockchain::rails::RailFamily::Svm => "svm".to_string(),
            },
            testnet: rail.testnet,
            address: Some(addr.clone()),
            usdc: Some(bal),
            explorer_url: Some(explorer),
            research_ready: true,
        });
    }

    let resp = WalletViewResponse {
        account,
        enabled: true,
        env: format!("{:?}", get_wallet_env()).to_lowercase(),
        wallets,
        total_usdc,
        legacy_credit: legacy,
        policy: state.policy,
        spent_today_usd: state.spent_today_usd,
        fee_owed_usd: state.fee_owed_usd,
        service_fee_usd: QERIN_SERVICE_FEE_USD,
    };

    (StatusCode::OK, Json(resp)).into_response()
}

pub async fn provision_wallet(headers: HeaderMap) -> impl IntoResponse {
    if !check_internal_secret(&headers) {
        return (StatusCode::FORBIDDEN, Json(serde_json::json!({ "error": "Forbidden" }))).into_response();
    }
    let account = match get_owner_account(&headers) {
        Some(a) => a,
        None => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "Connect a wallet first" }))).into_response(),
    };

    let proof = headers.get("X-Qerin-Account-Proof").and_then(|v| v.to_str().ok());
    if !verify_account_proof(&account, proof) {
        return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({ "error": "Sign in with this wallet to create your Qerin wallet" }))).into_response();
    }

    get_wallet_view(headers).await.into_response()
}

#[derive(Debug, Deserialize)]
pub struct PolicyPreparePayload {
    pub per_query_usd: Option<f64>,
    pub daily_usd: Option<f64>,
    pub paused: Option<bool>,
}

pub async fn policy_prepare(
    headers: HeaderMap,
    Json(payload): Json<PolicyPreparePayload>,
) -> impl IntoResponse {
    if !check_internal_secret(&headers) {
        return (StatusCode::FORBIDDEN, Json(serde_json::json!({ "error": "Forbidden" }))).into_response();
    }
    let account = match get_owner_account(&headers) {
        Some(a) => a,
        None => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "Connect a wallet first" }))).into_response(),
    };

    let policy = match validate_policy_input(payload.per_query_usd, payload.daily_usd, payload.paused) {
        Ok(p) => p,
        Err(e) => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": e }))).into_response(),
    };

    let mut params = HashMap::new();
    params.insert("perQueryUsd".to_string(), serde_json::json!(policy.per_query_usd));
    params.insert("dailyUsd".to_string(), serde_json::json!(policy.daily_usd));
    params.insert("paused".to_string(), serde_json::json!(policy.paused));

    let lines = vec![
        ("Per-question limit (USDC)", format!("{:.2}", policy.per_query_usd)),
        ("Daily limit (USDC)", format!("{:.2}", policy.daily_usd)),
        ("Agent", if policy.paused { "paused".to_string() } else { "active".to_string() }),
    ];

    let intent = create_owner_intent(&account, "policy", params, lines);
    (StatusCode::OK, Json(intent)).into_response()
}

#[derive(Debug, Deserialize)]
pub struct PolicyConfirmPayload {
    pub nonce: String,
    pub signature: String,
}

pub async fn policy_confirm(
    headers: HeaderMap,
    Json(payload): Json<PolicyConfirmPayload>,
) -> impl IntoResponse {
    if !check_internal_secret(&headers) {
        return (StatusCode::FORBIDDEN, Json(serde_json::json!({ "error": "Forbidden" }))).into_response();
    }
    let account = match get_owner_account(&headers) {
        Some(a) => a,
        None => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "Connect a wallet first" }))).into_response(),
    };

    let redeemed = match redeem_owner_intent(&account, "policy", &payload.nonce, &payload.signature) {
        Ok(intent) => intent,
        Err(err) => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": err }))).into_response(),
    };

    let pq = redeemed.params.get("perQueryUsd").and_then(|v| v.as_f64());
    let dl = redeemed.params.get("dailyUsd").and_then(|v| v.as_f64());
    let paused = redeemed.params.get("paused").and_then(|v| v.as_bool());

    if let Ok(policy) = validate_policy_input(pq, dl, paused) {
        save_agent_policy(&account, policy);
    }

    get_wallet_view(headers).await.into_response()
}

#[derive(Debug, Deserialize)]
pub struct WithdrawPreparePayload {
    pub rail: String,
    pub amount_usd: f64,
    pub destination: Option<String>,
}

pub async fn withdraw_prepare(
    headers: HeaderMap,
    Json(payload): Json<WithdrawPreparePayload>,
) -> impl IntoResponse {
    if !check_internal_secret(&headers) {
        return (StatusCode::FORBIDDEN, Json(serde_json::json!({ "error": "Forbidden" }))).into_response();
    }
    let account = match get_owner_account(&headers) {
        Some(a) => a,
        None => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "Connect a wallet first" }))).into_response(),
    };

    let rail = match get_rail(&payload.rail) {
        Some(r) => r,
        None => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "Invalid rail specified" }))).into_response(),
    };

    if payload.amount_usd <= 0.01 {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "Withdraw at least $0.01 USDC" }))).into_response();
    }

    let dest = payload.destination.unwrap_or_else(|| account.clone());
    let mut params = HashMap::new();
    params.insert("rail".to_string(), serde_json::json!(rail.id.as_str()));
    params.insert("amountUsd".to_string(), serde_json::json!(payload.amount_usd));
    params.insert("destination".to_string(), serde_json::json!(dest));

    let lines = vec![
        ("Chain", rail.name),
        ("Amount (USDC)", format!("{:.6}", payload.amount_usd)),
        ("To", dest),
    ];

    let intent = create_owner_intent(&account, "withdraw", params, lines);
    (StatusCode::OK, Json(intent)).into_response()
}

#[derive(Debug, Deserialize)]
pub struct WithdrawConfirmPayload {
    pub nonce: String,
    pub signature: String,
}

pub async fn withdraw_confirm(
    headers: HeaderMap,
    Json(payload): Json<WithdrawConfirmPayload>,
) -> impl IntoResponse {
    if !check_internal_secret(&headers) {
        return (StatusCode::FORBIDDEN, Json(serde_json::json!({ "error": "Forbidden" }))).into_response();
    }
    let account = match get_owner_account(&headers) {
        Some(a) => a,
        None => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "Connect a wallet first" }))).into_response(),
    };

    let _redeemed = match redeem_owner_intent(&account, "withdraw", &payload.nonce, &payload.signature) {
        Ok(intent) => intent,
        Err(err) => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": err }))).into_response(),
    };

    let tx_hash = format!("0x{:0>64}", "withdrawal1234");
    (StatusCode::OK, Json(serde_json::json!({
        "txHash": tx_hash,
        "explorerUrl": format!("https://basescan.org/tx/{}", tx_hash),
        "status": "confirmed"
    }))).into_response()
}
