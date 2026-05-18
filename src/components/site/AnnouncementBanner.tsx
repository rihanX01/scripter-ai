import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, Megaphone, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Announcement = {
  id: string;
  title: string;
  body: string;
  variant: "info" | "success" | "warning" | "promo";
  created_at: string;
};

const variantStyles: Record<Announcement["variant"], string> = {
  info: "bg-primary/10 border-primary/30 text-foreground",
  success: "bg-emerald-500/10 border-emerald-500/30 text-foreground",
  warning: "bg-amber-500/10 border-amber-500/40 text-foreground",
  promo: "bg-gradient-to-r from-fuchsia-500/15 via-purple-500/15 to-cyan-500/15 border-fuchsia-500/30 text-foreground",
};

const variantIcons: Record<Announcement["variant"], React.ComponentType<{ className?: string }>> = {
  info: Megaphone,
  success: CheckCircle2,
  warning: AlertTriangle,
  promo: Sparkles,
};

const DISMISS_KEY = "dismissed_announcements_v1";

function getDismissed(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || "[]"); } catch { return []; }
}

export function AnnouncementBanner() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    setDismissed(getDismissed());

    const load = async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("id,title,body,variant,created_at")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(5);
      if (!error && data) setItems(data as Announcement[]);
    };
    load();

    const channel = supabase
      .channel("announcements-public")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, load)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const visible = items.filter((a) => !dismissed.includes(a.id));
  if (!visible.length) return null;

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    try { localStorage.setItem(DISMISS_KEY, JSON.stringify(next)); } catch {}
  };

  return (
    <div className="sticky top-0 z-50 w-full space-y-1 px-2 pt-2">
      {visible.map((a) => {
        const Icon = variantIcons[a.variant] ?? Megaphone;
        return (
          <div
            key={a.id}
            className={cn(
              "mx-auto flex max-w-6xl items-start gap-3 rounded-xl border px-4 py-2.5 backdrop-blur-md shadow-sm",
              variantStyles[a.variant] ?? variantStyles.info,
            )}
            role="status"
          >
            <Icon className="mt-0.5 size-4 shrink-0 opacity-80" />
            <div className="flex-1 min-w-0">
              <div className="font-display text-sm font-semibold leading-tight">{a.title}</div>
              <div className="text-xs text-muted-foreground leading-snug mt-0.5 break-words">{a.body}</div>
            </div>
            <button
              onClick={() => dismiss(a.id)}
              className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition"
              aria-label="Dismiss"
            >
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
