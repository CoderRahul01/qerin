use super::client::{get_transaction, get_transaction_receipt};
use super::networks::{get_network_config, parse_network, SupportedNetwork};
use k256::ecdsa::{RecoveryId, Signature, VerifyingKey};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sha3::{Digest, Keccak256};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

pub const ERC20_DECIMALS: f64 = 1_000_000.0;
pub const NATIVE_DECIMALS: f64 = 1e18;
pub const TRANSFER_TOPIC0: &str = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
pub const WBOT_ADDRESS: &str = "0xD5452816194a3784dBa983426cCe7c122F4abd30";

static BOT_PRICE_CACHE: AtomicU64 = AtomicU64::new(0);
static BOT_PRICE_TS: AtomicU64 = AtomicU64::new(0);
static ETH_PRICE_CACHE: AtomicU64 = AtomicU64::new(0);
static ETH_PRICE_TS: AtomicU64 = AtomicU64::new(0);

fn current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

pub async fn fetch_live_bot_price() -> Result<f64, String> {
    let now = current_timestamp();
    let ts = BOT_PRICE_TS.load(Ordering::Relaxed);
    if now.saturating_sub(ts) < 300 {
        let cached = BOT_PRICE_CACHE.load(Ordering::Relaxed);
        if cached > 0 {
            return Ok(f64::from_bits(cached));
        }
    }

    let client = Client::builder().timeout(Duration::from_secs(4)).build().map_err(|e| e.to_string())?;
    let url = format!("https://dex-wallet.botchain.ai/api/graph/price?token={}", WBOT_ADDRESS);
    let res = client.get(&url).send().await.map_err(|e| e.to_string())?;

    #[derive(Deserialize)]
    struct Resp {
        data: Option<PriceData>,
    }
    #[derive(Deserialize)]
    struct PriceData {
        price: Option<String>,
    }

    let body: Resp = res.json().await.map_err(|e| e.to_string())?;
    let price: f64 = body.data.and_then(|d| d.price).and_then(|p| p.parse().ok()).unwrap_or(0.0);

    if price > 0.0 {
        BOT_PRICE_CACHE.store(price.to_bits(), Ordering::Relaxed);
        BOT_PRICE_TS.store(now, Ordering::Relaxed);
        Ok(price)
    } else {
        Err("Live BOT price unavailable".to_string())
    }
}

pub async fn fetch_live_eth_price() -> Result<f64, String> {
    let now = current_timestamp();
    let ts = ETH_PRICE_TS.load(Ordering::Relaxed);
    if now.saturating_sub(ts) < 300 {
        let cached = ETH_PRICE_CACHE.load(Ordering::Relaxed);
        if cached > 0 {
            return Ok(f64::from_bits(cached));
        }
    }

    let client = Client::builder().timeout(Duration::from_secs(4)).build().map_err(|e| e.to_string())?;
    let res = client.get("https://api.coinbase.com/v2/prices/ETH-USD/spot").send().await.map_err(|e| e.to_string())?;

    #[derive(Deserialize)]
    struct Resp {
        data: Option<SpotData>,
    }
    #[derive(Deserialize)]
    struct SpotData {
        amount: Option<String>,
    }

    let body: Resp = res.json().await.map_err(|e| e.to_string())?;
    let price: f64 = body.data.and_then(|d| d.amount).and_then(|p| p.parse().ok()).unwrap_or(0.0);

    if price > 0.0 {
        ETH_PRICE_CACHE.store(price.to_bits(), Ordering::Relaxed);
        ETH_PRICE_TS.store(now, Ordering::Relaxed);
        Ok(price)
    } else {
        Err("Live ETH price unavailable".to_string())
    }
}

pub fn build_topup_sign_message(account_id: &str, tx_hash: &str) -> String {
    format!("Qerin top-up confirmation\naccount:{}\ntx:{}", account_id, tx_hash)
}

