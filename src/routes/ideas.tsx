import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Lightbulb, Sparkles, Loader2, Copy, Check, Flame, ArrowLeft, Wand2, Hash, Lock,
} from "lucide-react";
import { getViralIdeas, getIdeasUsage, type IdeaResult, type ViralIdea } from "@/lib/ideas.functions";
import { Nav } from "@/components/site/Nav";
import { Particles } from "@/components/site/Particles";
import { AdSlot } from "@/components/site/AdSlot";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/ideas")({
  component: IdeasPage,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      { title: "Get Idea — ShortForge AI Ultra" },
      { name: "description", content: "Generate viral, scroll-stopping content ideas by category — powered by ShortForge AI." },
    ],
  }),
});

const CATEGORIES = [
  "auto","Horror","Mystery","What If","Educational","Facts","Storytelling",
  "Emotional","Documentary","Motivation","Dark Psychology","Sci-fi",
  "Space","History","Cinematic","Conspiracy","Viral","Tech","Finance","Health",
];

type Form = {
  category: string;
  language: "english" | "hindi" | "hinglish";
  format: "short" | "long";
  count: number;
  audience: string;
  vibe: string;
};

function IdeasPage() {
  const navigate = useNavigate();
  const fn = useServerFn(getViralIdeas);

  const [form, setForm] = useState<Form>({
    category: "auto",
    language: "english",
    format: "short",
    count: 8,
    audience: "",
    vibe: "",
  });
  const [result, setResult] = useState<IdeaResult | null>(null);

  const mut = useMutation({
    mutationFn: (input: Form) => fn({ data: input }),
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Particles />
      <Nav />
      <main className="relative z-10 pt-28 pb-20 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link to="/generate" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Back to Studio
          </Link>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-mono text-[var(--neon)] mb-4">
            <Lightbulb className="size-3.5" /> IDEAFORGE
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight">
            Get <span className="text-gradient">Viral Ideas</span>
          </h1>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Pick a category. AI surfaces fresh, scroll-stopping topics with hook, angle, and virality score.
          </p>
        </motion.div>

        {/* Form */}
        <div className="glass rounded-3xl p-6 sm:p-8 mb-8">
          <div className="grid md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="text-xs font-mono text-muted-foreground mb-2 block">CATEGORY</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm((f) => ({ ...f, category: c }))}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                      form.category === c
                        ? "bg-[var(--neon)] text-background border-[var(--neon)]"
                        : "border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/40"
                    }`}
                  >
                    {c === "auto" ? "🔥 Auto-pick" : c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-muted-foreground mb-2 block">LANGUAGE</label>
              <div className="flex gap-2">
                {(["english","hindi","hinglish"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setForm((f) => ({ ...f, language: l }))}
                    className={`flex-1 px-3 py-2 rounded-xl text-sm border transition-all capitalize ${
                      form.language === l
                        ? "bg-foreground text-background border-foreground"
                        : "border-border/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-muted-foreground mb-2 block">FORMAT</label>
              <div className="flex gap-2">
                {(["short","long"] as const).map((fm) => (
                  <button
                    key={fm}
                    onClick={() => setForm((f) => ({ ...f, format: fm }))}
                    className={`flex-1 px-3 py-2 rounded-xl text-sm border transition-all capitalize ${
                      form.format === fm
                        ? "bg-foreground text-background border-foreground"
                        : "border-border/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {fm === "short" ? "Shorts / Reels" : "Long-form"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-muted-foreground mb-2 block">AUDIENCE (optional)</label>
              <input
                value={form.audience}
                onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}
                placeholder="e.g. Gen Z, Indian students, tech founders"
                className="w-full bg-background/40 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[var(--neon)]"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-muted-foreground mb-2 block">VIBE (optional)</label>
              <input
                value={form.vibe}
                onChange={(e) => setForm((f) => ({ ...f, vibe: e.target.value }))}
                placeholder="e.g. dark cinematic, funny, mind-blown"
                className="w-full bg-background/40 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[var(--neon)]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-mono text-muted-foreground mb-2 block">HOW MANY IDEAS · {form.count}</label>
              <input
                type="range" min={3} max={15} step={1}
                value={form.count}
                onChange={(e) => setForm((f) => ({ ...f, count: Number(e.target.value) }))}
                className="w-full accent-[var(--neon)]"
              />
            </div>
          </div>

          {mut.isError && (
            <div className="mt-4 text-sm text-destructive">{(mut.error as Error)?.message}</div>
          )}

          <button
            onClick={() => mut.mutate(form)}
            disabled={mut.isPending}
            className="btn-hero rounded-2xl px-6 py-3 mt-6 w-full sm:w-auto inline-flex items-center justify-center gap-2 font-medium disabled:opacity-50"
          >
            {mut.isPending ? <><Loader2 className="size-4 animate-spin"/> Brewing viral ideas…</> : <><Sparkles className="size-4"/> Generate Ideas</>}
          </button>
        </div>

        {/* AdSense slot — free users only */}
        <AdSlot slot="ideas-top" format="horizontal" minHeight={120} className="mb-8" />

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-bold">
                  {result.ideas.length} ideas for <span className="text-gradient">{result.category}</span>
                </h2>
                <div className="text-xs font-mono text-muted-foreground">Tap an idea to write the script →</div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {result.ideas.map((idea, i) => (
                  <IdeaCard
                    key={i}
                    idea={idea}
                    onWrite={() => {
                      sessionStorage.setItem("prefill_topic", idea.title);
                      sessionStorage.setItem("prefill_category", result.category);
                      navigate({ to: "/generate" });
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function IdeaCard({ idea, onWrite }: { idea: ViralIdea; onWrite: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(`${idea.title}\n\nHook: ${idea.hook}\n\nAngle: ${idea.angle}`);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };
  const score = idea.estimated_virality;
  const scoreColor = score >= 85 ? "text-[var(--neon)]" : score >= 70 ? "text-[var(--plasma)]" : "text-muted-foreground";

  return (
    <motion.div whileHover={{ y: -2 }} className="glass rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display font-semibold text-lg leading-snug">{idea.title}</h3>
        <div className={`flex items-center gap-1 text-sm font-mono ${scoreColor}`}>
          <Flame className="size-4"/> {score}
        </div>
      </div>
      <p className="text-sm text-muted-foreground italic">"{idea.hook}"</p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="glass rounded-lg p-2">
          <div className="text-muted-foreground font-mono mb-0.5">ANGLE</div>
          <div>{idea.angle}</div>
        </div>
        <div className="glass rounded-lg p-2">
          <div className="text-muted-foreground font-mono mb-0.5">WHY VIRAL</div>
          <div>{idea.why_viral}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 text-[10px]">
        {idea.hashtags.slice(0, 8).map((h, i) => (
          <span key={i} className="px-2 py-0.5 rounded-full border border-border/60 text-muted-foreground"><Hash className="size-2.5 inline -mt-0.5"/>{h.replace(/^#/, "")}</span>
        ))}
      </div>
      <div className="flex gap-2 mt-1">
        <button onClick={onWrite} className="btn-hero flex-1 rounded-xl px-3 py-2 text-sm inline-flex items-center justify-center gap-2">
          <Wand2 className="size-3.5"/> Write Script
        </button>
        <button onClick={copy} className="rounded-xl px-3 py-2 text-sm border border-border/60 hover:border-foreground/40 inline-flex items-center gap-1.5">
          {copied ? <Check className="size-3.5 text-[var(--neon)]"/> : <Copy className="size-3.5"/>}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </motion.div>
  );
}
