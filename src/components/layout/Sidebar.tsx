import { useAppStore } from "@/store/useAppStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { getCategoryLabel } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { FlaskConical, Settings } from "lucide-react";

export function Sidebar() {
  const { activeCategory, setActiveCategory, setShowSettings } = useAppStore();
  const { subscriptions } = useSettingsStore();

  if (subscriptions.length === 0) {
    return (
      <aside className="w-56 shrink-0 border-r border-border bg-surface flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-5 text-center">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
            <FlaskConical size={18} className="text-muted-foreground/40" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground/70">No feeds yet</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add categories in settings
            </p>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="mt-1 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
          >
            <Settings size={11} />
            Open Settings
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-surface flex flex-col overflow-hidden">
      {/* Header label */}
      <div className="px-4 pt-4 pb-2">
        <p className="font-mono text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">
          Feeds
        </p>
      </div>

      {/* Category list */}
      <nav className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
        {subscriptions.map((cat, i) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{ animationDelay: `${i * 30}ms` }}
              className={cn(
                "group relative w-full flex flex-col items-start gap-0.5",
                "px-3 py-2.5 rounded-lg text-left",
                "transition-all duration-150 animate-slide-in",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-foreground/70 hover:bg-muted/60 hover:text-foreground"
              )}
            >
              {/* Active indicator bar */}
              <div
                className={cn(
                  "absolute left-0 top-2 bottom-2 w-0.5 rounded-full transition-all duration-200",
                  isActive ? "bg-primary opacity-100" : "opacity-0"
                )}
              />
              <span
                className={cn(
                  "font-mono text-[10px] font-medium leading-none transition-colors",
                  isActive ? "text-primary/70" : "text-muted-foreground/50"
                )}
              >
                {cat}
              </span>
              <span
                className={cn(
                  "text-[12px] leading-snug font-medium transition-colors line-clamp-1",
                  isActive ? "text-primary" : "text-foreground/80"
                )}
              >
                {getCategoryLabel(cat)}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-3 py-2.5">
        <button
          onClick={() => setShowSettings(true)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <Settings size={12} />
          <span>Manage feeds</span>
        </button>
      </div>
    </aside>
  );
}
