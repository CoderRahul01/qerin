use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SupportedNetwork {
    Mainnet,
    Testnet,
    Arbitrum,
    ArbitrumSepolia,
    Botchain,
    BotchainTestnet,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkConfig {
    pub name: String,
    pub chain_id: u64,
    pub caip2: String,
    pub currency: String,
    pub usdc: Option<String>,
    pub usdt: Option<String>,
    pub wbot: Option<String>,
    pub rpc_url: String,
    pub explorer_tx_base: String,
    pub explorer_address_base: String,
}

impl NetworkConfig {
    pub fn explorer_tx_url(&self, hash: &str) -> String {
        format!("{}/{}", self.explorer_tx_base, hash)
    }

    pub fn explorer_address_url(&self, address: &str) -> String {
        format!("{}/{}", self.explorer_address_base, address)
    }
}

pub fn get_network_config(network: SupportedNetwork) -> NetworkConfig {
    match network {
        SupportedNetwork::Mainnet => NetworkConfig {
            name: "Base Mainnet".to_string(),
            chain_id: 8453,
            caip2: "eip155:8453".to_string(),
            currency: "ETH".to_string(),
            usdc: Some("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913".to_string()),
            usdt: None,
            wbot: None,
            rpc_url: std::env::var("QERIN_BASE_RPC_URL").unwrap_or_else(|_| "https://mainnet.base.org".to_string()),
            explorer_tx_base: "https://basescan.org/tx".to_string(),
            explorer_address_base: "https://basescan.org/address".to_string(),
        },
        SupportedNetwork::Testnet => NetworkConfig {
            name: "Base Sepolia".to_string(),
            chain_id: 84532,
            caip2: "eip155:84532".to_string(),
            currency: "ETH".to_string(),
            usdc: Some("0x036CbD53842c5426634e7929541eC2318f3dCF7e".to_string()),
            usdt: None,
            wbot: None,
            rpc_url: std::env::var("QERIN_BASE_RPC_URL").unwrap_or_else(|_| "https://sepolia.base.org".to_string()),
            explorer_tx_base: "https://sepolia.basescan.org/tx".to_string(),
            explorer_address_base: "https://sepolia.basescan.org/address".to_string(),
        },
        SupportedNetwork::Arbitrum => NetworkConfig {
            name: "Arbitrum One".to_string(),
            chain_id: 42161,
            caip2: "eip155:42161".to_string(),
            currency: "ETH".to_string(),
            usdc: Some("0xaf88d065e77c8cC2239327C5EDb3A432268e5831".to_string()),
            usdt: None,
            wbot: None,
            rpc_url: std::env::var("QERIN_ARBITRUM_RPC_URL").unwrap_or_else(|_| "https://arb1.arbitrum.io/rpc".to_string()),
            explorer_tx_base: "https://arbiscan.io/tx".to_string(),
            explorer_address_base: "https://arbiscan.io/address".to_string(),
        },
        SupportedNetwork::ArbitrumSepolia => NetworkConfig {
            name: "Arbitrum Sepolia".to_string(),
            chain_id: 421614,
            caip2: "eip155:421614".to_string(),
            currency: "ETH".to_string(),
            usdc: Some("0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d".to_string()),
            usdt: None,
            wbot: None,
            rpc_url: std::env::var("QERIN_ARBITRUM_RPC_URL").unwrap_or_else(|_| "https://sepolia-rollup.arbitrum.io/rpc".to_string()),
            explorer_tx_base: "https://sepolia.arbiscan.io/tx".to_string(),
            explorer_address_base: "https://sepolia.arbiscan.io/address".to_string(),
        },
        SupportedNetwork::Botchain => NetworkConfig {
            name: "BOT Chain Mainnet".to_string(),
            chain_id: 677,
            caip2: "eip155:677".to_string(),
            currency: "BOT".to_string(),
            usdc: None,
            usdt: Some("0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C".to_string()),
            wbot: Some("0xD5452816194a3784dBa983426cCe7c122F4abd30".to_string()),
            rpc_url: std::env::var("QERIN_BOTCHAIN_RPC_URL").unwrap_or_else(|_| "https://rpc.botchain.ai".to_string()),
            explorer_tx_base: "https://scan.botchain.ai/tx".to_string(),
            explorer_address_base: "https://scan.botchain.ai/address".to_string(),
        },
        SupportedNetwork::BotchainTestnet => NetworkConfig {
            name: "BOT Chain Testnet".to_string(),
            chain_id: 968,
            caip2: "eip155:968".to_string(),
            currency: "BOT".to_string(),
            usdc: None,
            usdt: None,
            wbot: None,
            rpc_url: std::env::var("QERIN_BOTCHAIN_TESTNET_RPC_URL").unwrap_or_else(|_| "https://rpc.bohr.life".to_string()),
            explorer_tx_base: "https://scan.botchain.ai/tx".to_string(),
            explorer_address_base: "https://scan.botchain.ai/address".to_string(),
        },
    }
}

pub fn get_active_network() -> SupportedNetwork {
    match std::env::var("QERIN_NETWORK").as_deref() {
        Ok("arbitrum") => SupportedNetwork::Arbitrum,
        Ok("arbitrum_sepolia") => SupportedNetwork::ArbitrumSepolia,
        Ok("botchain") => SupportedNetwork::Botchain,
        Ok("botchain_testnet") => SupportedNetwork::BotchainTestnet,
        Ok("testnet") => SupportedNetwork::Testnet,
        _ => SupportedNetwork::Mainnet,
    }
}

pub fn parse_network(name: Option<&str>) -> SupportedNetwork {
    match name {
        Some("arbitrum") => SupportedNetwork::Arbitrum,
        Some("arbitrum_sepolia") => SupportedNetwork::ArbitrumSepolia,
        Some("botchain") => SupportedNetwork::Botchain,
        Some("botchain_testnet") => SupportedNetwork::BotchainTestnet,
        Some("testnet") => SupportedNetwork::Testnet,
        Some("mainnet") => SupportedNetwork::Mainnet,
        _ => get_active_network(),
    }
}

pub fn get_registry_address(network: SupportedNetwork) -> Option<String> {
    let key = match network {
        SupportedNetwork::Mainnet => "QERIN_REGISTRY_ADDRESS_MAINNET",
        SupportedNetwork::Testnet => "QERIN_REGISTRY_ADDRESS_TESTNET",
        SupportedNetwork::Arbitrum => "QERIN_REGISTRY_ADDRESS_ARBITRUM",
        SupportedNetwork::ArbitrumSepolia => "QERIN_REGISTRY_ADDRESS_ARBITRUM_SEPOLIA",
        SupportedNetwork::Botchain => "QERIN_REGISTRY_ADDRESS_BOTCHAIN",
        SupportedNetwork::BotchainTestnet => "QERIN_REGISTRY_ADDRESS_BOTCHAIN_TESTNET",
    };
    std::env::var(key).ok().or_else(|| std::env::var("QERIN_REGISTRY_ADDRESS").ok())
}
