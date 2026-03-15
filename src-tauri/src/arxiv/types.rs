/// A parsed arXiv article entry before DB storage.
#[derive(Debug, Clone)]
pub struct FeedEntry {
    pub id: String,
    pub title: String,
    pub authors: Vec<String>,
    pub abstract_text: String,
    pub published_at: String,
    pub updated_at: String,
    pub link: String,
}
