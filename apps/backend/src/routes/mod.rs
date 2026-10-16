pub mod answer;
pub mod wallet;
pub mod accounts;
pub mod waitlist;
pub mod analytics;
pub mod admin;

use axum::routing::{get, post};
use axum::Router;
use tower_http::cors::{Any, CorsLayer};

pub fn build_app() -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .route("/v1/answer", post(answer::answer_handler))
        .route("/v1/paid/answer", post(answer::answer_handler))
        .route("/v1/wallet", get(wallet::get_wallet_view))
        .route("/v1/wallet/provision", post(wallet::provision_wallet))
        .route("/v1/wallet/policy/prepare", post(wallet::policy_prepare))
        .route("/v1/wallet/policy/confirm", post(wallet::policy_confirm))
        .route("/v1/wallet/withdraw/prepare", post(wallet::withdraw_prepare))
        .route("/v1/wallet/withdraw/confirm", post(wallet::withdraw_confirm))
        .route("/v1/accounts/me", get(accounts::get_account_me))
        .route("/v1/accounts/balance", get(accounts::get_account_balance))
        .route("/v1/accounts/topup", post(accounts::account_topup))
        .route("/v1/waitlist", post(waitlist::waitlist_handler))
        .route("/v1/analytics", get(analytics::analytics_handler))
        .route("/v1/admin/wallet-config", get(admin::wallet_config_handler))
        .layer(cors)
}
