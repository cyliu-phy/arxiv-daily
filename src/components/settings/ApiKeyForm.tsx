import { useState } from "react";
import { setSetting } from "@/lib/tauri";
import type { AppSettings } from "@/lib/tauri";
import { useSettingsStore } from "@/store/useSettingsStore";
import { Eye, EyeOff, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props { settings: AppSettings; }

export function ApiKeyForm({ settings }: Props) {
  const { setSettings } = useSettingsStore();
  const [form, setForm] = useState({
    llm_endpoint: settings.llm_endpoint,
    llm_api_key:  settings.llm_api_key,
    llm_model:    settings.llm_model,
  });
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving]   = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await Promise.all([
        setSetting("llm_endpoint", form.llm_endpoint),
        setSetting("llm_api_key",  form.llm_api_key),
        setSetting("llm_model",    form.llm_model),
      ]);
      setSettings({ ...settings, ...form });
      toast.success("LLM settings saved");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <Field
        label="API Endpoint"
        hint={<>OpenAI-compatible base URL — e.g. <code className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded-md">https://api.openai.com/v1</code></>}
      >
        <Input
          type="text"
          placeholder="https://api.openai.com/v1"
          value={form.llm_endpoint}
          onChange={(v) => setForm({ ...form, llm_endpoint: v })}
        />
      </Field>

      <Field label="API Key">
        <div className="relative">
          <Input
            type={showKey ? "text" : "password"}
            placeholder="sk-…"
            value={form.llm_api_key}
            onChange={(v) => setForm({ ...form, llm_api_key: v })}
            className="pr-9"
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          >
            {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <ShieldCheck size={11} className="text-primary/50" />
          <p className="text-[11px] text-muted-foreground/50">
            Stored locally in SQLite — never sent anywhere except the endpoint above.
          </p>
        </div>
      </Field>

      <Field
        label="Model"
        hint="Any model name your endpoint supports."
      >
        <Input
          type="text"
          placeholder="gpt-4o-mini"
          value={form.llm_model}
          onChange={(v) => setForm({ ...form, llm_model: v })}
        />
      </Field>

      <button
        onClick={save}
        disabled={saving}
        className={cn(
          "flex items-center gap-2 px-5 h-9 rounded-xl text-[12px] font-semibold",
          "bg-primary text-primary-foreground hover:bg-primary/90 transition-colors",
          "disabled:opacity-50"
        )}
      >
        <Save size={13} />
        {saving ? "Saving…" : "Save settings"}
      </button>
    </div>
  );
}

/* ── sub-components ──────────────────────────────────────────────────────────── */

function Field({
  label, hint, children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12px] font-semibold text-foreground/80 tracking-wide">
        {label}
      </label>
      {hint && (
        <p className="text-[11px] text-muted-foreground/60 leading-relaxed">{hint}</p>
      )}
      {children}
    </div>
  );
}

function Input({
  type, placeholder, value, onChange, className,
}: {
  type: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "w-full h-9 px-3 rounded-xl text-[13px] font-sans",
        "bg-muted/40 border border-input text-foreground",
        "placeholder:text-muted-foreground/35",
        "focus:outline-none focus:border-primary/40 focus:ring-gold focus:bg-card",
        "transition-all duration-150",
        className
      )}
    />
  );
}
