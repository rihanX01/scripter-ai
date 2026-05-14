import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listFeatureFlags, setFeatureFlag } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/flags")({ component: Page });

function Page() {
  const list = useServerFn(listFeatureFlags);
  const set = useServerFn(setFeatureFlag);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["flags"], queryFn: () => list() });

  const toggle = async (key: string, enabled: boolean) => {
    await set({ data: { key, enabled } });
    toast.success(`${key} ${enabled ? "enabled" : "disabled"}`);
    qc.invalidateQueries({ queryKey: ["flags"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Feature Flags</h1>
        <p className="text-muted-foreground mt-1">Instantly toggle platform capabilities.</p>
      </div>
      {isLoading ? <div className="text-muted-foreground">Loading…</div> : (
        <div className="grid md:grid-cols-2 gap-3">
          {data?.map((f: any) => (
            <Card key={f.key} className="glass-strong p-4 border-border/40 flex items-center justify-between">
              <div>
                <div className="font-mono text-sm">{f.key}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Updated {new Date(f.updated_at).toLocaleString()}</div>
              </div>
              <Switch checked={f.enabled} onCheckedChange={(v) => toggle(f.key, v)}/>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
