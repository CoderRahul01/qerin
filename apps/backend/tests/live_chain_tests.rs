use qerin_backend_rs::blockchain::client::{eth_call, rpc_call};
use qerin_backend_rs::blockchain::networks::{get_network_config, SupportedNetwork};
use qerin_backend_rs::blockchain::rails::{solana_rail, WalletEnv};

#[tokio::test]
async fn test_live_base_mainnet_rpc() {
    let base = get_network_config(SupportedNetwork::Mainnet);
    let chain_id_hex: Option<String> = rpc_call(&base.rpc_url, "eth_chainId", serde_json::json!([])).await.unwrap();
    assert!(chain_id_hex.is_some(), "Base RPC failed to return chainId");
    let chain_id = u64::from_str_radix(chain_id_hex.unwrap().trim_start_matches("0x"), 16).unwrap();
    assert_eq!(chain_id, 8453, "Base chainId mismatch");

    let block_hex: Option<String> = rpc_call(&base.rpc_url, "eth_blockNumber", serde_json::json!([])).await.unwrap();
    assert!(block_hex.is_some(), "Base RPC failed to return blockNumber");
    let block = u64::from_str_radix(block_hex.unwrap().trim_start_matches("0x"), 16).unwrap();
    assert!(block > 20_000_000, "Base block number seems invalid: {}", block);

    // Read Base USDC decimals (0x313ce567)
    let usdc = base.usdc.expect("Base USDC address not set");
    let decimals_hex = eth_call(&base.rpc_url, &usdc, "0x313ce567").await.expect("Failed to read Base USDC decimals");
    let decimals = u64::from_str_radix(decimals_hex.trim_start_matches("0x"), 16).unwrap();
    assert_eq!(decimals, 6, "Base USDC decimals mismatch");
}

#[tokio::test]
async fn test_live_arbitrum_one_rpc() {
    let arb = get_network_config(SupportedNetwork::Arbitrum);
    let chain_id_hex: Option<String> = rpc_call(&arb.rpc_url, "eth_chainId", serde_json::json!([])).await.unwrap();
    assert!(chain_id_hex.is_some(), "Arbitrum RPC failed to return chainId");
    let chain_id = u64::from_str_radix(chain_id_hex.unwrap().trim_start_matches("0x"), 16).unwrap();
    assert_eq!(chain_id, 42161, "Arbitrum chainId mismatch");

    let block_hex: Option<String> = rpc_call(&arb.rpc_url, "eth_blockNumber", serde_json::json!([])).await.unwrap();
    assert!(block_hex.is_some(), "Arbitrum RPC failed to return blockNumber");
    let block = u64::from_str_radix(block_hex.unwrap().trim_start_matches("0x"), 16).unwrap();
    assert!(block > 200_000_000, "Arbitrum block number seems invalid: {}", block);

    // Read Arbitrum native USDC decimals (0x313ce567)
    let usdc = arb.usdc.expect("Arbitrum USDC address not set");
    let decimals_hex = eth_call(&arb.rpc_url, &usdc, "0x313ce567").await.expect("Failed to read Arbitrum USDC decimals");
    let decimals = u64::from_str_radix(decimals_hex.trim_start_matches("0x"), 16).unwrap();
    assert_eq!(decimals, 6, "Arbitrum USDC decimals mismatch");
}

#[tokio::test]
async fn test_live_botchain_mainnet_rpc() {
    let bot = get_network_config(SupportedNetwork::Botchain);
    let chain_id_hex: Option<String> = rpc_call(&bot.rpc_url, "eth_chainId", serde_json::json!([])).await.unwrap();
    assert!(chain_id_hex.is_some(), "BOT Chain RPC failed to return chainId");
    let chain_id = u64::from_str_radix(bot_chain_id_clean(&chain_id_hex.unwrap()), 16).unwrap();
    assert_eq!(chain_id, 677, "BOT Chain chainId mismatch");
}

fn bot_chain_id_clean(raw: &str) -> &str {
    raw.trim_start_matches("0x")
}

#[tokio::test]
async fn test_live_solana_rpc() {
    let sol = solana_rail(WalletEnv::Mainnet);
    let client = reqwest::Client::new();
    let res = client
        .post(&sol.rpc_url)
        .json(&serde_json::json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getSlot"
        }))
        .send()
        .await;

    if let Ok(resp) = res {
        if resp.status().is_success() {
            let json: serde_json::Value = resp.json().await.unwrap();
            let slot = json.get("result").and_then(|r| r.as_u64());
            assert!(slot.is_some(), "Solana RPC returned unexpected slot response");
        }
    }
}
