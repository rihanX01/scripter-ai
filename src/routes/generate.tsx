import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Sparkles, Wand2, Copy, Check, Download, RotateCcw, ArrowLeft,
  Image as ImageIcon, Video, Hash, Gauge, Film, Loader2, Flame, Timer, Zap,
  Telescope, Lock, ExternalLink,
} from "lucide-react";
import { generateScript, getMyUsage, deepResearch, type GenerateResult, type DeepResearchResult } from "@/lib/generate.functions";
import { Nav } from "@/components/site/Nav";
import { Particles } from "@/components/site/Particles";
import { AdSlot } from "@/components/site/AdSlot";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/generate")({
  component: GeneratePage,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      { title: "Studio — ShortForge AI Ultra" },
      { name: "description", content: "Generate viral, cinematic YouTube Shorts and long-form scripts with per-line scene prompts and SEO pack." },
    ],
  }),
});

const CATEGORIES = [
  "auto","Horror","Mystery","What If","Educational","Facts","Storytelling",
  "Emotional","Documentary","Motivation","Dark Psychology","Sci-fi",
  "Space","History","Cinematic","Conspiracy","Viral",
];

const SHORT_PRESETS = [60, 86, 100, 150];
const LONG_PRESETS  = [500, 800, 1100, 1500];

type Form = {
  topic: string;
  category: string;
  language: "english" | "hindi" | "hinglish";
  format: "short" | "long";
  target_words: number;
};

