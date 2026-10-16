use reqwest::Client;
use serde_json::Value;
use std::time::Duration;

pub async fn get_solana_usdc_balance(rpc_url: &str, mint_address: &str, owner_address: &str) -> Option<f64> {
    let client = Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
        .ok()?;

    let req = serde_json::json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getTokenAccountsByOwner",
        "params": [
            owner_address,
            { "mint": mint_address },
            { "encoding": "jsonParsed", "commitment": "confirmed" }
        ]
    });

    let res = client.post(rpc_url).json(&req).send().await.ok()?;
    if !res.status().is_success() {
        return None;
    }

    let json: Value = res.json().await.ok()?;
    let accounts = json.get("result")?.get("value")?.as_array()?;

    let mut total_atomic: u64 = 0;
    for entry in accounts {
        let amount_str = entry
            .pointer("/account/data/parsed/info/tokenAmount/amount")?
            .as_str()?;
        if let Ok(val) = amount_str.parse::<u64>() {
            total_atomic += val;
        }
    }

    Some((total_atomic as f64) / 1_000_000.0)
}
