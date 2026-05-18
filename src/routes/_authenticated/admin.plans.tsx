import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { listPlanLimits, updatePlanLimit } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/plans")({ component: PlansPage });

type Plan = { plan: "free" | "pro" | "max"; shorts_limit: number; longs_limit: number; ideas_limit: number; ideas_per_request_limit: number; ad_free: boolean; priority_queue: boolean; ai_model: string; price_usd: number };

function PlanCard({ plan: initial }: { plan: Plan }) {
  const upd = useServerFn(updatePlanLimit);
  const qc = useQueryClient();
  const normalize = (x: Plan): Plan => ({
    ...x,
    price_usd: Number(x.price_usd) || 0,
    shorts_limit: Number(x.shorts_limit) || 0,
    longs_limit: Number(x.longs_limit) || 0,
    ideas_limit: Number(x.ideas_limit) || 0,
    ideas_per_request_limit: Number(x.ideas_per_request_limit) || 3,
    ad_free: !!x.ad_free,
    priority_queue: !!x.priority_queue,
  });
  const [p, setP] = useState<Plan>(normalize(initial));
  const [saving, setSaving] = useState(false);
  useEffect(() => setP(normalize(initial)), [initial]);

  const save = async () => {
    try {
      setSaving(true);
      await upd({ data: p });
      toast.success(`${p.plan.toUpperCase()} plan saved`);
      qc.invalidateQueries({ queryKey: ["plan-limits"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  const accent = p.plan === "max" ? "plasma-border" : p.plan === "pro" ? "neon-border" : "";
  return (
    <Card className={`glass-strong p-5 border-border/40 ${accent}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="font-display text-xl font-bold uppercase">{p.plan}</div>
        <Button size="sm" onClick={save} disabled={saving} className="btn-hero rounded-lg">{saving ? "Saving…" : "Save"}</Button>
      </div>
      <div className="space-y-3">
        <div><Label>Price (USD / month)</Label><Input type="number" step="0.01" value={p.price_usd} onChange={(e) => setP({ ...p, price_usd: e.target.value === "" ? 0 : +e.target.value })}/></div>
        <div><Label>Short generations / month</Label><Input type="number" value={p.shorts_limit} onChange={(e) => setP({ ...p, shorts_limit: e.target.value === "" ? 0 : parseInt(e.target.value, 10) })}/></div>
        <div><Label>Long generations / day</Label><Input type="number" value={p.longs_limit} onChange={(e) => setP({ ...p, longs_limit: e.target.value === "" ? 0 : parseInt(e.target.value, 10) })}/></div>
        <div><Label>Idea generations / day</Label><Input type="number" value={p.ideas_limit} onChange={(e) => setP({ ...p, ideas_limit: e.target.value === "" ? 0 : parseInt(e.target.value, 10) })}/></div>
        <div><Label>AI Model</Label><Input value={p.ai_model} onChange={(e) => setP({ ...p, ai_model: e.target.value })}/></div>
        <div className="flex items-center justify-between"><Label>Ad-free</Label><Switch checked={p.ad_free} onCheckedChange={(v) => setP({ ...p, ad_free: v })}/></div>
        <div className="flex items-center justify-between"><Label>Priority queue</Label><Switch checked={p.priority_queue} onCheckedChange={(v) => setP({ ...p, priority_queue: v })}/></div>
      </div>
    </Card>
  );
}

function PlansPage() {
  const list = useServerFn(listPlanLimits);
  const { data, isLoading } = useQuery({ queryKey: ["plan-limits"], queryFn: () => list() });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Plan Limits</h1>
        <p className="text-muted-foreground mt-1">Live-tune what each tier gets.</p>
      </div>
      {isLoading ? <div className="text-muted-foreground">Loading…</div> : (
        <div className="grid md:grid-cols-3 gap-5">
          {data?.map((p: Plan) => <PlanCard key={p.plan} plan={p}/>)}
        </div>
      )}
    </div>
  );
}
