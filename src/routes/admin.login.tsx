import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { recordAdminLogin } from "@/lib/admin-security.functions";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Loader2, Eye, EyeOff, Mail, Lock, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Admin Sign In — ShortForge AI" }] }),
  component: AdminLoginPage,
});

const ADMIN_EMAIL = "rihan@gmail.com";

const fieldCls =
  "w-full h-11 rounded-xl bg-background/60 border border-border pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-[var(--neon)] focus:ring-2 focus:ring-[var(--neon)]/30 transition";

function AdminLoginPage() {
  const nav = useNavigate();
  const record = useServerFn(recordAdminLogin);
  const { refresh } = useAuth();
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);

  // If already logged in as admin, fast-forward.
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) return;
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", data.session.user.id);
      if (roles?.some((r) => r.role === "admin")) {
        nav({ to: "/admin", replace: true });
      }
    })();
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockUntil && Date.now() < lockUntil) {
      const sec = Math.ceil((lockUntil - Date.now()) / 1000);
      toast.error(`Too many attempts. Try again in ${sec}s.`);
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(), password,
      });
      if (error || !data.session) {
        const next = attempts + 1;
        setAttempts(next);
        if (next >= 5) {
          setLockUntil(Date.now() + 60_000);
          setAttempts(0);
          toast.error("Too many failed attempts. Locked for 60 seconds.");
        } else {
          toast.error(error?.message ?? "Sign-in failed");
        }
        return;
      }
      // Verify admin role before granting console access.
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", data.session.user.id);
      const isAdmin = roles?.some((r) => r.role === "admin");
      if (!isAdmin) {
        await supabase.auth.signOut();
        toast.error("This account does not have admin access.");
        return;
      }
      try { await record({ data: { email: data.session.user.email ?? undefined, success: true } }); } catch {}
      sessionStorage.setItem("admin_login_at", String(Date.now()));
      await refresh();
      toast.success("Welcome, Administrator.");
      await nav({ to: "/admin", replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full overflow-hidden relative bg-background flex items-center justify-center px-4 py-8">
      {/* Cinematic backdrop */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.22_0.08_280)_0%,oklch(0.08_0.03_270)_60%)]" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 size-[600px] rounded-full bg-[var(--neon)]/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-0 size-[400px] rounded-full bg-[var(--plasma)]/10 blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <div className="w-full max-w-md">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="size-3.5" /> Standard sign-in
        </Link>

        <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-2xl p-6 sm:p-8 shadow-[0_0_60px_-15px_oklch(0.78_0.18_200/0.4)] relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--neon)] to-transparent" />

          <div className="flex items-center gap-3 mb-6">
            <div className="size-11 rounded-xl bg-gradient-to-br from-[var(--neon)] to-[var(--plasma)] flex items-center justify-center shadow-lg shadow-[var(--neon)]/30">
              <Shield className="size-5 text-background" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Restricted</div>
              <h1 className="font-display text-xl font-bold leading-tight">Admin <span className="text-gradient">Console</span></h1>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground mb-6">
            Authorized personnel only. All sign-in attempts are logged with IP, browser, and timestamp.
          </p>

          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs">Admin email</Label>
              <div className="relative">
                <Mail className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input id="email" type="email" autoComplete="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@yourdomain.com" className={fieldCls} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="password" className="text-xs">Password</Label>
              <div className="relative">
                <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input id="password" type={showPw ? "text" : "password"}
                  autoComplete="current-password" required minLength={6}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" className={`${fieldCls} pr-10`} />
                <button type="button" onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1} aria-label={showPw ? "Hide" : "Show"}>
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={busy} className="w-full btn-hero h-11 rounded-xl mt-2 relative overflow-hidden group">
              {busy ? <Loader2 className="size-4 animate-spin" /> : (
                <span className="inline-flex items-center gap-2"><Shield className="size-4" /> Authenticate</span>
              )}
            </Button>

            {attempts > 0 && !lockUntil && (
              <p className="text-[11px] text-amber-400/80 text-center">Failed attempts: {attempts}/5</p>
            )}
          </form>

          <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" /> Secure connection</span>
            <Link to="/forgot-password" className="hover:text-foreground">Reset password</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
