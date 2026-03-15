use crate::db::{models::Settings, DbState};
use crate::db::{get_setting, set_setting};

#[tauri::command]
pub fn get_subscriptions(state: tauri::State<'_, DbState>) -> Result<Vec<String>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT category FROM subscriptions ORDER BY category")
        .map_err(|e| e.to_string())?;
    let cats = stmt
        .query_map([], |r| r.get(0))
        .map_err(|e| e.to_string())?
        .collect::<rusqlite::Result<Vec<String>>>()
        .map_err(|e| e.to_string())?;
    Ok(cats)
}

#[tauri::command]
pub fn set_subscriptions(
    state: tauri::State<'_, DbState>,
    categories: Vec<String>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM subscriptions", [])
        .map_err(|e| e.to_string())?;
    for cat in categories {
        conn.execute(
            "INSERT OR IGNORE INTO subscriptions(category) VALUES(?1)",
            [&cat],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_settings(state: tauri::State<'_, DbState>) -> Result<Settings, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    Ok(Settings {
        llm_endpoint: get_setting(&conn, "llm_endpoint").unwrap_or_default(),
        llm_api_key:  get_setting(&conn, "llm_api_key").unwrap_or_default(),
        llm_model:    get_setting(&conn, "llm_model").unwrap_or_else(|| "gpt-4o-mini".to_string()),
        theme:        get_setting(&conn, "theme").unwrap_or_else(|| "system".to_string()),
    })
}

#[tauri::command]
pub fn set_setting_cmd(
    state: tauri::State<'_, DbState>,
    key: String,
    value: String,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    set_setting(&conn, &key, &value).map_err(|e| e.to_string())
}
