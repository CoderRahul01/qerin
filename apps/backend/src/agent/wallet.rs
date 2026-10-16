use crate::blockchain::client::get_usdc_balance;
use crate::blockchain::rails::{get_rail, RailId};
use crate::blockchain::solana::get_solana_usdc_balance;
use serde::{Deserialize, Serialize};

pub fn agent_wallet_name(owner_address: &str) -> String {
    let clean = owner_address.to_lowercase().replace("0x", "");
    let prefix: String = clean.chars().take(30).collect();
    format!("qerin-{}", prefix)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RailWalletView {
    pub rail: String,
    pub name: String,
    pub family: String,
    pub testnet: bool,
    pub address: Option<String>,
    pub usdc: Option<f64>,
    pub explorer_url: Option<String>,
    pub research_ready: bool,
}

pub async fn read_wallet_balance(rail_id: RailId, wallet_address: &str) -> Option<f64> {
    let rail = get_rail(rail_id.as_str())?;
    match rail_id {
        RailId::Base | RailId::Arbitrum => {
            get_usdc_balance(&rail.rpc_url, &rail.usdc, wallet_address).await
        }
        RailId::Solana => {
            get_solana_usdc_balance(&rail.rpc_url, &rail.usdc, wallet_address).await
        }
    }
}
