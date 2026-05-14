import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, Loader2, Mail, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password — ShortForge AI Ultra" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Reset link sent to your inbox.");
    } catch (err: any) {
      toast.error(err.message ?? "Could not send reset email");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 py-6 sm:py-12 grid-bg">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-strong rounded-3xl p-6 sm:p-8"
      >
        <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="size-4" /> Back to sign in
        </Link>

        <div className="flex items-center gap-2 mb-6">
          <div className="size-9 rounded-lg bg-gradient-to-br from-[var(--neon)] to-[var(--plasma)] flex items-center justify-center">
            <Sparkles className="size-4 text-background" strokeWidth={2.5} />
          </div>
          <span className="font-display font-bold">
            ShortForge<span className="text-gradient"> AI</span>
          </span>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="size-14 mx-auto rounded-2xl bg-gradient-to-br from-[var(--neon)] to-[var(--plasma)] flex items-center justify-center mb-4">
              <Mail className="size-6 text-background" strokeWidth={2.5} />
            </div>
            <h1 className="font-display text-2xl font-bold mb-2">Check your inbox</h1>
            <p className="text-sm text-muted-foreground break-words">
              We sent a password reset link to <span className="text-foreground font-medium">{email}</span>.
            </p>
          </div>
        ) : (
          <>
            <h1 className="font-display text-2xl sm:text-3xl font-bold mb-1">Forgot password?</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Enter your email and we'll send you a reset link.
            </p>
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-9 h-11"
                    autoComplete="email"
                  />
                </div>
              </div>
              <Button type="submit" disabled={busy} className="w-full btn-hero h-11 rounded-xl">
                {busy ? <Loader2 className="size-4 animate-spin" /> : "Send reset link"}
              </Button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
