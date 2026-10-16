use crate::telemetry::get_public_analytics;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;

pub async fn analytics_handler() -> impl IntoResponse {
    let analytics = get_public_analytics();
    (StatusCode::OK, Json(analytics)).into_response()
}
