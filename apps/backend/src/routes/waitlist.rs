use crate::db::join_waitlist;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct WaitlistPayload {
    pub email: String,
}

pub async fn waitlist_handler(Json(payload): Json<WaitlistPayload>) -> impl IntoResponse {
    let email = payload.email.trim();
    if !email.contains('@') || !email.contains('.') {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "Invalid email address" }))).into_response();
    }

    let joined = join_waitlist(email);
    (StatusCode::OK, Json(serde_json::json!({ "joined": joined }))).into_response()
}
