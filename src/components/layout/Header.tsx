import { Search, RefreshCw, Moon, Sun, Settings } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useFetchFeed } from "@/hooks/useArticles";
import { setSetting } from "@/lib/tauri";
import { cn } from "@/lib/utils";

export function Header() {
  const { activeCategory, searchQuery, setSearchQuery, setShowSettings } = useAppStore();
  const { settings, setSettings } = useSettingsStore();
  const fetchFeed = useFetchFeed();

  const isDark = settings.theme === "dark";

  const toggleTheme = async () => {
    const next = isDark ? "light" : "dark";
    await setSetting("theme", next);
    setSettings({ ...settings, theme: next });
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  return (
    <header className="relative h-13 shrink-0 border-b border-border bg-card/80 backdrop-blur-md z-20">
      {/* Subtle top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      <div className="flex h-full items-center gap-3 px-4">
        {/* Wordmark */}
        <div className="flex items-center gap-2 shrink-0 mr-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 border border-primary/20">
            <span className="font-mono text-[10px] font-medium text-primary leading-none">arX</span>
          </div>
          <span className="font-sans text-sm font-semibold text-foreground tracking-tight hidden sm:block">
            Daily
          </span>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-lg relative group">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none transition-colors group-focus-within:text-primary"
          />
          <input
            type="text"
            placeholder="Search titles, authors, abstracts…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full h-8 pl-8 pr-3 text-sm rounded-md",
              "bg-muted/50 border border-input",
              "text-foreground placeholder:text-muted-foreground/50",
              "transition-all duration-150",
              "focus:outline-none focus:bg-card focus:border-primary/40 focus:ring-gold"
            )}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground text-xs leading-none"
            >
              ×
            </button>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-0.5 ml-auto">
          <HeaderBtn
            onClick={() => activeCategory && fetchFeed.mutate(activeCategory)}
            disabled={!activeCategory || fetchFeed.isPending}
            title="Sync now"
          >
            <RefreshCw size={14} className={cn(fetchFeed.isPending && "animate-spin")} />
          </HeaderBtn>

          <HeaderBtn onClick={toggleTheme} title={isDark ? "Light mode" : "Dark mode"}>
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </HeaderBtn>

          <HeaderBtn onClick={() => setShowSettings(true)} title="Settings">
            <Settings size={14} />
          </HeaderBtn>
        </div>
      </div>
    </header>
  );
}

function HeaderBtn({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "h-8 w-8 flex items-center justify-center rounded-md",
        "text-muted-foreground transition-all duration-150",
        "hover:bg-accent hover:text-accent-foreground",
        "disabled:opacity-30 disabled:cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}
