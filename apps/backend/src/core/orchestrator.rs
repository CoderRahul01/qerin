use super::sources::{fetch_arxiv_research, fetch_wikipedia_research, SourceCitation};
use std::time::Duration;

#[derive(Debug, Clone, Default)]
pub struct GatheredContext {
    pub raw_snippets: Vec<String>,
    pub citations: Vec<SourceCitation>,
    pub source_names: Vec<String>,
}

pub async fn gather_sources(question: &str, selected: &[String]) -> GatheredContext {
    let mut context = GatheredContext::default();

    let mut handles = Vec::new();

    for source in selected {
        context.source_names.push(source.clone());
        let q = question.to_string();
        let s = source.clone();
        handles.push(tokio::spawn(async move {
            match s.as_str() {
                "arxiv" => {
                    let papers = fetch_arxiv_research(&q).await;
                    let mut snippets = Vec::new();
                    let mut citations = Vec::new();
                    for p in papers {
                        snippets.push(format!("[arXiv Paper] {}: {}", p.title, p.summary));
                        citations.push(SourceCitation {
                            name: format!("arXiv: {}", p.title),
                            citation: p.link,
                        });
                    }
                    (snippets, citations)
                }
                _ => {
                    let wiki = fetch_wikipedia_research(&q).await;
                    let mut snippets = Vec::new();
                    let mut citations = Vec::new();
                    for (title, text) in wiki {
                        snippets.push(format!("[Source] {}: {}", title, text));
                        citations.push(SourceCitation {
                            name: title.clone(),
                            citation: format!("https://en.wikipedia.org/wiki/{}", title.replace(' ', "_")),
                        });
                    }
                    (snippets, citations)
                }
            }
        }));
    }

    for handle in handles {
        if let Ok(Ok((snippets, citations))) = tokio::time::timeout(Duration::from_secs(6), handle).await {
            context.raw_snippets.extend(snippets);
            context.citations.extend(citations);
        }
    }

    context
}
