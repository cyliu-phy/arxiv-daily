import { useState } from "react";
import { CATEGORY_GROUPS } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { Check, ChevronDown } from "lucide-react";

interface Props {
  selected: string[];
  onChange: (cats: string[]) => void;
}

export function CategoryPicker({ selected, onChange }: Props) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    new Set(CATEGORY_GROUPS.map(([g]) => g))
  );

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((c) => c !== id) : [...selected, id]);

  const toggleGroup = (group: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(group) ? next.delete(group) : next.add(group);
      return next;
    });

  return (
    <div className="space-y-2 max-h-[380px] overflow-y-auto -mx-1 px-1">
      {CATEGORY_GROUPS.map(([group, cats]) => {
        const isOpen = openGroups.has(group);
        const groupSelected = cats.filter((c) => selected.includes(c.id)).length;
        return (
          <div key={group} className="rounded-xl border border-border/60 overflow-hidden">
            {/* Group header */}
            <button
              onClick={() => toggleGroup(group)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-medium text-foreground/70 uppercase tracking-widest">
                  {group}
                </span>
                {groupSelected > 0 && (
                  <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20 tabular-nums">
                    {groupSelected}
                  </span>
                )}
              </div>
              <ChevronDown
                size={13}
                className={cn(
                  "text-muted-foreground/40 transition-transform duration-200",
                  isOpen && "rotate-180"
                )}
              />
            </button>

            {/* Category rows */}
            {isOpen && (
              <div className="divide-y divide-border/40">
                {cats.map((cat) => {
                  const isSel = selected.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggle(cat.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 text-left",
                        "transition-colors duration-100",
                        isSel
                          ? "bg-primary/8 hover:bg-primary/12"
                          : "hover:bg-muted/30"
                      )}
                    >
                      {/* Checkbox */}
                      <div
                        className={cn(
                          "h-4 w-4 rounded-[4px] border flex items-center justify-center shrink-0 transition-all duration-150",
                          isSel
                            ? "bg-primary border-primary"
                            : "border-border/60 bg-card"
                        )}
                      >
                        {isSel && <Check size={9} strokeWidth={3} className="text-primary-foreground" />}
                      </div>

                      {/* ID */}
                      <span className="font-mono text-[10px] text-muted-foreground/50 w-28 shrink-0">
                        {cat.id}
                      </span>

                      {/* Label */}
                      <span className={cn(
                        "text-[12px] font-medium truncate transition-colors",
                        isSel ? "text-foreground" : "text-foreground/70"
                      )}>
                        {cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
