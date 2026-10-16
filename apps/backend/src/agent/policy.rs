use serde::{Deserialize, Serialize};

pub const QERIN_SERVICE_FEE_USD: f64 = 0.08;
pub const MIN_PER_QUERY_USD: f64 = 0.09;
pub const MAX_PER_QUERY_USD: f64 = 5.0;
pub const MIN_DAILY_USD: f64 = 0.09;
pub const MAX_DAILY_USD: f64 = 100.0;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentPolicy {
    pub per_query_usd: f64,
    pub daily_usd: f64,
    pub paused: bool,
}

impl Default for AgentPolicy {
    fn default() -> Self {
        Self {
            per_query_usd: 0.25,
            daily_usd: 2.0,
            paused: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ActivityKind {
    Source,
    Fee,
    Withdrawal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentActivity {
    pub kind: ActivityKind,
    pub label: String,
    pub amount_usd: f64,
    pub rail: String,
    pub tx_hash: Option<String>,
    pub explorer_url: Option<String>,
    pub at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AgentState {
    pub policy: AgentPolicy,
    pub spent_today_usd: f64,
    pub fee_owed_usd: f64,
    pub activity: Vec<AgentActivity>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PolicyViolation {
    AgentPaused,
    PerQueryLimit(String),
    DailyLimit(String),
}

impl AgentState {
    pub fn check_policy(&self, cost_usd: f64) -> Result<(), PolicyViolation> {
        if self.policy.paused {
            return Err(PolicyViolation::AgentPaused);
        }
        if cost_usd > self.policy.per_query_usd + 1e-9 {
            return Err(PolicyViolation::PerQueryLimit(format!(
                "This question needs up to ${:.3}, above your ${:.2} limit",
                cost_usd, self.policy.per_query_usd
            )));
        }
        if self.spent_today_usd + cost_usd > self.policy.daily_usd + 1e-9 {
            return Err(PolicyViolation::DailyLimit(format!(
                "Your agent has spent ${:.2} of its ${:.2} daily limit",
                self.spent_today_usd, self.policy.daily_usd
            )));
        }
        Ok(())
    }
}

pub fn validate_policy_input(per_query: Option<f64>, daily: Option<f64>, paused: Option<bool>) -> Result<AgentPolicy, String> {
    let pq = per_query.unwrap_or(0.25);
    let dl = daily.unwrap_or(2.0);

    if pq < MIN_PER_QUERY_USD || pq > MAX_PER_QUERY_USD {
        return Err(format!("Per-question limit must be between ${:.2} and ${:.2}", MIN_PER_QUERY_USD, MAX_PER_QUERY_USD));
    }
    if dl < MIN_DAILY_USD || dl > MAX_DAILY_USD {
        return Err(format!("Daily limit must be between ${:.2} and ${:.2}", MIN_DAILY_USD, MAX_DAILY_USD));
    }
    if dl < pq {
        return Err("Daily limit cannot be lower than per-question limit".to_string());
    }

    Ok(AgentPolicy {
        per_query_usd: (pq * 100.0).round() / 100.0,
        daily_usd: (dl * 100.0).round() / 100.0,
        paused: paused.unwrap_or(false),
    })
}
