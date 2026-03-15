use tauri::{
    AppHandle, Emitter, LogicalPosition, LogicalSize, Manager,
    State, WebviewBuilder, WebviewUrl, WindowBuilder,
};
use crate::{ViewerItem, ViewerQueue};

const TAB_H: f64 = 40.0;

/// Open the global paper viewer.
///
/// Architecture: a single bare `Window` ("arxiv-viewer") hosts two child webviews:
///   - "viewer-tabs"    – local React tab bar (40 px, top)
///   - "viewer-content" – external URL loaded directly (no iframe), fills the rest
///
/// Using direct webview navigation instead of iframes fixes blank/stuck rendering
/// on Windows (WebView2) and macOS (WKWebView) for PDF and HTML content.
#[tauri::command]
pub fn open_viewer(
    app: AppHandle,
    queue: State<'_, ViewerQueue>,
    url: String,
    title: String,
) -> Result<(), String> {
    let item = ViewerItem { url: url.clone(), title };

    if let Some(win) = app.get_window("arxiv-viewer") {
        let _ = win.show();
        let _ = win.set_focus();
        // Tab bar is already running – tell it to add a new tab and navigate content.
        let _ = app.emit("viewer_open", item);
    } else {
        let parsed = url.parse::<url::Url>().map_err(|e| e.to_string())?;
        queue.0.lock().unwrap().push(item);

        // Bare window (owns both child webviews).
        let win = WindowBuilder::new(&app, "arxiv-viewer")
            .title("Paper Viewer")
            .inner_size(1100.0, 820.0)
            .min_inner_size(600.0, 400.0)
            .center()
            .build()
            .map_err(|e| e.to_string())?;

        // Tab bar – local React page at the top.
        win.add_child(
            WebviewBuilder::new("viewer-tabs", WebviewUrl::App("viewer.html".into())),
            LogicalPosition::new(0.0, 0.0),
            LogicalSize::new(1100.0, TAB_H),
        )
        .map_err(|e| e.to_string())?;

        // Content – direct external navigation, fills the remainder.
        win.add_child(
            WebviewBuilder::new("viewer-content", WebviewUrl::External(parsed)),
            LogicalPosition::new(0.0, TAB_H),
            LogicalSize::new(1100.0, 820.0 - TAB_H),
        )
        .map_err(|e| e.to_string())?;

        // Keep child webviews correctly sized when the user resizes the window.
        let app2 = app.clone();
        let win2 = win.clone();
        win.on_window_event(move |event| {
            if let tauri::WindowEvent::Resized(physical) = event {
                let Ok(scale) = win2.scale_factor() else { return };
                let lw = physical.width as f64 / scale;
                let lh = physical.height as f64 / scale;

                if let Some(v) = app2.get_webview("viewer-content") {
                    let _ = v.set_bounds(tauri::Rect {
                        position: tauri::Position::Logical(LogicalPosition::new(0.0, TAB_H)),
                        size: tauri::Size::Logical(LogicalSize::new(lw, (lh - TAB_H).max(0.0))),
                    });
                }
                if let Some(t) = app2.get_webview("viewer-tabs") {
                    let _ = t.set_bounds(tauri::Rect {
                        position: tauri::Position::Logical(LogicalPosition::new(0.0, 0.0)),
                        size: tauri::Size::Logical(LogicalSize::new(lw, TAB_H)),
                    });
                }
            }
        });
    }

    Ok(())
}

/// Navigate the content webview to a different URL (tab switch).
#[tauri::command]
pub fn navigate_content(app: AppHandle, url: String) -> Result<(), String> {
    let webview = app
        .get_webview("viewer-content")
        .ok_or_else(|| "Viewer not open".to_string())?;
    let parsed = url.parse::<url::Url>().map_err(|e| e.to_string())?;
    webview.navigate(parsed).map_err(|e| e.to_string())
}

/// Drain the startup queue – called by the tab bar on mount.
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
    let resp = client.head(&url).send().await.map_err(|e| e.to_string())?;
    Ok(resp.status().is_success())
}
