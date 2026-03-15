mod arxiv;
mod commands;
mod db;

use db::DbState;
use std::sync::Mutex;
use tauri::Manager;

/// A single paper to open in the viewer window.
#[derive(Clone, serde::Serialize)]
pub struct ViewerItem {
    pub url: String,
    pub title: String,
}

/// Shared queue of items waiting for the viewer window to mount.
pub struct ViewerQueue(pub Mutex<Vec<ViewerItem>>);

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

            // Queue for viewer window tab items
            app.manage(ViewerQueue(Mutex::new(Vec::new())));

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
            commands::llm::get_llm_outputs,
            commands::llm::save_llm_output,
            commands::viewer::open_viewer,
            commands::viewer::pop_viewer_queue,
            commands::viewer::check_html_available,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
