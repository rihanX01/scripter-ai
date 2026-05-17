import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const inputSchema = z.object({
  topic: z.string().trim().min(3).max(500),
  category: z.string().min(2).max(40),
  language: z.enum(["english", "hindi", "hinglish"]),
  format: z.enum(["short", "long"]),
  // Custom target word count (optional — if omitted, uses format defaults)
  target_words: z.number().int().min(40).max(2000).optional(),
});

export type GenerateInput = z.infer<typeof inputSchema>;

const researchInputSchema = z.object({
  topic: z.string().trim().min(3).max(500),
  language: z.enum(["english", "hindi", "hinglish"]).default("english"),
});

export type DeepResearchResult = {
  topic: string;
  summary: string;
  key_findings: string[];
  stats: { label: string; value: string }[];
  angles: string[];
  sources: { title: string; url: string; snippet: string }[];
  script: string;
};

export type Scene = {
  line: string;
  image_prompt: string;
  video_prompt: string;
  camera: string;
  lighting: string;
  mood: string;
  environment: string;
  characters: string;
  transition: string;
  sfx: string;
  music: string;
  voice: string;
};

export type GenerateResult = {
  detected_category: string;
  word_count: number;
  script: string;
  scenes: Scene[];
  seo: {
    titles: string[];
    short_description: string;
    long_description: string;
    hashtags: string[];
    seo_tags: string;
    thumbnail_text: string;
    video_category: string;
  };
  scores: { virality: number; retention: number; ctr: number };
  usage: {
    plan: "free" | "pro" | "max";
    shorts_used: number;
    longs_used: number;
    shorts_limit: number;
    longs_limit: number;
    reset_at: string;
  };
};

const SYSTEM = `You are ShortForge AI Ultra — an elite viral YouTube script writer for faceless / cinematic channels.
You write extremely human, emotional, cinematic, hook-driven content that outperforms top viral creators.
You always reply with STRICT JSON matching the requested tool schema. No prose outside JSON.

WRITING RULES:
- Sound 100% human. No robotic AI phrasing. No "in this video", no "let's dive in".
- Hook in line 1 — shocking, curiosity-piercing, emotional or cinematic.
- Every line must escalate curiosity, tension, or stakes. No filler.
- Use loop-ending: last line should re-trigger curiosity or imply more.
- Adapt tone to category (horror = dread, motivation = fire, science = awe, etc.).
- For "What If" topics, the FIRST line MUST naturally start with "What if".

LANGUAGE RULES:
- english: pure English, natural creator voice.
- hindi: pure Hindi in DEVANAGARI script (देवनागरी). No Roman letters.
- hinglish: this is the way real Indian YouTubers like BB Ki Vines, MrBeast Hindi dubs, and viral Shorts creators speak.
  * Write ENTIRELY in the English alphabet (Roman script). Never use Devanagari.
  * Roughly 95–98% of the words must be HINDI words spelled phonetically in Roman script
    (e.g. "kya", "matlab", "socho", "zindagi", "rasta", "andhera", "dimag", "kabhi", "lekin", "phir", "samajh", "agar", "yaar", "bhai", "dekho", "suno", "hota hai", "ho gaya", "kar diya").
  * Only allow common loan-words that Indians genuinely use in conversation
    (phone, video, internet, AI, gym, plan, level, system, etc.). Avoid heavy English vocabulary.
  * NEVER write full English sentences or fancy English literary words.
  * Tone: emotional, conversational, street-real, cinematic. Like a desi narrator whispering a secret.
  * Punctuation and pacing should feel like spoken Hindi, not translated English.

WORD COUNT RULES (STRICT):
- The user-provided "target_words" is the EXACT word count to hit (±5% tolerance).
- Count words carefully before returning. word_count in the JSON must reflect the actual count.
- If no target is given, SHORT = 86–100 words, LONG = 700–1100 words.

For EVERY line of the script, generate a scene with cinematic image_prompt and video_prompt
optimized for Midjourney / Flux / Sora / Veo / Runway / Kling — ultra-detailed, dramatic, high-contrast.
Also include camera move, lighting, mood, environment, characters, transition, sfx, music, voice tone.

SEO PACK:
- 5 viral title variants
- short_description (under 200 chars, hook-style)
- long_description (3–5 short paragraphs with CTAs)
- EXACTLY 86 hashtags, lowercase, no spaces, mix of broad + niche + trending
- seo_tags: a comma-separated tag string with total length between 480 and 500 characters
- thumbnail_text: 2–4 explosive words
- video_category (YouTube category name)
- Scores 0–100 for virality, retention, ctr (be honest, not always 90+).`;