pub fn recover_eth_address(message: &str, sig_hex: &str) -> Result<String, String> {
    let clean_sig = sig_hex.trim_start_matches("0x");
    let sig_bytes = hex::decode(clean_sig).map_err(|e| format!("Invalid hex: {}", e))?;
    if sig_bytes.len() != 65 {
        return Err("Signature must be 65 bytes".to_string());
    }

    let mut v = sig_bytes[64];
    if v >= 27 {
        v -= 27;
    }
    let recovery_id = RecoveryId::try_from(v).map_err(|e| format!("Invalid recovery ID: {}", e))?;
    let signature = Signature::from_slice(&sig_bytes[0..64]).map_err(|e| format!("Invalid signature: {}", e))?;

    let prefix = format!("\x19Ethereum Signed Message:\n{}", message.len());
    let mut hasher = Keccak256::new();
    hasher.update(prefix.as_bytes());
    hasher.update(message.as_bytes());
    let msg_hash = hasher.finalize();

    let recovered_key = VerifyingKey::recover_from_prehash(&msg_hash, &signature, recovery_id)
        .map_err(|e| format!("Key recovery failed: {}", e))?;

    let uncompressed = recovered_key.to_encoded_point(false);
    let public_bytes = &uncompressed.as_bytes()[1..]; // skip 0x04 tag
    let mut pub_hasher = Keccak256::new();
    pub_hasher.update(public_bytes);
    let pub_hash = pub_hasher.finalize();

    let address = format!("0x{}", hex::encode(&pub_hash[12..]));
    Ok(address.to_lowercase())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CryptoDepositResult {
    pub verified: bool,
    pub amount_usd: f64,
    pub reason: Option<String>,
}

pub async fn verify_crypto_deposit(
    account_id: &str,
    tx_hash: &str,
    signature: &str,
    network_name: Option<&str>,
) -> CryptoDepositResult {
    let network = parse_network(network_name);
    let config = get_network_config(network);

    let message = build_topup_sign_message(account_id, tx_hash);
    let signer = match recover_eth_address(&message, signature) {
        Ok(addr) => addr,
        Err(_) => {
            return CryptoDepositResult {
                verified: false,
                amount_usd: 0.0,
                reason: Some("Could not verify wallet signature".to_string()),
            };
        }
    };

    let (receipt, tx) = tokio::join!(
        get_transaction_receipt(&config.rpc_url, tx_hash),
        get_transaction(&config.rpc_url, tx_hash)
    );

    let (receipt, tx) = match (receipt, tx) {
        (Some(r), Some(t)) => (r, t),
        _ => {
            return CryptoDepositResult {
                verified: false,
                amount_usd: 0.0,
                reason: Some("Transaction not found on-chain yet — try again shortly".to_string()),
            };
        }
    };

    if receipt.status != "0x1" {
        return CryptoDepositResult {
            verified: false,
            amount_usd: 0.0,
            reason: Some("Transaction did not succeed".to_string()),
        };
    }

    if receipt.from.to_lowercase() != signer {
        return CryptoDepositResult {
            verified: false,
            amount_usd: 0.0,
            reason: Some("Signature does not match transaction sender".to_string()),
        };
    }

    let qerin_address = std::env::var("QERIN_TREASURY_ADDRESS")
        .ok()
        .map(|a| a.to_lowercase());

    let mut transferred_usd = 0.0;

    // 1. Native coin transfer
    let tx_to = tx.to.unwrap_or_default().to_lowercase();
    let native_hex = tx.value.trim_start_matches("0x");
    let native_val = u128::from_str_radix(if native_hex.is_empty() { "0" } else { native_hex }, 16).unwrap_or(0);

    if let Some(target) = &qerin_address {
        if tx_to == *target && native_val > 0 {
            let native_amount = (native_val as f64) / NATIVE_DECIMALS;
            match network {
                SupportedNetwork::Botchain | SupportedNetwork::BotchainTestnet => {
                    if let Ok(bot_price) = fetch_live_bot_price().await {
                        transferred_usd = native_amount * bot_price;
                    }
                }
                _ => {
                    if let Ok(eth_price) = fetch_live_eth_price().await {
                        transferred_usd = native_amount * eth_price;
                    }
                }
            }
        }
    }

    // 2. ERC-20 token transfer
    if transferred_usd == 0.0 {
        let token_addr = config.usdc.as_ref().or(config.usdt.as_ref()).map(|s| s.to_lowercase());
        for log in receipt.logs {
            if let Some(expected) = &token_addr {
                if log.address.to_lowercase() == *expected
                    && !log.topics.is_empty()
                    && log.topics[0].to_lowercase() == TRANSFER_TOPIC0
                    && log.topics.len() >= 3
                {
                    let to_topic = &log.topics[2];
                    let to_addr = if to_topic.len() >= 40 {
                        format!("0x{}", &to_topic[to_topic.len() - 40..]).to_lowercase()
                    } else {
                        "".to_string()
                    };

                    if let Some(target) = &qerin_address {
                        if to_addr == *target {
                            let data_hex = log.data.trim_start_matches("0x");
                            let val = u128::from_str_radix(if data_hex.is_empty() { "0" } else { data_hex }, 16).unwrap_or(0);
                            transferred_usd = (val as f64) / ERC20_DECIMALS;
                            break;
                        }
                    }
                }
            }
        }
    }

    if transferred_usd > 0.0 {
        CryptoDepositResult {
            verified: true,
            amount_usd: transferred_usd,
            reason: None,
        }
    } else {
        CryptoDepositResult {
            verified: false,
            amount_usd: 0.0,
            reason: Some("No valid transfer to Qerin's wallet found in transaction".to_string()),
        }
    }
}
