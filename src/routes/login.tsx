import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, Loader2, Eye, EyeOff, Mail, Lock, User } from "lucide-react";

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
  const [showPw, setShowPw] = useState(false);
  const [pendingVerify, setPendingVerify] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/generate`,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        if (data.user && !data.session) {
          setPendingVerify(email);
          toast.success("Check your email to verify your account.");
          return;
        }
        toast.success("Account created. You're in.");
        nav({ to: "/generate" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.toLowerCase().includes("email not confirmed")) {
            setPendingVerify(email);
            toast.error("Please verify your email first.");
            return;
          }
          throw error;
        }
        toast.success("Welcome back.");
        nav({ to: "/generate" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Auth failed");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error.message ?? "Google sign-in failed");
        return;
      }
      if (result.redirected) return;
      nav({ to: "/generate" });
    } finally {
      setBusy(false);
    }
  };

  const resendVerify = async () => {
    if (!pendingVerify) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: pendingVerify,
        options: { emailRedirectTo: `${window.location.origin}/generate` },
      });
      if (error) throw error;
      toast.success("Verification email resent.");
    } catch (err: any) {
      toast.error(err.message ?? "Could not resend");
    } finally {
      setBusy(false);
    }
  };

  if (pendingVerify) {
    return (
      <div className="min-h-[100dvh] w-full overflow-y-auto grid-bg flex justify-center items-start sm:items-center px-4 py-6 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md glass-strong rounded-3xl p-5 sm:p-8 text-center my-auto"
        >
          <div className="size-14 mx-auto rounded-2xl bg-gradient-to-br from-[var(--neon)] to-[var(--plasma)] flex items-center justify-center mb-4">
            <Mail className="size-6 text-background" strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-2xl font-bold mb-2">Verify your email</h1>
          <p className="text-sm text-muted-foreground mb-6 break-words">
            We sent a confirmation link to <span className="text-foreground font-medium">{pendingVerify}</span>. Click it to activate your account.
          </p>
          <Button onClick={resendVerify} disabled={busy} variant="outline" className="w-full h-11 mb-2">
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Resend verification email"}
          </Button>
          <button
            onClick={() => setPendingVerify(null)}
            className="text-sm text-muted-foreground hover:text-foreground mt-3"
          >
            ← Back to sign in
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full overflow-y-auto grid-bg flex justify-center items-start sm:items-center px-4 py-6 sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md glass-strong rounded-3xl p-5 sm:p-8 my-auto"
      >
        <Link to="/" className="flex items-center gap-2 mb-6 sm:mb-8 w-fit">
          <div className="size-9 rounded-lg bg-gradient-to-br from-[var(--neon)] to-[var(--plasma)] flex items-center justify-center">
            <Sparkles className="size-4 text-background" strokeWidth={2.5} />
          </div>
          <span className="font-display font-bold">
            ShortForge<span className="text-gradient"> AI</span>
          </span>
        </Link>

        <h1 className="font-display text-2xl sm:text-3xl font-bold mb-1">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {mode === "signin" ? "Sign in to forge viral scripts." : "Free plan, no card required."}
        </p>

        <Button
          type="button"
          onClick={google}
          disabled={busy}
          variant="outline"
          className="w-full mb-4 h-11 touch-manipulation"
        >
          <svg className="size-4 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M21.35 11.1h-9.17v2.92h5.27c-.23 1.5-1.69 4.4-5.27 4.4-3.17 0-5.76-2.62-5.76-5.86s2.59-5.86 5.76-5.86c1.81 0 3.02.77 3.71 1.43l2.53-2.43C16.78 4.18 14.71 3.2 12.18 3.2 6.97 3.2 2.75 7.42 2.75 12.56s4.22 9.36 9.43 9.36c5.45 0 9.05-3.83 9.05-9.22 0-.62-.07-1.09-.18-1.6z"
            />
          </svg>
          Continue with Google
        </Button>

        <div className="flex items-center gap-3 my-4 text-xs text-muted-foreground">
          <div className="h-px bg-border flex-1" />
          or
          <div className="h-px bg-border flex-1" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <div className="relative">
                <User className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="pl-9 h-11"
                  autoComplete="name"
                />
              </div>
            </div>
          )}
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
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {mode === "signin" && (
                <Link
                  to="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Forgot?
                </Link>
              )}
            </div>
            <div className="relative">
              <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="pl-9 pr-10 h-11"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
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
          <Button
            type="submit"
            disabled={busy}
            className="w-full btn-hero h-11 rounded-xl touch-manipulation"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : mode === "signin" ? (
              "Sign in"
            ) : (
              "Create account"
            )}
          </Button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-5 text-sm text-muted-foreground hover:text-foreground w-full text-center"
        >
          {mode === "signin"
            ? "No account? Create one →"
            : "Already have an account? Sign in →"}
        </button>
      </motion.div>
    </div>
  );
}
