import { createFileRoute, Outlet, Link, useRouterState, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { LayoutDashboard, Users, Settings2, Megaphone, ToggleLeft, FileText, ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — ShortForge AI" }] }),
  component: AdminLayout,
});

const navItems = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/plans", label: "Plan Limits", icon: Settings2 },
  { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { to: "/admin/flags", label: "Feature Flags", icon: ToggleLeft },
  { to: "/admin/audit", label: "Audit Log", icon: FileText },
];

function AdminLayout() {
  const { isAdmin, loading, profile } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground"/></div>;
  if (!isAdmin) return <Navigate to="/" />;

  return (
    <div className="min-h-screen flex w-full bg-background">
      <aside className="w-64 shrink-0 border-r border-border/60 hidden md:flex flex-col p-4 glass-strong">
        <Link to="/" className="flex items-center gap-2 mb-8 px-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4"/> Back to site
        </Link>
        <div className="px-2 mb-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Console</div>
          <div className="font-display text-lg font-bold mt-1">Admin <span className="text-gradient">Forge</span></div>
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map((it) => {
            const active = it.exact ? path === it.to : path.startsWith(it.to) && (it.to !== "/admin" || path === "/admin");
            return (
              <Link key={it.to} to={it.to as any} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${active ? "bg-[var(--neon)]/10 text-foreground neon-border" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}>
                <it.icon className="size-4"/> {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="text-xs text-muted-foreground border-t border-border/60 pt-3 mt-3 px-2">
          <div className="text-foreground">{profile?.display_name ?? "Admin"}</div>
          <div className="font-mono">role: admin</div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="md:hidden border-b border-border/60 p-3 overflow-x-auto whitespace-nowrap flex gap-2">
          {navItems.map((it) => (
            <Link key={it.to} to={it.to as any} className="px-3 py-1.5 rounded-md text-xs glass">{it.label}</Link>
          ))}
        </div>
        <div className="p-6 md:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
