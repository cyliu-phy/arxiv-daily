mod arxiv;
mod commands;
mod db;

use db::DbState;
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .setup(|app| {
            // Open (or create) the SQLite database in the app data directory
            let data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to resolve app data directory");

            let conn = db::open(&data_dir).expect("Failed to open database");
            app.manage(DbState(Mutex::new(conn)));

            // Shared HTTP client (connection pooling)
            let http = reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(30))
                .build()
                .expect("Failed to build HTTP client");
            app.manage(http);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::arxiv::fetch_feed,
            commands::arxiv::get_articles,
            commands::arxiv::search_articles,
            commands::settings::get_subscriptions,
            commands::settings::set_subscriptions,
            commands::settings::get_settings,
            commands::settings::set_setting_cmd,
            commands::favorites::toggle_favorite,
            commands::favorites::get_favorites,
            commands::llm::llm_summarize,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
