use crate::agent::policy::{AgentActivity, AgentPolicy, AgentState};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Mutex;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountRecord {
    pub account_id: String,
    pub balance: f64,
    pub agent_wallet: Option<String>,
    pub agent_solana_wallet: Option<String>,
    pub agent_policy: AgentPolicy,
    pub spent_today_usd: f64,
    pub fee_owed_usd: f64,
    pub activity: Vec<AgentActivity>,
    pub vip_points: u64,
    pub referral_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatVault {
    pub threads: Vec<Value>,
    pub active_thread_id: Option<String>,
    pub deliveries: Vec<Value>,
    pub updated_at: String,
}

#[derive(Default)]
pub struct Database {
    pub accounts: HashMap<String, AccountRecord>,
    pub used_deposits: HashMap<String, String>, // network:tx_hash -> account_id
    pub waitlist: HashMap<String, String>,      // email -> created_at
    pub vaults: HashMap<String, ChatVault>,
    pub spend_log: Vec<Value>,
}

static DB: Mutex<Option<Database>> = Mutex::new(None);

pub fn with_db<F, R>(f: F) -> R
where
    F: FnOnce(&mut Database) -> R,
{
    let mut lock = DB.lock().unwrap();
    if lock.is_none() {
        *lock = Some(Database::default());
    }
    f(lock.as_mut().unwrap())
}

pub fn normalize_account_id(id: Option<&str>) -> String {
    match id {
        Some(s) if !s.trim().is_empty() => s.trim().to_lowercase(),
        _ => Uuid::new_v4().to_string(),
    }
}

pub fn get_or_create_account(account_id: Option<&str>) -> AccountRecord {
    let id = normalize_account_id(account_id);
    with_db(|db| {
        db.accounts
            .entry(id.clone())
            .or_insert_with(|| AccountRecord {
                account_id: id.clone(),
                balance: 0.0,
                agent_wallet: None,
                agent_solana_wallet: None,
                agent_policy: AgentPolicy::default(),
                spent_today_usd: 0.0,
                fee_owed_usd: 0.0,
                activity: Vec::new(),
                vip_points: 120,
                referral_count: 0,
            })
            .clone()
    })
}

pub fn get_balance(account_id: &str) -> f64 {
    let id = account_id.to_lowercase();
    with_db(|db| db.accounts.get(&id).map(|a| a.balance).unwrap_or(0.0))
}

pub fn debit_balance(account_id: &str, amount: f64) -> Option<f64> {
    let id = account_id.to_lowercase();
    with_db(|db| {
        let acc = db.accounts.get_mut(&id)?;
        if acc.balance < amount {
            return None;
        }
        acc.balance -= amount;
        Some(acc.balance)
    })
}

pub fn credit_balance(account_id: &str, amount: f64) -> f64 {
    let id = account_id.to_lowercase();
    with_db(|db| {
        let acc = db.accounts.entry(id.clone()).or_insert_with(|| AccountRecord {
            account_id: id,
            balance: 0.0,
            agent_wallet: None,
            agent_solana_wallet: None,
            agent_policy: AgentPolicy::default(),
            spent_today_usd: 0.0,
            fee_owed_usd: 0.0,
            activity: Vec::new(),
            vip_points: 120,
            referral_count: 0,
        });
        acc.balance += amount;
        acc.balance
    })
}

pub fn record_deposit(
    account_id: &str,
    tx_hash: &str,
    amount_usd: f64,
    network_key: &str,
) -> Result<f64, String> {
    let id = account_id.to_lowercase();
    let global_key = format!("{}:{}", network_key, tx_hash.to_lowercase());

    with_db(|db| {
        if let Some(used_by) = db.used_deposits.get(&global_key) {
            if used_by != &id {
                return Err("This transaction has already been credited to a different account".to_string());
            }
            let bal = db.accounts.get(&id).map(|a| a.balance).unwrap_or(0.0);
            return Ok(bal);
        }

        db.used_deposits.insert(global_key, id.clone());
        let acc = db.accounts.entry(id.clone()).or_insert_with(|| AccountRecord {
            account_id: id,
            balance: 0.0,
            agent_wallet: None,
            agent_solana_wallet: None,
            agent_policy: AgentPolicy::default(),
            spent_today_usd: 0.0,
            fee_owed_usd: 0.0,
            activity: Vec::new(),
            vip_points: 120,
            referral_count: 0,
        });
        acc.balance += amount_usd;
        Ok(acc.balance)
    })
}

pub fn join_waitlist(email: &str) -> bool {
    let clean = email.trim().to_lowercase();
    with_db(|db| {
        if db.waitlist.contains_key(&clean) {
            false
        } else {
            db.waitlist.insert(clean, chrono::Utc::now().to_rfc3339());
            true
        }
    })
}

pub fn get_agent_state(account_id: &str) -> AgentState {
    let id = account_id.to_lowercase();
    with_db(|db| {
        if let Some(acc) = db.accounts.get(&id) {
            AgentState {
                policy: acc.agent_policy.clone(),
                spent_today_usd: acc.spent_today_usd,
                fee_owed_usd: acc.fee_owed_usd,
                activity: acc.activity.clone(),
            }
        } else {
            AgentState::default()
        }
    })
}

pub fn save_agent_policy(account_id: &str, policy: AgentPolicy) {
    let id = account_id.to_lowercase();
    with_db(|db| {
        if let Some(acc) = db.accounts.get_mut(&id) {
            acc.agent_policy = policy;
        }
    });
}

pub fn record_agent_spend(account_id: &str, entries: Vec<AgentActivity>, fee_owed_delta: f64) {
    let id = account_id.to_lowercase();
    with_db(|db| {
        if let Some(acc) = db.accounts.get_mut(&id) {
            let total_spent: f64 = entries.iter().map(|e| e.amount_usd).sum();
            acc.spent_today_usd += total_spent;
            acc.fee_owed_usd = (acc.fee_owed_usd + fee_owed_delta).max(0.0);
            let mut new_act = entries;
            new_act.extend(acc.activity.drain(..));
            new_act.truncate(25);
            acc.activity = new_act;
        }
    });
}
