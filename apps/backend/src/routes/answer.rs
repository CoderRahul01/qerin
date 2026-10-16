use crate::blockchain::networks::parse_network;
use crate::blockchain::receipt::record_delivery_receipt;
use crate::core::orchestrator::gather_sources;
use crate::core::selector::select_sources;
use crate::core::synthesize::synthesize_research;
use crate::db::get_or_create_account;
use axum::http::{HeaderMap, StatusCode};
use axum::response::IntoResponse;
use axum::Json;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct AnswerRequest {
    pub question: String,
    pub network: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AnswerResponse {
    pub topic: String,
    pub summary: String,
    pub answer: String,
    pub source_citations: Vec<crate::core::sources::SourceCitation>,
    pub receipt: Option<ReceiptView>,
    pub total_paid: String,
    pub latency_sec: String,
}

#[derive(Debug, Serialize)]
pub struct ReceiptView {
    pub receipt_id: String,
    pub registry_tx_hash: Option<String>,
    pub registry_contract: Option<String>,
    pub chain_id: u64,
}

pub async fn answer_handler(
    headers: HeaderMap,
    Json(payload): Json<AnswerRequest>,
) -> impl IntoResponse {
    let start = std::time::Instant::now();
    let question = payload.question.trim();
    if question.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "Question is required" }))).into_response();
    }

    let account_id = headers
        .get("X-Qerin-Account-Id")
        .and_then(|v| v.to_str().ok());

    let _account = get_or_create_account(account_id);
    let network = parse_network(payload.network.as_deref());

    let selected = select_sources(question);
    let gathered = gather_sources(question, &selected).await;
    let synthesis = synthesize_research(question, &gathered.raw_snippets, gathered.citations).await;

    let receipt_id = format!("0x{}", Uuid::new_v4().to_string().replace('-', ""));
    let receipt_result = record_delivery_receipt(network, &receipt_id, question, selected.len(), 50000).await;

    let latency = format!("{:.2}s", start.elapsed().as_secs_f64());

    let resp = AnswerResponse {
        topic: synthesis.topic,
        summary: synthesis.summary,
        answer: synthesis.answer,
        source_citations: synthesis.citations,
        receipt: Some(ReceiptView {
            receipt_id,
            registry_tx_hash: receipt_result.tx_hash,
            registry_contract: receipt_result.registry_contract,
            chain_id: receipt_result.chain_id,
        }),
        total_paid: "$0.05 USDC".to_string(),
        latency_sec: latency,
    };

    (StatusCode::OK, Json(resp)).into_response()
}
