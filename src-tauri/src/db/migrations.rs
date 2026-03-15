use anyhow::Result;
use rusqlite::Connection;

pub fn run(conn: &Connection) -> Result<()> {
    conn.execute_batch("PRAGMA journal_mode=WAL;")?;

    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS subscriptions (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS articles (
            id           TEXT PRIMARY KEY,
            category     TEXT NOT NULL,
            title        TEXT NOT NULL,
            authors      TEXT NOT NULL,
            abstract_text TEXT NOT NULL,
            published_at TEXT NOT NULL,
            updated_at   TEXT NOT NULL,
            link         TEXT NOT NULL,
            is_new       INTEGER NOT NULL DEFAULT 1,
            fetched_at   TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
        CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC);

        CREATE TABLE IF NOT EXISTS favorites (
            article_id TEXT PRIMARY KEY,
            starred_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS settings (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS llm_outputs (
            article_id  TEXT NOT NULL,
            instruction TEXT NOT NULL,
            output      TEXT NOT NULL,
            created_at  TEXT NOT NULL DEFAULT (datetime('now')),
            PRIMARY KEY (article_id, instruction)
        );
        ",
    )?;

    Ok(())
}
