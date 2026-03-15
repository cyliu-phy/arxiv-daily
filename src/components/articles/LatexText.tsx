import { useEffect, useRef, memo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";

// ── segment parser ────────────────────────────────────────────────────────────
type SegmentKind = "text" | "inline" | "display";
interface Segment {
  kind: SegmentKind;
  content: string;
}

/**
 * Splits a string into plain-text and math segments.
 * Handles: $$...$$ · $...$ · \[...\] · \(...\)
 */
function parseSegments(text: string): Segment[] {
  const segs: Segment[] = [];
  // Order matters: try $$ before $ so display blocks aren't eaten by inline pattern
  const re =
    /\$\$([\s\S]*?)\$\$|\$([^$\n]{1,300}?)\$|\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g;
  let last = 0;

  for (const m of text.matchAll(re)) {
    const start = m.index ?? 0;
    if (start > last) segs.push({ kind: "text", content: text.slice(last, start) });

    if (m[1] !== undefined)      segs.push({ kind: "display", content: m[1] });
    else if (m[2] !== undefined) segs.push({ kind: "inline",  content: m[2] });
    else if (m[3] !== undefined) segs.push({ kind: "display", content: m[3] });
    else if (m[4] !== undefined) segs.push({ kind: "inline",  content: m[4] });

    last = start + m[0].length;
  }

  if (last < text.length) segs.push({ kind: "text", content: text.slice(last) });
  return segs;
}

// ── KaTeX leaf renderer ───────────────────────────────────────────────────────
const MathNode = memo(function MathNode({
  latex,
  display,
}: {
  latex: string;
  display: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    try {
      katex.render(latex.trim(), el, {
        displayMode: display,
        throwOnError: false,
        trust: false,
        strict: false,
      });
    } catch {
      el.textContent = display ? `$$${latex}$$` : `$${latex}$`;
    }
  }, [latex, display]);

  return (
    <span
      ref={ref}
      className={cn(
        display
          ? "block my-1 overflow-x-auto text-center"
          : "inline align-middle"
      )}
    />
  );
});

// ── public component ──────────────────────────────────────────────────────────
interface Props {
  text: string;
  className?: string;
}

export const LatexText = memo(function LatexText({ text, className }: Props) {
  const segments = parseSegments(text);

  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.kind === "text" ? (
          <span key={i}>{seg.content}</span>
        ) : (
          <MathNode
            key={i}
            latex={seg.content}
            display={seg.kind === "display"}
          />
        )
      )}
    </span>
  );
});
