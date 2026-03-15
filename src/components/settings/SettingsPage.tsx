import { useState } from "react";
import { X } from "lucide-react";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useAppStore } from "@/store/useAppStore";
import { setSubscriptions } from "@/lib/tauri";
import { CategoryPicker } from "./CategoryPicker";
import { ApiKeyForm } from "./ApiKeyForm";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Tab = "categories" | "llm";

export function SettingsPage() {
  const { setShowSettings } = useAppStore();
  const { subscriptions, setSubscriptions: storeSave, settings } = useSettingsStore();
  const [tab, setTab]     = useState<Tab>("categories");
  const [draft, setDraft] = useState<string[]>(subscriptions);
  const [saving, setSaving] = useState(false);

  const saveCategories = async () => {
    setSaving(true);
    try {
      await setSubscriptions(draft);
      storeSave(draft);
      toast.success("Subscriptions saved");
      setShowSettings(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && setShowSettings(false)}
    >
      <div className="w-[600px] max-h-[82vh] bg-card border border-border rounded-2xl shadow-card-hover flex flex-col overflow-hidden animate-fade-in">

        {/* Gold top accent */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

        {/* Title bar */}
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-medium text-foreground">Settings</h2>
            <p className="text-xs text-muted-foreground/60 mt-0.5 font-mono">
              arXiv Daily preferences
            </p>
          </div>
          <button
            onClick={() => setShowSettings(false)}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 px-6 border-b border-border">
          {(["categories", "llm"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-2.5 text-[12px] font-medium rounded-t-lg transition-all duration-150 relative border border-transparent",
                t === tab
                  ? "text-foreground bg-background border-border border-b-background after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-px after:bg-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              {t === "categories" ? "Categories" : "LLM / API"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {tab === "categories" ? (
            <>
              <p className="text-xs text-muted-foreground/70 mb-4 font-sans leading-relaxed">
                Choose which arXiv categories to track. Only selected feeds are fetched and cached.
              </p>
              <CategoryPicker selected={draft} onChange={setDraft} />
            </>
          ) : (
            <ApiKeyForm settings={settings} />
          )}
        </div>

        {/* Footer */}
        {tab === "categories" && (
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-border bg-muted/20">
            <span className="font-mono text-[10px] text-muted-foreground/50 tabular-nums">
              {draft.length} feed{draft.length !== 1 ? "s" : ""} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 h-8 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveCategories}
                disabled={saving}
                className="px-5 h-8 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
