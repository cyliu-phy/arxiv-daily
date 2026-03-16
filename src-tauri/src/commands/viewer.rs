use tauri::{AppHandle, Manager, State, WebviewUrl, WebviewWindowBuilder};

/// Derive a valid Tauri window label from a paper URL.
/// e.g. https://arxiv.org/pdf/2301.12345v1  → "pdf-2301-12345v1"
///      https://arxiv.org/html/2301.12345v1 → "html-2301-12345v1"
fn url_to_label(url: &str) -> String {
    let segment = url
        .split('/')
        .last()
        .unwrap_or("paper")
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '-' })
        .collect::<String>();

    if url.contains("/pdf/") {
        format!("pdf-{}", segment)
    } else if url.contains("/html/") {
        format!("html-{}", segment)
    } else {
        format!("viewer-{}", segment)
    }
}

/// Open (or focus) a per-paper viewer window using the stable WebviewWindowBuilder API.
/// Each unique paper URL gets its own window; clicking the same button again
/// just brings the existing window to front.
#[tauri::command]
pub fn open_viewer(app: AppHandle, url: String, title: String) -> Result<(), String> {
    let label = url_to_label(&url);

    if let Some(win) = app.get_webview_window(&label) {
        let _ = win.show();
        let _ = win.set_focus();
        return Ok(());
    }

    let parsed = url.parse::<url::Url>().map_err(|e| e.to_string())?;
    WebviewWindowBuilder::new(&app, &label, WebviewUrl::External(parsed))
        .title(&title)
        .inner_size(1100.0, 820.0)
        .center()
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
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
