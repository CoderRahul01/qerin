use crate::blockchain::rails::{usd_to_atomic, PaymentRail};
use super::facilitator::settle_x402_payment;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferResult {
    pub tx_hash: String,
    pub network: String,
}

pub async fn execute_agent_transfer(
    rail: &PaymentRail,
    pay_to: &str,
    amount_usd: f64,
) -> Result<TransferResult, String> {
    if amount_usd <= 0.0 {
        return Err("Transfer amount must be positive".to_string());
    }

    let atomic = usd_to_atomic(amount_usd);
    let outcome = settle_x402_payment(&rail.caip2, atomic, pay_to).await;

    if outcome.success && outcome.transaction.is_some() {
        Ok(TransferResult {
            tx_hash: outcome.transaction.unwrap(),
            network: outcome.network.unwrap_or_else(|| rail.caip2.clone()),
        })
    } else {
        Err(outcome.error_message.unwrap_or_else(|| "Settlement failed".to_string()))
    }
}
