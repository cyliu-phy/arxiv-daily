use tauri::{AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder};
use crate::{ViewerItem, ViewerQueue};

/// Open the global viewer window and add a tab for the given URL.
/// - If the window doesn't exist yet, creates it and queues the item so the
///   page can drain the queue on mount.
/// - If the window already exists, emits `viewer_open` directly.
#[tauri::command]
pub fn open_viewer(
    app: AppHandle,
    queue: State<'_, ViewerQueue>,
    url: String,
    title: String,
) -> Result<(), String> {
    let item = ViewerItem { url, title };

    if let Some(win) = app.get_webview_window("arxiv-viewer") {
        let _ = win.show();
        let _ = win.set_focus();
        let _ = app.emit("viewer_open", item);
    } else {
        queue.0.lock().unwrap().push(item);
        WebviewWindowBuilder::new(
            &app,
            "arxiv-viewer",
            WebviewUrl::App("viewer.html".into()),
        )
        .title("Paper Viewer")
        .inner_size(1100.0, 820.0)
        .center()
        .build()
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

/// Called by the viewer page on mount to drain any items queued before the
/// page was ready.
#[tauri::command]
pub fn pop_viewer_queue(queue: State<'_, ViewerQueue>) -> Vec<ViewerItem> {
    queue.0.lock().unwrap().drain(..).collect()
}

/// Returns true if `https://arxiv.org/html/{id}` responds with 2xx.
#[tauri::command]
pub async fn check_html_available(
    client: State<'_, reqwest::Client>,
    arxiv_id: String,
) -> Result<bool, String> {
    let url = format!("https://arxiv.org/html/{}", arxiv_id);
    let resp = client
        .head(&url)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    Ok(resp.status().is_success())
}
