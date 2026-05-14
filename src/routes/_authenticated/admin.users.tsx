import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listUsers, updateUserPlan, setUserBanned, setUserRole } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, ShieldOff, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({ component: UsersPage });

function UsersPage() {
  const list = useServerFn(listUsers);
  const updPlan = useServerFn(updateUserPlan);
  const updBan = useServerFn(setUserBanned);
  const updRole = useServerFn(setUserRole);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: () => list({ data: { search: search || undefined, limit: 100 } }),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-users"] });

  const onPlan = async (user_id: string, plan: "free" | "pro" | "max") => {
    await updPlan({ data: { user_id, plan } });
    toast.success("Plan updated");
    refresh();
  };
  const onBan = async (user_id: string, banned: boolean) => {
    await updBan({ data: { user_id, banned } });
    toast.success(banned ? "User banned" : "User unbanned");
    refresh();
  };
  const onAdminToggle = async (user_id: string, isAdmin: boolean) => {
    await updRole({ data: { user_id, role: "admin", grant: !isAdmin } });
    toast.success(isAdmin ? "Admin removed" : "Admin granted");
    refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Users</h1>
        <p className="text-muted-foreground mt-1">Manage subscriptions, roles and access.</p>
      </div>
      <div className="relative max-w-sm">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search email or name…" className="pl-9"/>
      </div>

      <Card className="glass-strong border-border/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-3">User</th><th className="p-3">Plan</th><th className="p-3">Roles</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
              {users?.map((u: any) => {
                const isAdmin = u.roles.includes("admin");
                return (
                  <tr key={u.user_id} className="border-b border-border/20 hover:bg-white/[0.02]">
                    <td className="p-3">
                      <div className="font-medium">{u.display_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="p-3">
                      <Select value={u.plan} onValueChange={(v) => onPlan(u.user_id, v as any)}>
                        <SelectTrigger className="w-28 h-8"><SelectValue/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                          <SelectItem value="max">Max</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3 space-x-1">
                      {u.roles.map((r: string) => <Badge key={r} variant="secondary" className="text-[10px]">{r}</Badge>)}
                    </td>
                    <td className="p-3">
                      {u.is_banned ? <Badge variant="destructive">Banned</Badge> : <Badge className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20">Active</Badge>}
                    </td>
                    <td className="p-3 text-right space-x-2 whitespace-nowrap">
                      <Button size="sm" variant="outline" onClick={() => onAdminToggle(u.user_id, isAdmin)}>
                        {isAdmin ? <><ShieldOff className="size-3 mr-1"/>Revoke admin</> : <><Shield className="size-3 mr-1"/>Make admin</>}
                      </Button>
                      <Button size="sm" variant={u.is_banned ? "secondary" : "destructive"} onClick={() => onBan(u.user_id, !u.is_banned)}>
                        {u.is_banned ? "Unban" : "Ban"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
