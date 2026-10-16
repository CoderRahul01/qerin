use qerin_backend_rs::agent::policy::{validate_policy_input, AgentPolicy, AgentState, PolicyViolation};
use qerin_backend_rs::agent::wallet::agent_wallet_name;
use qerin_backend_rs::blockchain::networks::{get_network_config, SupportedNetwork};
use qerin_backend_rs::blockchain::rails::{arbitrum_rail, atomic_to_usd, base_rail, usd_to_atomic, WalletEnv};
use qerin_backend_rs::blockchain::topup::build_topup_sign_message;
use qerin_backend_rs::core::selector::select_sources;
use qerin_backend_rs::db::{credit_balance, debit_balance, get_balance, record_deposit};

#[test]
fn test_arbitrum_network_config() {
    let arb = get_network_config(SupportedNetwork::Arbitrum);
    assert_eq!(arb.chain_id, 42161);
    assert_eq!(arb.currency, "ETH");
    assert_eq!(arb.caip2, "eip155:42161");
    assert_eq!(arb.usdc, Some("0xaf88d065e77c8cC2239327C5EDb3A432268e5831".to_string()));
    assert!(arb.explorer_tx_url("0x123").contains("arbiscan.io/tx/0x123"));

    let arb_sep = get_network_config(SupportedNetwork::ArbitrumSepolia);
    assert_eq!(arb_sep.chain_id, 421614);
    assert_eq!(arb_sep.caip2, "eip155:421614");
}

#[test]
fn test_rails_and_conversions() {
    let base = base_rail(WalletEnv::Mainnet);
    assert_eq!(base.caip2, "eip155:8453");
    assert!(!base.testnet);

    let arb = arbitrum_rail(WalletEnv::Mainnet);
    assert_eq!(arb.caip2, "eip155:42161");
    assert_eq!(arb.usdc, "0xaf88d065e77c8cC2239327C5EDb3A432268e5831");

    assert_eq!(usd_to_atomic(1.0), 1_000_000);
    assert_eq!(usd_to_atomic(0.05), 50_000);
    assert_eq!(atomic_to_usd(1_000_000), 1.0);
    assert_eq!(atomic_to_usd(50_000), 0.05);
}

#[test]
fn test_source_selection_heuristic() {
    // Academic & research queries route to arXiv
    let arxiv_res = select_sources("What are the latest arXiv research paper findings on LLM reasoning?");
    assert!(arxiv_res.contains(&"arxiv".to_string()));

    // Crypto queries route to specialized sources
    let crypto_news = select_sources("What happened in crypto news today?");
    assert!(crypto_news.contains(&"cryptoslate".to_string()));

    let dex_pool = select_sources("What is the DEX pool liquidity for Arbitrum?");
    assert!(dex_pool.contains(&"coingecko".to_string()));

    // General queries route to superhighway
    let gen_res = select_sources("What was the history of the roman empire?");
    assert_eq!(gen_res, vec!["superhighway".to_string()]);
}

#[test]
fn test_agent_policy_enforcement() {
    let valid = validate_policy_input(Some(0.25), Some(5.0), Some(false)).unwrap();
    assert_eq!(valid.per_query_usd, 0.25);
    assert_eq!(valid.daily_usd, 5.0);
    assert!(!valid.paused);

    // Rejects per_query > daily
    assert!(validate_policy_input(Some(10.0), Some(2.0), Some(false)).is_err());

    let state = AgentState {
        policy: AgentPolicy {
            per_query_usd: 0.25,
            daily_usd: 2.0,
            paused: false,
        },
        spent_today_usd: 1.90,
        fee_owed_usd: 0.0,
        activity: vec![],
    };

    // Allows up to daily limit
    assert!(state.check_policy(0.10).is_ok());

    // Refuses when daily limit exceeded
    assert!(matches!(state.check_policy(0.15), Err(PolicyViolation::DailyLimit(_))));

    // Refuses when paused
    let paused_state = AgentState {
        policy: AgentPolicy {
            paused: true,
            ..state.policy
        },
        ..state
    };
    assert_eq!(paused_state.check_policy(0.05), Err(PolicyViolation::AgentPaused));
}

#[test]
fn test_deterministic_wallet_naming() {
    let owner = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
    let name = agent_wallet_name(owner);
    assert_eq!(name, "qerin-d8da6bf26964af9d7eed9e03e53415");
    assert!(name.len() <= 36);
}

#[test]
fn test_crypto_deposit_message() {
    let msg = build_topup_sign_message("0xabc123", "0xtxhash456");
    assert_eq!(msg, "Qerin top-up confirmation\naccount:0xabc123\ntx:0xtxhash456");
}

#[test]
fn test_database_ledger_and_deposit_idempotency() {
    let account = "0xuserledger1";
    assert_eq!(get_balance(account), 0.0);

    let cred = credit_balance(account, 10.0);
    assert_eq!(cred, 10.0);
    assert_eq!(get_balance(account), 10.0);

    let deb = debit_balance(account, 4.0);
    assert_eq!(deb, Some(6.0));
    assert_eq!(get_balance(account), 6.0);

    // Overdraft refused
    assert_eq!(debit_balance(account, 10.0), None);

    // Deposit idempotency
    let dep1 = record_deposit(account, "0xhash999", 5.0, "8453").unwrap();
    assert_eq!(dep1, 11.0);

    // Retrying same tx on same account is an idempotent no-op
    let dep2 = record_deposit(account, "0xhash999", 5.0, "8453").unwrap();
    assert_eq!(dep2, 11.0);

    // Retrying same tx on different account is rejected
    let diff_account = "0xuserattacker";
    assert!(record_deposit(diff_account, "0xhash999", 5.0, "8453").is_err());
}