const tools = [
  {
    type: "function" as const,
    function: {
      name: "emit_script_pack",
      description: "Return the complete viral script pack with scenes and SEO.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          detected_category: { type: "string" },
          word_count: { type: "integer" },
          script: { type: "string" },
          scenes: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                line: { type: "string" },
                image_prompt: { type: "string" },
                video_prompt: { type: "string" },
                camera: { type: "string" },
                lighting: { type: "string" },
                mood: { type: "string" },
                environment: { type: "string" },
                characters: { type: "string" },
                transition: { type: "string" },
                sfx: { type: "string" },
                music: { type: "string" },
                voice: { type: "string" },
              },
              required: ["line","image_prompt","video_prompt","camera","lighting","mood","environment","characters","transition","sfx","music","voice"],
            },
          },
          seo: {
            type: "object",
            additionalProperties: false,
            properties: {
              titles: { type: "array", items: { type: "string" }, minItems: 5, maxItems: 5 },
              short_description: { type: "string" },
              long_description: { type: "string" },
              hashtags: { type: "array", items: { type: "string" }, minItems: 86, maxItems: 86 },
              seo_tags: { type: "string" },
              thumbnail_text: { type: "string" },
              video_category: { type: "string" },
            },
            required: ["titles","short_description","long_description","hashtags","seo_tags","thumbnail_text","video_category"],
          },
          scores: {
            type: "object",
            additionalProperties: false,
            properties: {
              virality: { type: "integer" },
              retention: { type: "integer" },
              ctr: { type: "integer" },
            },
            required: ["virality","retention","ctr"],
          },
        },
        required: ["detected_category","word_count","script","scenes","seo","scores"],
      },
    },
  },
];

function parseQuotaError(message: string): string {
  // QUOTA_EXCEEDED:short:2:2:2026-05-15 08:00:00+00
  const m = message.match(/QUOTA_EXCEEDED:(short|long):(\d+):(\d+):(.+)/);
  if (!m) return message;
  const [, fmt, used, limit, reset] = m;
  const resetDate = new Date(reset);
  const hrs = Math.max(0, Math.ceil((resetDate.getTime() - Date.now()) / 3_600_000));
  return `Daily ${fmt} script limit reached (${used}/${limit}). Resets in ~${hrs}h. Upgrade your plan for more.`;
}

export const getMyUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase.rpc("get_my_usage");
    if (error) throw new Error(error.message);
    return data as GenerateResult["usage"];
  });

