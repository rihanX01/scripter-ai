import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getAdminOverview } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Users, Sparkles, Zap, Crown } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Overview,
});

function Stat({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string | number; accent?: string }) {
  return (
    <Card className="glass-strong p-5 border-border/40">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
        <Icon className={`size-4 ${accent ?? "text-[var(--neon)]"}`}/>
      </div>
      <div className="font-display text-3xl font-bold mt-2">{value}</div>
    </Card>
  );
}

function Overview() {
  const fn = useServerFn(getAdminOverview);
  const { data, isLoading } = useQuery({ queryKey: ["admin-overview"], queryFn: () => fn() });

  if (isLoading || !data) return <div className="text-muted-foreground">Loading dashboard…</div>;

  const planData = [
    { name: "Free", value: data.planCounts.free, color: "oklch(0.7 0.04 260)" },
    { name: "Pro", value: data.planCounts.pro, color: "oklch(0.78 0.18 200)" },
    { name: "Max", value: data.planCounts.max, color: "oklch(0.72 0.24 320)" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Overview</h1>
        <p className="text-muted-foreground mt-1">Real-time platform vitals.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Users} label="Total Users" value={data.totalUsers}/>
        <Stat icon={Sparkles} label="Generations" value={data.totalGenerations}/>
        <Stat icon={Zap} label="Pro Users" value={data.planCounts.pro} accent="text-[var(--neon)]"/>
        <Stat icon={Crown} label="Max Users" value={data.planCounts.max} accent="text-[var(--plasma)]"/>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="glass-strong p-5 border-border/40 lg:col-span-2">
          <div className="font-display font-semibold mb-4">Generations — last 7 days</div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={data.dailySeries}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.78 0.18 200)" stopOpacity={0.6}/>
                    <stop offset="100%" stopColor="oklch(0.78 0.18 200)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.72 0.24 320)" stopOpacity={0.6}/>
                    <stop offset="100%" stopColor="oklch(0.72 0.24 320)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="oklch(0.6 0.04 260)" fontSize={11}/>
                <YAxis stroke="oklch(0.6 0.04 260)" fontSize={11}/>
                <Tooltip contentStyle={{ background: "oklch(0.16 0.035 275)", border: "1px solid oklch(0.28 0.04 280)" }}/>
                <Area type="monotone" dataKey="shorts" stroke="oklch(0.78 0.18 200)" fill="url(#g1)"/>
                <Area type="monotone" dataKey="long" stroke="oklch(0.72 0.24 320)" fill="url(#g2)"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="glass-strong p-5 border-border/40">
          <div className="font-display font-semibold mb-4">Plan distribution</div>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={planData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={4}>
                  {planData.map((d) => <Cell key={d.name} fill={d.color}/>)}
                </Pie>
                <Tooltip contentStyle={{ background: "oklch(0.16 0.035 275)", border: "1px solid oklch(0.28 0.04 280)" }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-around text-xs mt-2">
            {planData.map((p) => <div key={p.name} className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: p.color }}/>{p.name}</div>)}
          </div>
        </Card>
      </div>

      <Card className="glass-strong p-5 border-border/40">
        <div className="font-display font-semibold mb-4">Recent Generations</div>
        <div className="space-y-2">
          {data.recentGenerations.length === 0 && <div className="text-muted-foreground text-sm">No generations yet.</div>}
          {data.recentGenerations.map((g: any) => (
            <div key={g.id} className="flex items-center justify-between text-sm py-2 border-b border-border/30 last:border-0">
              <div className="flex-1 truncate"><span className="text-foreground">{g.topic}</span></div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="px-2 py-0.5 rounded glass">{g.format}</span>
                <span>{g.language}</span>
                <span>{new Date(g.created_at).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
