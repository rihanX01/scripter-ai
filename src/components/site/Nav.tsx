import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles, Shield, Lightbulb } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function Nav() {
  const { user, isAdmin, signOut } = useAuth();
  return (
    <header className="fixed left-0 right-0 z-40" style={{ top: "var(--announcement-h, 0px)" }}>
      <div className="mx-auto max-w-7xl px-6 py-4">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="glass rounded-2xl px-5 py-3 flex items-center justify-between"
        >
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="size-8 rounded-lg bg-gradient-to-br from-[var(--neon)] to-[var(--plasma)] flex items-center justify-center neon-border">
                <Sparkles className="size-4 text-background" strokeWidth={2.5} />
              </div>
              <div className="absolute inset-0 rounded-lg bg-[var(--neon)] blur-xl opacity-40 group-hover:opacity-70 transition-opacity" />
            </div>
            <div className="font-display font-bold tracking-tight text-base">
              ShortForge<span className="text-gradient"> AI</span>
              <span className="ml-1 text-[10px] font-mono text-muted-foreground align-middle">ULTRA</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            {user && (
              <Link to="/ideas" className="flex items-center gap-1 hover:text-foreground transition-colors">
                <Lightbulb className="size-3.5"/> Get Idea
              </Link>
            )}
            {isAdmin && (
              <Link to="/admin" className="flex items-center gap-1 text-[var(--neon)] hover:text-foreground transition-colors">
                <Shield className="size-3.5"/> Admin
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                {/* Mobile Get Idea */}
                <Link to="/ideas" className="md:hidden text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 px-2">
                  <Lightbulb className="size-3.5"/> Idea
                </Link>
                <Link to="/generate" className="btn-hero rounded-xl px-4 py-2 text-sm">Studio →</Link>
                <button onClick={signOut} className="text-xs text-muted-foreground hover:text-foreground px-2">Sign out</button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground px-3">Sign in</Link>
                <Link to="/generate" className="btn-hero rounded-xl px-4 py-2 text-sm">Launch Studio →</Link>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </header>
  );
}
