pub fn extract_ticker_symbol(query: &str) -> Option<String> {
    const STOPWORDS: &[&str] = &["I", "A", "THE", "AI", "US", "USD", "CEO", "CFO", "IPO", "SEC"];
    for word in query.split_whitespace() {
        let clean: String = word.chars().filter(|c| c.is_alphabetic()).collect();
        if clean.len() >= 2 && clean.len() <= 5 && clean.chars().all(|c| c.is_uppercase()) {
            if !STOPWORDS.contains(&clean.as_str()) {
                return Some(clean);
            }
        }
    }
    None
}

pub fn select_sources(question: &str) -> Vec<String> {
    let lower = question.to_lowercase();
    let is_crypto = lower.contains("crypto")
        || lower.contains("bitcoin")
        || lower.contains("btc")
        || lower.contains("ethereum")
        || lower.contains("eth")
        || lower.contains("token")
        || lower.contains("coin")
        || lower.contains("arbitrum")
        || lower.contains("defi");

    let specialist: Option<&str> = if lower.contains("arxiv")
        || lower.contains("academic paper")
        || lower.contains("research paper")
        || lower.contains("preprint")
    {
        Some("arxiv")
    } else if lower.contains("stock")
        || lower.contains("filing")
        || lower.contains("sec")
        || lower.contains("earnings")
        || lower.contains("10-k")
    {
        if extract_ticker_symbol(question).is_some() {
            Some("ottoaiTradfiData")
        } else {
            Some("veles")
        }
    } else if is_crypto && (lower.contains("pool") || lower.contains("dex") || lower.contains("liquidity")) {
        Some("coingecko")
    } else if is_crypto && (lower.contains("news") || lower.contains("happened") || lower.contains("today") || lower.contains("announced")) {
        Some("cryptoslate")
    } else if is_crypto && (lower.contains("price") || lower.contains("market cap")) {
        None
    } else if is_crypto {
        Some("ottoaiCryptoNews")
    } else {
        None
    };

    if let Some(spec) = specialist {
        vec![spec.to_string(), "superhighway".to_string()]
    } else {
        vec!["superhighway".to_string()]
    }
}
