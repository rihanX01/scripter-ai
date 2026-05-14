import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { recentAuditLog } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/audit")({ component: Page });

function Page() {
  const list = useServerFn(recentAuditLog);
  const { data, isLoading } = useQuery({ queryKey: ["audit"], queryFn: () => list() });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Audit Log</h1>
        <p className="text-muted-foreground mt-1">Every admin action, time-stamped.</p>
      </div>
      <Card className="glass-strong border-border/40 overflow-hidden">
        <div className="divide-y divide-border/30">
          {isLoading && <div className="p-6 text-center text-muted-foreground">Loading…</div>}
          {data?.length === 0 && <div className="p-6 text-center text-muted-foreground text-sm">No actions yet.</div>}
          {data?.map((a: any) => (
            <div key={a.id} className="p-3 flex items-center justify-between text-sm">
              <div>
                <span className="font-mono text-[var(--neon)]">{a.action}</span>
                {a.target_user_id && <span className="text-muted-foreground ml-2 text-xs">target: {a.target_user_id.slice(0, 8)}…</span>}
                {a.metadata && Object.keys(a.metadata).length > 0 && (
                  <span className="text-xs text-muted-foreground ml-2">{JSON.stringify(a.metadata)}</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
