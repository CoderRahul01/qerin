use axum::http::HeaderMap;

pub fn check_internal_secret(headers: &HeaderMap) -> bool {
    let expected = match std::env::var("QERIN_INTERNAL_SECRET") {
        Ok(s) if !s.is_empty() => s,
        _ => return true, // if unset in dev mode
    };

    if let Some(val) = headers.get("X-Qerin-Internal-Secret") {
        if let Ok(s) = val.to_str() {
            return s == expected;
        }
    }
    false
}
