import { useState, useEffect, useCallback } from "react";
import {
  Star, ExternalLink, ChevronDown, ChevronUp,
  Languages, EyeOff, Eye, FileText, Globe, Sparkles,
} from "lucide-react";
import type { Article, LlmOutput } from "@/lib/tauri";
import {
  openExternal, llmSummarize,
  onLlmToken, onLlmDone, onLlmError,
  getLlmOutputs, saveLlmOutput,
  openViewer, checkHtmlAvailable,
} from "@/lib/tauri";
import { useToggleFavorite } from "@/hooks/useFavorites";
import { LatexText } from "./LatexText";
import { formatDate, cn } from "@/lib/utils";
import { toast } from "sonner";

// ── helpers ───────────────────────────────────────────────────────────────────

function outputLabel(instruction: string): string {
  if (instruction === "summarize") return "AI Summary";
  const lang = instruction.match(/translate to (.+)/i)?.[1];
  if (lang) return `Translation · ${lang}`;
  return instruction;
}

// ── component ─────────────────────────────────────────────────────────────────

interface Props { article: Article }

export function ArticleCard({ article }: Props) {
  const [expanded, setExpanded]         = useState(false);
  const [cachedOutputs, setCachedOutputs] = useState<LlmOutput[]>([]);
  // track which instructions are hidden (session-only, not persisted)
  const [hidden, setHidden]             = useState<Set<string>>(new Set());
  // instruction currently streaming (null = idle)
  const [streaming, setStreaming]       = useState<{ instruction: string; text: string } | null>(null);
  const toggleFav = useToggleFavorite();

  const [htmlAvailable, setHtmlAvailable] = useState<boolean | null>(null);

  // Load cached outputs once on mount
  useEffect(() => {
    getLlmOutputs(article.id).then(setCachedOutputs).catch(() => {});
  }, [article.id]);

  // Check HTML availability once on mount
  useEffect(() => {
    checkHtmlAvailable(article.id).then(setHtmlAvailable).catch(() => setHtmlAvailable(false));
  }, [article.id]);

  const toggleHide = useCallback((instruction: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(instruction) ? next.delete(instruction) : next.add(instruction);
      return next;
    });
  }, []);

  const runLlm = async (instruction: string) => {
    if (streaming) return;
    setStreaming({ instruction, text: "" });
    // un-hide this slot so the user sees the incoming stream
    setHidden((prev) => { const next = new Set(prev); next.delete(instruction); return next; });

    const unToken = await onLlmToken((tok) =>
      setStreaming((s) => s ? { ...s, text: s.text + tok } : null)
    );
    const cleanup = () => { unToken(); unDone(); unErr(); };
    const unDone = await onLlmDone(async (fullText) => {
      cleanup();
      try {
        await saveLlmOutput(article.id, instruction, fullText);
        const updated = await getLlmOutputs(article.id);
        setCachedOutputs(updated);
      } catch { /* non-fatal */ }
      setStreaming(null);
    });
    const unErr = await onLlmError((msg) => {
      toast.error(msg);
      cleanup();
      setStreaming(null);
    });

    try {
      await llmSummarize(article.abstract_text, instruction);
    } catch {
      setStreaming(null);
    }
  };

  const authorStr =
    article.authors.length > 3
      ? `${article.authors.slice(0, 3).join(", ")} +${article.authors.length - 3}`
      : article.authors.join(", ");

  // Merge cached + any active stream into a single ordered list for display.
  // If a stream is active for an instruction that already has a cached entry,
  // the stream replaces it in that slot.
  const displayOutputs: Array<{ instruction: string; text: string; isStreaming: boolean }> =
    cachedOutputs.map((c) => {
      if (streaming?.instruction === c.instruction) {
        return { instruction: c.instruction, text: streaming.text, isStreaming: true };
      }
      return { instruction: c.instruction, text: c.output, isStreaming: false };
    });

  // If streaming a brand-new instruction (not yet cached), append it
  if (streaming && !cachedOutputs.find((c) => c.instruction === streaming.instruction)) {
    displayOutputs.push({ instruction: streaming.instruction, text: streaming.text, isStreaming: true });
  }

  return (
    <article
      className={cn(
        "group relative rounded-xl border border-border/60 bg-card",
        "p-5 transition-all duration-200",
        "hover:border-border hover:bg-card-hover hover:shadow-card-hover",
        "animate-fade-in"
      )}
    >
      {/* Gold left accent on hover */}
      <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      {/* Meta row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <a
            onClick={(e) => { e.preventDefault(); openExternal(article.link); }}
            href={article.link}
            className="font-mono text-[10px] text-primary/60 hover:text-primary transition-colors cursor-pointer shrink-0"
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

        {/* Action buttons */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
          <IconBtn
            onClick={() => runLlm("translate to Chinese")}
            title="Translate (ZH)"
            active={!!streaming && streaming.instruction === "translate to Chinese"}
          >
            <Languages size={12} className={streaming?.instruction === "translate to Chinese" ? "animate-pulse" : ""} />
          </IconBtn>
          <IconBtn
            onClick={() => openViewer(`https://arxiv.org/pdf/${article.id}`, `PDF · ${article.id}`)}
            title="View PDF"
          >
            <FileText size={12} />
          </IconBtn>
          {htmlAvailable && (
            <IconBtn
              onClick={() => openViewer(`https://arxiv.org/html/${article.id}`, `HTML · ${article.id}`)}
              title="View HTML"
            >
              <Globe size={12} />
            </IconBtn>
          )}
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

      {/* Title */}
      <h3 className="font-display text-[17px] font-medium leading-snug text-foreground mb-1.5 line-clamp-2">
        <LatexText text={article.title} />
      </h3>

      {/* Authors */}
      {authorStr && (
        <p className="text-[12px] text-muted-foreground/70 mb-2.5 truncate font-sans">
          {authorStr}
        </p>
      )}

      {/* Abstract */}
      <div>
        <div className={cn(
          "text-[13px] leading-relaxed text-muted-foreground",
          !expanded && "line-clamp-3"
        )}>
          <LatexText text={article.abstract_text} />
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-primary/60 hover:text-primary transition-colors font-medium"
        >
          {expanded
            ? <><ChevronUp size={11} strokeWidth={2.5} /> Less</>
            : <><ChevronDown size={11} strokeWidth={2.5} /> More</>}
        </button>
      </div>

      {/* ── Pinned LLM outputs ─────────────────────────────────────────────── */}
      {displayOutputs.map(({ instruction, text, isStreaming }) => {
        const isHidden = hidden.has(instruction);
        return (
          <div
            key={instruction}
            className="mt-3 rounded-lg border border-primary/15 bg-primary/5 overflow-hidden"
          >
            {/* Output header */}
            <div className="flex items-center justify-between px-3.5 py-2 border-b border-primary/10">
              <div className="flex items-center gap-1.5">
                <Sparkles size={10} className={cn("text-primary/50", isStreaming && "animate-pulse")} />
                <span className="font-mono text-[10px] uppercase tracking-widest text-primary/60 font-medium">
                  {outputLabel(instruction)}
                </span>
                {isStreaming && (
                  <span className="font-mono text-[9px] text-primary/40 animate-pulse">
                    generating…
                  </span>
                )}
              </div>
              <button
                onClick={() => toggleHide(instruction)}
                title={isHidden ? "Show" : "Hide"}
                className="flex items-center gap-1 text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors font-medium"
              >
                {isHidden
                  ? <><Eye size={10} /> Show</>
                  : <><EyeOff size={10} /> Hide</>}
              </button>
            </div>

            {/* Output body */}
            {!isHidden && (
              <div className="px-3.5 py-2.5">
                <p className="text-[12.5px] leading-relaxed text-foreground/85 whitespace-pre-wrap font-sans">
                  {text}
                  {isStreaming && (
                    <span className="inline-block w-1.5 h-3.5 bg-primary/50 ml-0.5 animate-pulse rounded-sm align-text-bottom" />
                  )}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </article>
  );
}

function IconBtn({
  children, onClick, title, active,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "h-6 w-6 flex items-center justify-center rounded-md transition-all duration-100",
        active
          ? "text-primary bg-primary/10"
          : "text-muted-foreground/40 hover:text-accent-foreground hover:bg-accent"
      )}
    >
      {children}
    </button>
  );
}
