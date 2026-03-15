pub mod migrations;
pub mod models;

use anyhow::Result;
use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct DbState(pub Mutex<Connection>);

pub fn open(data_dir: &PathBuf) -> Result<Connection> {
    std::fs::create_dir_all(data_dir)?;
    let path = data_dir.join("arxiv_daily.db");
    let conn = Connection::open(path)?;
    migrations::run(&conn)?;
    Ok(conn)
}

// ── helpers used by command modules ─────────────────────────────────────────

pub fn get_setting(conn: &Connection, key: &str) -> Option<String> {
    conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        [key],
        |r| r.get(0),
    )
    .ok()
}

pub fn set_setting(conn: &Connection, key: &str, value: &str) -> Result<()> {
    conn.execute(
        "INSERT INTO settings(key, value) VALUES(?1,?2)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        [key, value],
    )?;
    Ok(())
}
