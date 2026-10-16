use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;

pub const FALLBACK_FETCH_TIMEOUT_SECS: u64 = 4;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceCitation {
    pub name: String,
    pub citation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArxivPaper {
    pub id: String,
    pub title: String,
    pub summary: String,
    pub authors: Vec<String>,
    pub link: String,
}

pub async fn fetch_arxiv_research(query: &str) -> Vec<ArxivPaper> {
    let clean: String = query
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace())
        .take(80)
        .collect();
    if clean.trim().is_empty() {
        return Vec::new();
    }

    let url = format!(
        "https://export.arxiv.org/api/query?search_query=all:{}&start=0&max_results=3&sortBy=relevance",
        urlencoding::encode(&clean)
    );

    let client = match Client::builder().timeout(Duration::from_secs(FALLBACK_FETCH_TIMEOUT_SECS)).build() {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };

    let res = match client.get(&url).header("User-Agent", "QerinResearchAgent/1.0").send().await {
        Ok(r) => r,
        Err(_) => return Vec::new(),
    };

    if !res.status().is_success() {
        return Vec::new();
    }

    let xml = match res.text().await {
        Ok(t) => t,
        Err(_) => return Vec::new(),
    };

    let mut papers = Vec::new();
    let entries: Vec<&str> = xml.split("<entry>").skip(1).collect();
    for entry in entries {
        let title = extract_tag(entry, "title").replace('\n', " ").trim().to_string();
        let summary: String = extract_tag(entry, "summary").replace('\n', " ").trim().chars().take(800).collect();
        let id = extract_tag(entry, "id").trim().to_string();

        if !title.is_empty() && (!id.is_empty() || !summary.is_empty()) {
            papers.push(ArxivPaper {
                id: id.clone(),
                title,
                summary,
                authors: vec!["arXiv author".to_string()],
                link: id,
            });
        }
    }

    papers
}

pub async fn fetch_wikipedia_research(query: &str) -> Vec<(String, String)> {
    let client = match Client::builder().timeout(Duration::from_secs(FALLBACK_FETCH_TIMEOUT_SECS)).build() {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };

    let url = format!(
        "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={}&format=json&utf8=1",
        urlencoding::encode(query)
    );

    let res = match client.get(&url).header("User-Agent", "QerinResearchAgent/1.0").send().await {
        Ok(r) => r,
        Err(_) => return Vec::new(),
    };

    if !res.status().is_success() {
        return Vec::new();
    }

    #[derive(Deserialize)]
    struct WikiResp {
        query: Option<WikiQuery>,
    }
    #[derive(Deserialize)]
    struct WikiQuery {
        search: Option<Vec<WikiItem>>,
    }
    #[derive(Deserialize)]
    struct WikiItem {
        title: String,
        snippet: String,
    }

    let json: WikiResp = match res.json().await {
        Ok(j) => j,
        Err(_) => return Vec::new(),
    };

    json.query
        .and_then(|q| q.search)
        .unwrap_or_default()
        .into_iter()
        .take(3)
        .map(|item| {
            let clean = item.snippet.replace("<span class=\"searchmatch\">", "").replace("</span>", "");
            (item.title, clean)
        })
        .collect()
}

fn extract_tag<'a>(xml: &'a str, tag: &str) -> &'a str {
    let open = format!("<{}>", tag);
    let close = format!("</{}>", tag);
    if let Some(start) = xml.find(&open) {
        let content_start = start + open.len();
        if let Some(end) = xml[content_start..].find(&close) {
            return &xml[content_start..content_start + end];
        }
    }
    ""
}

mod urlencoding {
    pub fn encode(s: &str) -> String {
        let mut out = String::new();
        for b in s.bytes() {
            if b.is_ascii_alphanumeric() || b == b'-' || b == b'_' || b == b'.' || b == b'~' {
                out.push(b as char);
            } else {
                out.push_str(&format!("%{:02X}", b));
            }
        }
        out
    }
}
