use crate::db::DbState;
use crate::db::models::Article;
use serde_json;

/// Toggle star; returns the new favorite state (true = starred).
#[tauri::command]
pub fn toggle_favorite(
    state: tauri::State<'_, DbState>,
    article_id: String,
) -> Result<bool, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let exists: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM favorites WHERE article_id = ?1",
            [&article_id],
            |r| r.get::<_, i32>(0),
        )
        .map(|n| n > 0)
        .unwrap_or(false);

    if exists {
        conn.execute("DELETE FROM favorites WHERE article_id = ?1", [&article_id])
            .map_err(|e| e.to_string())?;
        Ok(false)
    } else {
        conn.execute(
            "INSERT INTO favorites(article_id, starred_at) VALUES(?1, datetime('now'))",
            [&article_id],
        )
        .map_err(|e| e.to_string())?;
        Ok(true)
    }
}

/// All starred articles, joined with article data.
#[tauri::command]
pub fn get_favorites(state: tauri::State<'_, DbState>) -> Result<Vec<Article>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT a.id, a.category, a.title, a.authors, a.abstract_text,
                    a.published_at, a.updated_at, a.link, a.is_new, 1 AS is_favorite
             FROM articles a
             INNER JOIN favorites f ON f.article_id = a.id
             ORDER BY f.starred_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let result: Vec<Article> = stmt
        .query_map([], |row| {
            let authors_json: String = row.get(3)?;
            let authors: Vec<String> =
                serde_json::from_str(&authors_json).unwrap_or_default();
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
                is_favorite: true,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;
    Ok(result)
}
