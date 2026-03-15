import { useEffect } from "react";
import { Bookmark } from "lucide-react";
import { useAppStore, type UITab } from "@/store/useAppStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useArticles, useSearchArticles, useFetchFeed } from "@/hooks/useArticles";
import { useFavorites } from "@/hooks/useFavorites";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { ArticleList } from "@/components/articles/ArticleList";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { getCategoryLabel } from "@/lib/categories";
import { cn } from "@/lib/utils";

const TABS: { id: UITab; label: string; icon?: React.ReactNode }[] = [
  { id: "recent",    label: "Recent" },
  { id: "all",       label: "All" },
  { id: "bookmarks", label: "Bookmarks", icon: <Bookmark size={11} strokeWidth={2.5} /> },
];

export default function App() {
  const {
    activeCategory, activeTab, setActiveTab,
    searchQuery, showSettings, setActiveCategory,
  } = useAppStore();

  const { subscriptions, settings, loaded, load } = useSettingsStore();
  const fetchFeed = useFetchFeed();

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!loaded) return;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = settings.theme === "dark" || (settings.theme === "system" && prefersDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, [loaded, settings.theme]);

  useEffect(() => {
    if (loaded && !activeCategory && subscriptions.length > 0)
      setActiveCategory(subscriptions[0]);
  }, [loaded, subscriptions, activeCategory, setActiveCategory]);

  useEffect(() => {
    if (activeCategory) fetchFeed.mutate(activeCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory]);

  const searchActive = searchQuery.trim().length >= 2;
  const isBookmarks  = activeTab === "bookmarks";

  const articlesQuery  = useArticles(searchActive || isBookmarks ? null : activeCategory, activeTab);
  const searchResults  = useSearchArticles(searchQuery);
  const favoritesQuery = useFavorites();

  const articles  =
    searchActive ? (searchResults.data  ?? []) :
    isBookmarks  ? (favoritesQuery.data ?? []) :
                   (articlesQuery.data  ?? []);

  const isLoading =
    searchActive ? searchResults.isLoading  :
    isBookmarks  ? favoritesQuery.isLoading :
                   articlesQuery.isLoading;

  const pageTitle =
    searchActive ? `"${searchQuery}"` :
    isBookmarks  ? "Bookmarks" :
    activeCategory ? getCategoryLabel(activeCategory) :
    "Select a category";

  if (!loaded) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="flex items-center gap-2.5 text-muted-foreground/40">
          <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" />
          <span className="font-mono text-xs">loading</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Content header */}
          <div className="shrink-0 border-b border-border bg-surface/50">
            <div className="px-5 pt-3.5 pb-0 flex items-end justify-between">
              <div className="flex items-end gap-4">
                {/* Page title */}
                <h1 className="font-display text-xl font-medium text-foreground leading-none mb-3">
                  {pageTitle}
                </h1>

                {/* Tab bar */}
                {subscriptions.length > 0 && !searchActive && (
                  <div className="flex items-end gap-0.5 mb-0">
                    {TABS.map(({ id, label, icon }) => (
                      <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={cn(
                          "group flex items-center gap-1.5 px-3.5 py-2.5 text-[12px] font-medium",
                          "rounded-t-lg border border-transparent transition-all duration-150 relative",
                          activeTab === id
                            ? [
                                "text-foreground bg-background border-border border-b-background",
                                "after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-px after:bg-background",
                              ]
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                        )}
                      >
                        {icon && (
                          <span className={cn(
                            "transition-colors",
                            activeTab === id ? "text-primary" : "text-muted-foreground/50"
                          )}>
                            {icon}
                          </span>
                        )}
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Count badge */}
              {!searchActive && articles.length > 0 && (
                <div className="mb-3">
                  <span className="font-mono text-[10px] text-muted-foreground/40 tabular-nums">
                    {articles.length.toLocaleString()} papers
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Article list */}
          <ArticleList
            articles={articles}
            isLoading={isLoading}
            emptyMessage={
              searchActive ? "No results match your search." :
              isBookmarks  ? "No bookmarks yet — star an article to save it." :
                             "No articles cached. Click ↻ to sync."
            }
          />
        </main>
      </div>

      {showSettings && <SettingsPage />}
    </div>
  );
}
