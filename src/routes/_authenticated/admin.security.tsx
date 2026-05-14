import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listAdminLoginEvents } from "@/lib/admin-security.functions";
import { Card } from "@/components/ui/card";
import { Shield, CheckCircle2, XCircle, Globe, Monitor, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/security")({
  component: SecurityPage,
});

function SecurityPage() {
  const fn = useServerFn(listAdminLoginEvents);
  const { data, isLoading } = useQuery({ queryKey: ["admin-login-events"], queryFn: () => fn() });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2"><Shield className="size-7 text-[var(--neon)]" /> Security</h1>
        <p className="text-muted-foreground mt-1">Admin login events with IP, browser, and outcome.</p>
      </div>

      <Card className="glass-strong p-5 border-border/40">
        <div className="font-display font-semibold mb-4">Recent admin sign-ins</div>
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="size-4 animate-spin" /> Loading…</div>
        ) : !data?.length ? (
          <div className="text-muted-foreground text-sm">No login events yet.</div>
        ) : (
          <div className="space-y-2">
            {data.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between text-sm py-2.5 px-3 rounded-lg border border-border/30 hover:bg-white/5 transition">
                <div className="flex items-center gap-3 min-w-0">
                  {e.success
                    ? <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                    : <XCircle className="size-4 text-rose-400 shrink-0" />}
                  <div className="min-w-0">
                    <div className="truncate text-foreground">{e.email ?? "—"}</div>
                    <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                      <span className="inline-flex items-center gap-1"><Globe className="size-3" /> {e.ip ?? "unknown ip"}</span>
                      <span className="inline-flex items-center gap-1 truncate max-w-[260px]"><Monitor className="size-3" /> {e.user_agent ?? "—"}</span>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap pl-3">{new Date(e.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
