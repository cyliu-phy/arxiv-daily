use anyhow::{Context, Result};
use quick_xml::{events::Event, Reader};

use super::types::FeedEntry;

const MAX_RESULTS: u32 = 100;

pub async fn fetch_category(
    client: &reqwest::Client,
    category: &str,
) -> Result<Vec<FeedEntry>> {
    let url = format!(
        "https://export.arxiv.org/api/query\
         ?search_query=cat:{category}\
         &sortBy=submittedDate&sortOrder=descending\
         &max_results={MAX_RESULTS}"
    );

    let xml = client
        .get(&url)
        .header("User-Agent", "arxiv-daily/0.1")
        .send()
        .await
        .context("HTTP request failed")?
        .text()
        .await
        .context("Reading response body failed")?;

    parse_atom(&xml)
}

// ── XML parser ────────────────────────────────────────────────────────────────

#[derive(Default)]
struct EntryBuilder {
    id: String,
    title: String,
    authors: Vec<String>,
    abstract_text: String,
    published_at: String,
    updated_at: String,
    link: String,
    current_author: String,
}

impl EntryBuilder {
    fn build(self) -> Option<FeedEntry> {
        if self.id.is_empty() || self.title.is_empty() {
            return None;
        }
        Some(FeedEntry {
            id: self.id,
            title: self.title,
            authors: self.authors,
            abstract_text: self.abstract_text.trim().to_string(),
            published_at: self.published_at,
            updated_at: self.updated_at,
            link: self.link,
        })
    }
}

/// Strip namespace prefix: `arxiv:primary_category` → `primary_category`
fn local(name: &[u8]) -> &[u8] {
    name.iter()
        .position(|&b| b == b':')
        .map(|p| &name[p + 1..])
        .unwrap_or(name)
}

/// `http://arxiv.org/abs/2501.12345v2` → `2501.12345`
fn extract_id(url: &str) -> String {
    let raw = url.rsplit('/').next().unwrap_or(url);
    // strip trailing version like "v1", "v2", …
    if let Some(pos) = raw.rfind('v') {
        if raw[pos + 1..].chars().all(|c| c.is_ascii_digit()) {
            return raw[..pos].to_string();
        }
    }
    raw.to_string()
}

#[derive(PartialEq)]
enum TextField {
    None,
    Id,
    Title,
    Summary,
    Published,
    Updated,
    AuthorName,
}

fn parse_atom(xml: &str) -> Result<Vec<FeedEntry>> {
    let mut reader = Reader::from_str(xml);
    reader.config_mut().trim_text(true);

    let mut entries: Vec<FeedEntry> = Vec::new();
    let mut current: Option<EntryBuilder> = None;
    let mut field = TextField::None;
    let mut buf = Vec::new();

    loop {
        match reader.read_event_into(&mut buf)? {
            // ── opening tags ─────────────────────────────────────────────────
            Event::Start(e) => {
                let ename = e.name();
                let tag = local(ename.as_ref());
                match tag {
                    b"entry" => current = Some(EntryBuilder::default()),
                    b"id" if current.is_some() => field = TextField::Id,
                    b"title" if current.is_some() => field = TextField::Title,
                    b"summary" if current.is_some() => field = TextField::Summary,
                    b"published" if current.is_some() => field = TextField::Published,
                    b"updated" if current.is_some() => field = TextField::Updated,
                    b"name" if current.is_some() => field = TextField::AuthorName,
                    b"author" if current.is_some() => {
                        if let Some(ref mut e) = current {
                            e.current_author.clear();
                        }
                    }
                    _ => {}
                }
            }

            // ── self-closing tags ─────────────────────────────────────────────
            Event::Empty(e) => {
                let ename = e.name();
                let tag = local(ename.as_ref());
                if tag == b"link" {
                    if let Some(ref mut entry) = current {
                        if entry.link.is_empty() {
                            let mut rel = String::new();
                            let mut href = String::new();
                            for attr in e.attributes().flatten() {
                                match attr.key.as_ref() {
                                    b"rel" => {
                                        rel = String::from_utf8_lossy(&attr.value).into_owned()
                                    }
                                    b"href" => {
                                        href = String::from_utf8_lossy(&attr.value).into_owned()
                                    }
                                    _ => {}
                                }
                            }
                            if rel == "alternate" || rel.is_empty() {
                                entry.link = href;
                            }
                        }
                    }
                }
            }

            // ── text content ─────────────────────────────────────────────────
            Event::Text(e) => {
                if field == TextField::None {
                    buf.clear();
                    continue;
                }
                let text = e.unescape().unwrap_or_default().into_owned();
                if let Some(ref mut entry) = current {
                    match field {
                        TextField::Id => entry.id = extract_id(&text),
                        TextField::Title => entry.title = text.replace('\n', " ").trim().to_string(),
                        TextField::Summary => entry.abstract_text = text,
                        TextField::Published => entry.published_at = text,
                        TextField::Updated => entry.updated_at = text,
                        TextField::AuthorName => entry.current_author = text,
                        TextField::None => {}
                    }
                }
                field = TextField::None;
            }

            // ── closing tags ─────────────────────────────────────────────────
            Event::End(e) => {
                let ename = e.name();
                let tag = local(ename.as_ref());
                if tag == b"author" {
                    if let Some(ref mut entry) = current {
                        if !entry.current_author.is_empty() {
                            entry.authors.push(entry.current_author.clone());
                        }
                    }
                }
                if tag == b"entry" {
                    if let Some(entry) = current.take() {
                        if let Some(article) = entry.build() {
                            entries.push(article);
                        }
                    }
                }
                field = TextField::None;
            }

            Event::Eof => break,
            _ => {}
        }
        buf.clear();
    }

    Ok(entries)
}
