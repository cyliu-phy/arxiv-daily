use crate::db::models::LlmOutput;
use crate::db::DbState;
use crate::db::get_setting;
use serde_json::json;
use tauri::Emitter;

/// Return all cached LLM outputs for an article.
#[tauri::command]
pub fn get_llm_outputs(
    state: tauri::State<'_, DbState>,
    article_id: String,
) -> Result<Vec<LlmOutput>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT instruction, output, created_at
             FROM llm_outputs WHERE article_id = ?1
             ORDER BY created_at ASC",
        )
        .map_err(|e| e.to_string())?;

    let result: Vec<LlmOutput> = stmt
        .query_map(rusqlite::params![article_id], |row| {
            Ok(LlmOutput {
                instruction: row.get(0)?,
                output: row.get(1)?,
                created_at: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;
    Ok(result)
}

/// Persist (upsert) a completed LLM output for an article.
#[tauri::command]
pub fn save_llm_output(
    state: tauri::State<'_, DbState>,
    article_id: String,
    instruction: String,
    output: String,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO llm_outputs(article_id, instruction, output)
         VALUES(?1, ?2, ?3)
         ON CONFLICT(article_id, instruction)
         DO UPDATE SET output=excluded.output, created_at=datetime('now')",
        rusqlite::params![article_id, instruction, output],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// Calls the OpenAI-compatible chat completions endpoint, streams tokens
/// back to the frontend via Tauri events.
///
/// Events emitted:
///   `llm_token`  – payload: String (one chunk of text)
///   `llm_done`   – payload: String (complete response)
///   `llm_error`  – payload: String (error message)
#[tauri::command]
pub async fn llm_summarize(
    app: tauri::AppHandle,
    state: tauri::State<'_, DbState>,
    http: tauri::State<'_, reqwest::Client>,
    abstract_text: String,
    instruction: String, // e.g. "summarize" | "translate to Chinese"
) -> Result<(), String> {
    let (endpoint, api_key, model) = {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        (
            get_setting(&conn, "llm_endpoint").unwrap_or_default(),
            get_setting(&conn, "llm_api_key").unwrap_or_default(),
            get_setting(&conn, "llm_model")
                .unwrap_or_else(|| "gpt-4o-mini".to_string()),
        )
    };

    if endpoint.is_empty() || api_key.is_empty() {
        let _ = app.emit("llm_error", "LLM API not configured. Please add endpoint and API key in Settings.");
        return Err("LLM API not configured".to_string());
    }

    let system_prompt = match instruction.as_str() {
        i if i.starts_with("translate") => format!(
            "You are a scientific translator. Translate the following abstract {}.",
            i.trim_start_matches("translate").trim()
        ),
        _ => "You are a scientific paper assistant. Summarize the following abstract \
              in 2–3 clear sentences accessible to a non-specialist."
            .to_string(),
    };

    let url = format!(
        "{}/chat/completions",
        endpoint.trim_end_matches('/')
    );

    let payload = json!({
        "model": model,
        "messages": [
            { "role": "system", "content": system_prompt },
            { "role": "user",   "content": abstract_text }
        ],
        "stream": true,
        "max_tokens": 512,
        "temperature": 0.3
    });

    // Retry up to 3 times on transient errors (404 from LiteLLM load-balancer
    // routing failures, 429 rate-limit back-off, 5xx).
    let response = {
        const MAX_TRIES: u32 = 3;
        let mut last_err = String::new();
        let mut result = None;

        for attempt in 0..MAX_TRIES {
            if attempt > 0 {
                // Brief back-off: 600 ms × attempt
                tokio::time::sleep(std::time::Duration::from_millis(600 * attempt as u64)).await;
            }

            let resp = http
                .post(&url)
                .header("Authorization", format!("Bearer {api_key}"))
                .header("Content-Type", "application/json")
                .json(&payload)
                .send()
                .await;

            match resp {
                Err(e) => { last_err = format!("Network error: {e}"); }
                Ok(r) => {
                    let status = r.status();
                    // Retry on 404 (LiteLLM routing flake) and 5xx
                    if (status.as_u16() == 404 || status.is_server_error())
                        && attempt + 1 < MAX_TRIES
                    {
                        last_err = format!("HTTP {status} (retrying…)");
                        continue;
                    }
                    result = Some(r);
                    break;
                }
            }
        }

        match result {
            Some(r) => r,
            None => {
                let _ = app.emit("llm_error", &last_err);
                return Err(last_err);
            }
        }
    };

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        let msg = format!("LLM API error {status}: {body}");
        let _ = app.emit("llm_error", &msg);
        return Err(msg);
    }

    let mut full = String::new();
    let mut stream = response;

    // Manually parse SSE lines from the chunked body
    let mut leftover = String::new();

    while let Some(chunk) = stream.chunk().await.map_err(|e| e.to_string())? {
        leftover.push_str(&String::from_utf8_lossy(&chunk));
        // Process complete lines
        while let Some(pos) = leftover.find('\n') {
            let line = leftover[..pos].trim().to_string();
            leftover = leftover[pos + 1..].to_string();

            if let Some(data) = line.strip_prefix("data: ") {
                if data == "[DONE]" {
                    let _ = app.emit("llm_done", &full);
                    return Ok(());
                }
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(data) {
                    if let Some(token) = val["choices"][0]["delta"]["content"].as_str() {
                        full.push_str(token);
                        let _ = app.emit("llm_token", token);
                    }
                }
            }
        }
    }

    let _ = app.emit("llm_done", &full);
    Ok(())
}
