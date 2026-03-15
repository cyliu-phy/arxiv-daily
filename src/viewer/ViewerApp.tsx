import { useState, useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { popViewerQueue, type ViewerItem } from "@/lib/tauri";
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

export default function ViewerApp() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const nextId = useRef(0);

  function makeTab(item: ViewerItem): Tab {
    return {
      id: String(nextId.current++),
      url: item.url,
      title: item.title,
      type: tabType(item.url),
    };
  }

  useEffect(() => {
    // On mount: drain any queued opens from before the window was ready
    popViewerQueue().then((items) => {
      if (items.length === 0) return;
      const newTabs = items.map(makeTab);
      setTabs(newTabs);
      setActiveId(newTabs[newTabs.length - 1].id);
    });

    // Listen for subsequent opens while the window is alive
    const unlistenPromise = listen<ViewerItem>("viewer_open", (e) => {
      const tab = makeTab(e.payload);
      setTabs((prev) => [...prev, tab]);
      setActiveId(tab.id);
    });

    return () => {
      unlistenPromise.then((fn) => fn());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const closeTab = (id: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      const next = prev.filter((t) => t.id !== id);
      if (activeId === id && next.length > 0) {
        setActiveId(next[Math.max(0, idx - 1)].id);
      } else if (next.length === 0) {
        setActiveId(null);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground select-none">
      {/* Tab bar */}
      <div className="flex items-end overflow-x-auto bg-card border-b border-border shrink-0 min-h-[38px]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveId(tab.id)}
            className={cn(
              "group flex items-center gap-1.5 px-3 py-2 text-[11px] font-mono whitespace-nowrap",
              "border-b-2 transition-colors duration-100 shrink-0 max-w-[200px]",
              tab.id === activeId
                ? "border-primary text-foreground bg-background"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            {tab.type === "pdf"
              ? <FileText size={10} className="shrink-0 opacity-60" />
              : <Globe size={10} className="shrink-0 opacity-60" />}
            <span className="truncate">{tab.title}</span>
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
              className={cn(
                "ml-0.5 rounded flex items-center justify-center w-3.5 h-3.5 shrink-0",
                "opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-muted transition-opacity"
              )}
            >
              <X size={9} strokeWidth={2.5} />
            </span>
          </button>
        ))}
        {tabs.length === 0 && (
          <span className="px-4 py-2 text-[11px] font-mono text-muted-foreground/40 italic">
            no papers open
          </span>
        )}
      </div>

      {/* Iframe pane — all iframes are mounted, only active one is visible */}
      <div className="flex-1 relative">
        {tabs.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground/30">
            <BookOpen size={40} strokeWidth={1} />
            <p className="font-mono text-xs">open a paper from the main window</p>
          </div>
        ) : (
          tabs.map((tab) => (
            <iframe
              key={tab.id}
              src={tab.url}
              title={tab.title}
              className="absolute inset-0 w-full h-full border-0"
              style={{ display: tab.id === activeId ? "block" : "none" }}
            />
          ))
        )}
      </div>
    </div>
  );
}
