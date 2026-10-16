use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::time::Duration;

#[derive(Debug, Serialize)]
struct JsonRpcRequest<'a> {
    jsonrpc: &'static str,
    id: u64,
    method: &'a str,
    params: Value,
}

#[derive(Debug, Deserialize)]
struct JsonRpcResponse<T> {
    result: Option<T>,
    error: Option<JsonRpcError>,
}

#[derive(Debug, Deserialize)]
struct JsonRpcError {
    message: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RpcLog {
    pub address: String,
    pub topics: Vec<String>,
    pub data: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RpcReceipt {
    pub status: String,
    pub from: String,
    pub logs: Vec<RpcLog>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RpcTransaction {
    pub from: String,
    pub to: Option<String>,
    pub value: String,
}

pub async fn rpc_call<T: for<'de> Deserialize<'de>>(
    rpc_url: &str,
    method: &str,
    params: Value,
) -> Result<Option<T>, String> {
    let client = Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let req = JsonRpcRequest {
        jsonrpc: "2.0",
        id: 1,
        method,
        params,
    };

    let res = client
        .post(rpc_url)
        .json(&req)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Err(format!("RPC HTTP status {}", res.status()));
    }

    let body: JsonRpcResponse<T> = res.json().await.map_err(|e| e.to_string())?;
    if let Some(err) = body.error {
        return Err(err.message);
    }

    Ok(body.result)
}

pub async fn get_transaction_receipt(rpc_url: &str, tx_hash: &str) -> Option<RpcReceipt> {
    rpc_call(rpc_url, "eth_getTransactionReceipt", serde_json::json!([tx_hash]))
        .await
        .ok()
        .flatten()
}

pub async fn get_transaction(rpc_url: &str, tx_hash: &str) -> Option<RpcTransaction> {
    rpc_call(rpc_url, "eth_getTransactionByHash", serde_json::json!([tx_hash]))
        .await
        .ok()
        .flatten()
}

pub async fn eth_call(rpc_url: &str, to: &str, data: &str) -> Option<String> {
    let params = serde_json::json!([
        { "to": to, "data": data },
        "latest"
    ]);
    rpc_call(rpc_url, "eth_call", params).await.ok().flatten()
}

pub async fn get_usdc_balance(rpc_url: &str, token_address: &str, wallet_address: &str) -> Option<f64> {
    let clean_addr = wallet_address.trim_start_matches("0x").to_lowercase();
    let data = format!("0x70a08231{:0>64}", clean_addr);
    let hex_result = eth_call(rpc_url, token_address, &data).await?;
    let hex_clean = hex_result.trim_start_matches("0x");
    if hex_clean.is_empty() {
        return None;
    }
    let atomic = u128::from_str_radix(hex_clean, 16).ok()?;
    Some((atomic as f64) / 1_000_000.0)
}
