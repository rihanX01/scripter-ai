import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  topic: z.string().trim().min(3).max(500),
  category: z.string().min(2).max(40),
  language: z.enum(["english", "hindi", "hinglish"]),
  format: z.enum(["short", "long"]),
  tier: z.enum(["free", "pro", "max"]).default("free"),
});

export type GenerateInput = z.infer<typeof inputSchema>;

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
    hashtags: string[]; // 86
    seo_tags: string; // 500 chars
    thumbnail_text: string;
    video_category: string;
  };
  scores: {
    virality: number;
    retention: number;
    ctr: number;
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
- For Hinglish, mix natural Hindi + English the way real Indian creators speak.
- For Hindi, use Devanagari script.
- SHORT format: total script body must be EXACTLY between 86 and 100 words. Count carefully.
- LONG format: 700–1100 words, broken into clear cinematic beats.

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
          script: { type: "string", description: "Full script as plain text, lines separated by \\n" },
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

export const generateScript = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }): Promise<GenerateResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const tierModel: Record<string, string> = {
      free: "google/gemini-3-flash-preview",
      pro: "google/gemini-2.5-flash",
      max: "google/gemini-2.5-pro",
    };

    const userPrompt = `TOPIC: ${data.topic}
CATEGORY: ${data.category}${data.category === "auto" ? " (auto-detect the BEST viral category)" : ""}
LANGUAGE: ${data.language}
FORMAT: ${data.format === "short" ? "SHORT (86–100 words, viral YouTube Short)" : "LONG (700–1100 words, cinematic long-form)"}
TIER: ${data.tier}

Generate the script pack now. Be ruthless about quality. No filler. Hook hard. Loop the ending.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: tierModel[data.tier],
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "emit_script_pack" } },
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
    if (!call?.function?.arguments) throw new Error("AI returned no script payload");
    const parsed = JSON.parse(call.function.arguments) as GenerateResult;
    return parsed;
  });
