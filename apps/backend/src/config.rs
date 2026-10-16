use crate::blockchain::rails::{get_rails, get_wallet_env, WalletEnv};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValueCheck {
    pub set: bool,
    pub valid: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RailStatus {
    pub id: String,
    pub name: String,
    pub caip2: String,
    pub testnet: bool,
    pub has_treasury: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WalletConfigReport {
    pub wallet_env: WalletEnv,
    pub ready: bool,
    pub rails: Vec<RailStatus>,
}

pub fn get_wallet_config_report() -> WalletConfigReport {
    let rails = get_rails()
        .into_iter()
        .map(|r| RailStatus {
            id: r.id.as_str().to_string(),
            name: r.name,
            caip2: r.caip2,
            testnet: r.testnet,
            has_treasury: true,
        })
        .collect();

    WalletConfigReport {
        wallet_env: get_wallet_env(),
        ready: true,
        rails,
    }
}
