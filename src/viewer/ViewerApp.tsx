import { useState, useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { popViewerQueue, navigateContent, type ViewerItem } from "@/lib/tauri";
import { X, FileText, Globe, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  url: string;
  title: string;
  type: "pdf" | "html";
}

function tabType(url: string): "pdf" | "html" {
  return url.includes("/pdf/") ? "pdf" : "html";
}

function makeTab(item: ViewerItem, idRef: { current: number }): Tab {
  return {
    id: String(idRef.current++),
    url: item.url,
    title: item.title,
    type: tabType(item.url),
  };
}

export default function ViewerApp() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const nextId = useRef(0);

  useEffect(() => {
    // Drain items that were queued before this page was ready.
    // The content webview is already navigated to the first URL (set at creation),
    // so we only need to record the tab — no navigateContent call needed.
    popViewerQueue().then((items) => {
      if (!items.length) return;
      const newTabs = items.map((i) => makeTab(i, nextId));
      setTabs(newTabs);
      setActiveId(newTabs[newTabs.length - 1].id);
    });

    // Subsequent opens arrive as events while the window is alive.
    const unsub = listen<ViewerItem>("viewer_open", (e) => {
      const tab = makeTab(e.payload, nextId);
      setTabs((prev) => [...prev, tab]);
      setActiveId(tab.id);
      navigateContent(tab.url).catch(() => {});
    });

    return () => { unsub.then((fn) => fn()); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const switchTab = (tab: Tab) => {
    if (tab.id === activeId) return;
    setActiveId(tab.id);
    navigateContent(tab.url).catch(() => {});
  };

  const closeTab = (id: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      const next = prev.filter((t) => t.id !== id);
      if (activeId === id && next.length > 0) {
        const newActive = next[Math.max(0, idx - 1)];
        setActiveId(newActive.id);
        navigateContent(newActive.url).catch(() => {});
      } else if (next.length === 0) {
        setActiveId(null);
      }
      return next;
    });
  };

  return (
    <div className="flex items-center h-full bg-card border-b border-border overflow-x-auto select-none">
      {tabs.length === 0 ? (
        <div className="flex items-center gap-2 px-4 text-muted-foreground/40">
          <BookOpen size={12} strokeWidth={1.5} />
          <span className="font-mono text-[11px] italic">no papers open</span>
        </div>
      ) : (
        tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => switchTab(tab)}
            className={cn(
              "group flex items-center gap-1.5 px-3 h-full text-[11px] font-mono whitespace-nowrap shrink-0",
              "border-b-2 transition-colors duration-100",
              tab.id === activeId
                ? "border-primary text-foreground bg-background"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            {tab.type === "pdf"
              ? <FileText size={10} className="shrink-0 opacity-60" />
              : <Globe size={10} className="shrink-0 opacity-60" />}
            <span className="max-w-[180px] truncate">{tab.title}</span>
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
              className={cn(
                "ml-0.5 flex items-center justify-center w-3.5 h-3.5 rounded shrink-0",
                "opacity-0 group-hover:opacity-50 hover:!opacity-100 hover:bg-muted transition-opacity"
              )}
            >
              <X size={9} strokeWidth={2.5} />
            </span>
          </button>
        ))
      )}
    </div>
  );
}
