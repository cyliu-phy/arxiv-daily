import { create } from "zustand";

export type UITab = "recent" | "all" | "bookmarks";

interface AppState {
  activeCategory: string | null;
  activeTab: UITab;
  searchQuery: string;
  showSettings: boolean;
  setActiveCategory: (cat: string | null) => void;
  setActiveTab: (tab: UITab) => void;
  setSearchQuery: (q: string) => void;
  setShowSettings: (v: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeCategory: null,
  activeTab: "recent",
  searchQuery: "",
  showSettings: false,

  setActiveCategory: (activeCategory) =>
    set((s) => ({
      activeCategory,
      // Stay on bookmarks if it was already active; otherwise switch to recent
      activeTab: s.activeTab === "bookmarks" ? "bookmarks" : "recent",
      searchQuery: "",
    })),
  setActiveTab: (activeTab) => set({ activeTab }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setShowSettings: (showSettings) => set({ showSettings }),
}));
