import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — ShortForge AI Ultra" }] }),
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: name } },
        });
        if (error) throw error;
        toast.success("Account created. You're in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back.");
      }
      nav({ to: "/generate" });
    } catch (err: any) {
      toast.error(err.message ?? "Auth failed");
    } finally { setBusy(false); }
  };

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) { toast.error(result.error.message ?? "Google sign-in failed"); setBusy(false); return; }
    if (result.redirected) return;
    nav({ to: "/generate" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 grid-bg">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md glass-strong rounded-3xl p-8">
        <Link to="/" className="flex items-center gap-2 mb-8">
          <div className="size-9 rounded-lg bg-gradient-to-br from-[var(--neon)] to-[var(--plasma)] flex items-center justify-center">
            <Sparkles className="size-4 text-background" strokeWidth={2.5} />
          </div>
          <span className="font-display font-bold">ShortForge<span className="text-gradient"> AI</span></span>
        </Link>

        <h1 className="font-display text-2xl font-bold mb-1">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
        <p className="text-sm text-muted-foreground mb-6">{mode === "signin" ? "Sign in to forge viral scripts." : "Free plan, no card required."}</p>

        <Button type="button" onClick={google} disabled={busy} variant="outline" className="w-full mb-4 h-11">
          <svg className="size-4 mr-2" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1h-9.17v2.92h5.27c-.23 1.5-1.69 4.4-5.27 4.4-3.17 0-5.76-2.62-5.76-5.86s2.59-5.86 5.76-5.86c1.81 0 3.02.77 3.71 1.43l2.53-2.43C16.78 4.18 14.71 3.2 12.18 3.2 6.97 3.2 2.75 7.42 2.75 12.56s4.22 9.36 9.43 9.36c5.45 0 9.05-3.83 9.05-9.22 0-.62-.07-1.09-.18-1.6z"/></svg>
          Continue with Google
        </Button>

        <div className="flex items-center gap-3 my-4 text-xs text-muted-foreground"><div className="h-px bg-border flex-1"/>or<div className="h-px bg-border flex-1"/></div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <div><Label htmlFor="name">Name</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} required /></div>
          )}
          <div><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div><Label htmlFor="password">Password</Label><Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></div>
          <Button type="submit" disabled={busy} className="w-full btn-hero h-11 rounded-xl">
            {busy ? <Loader2 className="size-4 animate-spin"/> : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="mt-5 text-sm text-muted-foreground hover:text-foreground w-full text-center">
          {mode === "signin" ? "No account? Create one →" : "Already have an account? Sign in →"}
        </button>
      </motion.div>
    </div>
  );
}
