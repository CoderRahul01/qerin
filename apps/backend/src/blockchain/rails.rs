use serde::{Deserialize, Serialize};

pub const USDC_DECIMALS: u32 = 6;
pub const USDC_ATOMIC: f64 = 1_000_000.0;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RailId {
    Base,
    Arbitrum,
    Solana,
}

impl RailId {
    pub fn as_str(&self) -> &'static str {
        match self {
            RailId::Base => "base",
            RailId::Arbitrum => "arbitrum",
            RailId::Solana => "solana",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RailFamily {
    Evm,
    Svm,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum WalletEnv {
    Mainnet,
    Testnet,
}

pub fn get_wallet_env() -> WalletEnv {
    if std::env::var("QERIN_WALLET_ENV").as_deref() == Ok("testnet") {
        WalletEnv::Testnet
    } else {
        WalletEnv::Mainnet
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentRail {
    pub id: RailId,
    pub family: RailFamily,
    pub name: String,
    pub caip2: String,
    pub cdp_network: String,
    pub usdc: String,
    pub rpc_url: String,
    pub testnet: bool,
    pub explorer_tx_base: String,
    pub explorer_address_base: String,
}

impl PaymentRail {
    pub fn explorer_tx_url(&self, tx: &str) -> String {
        format!("{}/{}", self.explorer_tx_base, tx)
    }

    pub fn explorer_address_url(&self, address: &str) -> String {
        format!("{}/{}", self.explorer_address_base, address)
    }
}

pub fn usd_to_atomic(usd: f64) -> u64 {
    (usd * USDC_ATOMIC).round() as u64
}

pub fn atomic_to_usd(atomic: u64) -> f64 {
    (atomic as f64) / USDC_ATOMIC
}

pub fn base_rail(env: WalletEnv) -> PaymentRail {
    match env {
        WalletEnv::Testnet => PaymentRail {
            id: RailId::Base,
            family: RailFamily::Evm,
            name: "Base Sepolia".to_string(),
            caip2: "eip155:84532".to_string(),
            cdp_network: "base-sepolia".to_string(),
            usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e".to_string(),
            rpc_url: std::env::var("QERIN_BASE_RPC_URL").unwrap_or_else(|_| "https://sepolia.base.org".to_string()),
            testnet: true,
            explorer_tx_base: "https://sepolia.basescan.org/tx".to_string(),
            explorer_address_base: "https://sepolia.basescan.org/address".to_string(),
        },
        WalletEnv::Mainnet => PaymentRail {
            id: RailId::Base,
            family: RailFamily::Evm,
            name: "Base".to_string(),
            caip2: "eip155:8453".to_string(),
            cdp_network: "base".to_string(),
            usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913".to_string(),
            rpc_url: std::env::var("QERIN_BASE_RPC_URL").unwrap_or_else(|_| "https://mainnet.base.org".to_string()),
            testnet: false,
            explorer_tx_base: "https://basescan.org/tx".to_string(),
            explorer_address_base: "https://basescan.org/address".to_string(),
        },
    }
}

pub fn arbitrum_rail(env: WalletEnv) -> PaymentRail {
    match env {
        WalletEnv::Testnet => PaymentRail {
            id: RailId::Arbitrum,
            family: RailFamily::Evm,
            name: "Arbitrum Sepolia".to_string(),
            caip2: "eip155:421614".to_string(),
            cdp_network: "arbitrum-sepolia".to_string(),
            usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d".to_string(),
            rpc_url: std::env::var("QERIN_ARBITRUM_RPC_URL").unwrap_or_else(|_| "https://sepolia-rollup.arbitrum.io/rpc".to_string()),
            testnet: true,
            explorer_tx_base: "https://sepolia.arbiscan.io/tx".to_string(),
            explorer_address_base: "https://sepolia.arbiscan.io/address".to_string(),
        },
        WalletEnv::Mainnet => PaymentRail {
            id: RailId::Arbitrum,
            family: RailFamily::Evm,
            name: "Arbitrum One".to_string(),
            caip2: "eip155:42161".to_string(),
            cdp_network: "arbitrum".to_string(),
            usdc: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831".to_string(),
            rpc_url: std::env::var("QERIN_ARBITRUM_RPC_URL").unwrap_or_else(|_| "https://arb1.arbitrum.io/rpc".to_string()),
            testnet: false,
            explorer_tx_base: "https://arbiscan.io/tx".to_string(),
            explorer_address_base: "https://arbiscan.io/address".to_string(),
        },
    }
}

pub fn solana_rail(env: WalletEnv) -> PaymentRail {
    let devnet = env == WalletEnv::Testnet;
    let (rpc, tx_base, addr_base) = if devnet {
        (
            std::env::var("QERIN_SOLANA_RPC_URL").unwrap_or_else(|_| "https://api.devnet.solana.com".to_string()),
            "https://explorer.solana.com/tx".to_string(),
            "https://explorer.solana.com/address".to_string(),
        )
    } else {
        (
            std::env::var("QERIN_SOLANA_RPC_URL").unwrap_or_else(|_| "https://api.mainnet-beta.solana.com".to_string()),
            "https://explorer.solana.com/tx".to_string(),
            "https://explorer.solana.com/address".to_string(),
        )
    };

    PaymentRail {
        id: RailId::Solana,
        family: RailFamily::Svm,
        name: if devnet { "Solana Devnet".to_string() } else { "Solana".to_string() },
        caip2: if devnet { "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1".to_string() } else { "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp".to_string() },
        cdp_network: if devnet { "solana-devnet".to_string() } else { "solana".to_string() },
        usdc: if devnet { "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU".to_string() } else { "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v".to_string() },
        rpc_url: rpc,
        testnet: devnet,
        explorer_tx_base: tx_base,
        explorer_address_base: addr_base,
    }
}

pub fn get_rails() -> Vec<PaymentRail> {
    let env = get_wallet_env();
    let mut rails = vec![base_rail(env)];
    if std::env::var("QERIN_ARBITRUM_WALLETS").as_deref() == Ok("on")
        || std::env::var("QERIN_NETWORK").as_deref() == Ok("arbitrum")
        || std::env::var("QERIN_NETWORK").as_deref() == Ok("arbitrum_sepolia")
    {
        rails.push(arbitrum_rail(env));
    }
    if std::env::var("QERIN_SOLANA_WALLETS").as_deref() != Ok("off") {
        rails.push(solana_rail(env));
    }
    rails
}

pub fn get_rail(id: &str) -> Option<PaymentRail> {
    get_rails().into_iter().find(|r| r.id.as_str() == id)
}

pub fn get_rail_by_caip2(caip2: &str) -> Option<PaymentRail> {
    get_rails().into_iter().find(|r| r.caip2 == caip2)
}
