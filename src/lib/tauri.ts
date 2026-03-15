import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-shell";

export interface LlmOutput {
  instruction: string;
  output: string;
  created_at: string;
}

export interface Article {
  id: string;
  category: string;
  title: string;
  authors: string[];
  abstract_text: string;
  published_at: string;
  updated_at: string;
  link: string;
  is_new: boolean;
  is_favorite: boolean;
}

export interface AppSettings {
  llm_endpoint: string;
  llm_api_key: string;
  llm_model: string;
  theme: string;
}

/** Tabs sent to the Rust backend (no "bookmarks" — that's frontend-only). */
export type ArticleTab = "recent" | "all";

// ── arXiv ─────────────────────────────────────────────────────────────────────
export const fetchFeed = (category: string): Promise<Article[]> =>
  invoke("fetch_feed", { category });

export const getArticles = (category: string, tab: ArticleTab): Promise<Article[]> =>
  invoke("get_articles", { category, tab });

export const searchArticles = (query: string): Promise<Article[]> =>
  invoke("search_articles", { query });

// ── settings ──────────────────────────────────────────────────────────────────
export const getSubscriptions = (): Promise<string[]> =>
  invoke("get_subscriptions");

export const setSubscriptions = (categories: string[]): Promise<void> =>
  invoke("set_subscriptions", { categories });

export const getSettings = (): Promise<AppSettings> =>
  invoke("get_settings");

export const setSetting = (key: string, value: string): Promise<void> =>
  invoke("set_setting_cmd", { key, value });

// ── favorites ─────────────────────────────────────────────────────────────────
export const toggleFavorite = (articleId: string): Promise<boolean> =>
  invoke("toggle_favorite", { articleId });

export const getFavorites = (): Promise<Article[]> =>
  invoke("get_favorites");

// ── LLM ──────────────────────────────────────────────────────────────────────
export const getLlmOutputs = (articleId: string): Promise<LlmOutput[]> =>
  invoke("get_llm_outputs", { articleId });

export const saveLlmOutput = (
  articleId: string,
  instruction: string,
  output: string
): Promise<void> => invoke("save_llm_output", { articleId, instruction, output });

export const llmSummarize = (
  abstractText: string,
  instruction: string,
  requestId: string,
): Promise<void> =>
  invoke("llm_summarize", { abstractText, instruction, requestId });

interface LlmEventPayload { id: string; text: string }

/** Listen only for events matching `requestId`. */
export const onLlmToken = (requestId: string, cb: (token: string) => void): Promise<UnlistenFn> =>
  listen<LlmEventPayload>("llm_token", (e) => {
    if (e.payload.id === requestId) cb(e.payload.text);
  });

export const onLlmDone = (requestId: string, cb: (full: string) => void): Promise<UnlistenFn> =>
  listen<LlmEventPayload>("llm_done", (e) => {
    if (e.payload.id === requestId) cb(e.payload.text);
  });

export const onLlmError = (requestId: string, cb: (msg: string) => void): Promise<UnlistenFn> =>
  listen<LlmEventPayload>("llm_error", (e) => {
    if (e.payload.id === requestId) cb(e.payload.text);
  });

// ── viewer ────────────────────────────────────────────────────────────────────
export interface ViewerItem { url: string; title: string }

export const openViewer = (url: string, title: string): Promise<void> =>
  invoke("open_viewer", { url, title });

export const navigateContent = (url: string): Promise<void> =>
  invoke("navigate_content", { url });

export const popViewerQueue = (): Promise<ViewerItem[]> =>
  invoke("pop_viewer_queue");

export const checkHtmlAvailable = (arxivId: string): Promise<boolean> =>
  invoke("check_html_available", { arxivId });

// ── shell ─────────────────────────────────────────────────────────────────────
export const openExternal = (url: string): Promise<void> => open(url);