export const generateScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data, context }): Promise<GenerateResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const { supabase, userId } = context;

    // 1. Atomically check + consume quota (uses real plan from DB, not client input)
    const { data: usage, error: quotaErr } = await supabase.rpc("consume_quota", { _format: data.format });
    if (quotaErr) throw new Error(parseQuotaError(quotaErr.message));
    const usageData = usage as GenerateResult["usage"];

    // 2. Resolve model from the user's actual plan
    const tierModel: Record<string, string> = {
      free: "google/gemini-2.5-flash",
      pro: "google/gemini-2.5-flash",
      max: "google/gemini-2.5-pro",
    };

    const targetWords = data.target_words ?? (data.format === "short" ? 95 : 900);
    const minW = Math.max(40, Math.round(targetWords * 0.95));
    const maxW = Math.round(targetWords * 1.05);

    const userPrompt = `TOPIC: ${data.topic}
CATEGORY: ${data.category}${data.category === "auto" ? " (auto-detect the BEST viral category)" : ""}
LANGUAGE: ${data.language}
FORMAT: ${data.format === "short" ? "SHORT (viral YouTube Short)" : "LONG (cinematic long-form)"}
TARGET WORD COUNT: exactly ${targetWords} words (acceptable range: ${minW}–${maxW})

Generate the script pack now. Be ruthless about quality. No filler. Hook hard. Loop the ending.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: tierModel[usageData.plan],
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "emit_script_pack" } },
      }),
    });

    if (!res.ok) {
      // Best-effort refund of the consumed quota on AI failure
      try {
        const update = data.format === "short"
          ? { shorts_used: Math.max(0, usageData.shorts_used - 1) }
          : { longs_used: Math.max(0, usageData.longs_used - 1) };
        await supabaseAdmin.from("usage_counters").update(update).eq("user_id", userId);
      } catch { /* ignore */ }
      const t = await res.text();
      if (res.status === 429) throw new Error("Rate limit reached. Please try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add credits to continue.");
      throw new Error(`AI gateway error (${res.status}): ${t.slice(0, 200)}`);
    }

    const json = await res.json();
    const call = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) throw new Error("AI returned no script payload");
    const parsed = JSON.parse(call.function.arguments) as Omit<GenerateResult, "usage">;

    // 3. Persist the generation
    await supabaseAdmin.from("generations").insert({
      user_id: userId,
      topic: data.topic,
      category: parsed.detected_category ?? data.category,
      language: data.language,
      format: data.format,
      tier: usageData.plan,
      payload: parsed as never,
      virality: parsed.scores.virality,
      retention: parsed.scores.retention,
      ctr: parsed.scores.ctr,
    });

    return { ...parsed, usage: usageData };
  });

const RESEARCH_TOOL = [{
  type: "function" as const,
  function: {
    name: "emit_research",
    description: "Return deep research with credible sources and a research-backed script.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        topic: { type: "string" },
        summary: { type: "string", description: "300-500 word executive summary of the topic." },
        key_findings: { type: "array", items: { type: "string" }, minItems: 5, maxItems: 12 },
        stats: {
          type: "array",
          minItems: 3,
          maxItems: 10,
          items: {
            type: "object",
            additionalProperties: false,
            properties: { label: { type: "string" }, value: { type: "string" } },
            required: ["label", "value"],
          },
        },
        angles: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 8, description: "Untapped viral video angles." },
        sources: {
          type: "array",
          minItems: 5,
          maxItems: 15,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              url: { type: "string", description: "Full https URL to a credible primary source (gov, edu, established news, journals, books, official sites). Never invent URLs — only cite real, verifiable pages." },
              snippet: { type: "string", description: "1-2 sentence quote or paraphrase from the source." },
            },
            required: ["title", "url", "snippet"],
          },
        },
        script: { type: "string", description: "A long-form research-backed viral script (800-1200 words) that weaves in the findings, with hook, escalation, and loop ending." },
      },
      required: ["topic", "summary", "key_findings", "stats", "angles", "sources", "script"],
    },
  },
}];

export const deepResearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => researchInputSchema.parse(d))
  .handler(async ({ data, context }): Promise<DeepResearchResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const { supabase } = context;

    // Gate: paid plans only
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("plan")
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    const plan = (profile?.plan as "free" | "pro" | "max" | undefined) ?? "free";
    if (plan === "free") {
      throw new Error("Deep Research is available on Pro and Max plans. Upgrade to unlock.");
    }

    const system = `You are ShortForge Deep Research — a senior research analyst + viral scriptwriter.
You produce rigorously sourced research briefs for video creators.

RULES:
- Cite ONLY real, verifiable sources you are highly confident exist (gov, edu, peer-reviewed journals, established news outlets like BBC/NYT/Reuters/Nature/NASA/WHO, official org sites, well-known books). Never fabricate URLs. If unsure, omit.
- Prefer primary sources over secondary.
- Provide concrete numbers, dates, names, places — not vague claims.
- Surface non-obvious, counter-intuitive angles a viral creator could exploit.
- The final "script" must be a cinematic, hook-driven, human-sounding viral video script that integrates the research naturally. No "in this video", no AI clichés. Loop the ending.
- Match the requested language. For hinglish: Roman script, ~95% phonetic Hindi + common loan-words; never full English.
- Reply via the emit_research tool only.`;

    const user = `TOPIC: ${data.topic}
OUTPUT LANGUAGE (for script + summary): ${data.language}

Do deep research and emit the structured payload now.`;

    const model = plan === "max" ? "google/gemini-2.5-pro" : "google/gemini-2.5-flash";

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        tools: RESEARCH_TOOL,
        tool_choice: { type: "function", function: { name: "emit_research" } },
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      if (res.status === 429) throw new Error("Rate limit reached. Please try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add credits to continue.");
      throw new Error(`AI gateway error (${res.status}): ${t.slice(0, 200)}`);
    }

    const json = await res.json();
    const call = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) throw new Error("AI returned no research payload");
    const parsed = JSON.parse(call.function.arguments) as DeepResearchResult;

    // Filter obviously bad URLs
    parsed.sources = (parsed.sources ?? []).filter((s) => /^https?:\/\//i.test(s.url));

    return parsed;
  });
