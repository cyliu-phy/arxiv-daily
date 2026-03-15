use crate::arxiv::feed;
use crate::db::{models::Article, DbState};
use chrono::{Duration, Utc};
use serde_json;

/// Fetch the arXiv feed for `category`, persist to DB, return all articles.
#[tauri::command]
pub async fn fetch_feed(
    state: tauri::State<'_, DbState>,
    http: tauri::State<'_, reqwest::Client>,
    category: String,
) -> Result<Vec<Article>, String> {
    let entries = feed::fetch_category(&http, &category)
        .await
        .map_err(|e| e.to_string())?;

    let new_threshold = (Utc::now() - Duration::days(2))
        .format("%Y-%m-%dT%H:%M:%SZ")
        .to_string();

    {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        for entry in &entries {
            let authors_json = serde_json::to_string(&entry.authors).unwrap_or_default();
            let is_new = if entry.published_at > new_threshold { 1i32 } else { 0i32 };
            conn.execute(
                "INSERT INTO articles(id,category,title,authors,abstract_text,
                                      published_at,updated_at,link,is_new)
                 VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)
                 ON CONFLICT(id) DO UPDATE SET
                   title=excluded.title,
                   authors=excluded.authors,
                   abstract_text=excluded.abstract_text,
                   updated_at=excluded.updated_at,
                   is_new=excluded.is_new,
                   fetched_at=datetime('now')",
                rusqlite::params![
                    entry.id,
                    category,
                    entry.title,
                    authors_json,
                    entry.abstract_text,
                    entry.published_at,
                    entry.updated_at,
                    entry.link,
                    is_new,
                ],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    get_articles(state, category, "all".to_string())
}

/// Return cached articles for a category; `tab` = "new" | "recent" | "all".
#[tauri::command]
pub fn get_articles(
    state: tauri::State<'_, DbState>,
    category: String,
    tab: String,
) -> Result<Vec<Article>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let sql = match tab.as_str() {
        "new" => "SELECT a.id,a.category,a.title,a.authors,a.abstract_text,
                         a.published_at,a.updated_at,a.link,a.is_new,
                         (f.article_id IS NOT NULL) AS is_favorite
                  FROM articles a
                  LEFT JOIN favorites f ON f.article_id=a.id
                  WHERE a.category=?1 AND a.is_new=1
                  ORDER BY a.published_at DESC LIMIT 300",
        "recent" => "SELECT a.id,a.category,a.title,a.authors,a.abstract_text,
                            a.published_at,a.updated_at,a.link,a.is_new,
                            (f.article_id IS NOT NULL) AS is_favorite
                     FROM articles a
                     LEFT JOIN favorites f ON f.article_id=a.id
                     WHERE a.category=?1 AND a.is_new=0
                     ORDER BY a.published_at DESC LIMIT 300",
        _ => "SELECT a.id,a.category,a.title,a.authors,a.abstract_text,
                     a.published_at,a.updated_at,a.link,a.is_new,
                     (f.article_id IS NOT NULL) AS is_favorite
              FROM articles a
              LEFT JOIN favorites f ON f.article_id=a.id
              WHERE a.category=?1
              ORDER BY a.published_at DESC LIMIT 300",
    };

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;

    let result: Vec<Article> = stmt
        .query_map(rusqlite::params![category], row_to_article)
        .map_err(|e| e.to_string())?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;
    Ok(result)
}

/// Keyword search across title / authors / abstract.
#[tauri::command]
pub fn search_articles(
    state: tauri::State<'_, DbState>,
    query: String,
) -> Result<Vec<Article>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let pattern = format!("%{query}%");

    let mut stmt = conn
        .prepare(
            "SELECT a.id,a.category,a.title,a.authors,a.abstract_text,
                    a.published_at,a.updated_at,a.link,a.is_new,
                    (f.article_id IS NOT NULL) AS is_favorite
             FROM articles a
             LEFT JOIN favorites f ON f.article_id=a.id
             WHERE a.title LIKE ?1 OR a.authors LIKE ?1 OR a.abstract_text LIKE ?1
             ORDER BY a.published_at DESC LIMIT 200",
        )
        .map_err(|e| e.to_string())?;

    let result: Vec<Article> = stmt
        .query_map(rusqlite::params![pattern], row_to_article)
        .map_err(|e| e.to_string())?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;
    Ok(result)
}

// ── row mapper ────────────────────────────────────────────────────────────────

fn row_to_article(row: &rusqlite::Row<'_>) -> rusqlite::Result<Article> {
    let authors_json: String = row.get(3)?;
    let authors: Vec<String> = serde_json::from_str(&authors_json).unwrap_or_default();
    Ok(Article {
        id: row.get(0)?,
        category: row.get(1)?,
        title: row.get(2)?,
        authors,
        abstract_text: row.get(4)?,
        published_at: row.get(5)?,
        updated_at: row.get(6)?,
        link: row.get(7)?,
        is_new: row.get::<_, i32>(8)? != 0,
        is_favorite: row.get::<_, i32>(9)? != 0,
    })
}
