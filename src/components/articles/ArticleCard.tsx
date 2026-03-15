import { useState } from "react";
import {
  Star, ExternalLink, ChevronDown, ChevronUp,
  Sparkles, Languages,
} from "lucide-react";
import type { Article } from "@/lib/tauri";
import {
  openExternal, llmSummarize,
  onLlmToken, onLlmDone, onLlmError,
} from "@/lib/tauri";
import { useToggleFavorite } from "@/hooks/useFavorites";
import { LatexText } from "./LatexText";
import { formatDate, cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  article: Article;
}

export function ArticleCard({ article }: Props) {
  const [expanded, setExpanded]     = useState(false);
  const [llmOutput, setLlmOutput]   = useState<string | null>(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const toggleFav = useToggleFavorite();

  const authorStr =
    article.authors.length > 3
      ? `${article.authors.slice(0, 3).join(", ")} +${article.authors.length - 3}`
      : article.authors.join(", ");

  const runLlm = async (instruction: string) => {
    if (llmLoading) return;
    setLlmOutput("");
    setLlmLoading(true);
    setExpanded(true);

    const unToken = await onLlmToken((tok) => setLlmOutput((p) => (p ?? "") + tok));
    const unDone  = await onLlmDone(() => { setLlmLoading(false); unToken(); unDone(); });
    const unErr   = await onLlmError((msg) => {
      toast.error(msg);
      setLlmLoading(false);
      setLlmOutput(null);
      unToken(); unDone(); unErr();
    });

    try {
      await llmSummarize(article.abstract_text, instruction);
    } catch {
      setLlmLoading(false);
      setLlmOutput(null);
    }
  };

  return (
    <article
      className={cn(
        "group relative rounded-xl border border-border/60 bg-card",
        "p-5 transition-all duration-200",
        "hover:border-border hover:bg-card-hover hover:shadow-card-hover",
        "animate-fade-in"
      )}
    >
      {/* Gold left accent — appears on hover */}
      <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      {/* Top meta row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <a
            onClick={(e) => { e.preventDefault(); openExternal(article.link); }}
            href={article.link}
            className="font-mono text-[10px] text-primary/60 hover:text-primary transition-colors cursor-pointer shrink-0"
            title="Open on arXiv"
          >
            {article.id}
          </a>
          <span className="text-muted-foreground/30 text-xs">·</span>
          <span className="font-mono text-[10px] text-muted-foreground/50">
            {formatDate(article.published_at)}
          </span>
          <span className="text-muted-foreground/30 text-xs hidden sm:block">·</span>
          <span className="font-mono text-[10px] text-muted-foreground/40 hidden sm:block">
            {article.category}
          </span>
        </div>

        {/* Action buttons — fade in on hover */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
          <IconBtn onClick={() => runLlm("summarize")} title="AI summary">
            <Sparkles size={12} />
          </IconBtn>
          <IconBtn onClick={() => runLlm("translate to Chinese")} title="Translate (ZH)">
            <Languages size={12} />
          </IconBtn>
          <IconBtn onClick={() => openExternal(article.link)} title="Open on arXiv">
            <ExternalLink size={12} />
          </IconBtn>
          <button
            onClick={() => toggleFav.mutate(article.id)}
            title={article.is_favorite ? "Unstar" : "Bookmark"}
            className={cn(
              "h-6 w-6 flex items-center justify-center rounded-md transition-all duration-150",
              article.is_favorite
                ? "text-primary"
                : "text-muted-foreground/40 hover:text-primary hover:bg-primary/8"
            )}
          >
            <Star
              size={12}
              strokeWidth={article.is_favorite ? 0 : 2}
              fill={article.is_favorite ? "currentColor" : "none"}
            />
          </button>
        </div>
      </div>

      {/* Title — Crimson Pro serif */}
      <h3 className="font-display text-[17px] font-medium leading-snug text-foreground mb-1.5 line-clamp-2">
        <LatexText text={article.title} />
      </h3>

      {/* Authors */}
      {authorStr && (
        <p className="text-[12px] text-muted-foreground/70 mb-2.5 truncate font-sans">
          {authorStr}
        </p>
      )}

      {/* Abstract — collapsible */}
      <div>
        <div
          className={cn(
            "text-[13px] leading-relaxed text-muted-foreground",
            !expanded && "line-clamp-3"
          )}
        >
          <LatexText text={article.abstract_text} />
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-primary/60 hover:text-primary transition-colors font-medium"
        >
          {expanded ? (
            <><ChevronUp size={11} strokeWidth={2.5} /> Less</>
          ) : (
            <><ChevronDown size={11} strokeWidth={2.5} /> More</>
          )}
        </button>
      </div>

      {/* LLM panel */}
      {(llmOutput !== null || llmLoading) && (
        <div className="mt-4 rounded-lg bg-primary/5 border border-primary/15 p-3.5">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles size={10} className="text-primary/60" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary/60 font-medium">
              {llmLoading ? "generating…" : "AI output"}
            </span>
          </div>
          <p className="text-[12.5px] leading-relaxed text-foreground/85 whitespace-pre-wrap font-sans">
            {llmOutput}
            {llmLoading && (
              <span className="inline-block w-1.5 h-3.5 bg-primary/50 ml-0.5 animate-pulse rounded-sm" />
            )}
          </p>
        </div>
      )}
    </article>
  );
}

function IconBtn({
  children, onClick, title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground/40 hover:text-accent-foreground hover:bg-accent transition-all duration-100"
    >
      {children}
    </button>
  );
}
