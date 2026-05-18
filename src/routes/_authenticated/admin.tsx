import { createFileRoute, Outlet, Link, useRouterState, Navigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { adminHeartbeat } from "@/lib/support.functions";
import { toast } from "sonner";
import { LayoutDashboard, Users, Settings2, Megaphone, ToggleLeft, FileText, Shield, ArrowLeft, Loader2, LifeBuoy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — ShortForge AI" }] }),
  component: AdminLayout,
});

const navItems = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/support", label: "Support", icon: LifeBuoy },
  { to: "/admin/plans", label: "Plan Limits", icon: Settings2 },
  { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { to: "/admin/flags", label: "Feature Flags", icon: ToggleLeft },
  { to: "/admin/security", label: "Security", icon: Shield },
  { to: "/admin/audit", label: "Audit Log", icon: FileText },
];

const INACTIVITY_MS = 15 * 60 * 1000;

function AdminLayout() {
  const { isAdmin, loading, profile } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const timerRef = useRef<number | null>(null);

  // Inactivity auto-logout for admin console.
  useEffect(() => {
    if (!isAdmin) return;
    const reset = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(async () => {
        toast.warning("Logged out due to inactivity.");
        await supabase.auth.signOut();
        window.location.assign("/admin/login");
      }, INACTIVITY_MS);
    };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [isAdmin]);

  // Presence heartbeat: marks this admin as online to users.
  const heartbeatFn = useServerFn(adminHeartbeat);
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    const ping = () => { heartbeatFn().catch(() => {}); };
    ping();
    const id = window.setInterval(() => { if (!cancelled) ping(); }, 60_000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [isAdmin, heartbeatFn]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground"/></div>;
  if (!isAdmin) return <Navigate to="/admin/login" />;

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