function GeneratePage() {
  const { profile } = useAuth();
  const plan = (profile?.plan as "free" | "pro" | "max" | undefined) ?? "free";
  const isPaid = plan === "pro" || plan === "max";

  const [form, setForm] = useState<Form>({
    topic: "",
    category: "auto",
    language: "english",
    format: "short",
    target_words: 95,
  });
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [research, setResearch] = useState<DeepResearchResult | null>(null);
  const [researchEnabled, setResearchEnabled] = useState(false);
  const [researchOpen, setResearchOpen] = useState(true);

  const fn = useServerFn(generateScript);
  const usageFn = useServerFn(getMyUsage);
  const researchFn = useServerFn(deepResearch);
  const qc = useQueryClient();

  const usageQuery = useQuery({
    queryKey: ["my-usage"],
    queryFn: () => usageFn(),
    refetchInterval: 60_000,
  });

  const researchMutation = useMutation({
    mutationFn: (input: { topic: string; language: Form["language"]; script?: string; format?: Form["format"] }) => researchFn({ data: input }),
    onSuccess: (data) => {
      setResearch(data);
      setResearchOpen(true);
    },
    onError: () => setResearchEnabled(false),
  });

  const mutation = useMutation({
    mutationFn: (input: Form) => fn({ data: input }),
    onSuccess: (data) => {
      setResult(data);
      qc.setQueryData(["my-usage"], data.usage);
    },
  });

  const setFormat = (f: "short" | "long") => {
    setForm((p) => ({ ...p, format: f, target_words: f === "short" ? 95 : 900 }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.topic.trim() || form.topic.trim().length < 3) return;
    setResult(null);
    mutation.mutate(form);
    if (researchEnabled && isPaid) {
      setResearch(null);
      researchMutation.mutate({ topic: form.topic, language: form.language, format: form.format });
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Nav />

      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="absolute inset-0 max-h-screen overflow-hidden">
        <Particles count={35} />
      </div>
      <div className="glow-orb size-[400px] bg-[var(--neon)] -top-32 -left-20" />
      <div className="glow-orb size-[400px] bg-[var(--plasma)] top-40 -right-32" />

      <main className="relative pt-32 pb-24 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="size-4" /> back
          </Link>

          <div className="grid lg:grid-cols-[420px_1fr] gap-6">
            {/* INPUT PANEL */}
            <motion.form
              onSubmit={submit}
              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
              className="glass-strong rounded-3xl p-6 h-fit lg:sticky lg:top-28"
            >
              <div className="flex items-center gap-2 mb-6">
                <div className="size-8 rounded-lg bg-gradient-to-br from-[var(--neon)] to-[var(--plasma)] flex items-center justify-center">
                  <Wand2 className="size-4 text-background" />
                </div>
                <div>
                  <div className="font-display font-bold">Studio</div>
                  <div className="text-[10px] font-mono text-muted-foreground">forge a viral script</div>
                </div>
              </div>

              <Field label="Topic / Idea">
                <textarea
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  rows={3}
                  maxLength={500}
                  placeholder="e.g. What if Earth lost gravity for 5 seconds?"
                  className="w-full bg-input/40 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-[var(--neon)] focus:ring-2 focus:ring-[var(--neon)]/20 resize-none transition-all"
                />
              </Field>

              <UsageBadge usage={usageQuery.data} />

              <Field label="Format">
                <div className="grid grid-cols-2 gap-2">
                  {(["short","long"] as const).map((f) => (
                    <button key={f} type="button"
                      onClick={() => setFormat(f)}
                      className={`rounded-xl py-2.5 text-sm font-medium transition-all ${
                        form.format === f ? "btn-hero" : "glass hover:bg-white/5"
                      }`}>
                      {f === "short" ? "Short" : "Long-form"}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label={`Target words · ${form.target_words}`}>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(form.format === "short" ? SHORT_PRESETS : LONG_PRESETS).map((w) => (
                    <button key={w} type="button"
                      onClick={() => setForm({ ...form, target_words: w })}
                      className={`rounded-lg px-3 py-1.5 text-xs font-mono transition-all ${
                        form.target_words === w ? "bg-[var(--neon)] text-background" : "glass hover:bg-white/5"
                      }`}>{w}w</button>
                  ))}
                </div>
                <input
                  type="range"
                  min={form.format === "short" ? 40 : 300}
                  max={form.format === "short" ? 250 : 2000}
                  step={form.format === "short" ? 5 : 50}
                  value={form.target_words}
                  onChange={(e) => setForm({ ...form, target_words: Number(e.target.value) })}
                  className="w-full accent-[var(--neon)]"
                />
              </Field>

              <Field label="Language">
                <div className="grid grid-cols-3 gap-2">
                  {(["english","hindi","hinglish"] as const).map((l) => (
                    <button key={l} type="button"
                      onClick={() => setForm({ ...form, language: l })}
                      className={`rounded-xl py-2 text-xs font-medium capitalize transition-all ${
                        form.language === l ? "btn-hero" : "glass hover:bg-white/5"
                      }`}>{l}</button>
                  ))}
                </div>
              </Field>

              <Field label="Category">
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-input/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--neon)] transition-all"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-card">
                      {c === "auto" ? "🪄 Auto-detect (recommended)" : c}
                    </option>
                  ))}
                </select>
              </Field>

              <button
                type="submit"
                disabled={mutation.isPending || form.topic.trim().length < 3}
                className="w-full btn-hero rounded-xl py-3.5 mt-4 inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mutation.isPending ? (
                  <><Loader2 className="size-4 animate-spin" /> Forging…</>
                ) : (
                  <><Sparkles className="size-4" /> Generate</>
                )}
              </button>

              <div
                className={`w-full mt-2 rounded-xl py-3 px-4 flex items-center justify-between gap-3 text-sm font-medium transition-all border ${
                  isPaid
                    ? "border-[var(--plasma)]/40 bg-[var(--plasma)]/10"
                    : "border-white/10 bg-white/[0.02] text-muted-foreground"
                }`}
                title={isPaid ? "Toggle Deep Research with credible sources" : "Upgrade to Pro or Max to unlock Deep Research"}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isPaid ? <Telescope className="size-4 shrink-0" /> : <Lock className="size-3.5 shrink-0" />}
                  <span className="truncate">
                    {researchMutation.isPending
                      ? "Researching the web…"
                      : isPaid
                        ? "Deep Research + Sources"
                        : "Deep Research · Pro / Max"}
                  </span>
                  {researchMutation.isPending && <Loader2 className="size-3.5 animate-spin shrink-0" />}
                </div>
                <Switch
                  checked={researchEnabled}
                  disabled={!isPaid || researchMutation.isPending}
                  onCheckedChange={(checked) => {
                    if (!isPaid) return;
                    setResearchEnabled(checked);
                    if (!checked) setResearch(null);
                  }}
                />
              </div>
              {isPaid && researchEnabled && (
                <p className="mt-2 text-[10px] text-muted-foreground font-mono">
                  Research runs in parallel with script generation.
                </p>
              )}

              {researchMutation.error && (
                <div className="mt-3 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                  {(researchMutation.error as Error).message}
                </div>
              )}

              {mutation.error && (
                <div className="mt-3 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                  {(mutation.error as Error).message}
                </div>
              )}
            </motion.form>

            {/* OUTPUT PANEL */}
            <div className="space-y-5 min-w-0">
              {!isPaid && (
                <div className="glass rounded-3xl p-5 border border-white/10 flex flex-wrap items-center justify-between gap-3 opacity-90">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                      <Lock className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-display text-base font-bold">Deep Research <span className="text-[10px] font-mono text-[var(--plasma)] ml-1">PRO / MAX</span></div>
                      <div className="text-[11px] text-muted-foreground">Research any topic with credible source links and a research-backed script.</div>
                    </div>
                  </div>
                  <Link to="/" hash="pricing" className="rounded-xl px-4 py-2.5 text-sm font-medium glass hover:bg-white/5 inline-flex items-center gap-2 shrink-0">
                    Upgrade
                  </Link>
                </div>
              )}

              {/* Ad: free users only — hidden for pro/max */}
              <AdSlot slot="studio-top" format="horizontal" minHeight={90} />

              <AnimatePresence mode="wait">
                {!result && !mutation.isPending && (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="glass rounded-3xl p-12 text-center min-h-[60vh] flex flex-col items-center justify-center"
                  >
                    <div className="size-16 rounded-2xl bg-gradient-to-br from-[var(--neon)]/20 to-[var(--plasma)]/20 flex items-center justify-center mb-5 float">
                      <Film className="size-7 text-[var(--neon)]" />
                    </div>
                    <h2 className="font-display text-2xl font-bold mb-2">Studio is idle.</h2>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Drop a topic on the left. We'll forge a hook-driven script with per-line scene prompts and a full SEO pack.
                    </p>
                  </motion.div>
                )}

                {mutation.isPending && (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <LoadingState />
                  </motion.div>
                )}

                {result && (
                  <motion.div key="result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <ResultView result={result} onRegenerate={() => mutation.mutate(form)} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Research panel — runs in parallel with script generation */}
              {isPaid && (research || researchMutation.isPending) && (
                <div className="glass-strong rounded-3xl border border-[var(--plasma)]/30 overflow-hidden">
                  <div className="flex items-center justify-between gap-3 p-4 md:p-5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-10 rounded-xl bg-gradient-to-br from-[var(--plasma)] to-[var(--neon)] flex items-center justify-center shrink-0">
                        <Telescope className="size-5 text-background" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-display text-base font-bold">Deep Research</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {researchMutation.isPending
                            ? "Researching the web — grounding in your script…"
                            : research
                              ? "Credible sources · research-backed script"
                              : "Research grounded in the generated script"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!researchMutation.isPending && (
                        <button
                          type="button"
                          onClick={() => {
                            setResearch(null);
                            researchMutation.mutate({ topic: form.topic, language: form.language, script: result?.script, format: form.format });
                            setResearchOpen(true);
                          }}
                          className="rounded-lg px-3 py-2 text-xs font-medium bg-gradient-to-r from-[var(--plasma)] to-[var(--neon)] text-background inline-flex items-center gap-1.5"
                        >
                          <Telescope className="size-3.5" /> {research ? "Re-run" : "Run"}
                        </button>
                      )}
                      {(research || researchMutation.isPending) && (
                        <button
                          type="button"
                          onClick={() => setResearchOpen((v) => !v)}
                          className="rounded-lg px-3 py-2 text-xs font-medium glass hover:bg-white/5"
                        >
                          {researchOpen ? "Hide" : "Show"}
                        </button>
                      )}
                    </div>
                  </div>
                  <AnimatePresence initial={false}>
                    {researchOpen && (researchMutation.isPending || research) && (
                      <motion.div
                        key="research-body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 md:px-5 pb-5 min-w-0">
                          {researchMutation.isPending && !research ? (
                            <div className="text-center py-8">
                              <Loader2 className="size-6 animate-spin mx-auto mb-3 text-[var(--plasma)]" />
                              <div className="font-display text-base">Deep researching…</div>
                              <div className="text-xs text-muted-foreground mt-1">Pulling findings, stats, and credible sources.</div>
                            </div>
                          ) : research ? (
                            <ResearchView research={research} />
                          ) : null}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {researchMutation.error && (
                    <div className="mx-4 md:mx-5 mb-4 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                      {(researchMutation.error as Error).message}
                    </div>
                  )}
                </div>
              )}

              {/* Ad: free users only — hidden for pro/max */}
              <AdSlot slot="studio-bottom" format="auto" minHeight={250} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function UsageBadge({ usage }: { usage?: GenerateResult["usage"] }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!usage) return null;
  const ms = Math.max(0, new Date(usage.reset_at).getTime() - now);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const fmt = `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  const shortsLeft = Math.max(0, usage.shorts_limit - usage.shorts_used);
  const longsLeft  = Math.max(0, usage.longs_limit  - usage.longs_used);
  return (
    <div className="mb-4 glass rounded-2xl p-3 border border-white/5">
      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
        <span className="inline-flex items-center gap-1.5"><Zap className="size-3 text-[var(--neon)]" /> {usage.plan} plan</span>
        <span className="inline-flex items-center gap-1.5"><Timer className="size-3" /> resets in {fmt}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/[0.03] rounded-lg px-2.5 py-1.5">
          <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Shorts left</div>
          <div className="font-display text-base font-bold">{shortsLeft}<span className="text-xs text-muted-foreground font-normal">/{usage.shorts_limit}</span></div>
        </div>
        <div className="bg-white/[0.03] rounded-lg px-2.5 py-1.5">
          <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Long-form left</div>
          <div className="font-display text-base font-bold">{longsLeft}<span className="text-xs text-muted-foreground font-normal">/{usage.longs_limit}</span></div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}

function LoadingState() {
  const steps = ["Decoding topic", "Engineering hook", "Writing cinematic beats", "Generating scene prompts", "Building SEO pack", "Scoring virality"];
  return (
    <div className="glass-strong rounded-3xl p-10 min-h-[60vh] flex flex-col items-center justify-center">
      <div className="relative size-20 mb-8">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[var(--neon)] to-[var(--plasma)] blur-2xl opacity-60 animate-pulse" />
        <div className="relative size-full rounded-full glass-strong flex items-center justify-center neon-border">
          <Sparkles className="size-8 text-[var(--neon)] animate-pulse" />
        </div>
      </div>
      <h3 className="font-display text-2xl font-bold mb-6">Forging your script…</h3>
      <div className="space-y-2 w-full max-w-xs">
        {steps.map((s, i) => (
          <motion.div
            key={s}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.4 }}
            className="flex items-center gap-3 text-xs font-mono text-muted-foreground"
          >
            <div className="size-1.5 rounded-full bg-[var(--neon)]" /> {s}…
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ResultView({ result, onRegenerate }: { result: GenerateResult; onRegenerate: () => void }) {
  const [tab, setTab] = useState<"script" | "scenes" | "seo">("script");

  const downloadTxt = () => {
    const lines = [
      `=== SHORTFORGE AI ULTRA ===`,
      `Category: ${result.detected_category}  |  Words: ${result.word_count}`,
      ``,
      `--- SCRIPT ---`,
      result.script,
      ``,
      `--- SCENES ---`,
      ...result.scenes.map((s, i) => [
        `[Line ${i + 1}] ${s.line}`,
        `  Image: ${s.image_prompt}`,
        `  Video: ${s.video_prompt}`,
        `  Camera: ${s.camera}  |  Lighting: ${s.lighting}  |  Mood: ${s.mood}`,
        `  Environment: ${s.environment}  |  Characters: ${s.characters}`,
        `  Transition: ${s.transition}  |  SFX: ${s.sfx}  |  Music: ${s.music}  |  Voice: ${s.voice}`,
        ``,
      ].join("\n")),
      ``,
      `--- SEO ---`,
      `Titles:`,
      ...result.seo.titles.map((t) => `  • ${t}`),
      ``,
      `Short description: ${result.seo.short_description}`,
      ``,
      `Long description:\n${result.seo.long_description}`,
      ``,
      `Hashtags (${result.seo.hashtags.length}): ${result.seo.hashtags.join(" ")}`,
      ``,
      `SEO Tags: ${result.seo.seo_tags}`,
      `Thumbnail: ${result.seo.thumbnail_text}`,
      `YouTube Category: ${result.seo.video_category}`,
      ``,
      `--- SCORES ---`,
      `Virality: ${result.scores.virality}/100  |  Retention: ${result.scores.retention}/100  |  CTR: ${result.scores.ctr}/100`,
    ].join("\n");

    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "shortforge-script.txt"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Score header */}
      <div className="glass-strong rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--neon)]">Detected category</div>
            <div className="font-display text-xl font-bold">{result.detected_category} <span className="text-muted-foreground text-sm font-normal">· {result.word_count} words</span></div>
          </div>
          <div className="flex gap-2">
            <button onClick={onRegenerate} className="glass rounded-xl px-3 py-2 text-xs inline-flex items-center gap-1.5 hover:bg-white/5">
              <RotateCcw className="size-3.5" /> Regenerate
            </button>
            <button onClick={downloadTxt} className="btn-hero rounded-xl px-3 py-2 text-xs inline-flex items-center gap-1.5">
              <Download className="size-3.5" /> Download .txt
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <ScoreCard label="Virality" value={result.scores.virality} icon={Flame} />
          <ScoreCard label="Retention" value={result.scores.retention} icon={Gauge} />
          <ScoreCard label="CTR" value={result.scores.ctr} icon={Sparkles} />
        </div>
      </div>

      {/* Tabs */}
      <div className="glass-strong rounded-3xl overflow-hidden">
        <div className="flex border-b border-white/5">
          {([
            { id: "script", label: "Script", icon: Film },
            { id: "scenes", label: `Scenes · ${result.scenes.length}`, icon: Video },
            { id: "seo", label: "SEO Pack", icon: Hash },
          ] as const).map((t) => (
            <button key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 px-4 py-4 text-sm font-medium inline-flex items-center justify-center gap-2 transition-all relative ${
                tab === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="size-4" /> {t.label}
              {tab === t.id && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[var(--neon)] to-[var(--plasma)]" />}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === "script" && <ScriptTab script={result.script} />}
          {tab === "scenes" && <ScenesTab scenes={result.scenes} />}
          {tab === "seo" && <SeoTab seo={result.seo} />}
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ComponentType<{ className?: string }> }) {
  const color = value >= 80 ? "var(--neon)" : value >= 60 ? "var(--plasma)" : "oklch(0.7 0.15 60)";
  return (
    <div className="glass rounded-2xl p-4 relative overflow-hidden">
      <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3" /> {label}
      </div>
      <div className="font-display text-3xl font-bold mt-2" style={{ color }}>{value}<span className="text-sm text-muted-foreground font-normal">/100</span></div>
      <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${color}, var(--plasma))` }} />
      </div>
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="glass rounded-lg px-2.5 py-1.5 text-[11px] inline-flex items-center gap-1 hover:bg-white/5 transition-colors"
    >
      {copied ? <><Check className="size-3 text-[var(--neon)]" /> copied</> : <><Copy className="size-3" /> copy</>}
    </button>
  );
}

