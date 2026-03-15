use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Article {
    pub id: String,
    pub category: String,
    pub title: String,
    pub authors: Vec<String>,
    pub abstract_text: String,
    pub published_at: String,
    pub updated_at: String,
    pub link: String,
    pub is_new: bool,
    pub is_favorite: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub llm_endpoint: String,
    pub llm_api_key: String,
    pub llm_model: String,
    pub theme: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            llm_endpoint: String::new(),
            llm_api_key: String::new(),
            llm_model: "gpt-4o-mini".to_string(),
            theme: "system".to_string(),
        }
    }
}
