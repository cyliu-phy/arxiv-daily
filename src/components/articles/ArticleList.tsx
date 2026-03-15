import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Article } from "@/lib/tauri";
import { ArticleCard } from "./ArticleCard";
import { Loader2, Inbox } from "lucide-react";

interface Props {
  articles: Article[];
  isLoading?: boolean;
  emptyMessage?: string;
}

export function ArticleList({ articles, isLoading, emptyMessage }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: articles.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 210,
    overscan: 4,
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center gap-2.5 text-muted-foreground/50">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm font-sans">Fetching…</span>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
          <Inbox size={20} className="text-muted-foreground/30" />
        </div>
        <p className="text-sm text-muted-foreground/50 font-sans text-center max-w-xs">
          {emptyMessage ?? "No articles found."}
        </p>
      </div>
    );
  }

  return (
    <div ref={parentRef} className="flex-1 overflow-y-auto">
      <div
        style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}
        className="px-4 py-3"
      >
        {virtualizer.getVirtualItems().map((vItem) => (
          <div
            key={vItem.key}
            data-index={vItem.index}
            ref={virtualizer.measureElement}
            style={{
              position: "absolute",
              top: 0,
              left: 16,
              right: 16,
              transform: `translateY(${vItem.start}px)`,
              paddingBottom: "8px",
            }}
          >
            <ArticleCard article={articles[vItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
