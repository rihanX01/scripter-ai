import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Sparkles, Zap, Wand2, Film, Languages, Hash, Image as ImageIcon,
  Video, Brain, Rocket, Check, ChevronRight, Flame, Clapperboard, Eye,
} from "lucide-react";
import { Nav } from "@/components/site/Nav";
import { Particles } from "@/components/site/Particles";
import { useAuth } from "@/hooks/use-auth";
import { useRegionPrice, formatPrice } from "@/hooks/use-region-price";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "ShortForge AI Ultra — Viral YouTube Shorts Script Generator" },
      { name: "description", content: "Cinematic AI script generator for viral YouTube Shorts and long-form videos. Hooks, scene prompts, SEO pack, and virality scores in one click." },
      { property: "og:title", content: "ShortForge AI Ultra" },
      { property: "og:description", content: "Forge viral, human, cinematic scripts for faceless YouTube channels." },
    ],
  }),
});

const categories = [
  "Horror","Mystery","What If","Educational","Facts","Storytelling",
  "Emotional","Documentary","Motivation","Dark Psychology","Sci-fi",
  "Space","History","Cinematic","Conspiracy","Viral",
];

function Landing() {
  const { profile } = useAuth();
  const currentPlan = profile?.plan ?? null;
  const region = useRegionPrice();
  return (
    <div className="relative min-h-screen overflow-hidden">
      <Nav />

      {/* HERO */}
      <section className="relative pt-36 pb-24 px-6">
        <div className="absolute inset-0 grid-bg pointer-events-none" />
        <div className="absolute inset-0">
          <Particles count={50} />
        </div>
        <div className="glow-orb size-[420px] bg-[var(--neon)] -top-40 -left-20 float" />
        <div className="glow-orb size-[520px] bg-[var(--plasma)] top-20 -right-32 float" style={{ animationDelay: "1.5s" }} />

        <div className="relative max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
            className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs font-mono text-muted-foreground mb-8"
          >
            <span className="size-1.5 rounded-full bg-[var(--neon)] pulse-ring" />
            v1.0 — Cinematic AI for faceless creators
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.05 }}
            className="font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.02]"
          >
            Forge viral scripts<br />
            that <span className="text-gradient">don't feel AI.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15 }}
            className="mt-6 max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground"
          >
            Cinematic, hook-driven YouTube Shorts & long-form scripts — with per-line image &
            video prompts, 86 hashtags, virality scores, and SEO pack. Built for faceless channels.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.25 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
          >
            <Link to="/generate" className="btn-hero rounded-2xl px-7 py-4 text-base inline-flex items-center gap-2">
              <Wand2 className="size-4" /> Generate a viral script
            </Link>
            <a href="#features" className="glass rounded-2xl px-6 py-4 text-sm hover:bg-white/5 transition-colors inline-flex items-center gap-2">
              See what it does <ChevronRight className="size-4" />
            </a>
          </motion.div>

          {/* Live category marquee */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2, delay: 0.5 }}
            className="mt-16 relative overflow-hidden"
            style={{ maskImage: "linear-gradient(90deg, transparent, black 15%, black 85%, transparent)" }}
          >
            <div className="flex gap-3 scroll-marquee w-max">
              {[...categories, ...categories].map((c, i) => (
                <span key={i} className="glass rounded-full px-4 py-2 text-xs font-mono text-muted-foreground whitespace-nowrap">
                  {c}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-16">
            <p className="font-mono text-xs text-[var(--neon)] mb-3">// THE STACK</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
              Everything a viral creator needs.<br />
              <span className="text-gradient">In one cinematic flow.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Brain, title: "Human-grade hooks", desc: "Every script opens with a curiosity-piercing line. Loop-end on the last beat. Zero robotic phrasing." },
              { icon: Film, title: "Per-line scene prompts", desc: "Auto image + video prompts tuned for Sora, Veo, Runway, Kling, Midjourney & Flux." },
              { icon: Hash, title: "86 hashtags + 500-char SEO", desc: "Viral titles, descriptions, hashtags and SEO tag string — all generated in one pass." },
              { icon: Languages, title: "English · Hindi · Hinglish", desc: "Native-feel writing in three languages. No translated-feel slop." },
              { icon: Eye, title: "Virality scores", desc: "Honest 0–100 ratings for virality, retention and CTR — calibrated, not vanity." },
              { icon: Clapperboard, title: "Auto category detect", desc: "Tell us the topic. We pick the highest-performing tone — horror, what-if, motivation, dark psych." },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="glass rounded-2xl p-6 hover:bg-white/[0.04] transition-all hover:-translate-y-1 group"
              >
                <div className="size-10 rounded-xl bg-gradient-to-br from-[var(--neon)]/20 to-[var(--plasma)]/20 flex items-center justify-center mb-4 group-hover:neon-border transition-shadow">
                  <f.icon className="size-5 text-[var(--neon)]" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* DEMO PREVIEW */}
      <section className="relative py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="glass-strong rounded-3xl p-8 md:p-12 relative overflow-hidden">
            <div className="glow-orb size-[300px] bg-[var(--plasma)] -top-20 -right-10" />
            <div className="relative grid md:grid-cols-2 gap-10 items-center">
              <div>
                <p className="font-mono text-xs text-[var(--neon)] mb-3">// LIVE OUTPUT</p>
                <h3 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-4">
                  Topic in. <br />Cinematic script out.
                </h3>
                <p className="text-muted-foreground mb-6">
                  Every line ships with its own visual brief — image prompt, camera move, lighting,
                  mood, sound design, voice tone. Drop them straight into your AI video pipeline.
                </p>
                <Link to="/generate" className="btn-hero rounded-xl px-5 py-3 text-sm inline-flex items-center gap-2">
                  <Rocket className="size-4" /> Try it free
                </Link>
              </div>
              <div className="font-mono text-[13px] leading-relaxed glass rounded-2xl p-5 border border-white/10">
                <div className="text-muted-foreground mb-2">› topic: <span className="text-[var(--neon)]">"What if Earth lost gravity for 5 seconds?"</span></div>
                <div className="text-foreground/90">
                  <span className="text-[var(--plasma)]">L1</span> What if Earth lost gravity for exactly five seconds?<br />
                  <span className="text-muted-foreground text-[11px]">  ↳ image: hyperreal cinematic wide shot, city skyline, debris floating mid-air, golden hour…</span><br />
                  <span className="text-[var(--plasma)]">L2</span> Cars would lift off the highway like leaves.<br />
                  <span className="text-muted-foreground text-[11px]">  ↳ video: slow dolly-out, particles rising, anamorphic flare…</span><br />
                  <span className="text-[var(--plasma)]">L3</span> Oceans would briefly forget the shore exists.<br />
                  <span className="text-muted-foreground text-[11px]">  ↳ camera: aerial pan, lighting: overcast cool, mood: awe + dread…</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="relative py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="font-mono text-xs text-[var(--neon)] mb-3">// PRICING</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
              Start free. Scale to <span className="text-gradient">faceless empire</span>.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { key: "free", name: "Free", priceUsd: 0, tag: "Try the engine", features: ["2 short scripts", "1 long-form script", "Per-line scene prompts", "Full SEO pack", "Ads enabled"], cta: "Start free", highlight: false },
              { key: "pro", name: "Pro", priceUsd: 19, tag: "Creators", features: ["10 short scripts", "6 long-form scripts", "Faster generation", "Better AI quality", "Ad-free", "Save history"], cta: "Go Pro", highlight: true },
              { key: "max", name: "Max", priceUsd: 49, tag: "Faceless studios", features: ["20 short scripts", "10 long-form scripts", "Premium AI model", "Strongest hooks", "Highest virality tuning", "Priority queue"], cta: "Go Max", highlight: false },
            ].map((p) => {
              const isCurrent = currentPlan === p.key;
              // Freeze rules:
              // - On Max: freeze Free and Pro
              // - On Pro: freeze only Free (Max remains upgradeable)
              const isFrozen =
                (currentPlan === "max" && p.key !== "max") ||
                (currentPlan === "pro" && p.key === "free");
              return (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className={`relative rounded-3xl p-7 ${p.highlight ? "glass-strong neon-border" : "glass"} ${isFrozen ? "opacity-40 pointer-events-none grayscale" : ""} ${isCurrent ? "ring-2 ring-[var(--neon)]" : ""}`}
              >
                {isCurrent ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--neon)] text-background text-[10px] font-mono font-bold tracking-wider px-3 py-1 rounded-full">
                    CURRENT PLAN
                  </div>
                ) : p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[var(--neon)] to-[var(--plasma)] text-background text-[10px] font-mono font-bold tracking-wider px-3 py-1 rounded-full">
                    MOST LOVED
                  </div>
                )}
                <div className="text-xs font-mono text-muted-foreground">{p.tag}</div>
                <div className="mt-2 font-display text-2xl font-bold">{p.name}</div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-5xl font-bold">{p.price}</span>
                  <span className="text-muted-foreground text-sm">/mo</span>
                </div>
                <ul className="mt-6 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="size-4 text-[var(--neon)] mt-0.5 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <div className="mt-7 w-full text-center block rounded-xl py-3 text-sm font-medium glass border border-[var(--neon)]/40 text-[var(--neon)]">
                    Current
                  </div>
                ) : (
                  <Link
                    to="/generate"
                    className={`mt-7 w-full text-center block rounded-xl py-3 text-sm font-medium ${
                      p.highlight ? "btn-hero" : "glass hover:bg-white/5 transition-colors"
                    }`}
                  >
                    {p.cta}
                  </Link>
                )}
              </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="relative py-20 px-6">
        <div className="max-w-5xl mx-auto glass-strong rounded-3xl px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { v: "86–100", l: "words / Short" },
            { v: "86", l: "hashtags / pack" },
            { v: "12+", l: "scene fields / line" },
            { v: "3", l: "languages" },
          ].map((s) => (
            <div key={s.l}>
              <div className="font-display text-3xl md:text-4xl font-bold text-gradient">{s.v}</div>
              <div className="text-xs font-mono text-muted-foreground mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="font-mono text-xs text-[var(--neon)] mb-3">// FAQ</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-10">
            Quick answers.
          </h2>
          <div className="space-y-3">
            {[
              { q: "Will the script feel AI-written?", a: "No. ShortForge is tuned with anti-slop rules — no 'in this video', no robotic phrasing. Hooks first, loop-end last." },
              { q: "Can I use the scene prompts in Sora / Veo / Runway?", a: "Yes. Every line ships with image and video prompts tuned for top generators including Midjourney, Flux, Kling, Pika, Sora and Veo." },
              { q: "Do you support Hindi and Hinglish?", a: "Yes — native-feel Hindi (Devanagari) and Hinglish that sounds like real Indian creators." },
              { q: "What's the word count for a Short?", a: "Strictly 86–100 words. We keep retention pacing tight." },
            ].map((f) => (
              <details key={f.q} className="glass rounded-2xl p-5 group">
                <summary className="cursor-pointer font-medium flex items-center justify-between">
                  {f.q}
                  <ChevronRight className="size-4 text-muted-foreground group-open:rotate-90 transition-transform" />
                </summary>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 px-6">
        <div className="max-w-4xl mx-auto glass-strong rounded-3xl p-12 text-center relative overflow-hidden">
          <div className="glow-orb size-[400px] bg-[var(--neon)] -top-20 left-1/2 -translate-x-1/2" />
          <div className="relative">
            <Flame className="size-10 text-[var(--plasma)] mx-auto mb-4" />
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
              Your next viral Short<br /> is <span className="text-gradient">one prompt away.</span>
            </h2>
            <Link to="/generate" className="btn-hero rounded-2xl px-7 py-4 text-base inline-flex items-center gap-2 mt-8">
              <Zap className="size-4" /> Open the Studio
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative py-10 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-muted-foreground">
          <div>© {new Date().getFullYear()} ShortForge AI Ultra</div>
          <div className="flex gap-5">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#pricing" className="hover:text-foreground">Pricing</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