function ScriptTab({ script }: { script: string }) {
  return (
    <div>
      <div className="flex justify-end mb-3"><CopyBtn text={script} /></div>
      <div className="font-display text-lg leading-relaxed whitespace-pre-line text-foreground/95">
        {script}
      </div>
    </div>
  );
}

function ScenesTab({ scenes }: { scenes: GenerateResult["scenes"] }) {
  return (
    <div className="space-y-4">
      {scenes.map((s, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
          className="glass rounded-2xl p-5"
        >
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-start gap-3">
              <div className="font-mono text-[10px] text-[var(--neon)] mt-1 shrink-0">L{String(i + 1).padStart(2, "0")}</div>
              <div className="font-display text-base font-medium leading-snug">{s.line}</div>
            </div>
            <CopyBtn text={`${s.image_prompt}\n\n${s.video_prompt}`} />
          </div>
          <div className="grid md:grid-cols-2 gap-3 mt-3">
            <PromptBlock icon={ImageIcon} label="Image prompt" text={s.image_prompt} />
            <PromptBlock icon={Video} label="Video prompt" text={s.video_prompt} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-[11px] font-mono">
            <Meta k="Camera" v={s.camera} />
            <Meta k="Lighting" v={s.lighting} />
            <Meta k="Mood" v={s.mood} />
            <Meta k="Env" v={s.environment} />
            <Meta k="Cast" v={s.characters} />
            <Meta k="Transition" v={s.transition} />
            <Meta k="SFX" v={s.sfx} />
            <Meta k="Music" v={s.music} />
            <Meta k="Voice" v={s.voice} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function PromptBlock({ icon: Icon, label, text }: { icon: React.ComponentType<{ className?: string }>; label: string; text: string }) {
  return (
    <div className="bg-black/30 border border-white/5 rounded-xl p-3">
      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
        <span className="inline-flex items-center gap-1.5"><Icon className="size-3" /> {label}</span>
        <CopyBtn text={text} />
      </div>
      <div className="text-xs leading-relaxed text-foreground/85">{text}</div>
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-lg px-2.5 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className="text-foreground/85 truncate" title={v}>{v}</div>
    </div>
  );
}

function SeoTab({ seo }: { seo: GenerateResult["seo"] }) {
  return (
    <div className="space-y-5">
      <Section title="Viral title variants">
        <div className="space-y-2">
          {seo.titles.map((t, i) => (
            <div key={i} className="glass rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <span className="text-sm font-medium">{t}</span>
              <CopyBtn text={t} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Short description">
        <div className="glass rounded-xl p-4 text-sm leading-relaxed">
          <div className="flex justify-end mb-2"><CopyBtn text={seo.short_description} /></div>
          {seo.short_description}
        </div>
      </Section>

      <Section title="Long description">
        <div className="glass rounded-xl p-4 text-sm leading-relaxed whitespace-pre-line">
          <div className="flex justify-end mb-2"><CopyBtn text={seo.long_description} /></div>
          {seo.long_description}
        </div>
      </Section>

      <Section title={`Hashtags (${seo.hashtags.length})`}>
        <div className="glass rounded-xl p-4">
          <div className="flex justify-end mb-2"><CopyBtn text={seo.hashtags.join(" ")} /></div>
          <div className="flex flex-wrap gap-1.5">
            {seo.hashtags.map((h, i) => (
              <span key={i} className="text-[11px] font-mono bg-white/[0.04] border border-white/10 rounded-md px-2 py-0.5 text-foreground/80">
                {h.startsWith("#") ? h : `#${h}`}
              </span>
            ))}
          </div>
        </div>
      </Section>

      <div className="grid md:grid-cols-2 gap-4">
        <Section title={`SEO tags (${seo.seo_tags.length} chars)`}>
          <div className="glass rounded-xl p-4 text-xs font-mono leading-relaxed text-foreground/80 break-words">
            <div className="flex justify-end mb-2"><CopyBtn text={seo.seo_tags} /></div>
            {seo.seo_tags}
          </div>
        </Section>
        <Section title="Thumbnail & category">
          <div className="space-y-3">
            <div className="glass rounded-xl p-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Thumbnail text</div>
              <div className="font-display text-2xl font-bold text-gradient">{seo.thumbnail_text}</div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">YouTube category</div>
              <div className="text-sm">{seo.video_category}</div>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--neon)] mb-2">{title}</div>
      {children}
    </div>
  );
}

function ResearchView({ research }: { research: DeepResearchResult }) {
  const downloadMd = () => {
    const md = [
      `# Deep Research — ${research.topic}`,
      ``,
      `## Summary`,
      research.summary,
      ``,
      `## Key findings`,
      ...research.key_findings.map((k) => `- ${k}`),
      ``,
      `## Stats`,
      ...research.stats.map((s) => `- **${s.label}:** ${s.value}`),
      ``,
      `## Viral angles`,
      ...research.angles.map((a) => `- ${a}`),
      ``,
      `## Sources`,
      ...research.sources.map((s) => `- [${s.title}](${s.url}) — ${s.snippet}`),
      ``,
    ].join("\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "deep-research.md"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-end gap-2 mb-4">
        <button onClick={downloadMd} className="btn-hero rounded-xl px-3 py-2 text-xs inline-flex items-center gap-1.5">
          <Download className="size-3.5" /> .md
        </button>
      </div>

      <Section title="Summary">
        <div className="glass rounded-xl p-4 text-sm leading-relaxed whitespace-pre-line">{research.summary}</div>
      </Section>

      <div className="grid md:grid-cols-2 gap-4 mt-5">
        <Section title="Key findings">
          <ul className="space-y-1.5">
            {research.key_findings.map((k, i) => (
              <li key={i} className="glass rounded-lg px-3 py-2 text-xs leading-relaxed flex gap-2">
                <span className="text-[var(--neon)] font-mono shrink-0">{String(i + 1).padStart(2, "0")}</span>
                <span>{k}</span>
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Stats & numbers">
          <ul className="space-y-1.5">
            {research.stats.map((s, i) => (
              <li key={i} className="glass rounded-lg px-3 py-2 text-xs">
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{s.label}</div>
                <div className="font-display text-sm">{s.value}</div>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <div className="mt-5">
        <Section title="Untapped viral angles">
          <div className="flex flex-wrap gap-2">
            {research.angles.map((a, i) => (
              <span key={i} className="text-xs bg-[var(--plasma)]/10 border border-[var(--plasma)]/30 rounded-full px-3 py-1.5">{a}</span>
            ))}
          </div>
        </Section>
      </div>

      <div className="mt-5">
        <Section title={`Credible sources (${research.sources.length})`}>
          <ul className="space-y-2">
            {research.sources.map((s, i) => (
              <li key={i} className="glass rounded-xl p-3">
                <a href={s.url} target="_blank" rel="noopener noreferrer"
                  className="text-sm font-medium text-foreground hover:text-[var(--neon)] inline-flex items-center gap-1.5">
                  <ExternalLink className="size-3.5 shrink-0" /> {s.title}
                </a>
                <div className="text-[10px] font-mono text-muted-foreground break-all mt-0.5">{s.url}</div>
                <div className="text-xs text-foreground/75 mt-1.5 leading-relaxed">{s.snippet}</div>
              </li>
            ))}
          </ul>
          <div className="text-[10px] text-muted-foreground/70 mt-2 italic">Always verify sources before publishing — AI can occasionally cite outdated or imprecise pages.</div>
        </Section>
      </div>

    </div>
  );
}
