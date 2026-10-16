use crate::auth::guards::check_internal_secret;
use crate::config::get_wallet_config_report;
use axum::http::{HeaderMap, StatusCode};
use axum::response::IntoResponse;
use axum::Json;

pub async fn wallet_config_handler(headers: HeaderMap) -> impl IntoResponse {
    if !check_internal_secret(&headers) {
        return (StatusCode::FORBIDDEN, Json(serde_json::json!({ "error": "Forbidden" }))).into_response();
    }
    let report = get_wallet_config_report();
    (StatusCode::OK, Json(report)).into_response()
}
