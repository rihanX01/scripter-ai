import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, Loader2, Lock, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Set new password — ShortForge AI Ultra" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase puts the recovery token in the URL hash; getSession picks it up.
    const sub = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.data.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Password must be at least 6 characters.");
    if (password !== confirm) return toast.error("Passwords do not match.");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. You're signed in.");
      nav({ to: "/generate" });
    } catch (err: any) {
      toast.error(err.message ?? "Could not update password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full overflow-y-auto grid-bg flex justify-center items-start sm:items-center px-4 py-6 sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-strong rounded-3xl p-6 sm:p-8"
      >
        <div className="flex items-center gap-2 mb-6">
          <div className="size-9 rounded-lg bg-gradient-to-br from-[var(--neon)] to-[var(--plasma)] flex items-center justify-center">
            <Sparkles className="size-4 text-background" strokeWidth={2.5} />
          </div>
          <span className="font-display font-bold">
            ShortForge<span className="text-gradient"> AI</span>
          </span>
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-bold mb-1">Set a new password</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {ready ? "Choose a strong password you haven't used before." : "Verifying reset link…"}
        </p>

        {!ready ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pw">New password</Label>
              <div className="relative">
                <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="pw"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pl-9 pr-10 h-11"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm password</Label>
              <div className="relative">
                <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirm"
                  type={showPw ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                  className="pl-9 h-11"
                  autoComplete="new-password"
                />
              </div>
            </div>
            <Button type="submit" disabled={busy} className="w-full btn-hero h-11 rounded-xl">
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Update password"}
            </Button>
          </form>
        )}

        <Link to="/login" className="block text-sm text-muted-foreground hover:text-foreground text-center mt-5">
          ← Back to sign in
        </Link>
      </motion.div>
    </div>
  );
}
