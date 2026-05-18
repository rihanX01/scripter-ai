import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const DEFAULT_PLAN_LIMITS = [
  {
    plan: "free" as const,
    shorts_limit: 3,
    longs_limit: 1,
    ad_free: false,
    priority_queue: false,
    ai_model: "google/gemini-2.5-flash",
    price_usd: 0,
  },
  {
    plan: "pro" as const,
    shorts_limit: 50,
    longs_limit: 20,
    ad_free: true,
    priority_queue: true,
    ai_model: "google/gemini-2.5-flash",
    price_usd: 19,
  },
  {
    plan: "max" as const,
    shorts_limit: 500,
    longs_limit: 200,
    ad_free: true,
    priority_queue: true,
    ai_model: "google/gemini-2.5-pro",
    price_usd: 49,
  },
];

async function ensurePlanLimitRows() {
  const { data, error } = await supabaseAdmin.from("plan_limits").select("plan");
  if (error) throw new Error(error.message);

  const existing = new Set((data ?? []).map((row: { plan: string }) => row.plan));
  const missing = DEFAULT_PLAN_LIMITS.filter((row) => !existing.has(row.plan));

  if (!missing.length) return;

  const { error: upsertError } = await supabaseAdmin
    .from("plan_limits")
    .upsert(missing, { onConflict: "plan" });

  if (upsertError) throw new Error(upsertError.message);
}

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

async function audit(adminId: string, action: string, targetUserId: string | null, metadata: Record<string, unknown> = {}) {
  await supabaseAdmin.from("admin_audit_log").insert({
    admin_id: adminId, action, target_user_id: targetUserId, metadata: metadata as any,
  });
}

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    await ensurePlanLimitRows();
    const [users, gens, recentGens, planBreakdown, last7] = await Promise.all([
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("generations").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("generations").select("id,topic,format,language,category,created_at,user_id").order("created_at", { ascending: false }).limit(10),
      supabaseAdmin.from("profiles").select("plan"),
      supabaseAdmin.from("generations").select("created_at,format").gte("created_at", new Date(Date.now() - 7 * 86400_000).toISOString()),
    ]);

    const planCounts = { free: 0, pro: 0, max: 0 };
    (planBreakdown.data ?? []).forEach((r: any) => { planCounts[r.plan as keyof typeof planCounts]++; });

    // Build daily series
    const days: Record<string, { date: string; shorts: number; long: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
      days[d] = { date: d, shorts: 0, long: 0 };
    }
    (last7.data ?? []).forEach((g: any) => {
      const d = g.created_at.slice(0, 10);
      if (days[d]) days[d][g.format === "short" ? "shorts" : "long"]++;
    });

    return {
      totalUsers: users.count ?? 0,
      totalGenerations: gens.count ?? 0,
      planCounts,
      recentGenerations: recentGens.data ?? [],
      dailySeries: Object.values(days),
    };
  });

export const listUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ search: z.string().optional(), limit: z.number().min(1).max(200).default(50) }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin.from("profiles").select("user_id,email,display_name,avatar_url,plan,is_banned,created_at,last_seen_at").order("created_at", { ascending: false }).limit(data.limit);
    if (data.search) q = q.or(`email.ilike.%${data.search}%,display_name.ilike.%${data.search}%`);
    const { data: users, error } = await q;
    if (error) throw new Error(error.message);
    const ids = (users ?? []).map((u: any) => u.user_id);
    let roleMap: Record<string, string[]> = {};
    if (ids.length) {
      const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id,role").in("user_id", ids);
      (roles ?? []).forEach((r: any) => {
        roleMap[r.user_id] = roleMap[r.user_id] ?? [];
        roleMap[r.user_id].push(r.role);
      });
    }
    return (users ?? []).map((u: any) => ({ ...u, roles: roleMap[u.user_id] ?? [] }));
  });

export const updateUserPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid(), plan: z.enum(["free", "pro", "max"]) }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("profiles").update({ plan: data.plan }).eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
    await audit(context.userId, "update_plan", data.user_id, { plan: data.plan });
    return { ok: true };
  });

export const setUserBanned = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid(), banned: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("profiles").update({ is_banned: data.banned }).eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
    await audit(context.userId, data.banned ? "ban_user" : "unban_user", data.user_id, {});
    return { ok: true };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid(), role: z.enum(["admin", "moderator", "user"]), grant: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    if (data.grant) {
      await supabaseAdmin.from("user_roles").upsert({ user_id: data.user_id, role: data.role }, { onConflict: "user_id,role" });
    } else {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id).eq("role", data.role);
    }
    await audit(context.userId, data.grant ? "grant_role" : "revoke_role", data.user_id, { role: data.role });
    return { ok: true };
  });

export const listPlanLimits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    await ensurePlanLimitRows();
    const { data, error } = await supabaseAdmin.from("plan_limits").select("*").order("plan");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updatePlanLimit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    plan: z.enum(["free", "pro", "max"]),
    shorts_limit: z.coerce.number().int().min(0).max(100000),
    longs_limit: z.coerce.number().int().min(0).max(100000),
    ad_free: z.coerce.boolean(),
    priority_queue: z.coerce.boolean(),
    ai_model: z.string().min(2).max(100),
    price_usd: z.coerce.number().min(0).max(100000),
  }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    await ensurePlanLimitRows();
    const { error } = await supabaseAdmin.from("plan_limits").upsert({
      plan: data.plan,
      shorts_limit: data.shorts_limit, longs_limit: data.longs_limit,
      ad_free: data.ad_free, priority_queue: data.priority_queue, ai_model: data.ai_model,
      price_usd: data.price_usd,
    }, { onConflict: "plan" });
    if (error) throw new Error(error.message);
    await audit(context.userId, "update_plan_limit", null, data);
    return { ok: true };
  });

export const listFeatureFlags = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin.from("feature_flags").select("*").order("key");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const setFeatureFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ key: z.string().min(1).max(100), enabled: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("feature_flags").upsert({ key: data.key, enabled: data.enabled }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    await audit(context.userId, "set_feature_flag", null, data);
    return { ok: true };
  });

export const listAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin.from("announcements").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    title: z.string().min(1).max(200),
    body: z.string().min(1).max(2000),
    variant: z.enum(["info", "success", "warning", "promo"]).default("info"),
    active: z.boolean().default(true),
  }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("announcements").insert({ ...data, created_by: context.userId });
    if (error) throw new Error(error.message);
    await audit(context.userId, "create_announcement", null, { title: data.title });
    return { ok: true };
  });

export const toggleAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("announcements").update({ active: data.active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("announcements").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const recentAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await supabaseAdmin.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(50);
    return data ?? [];
  });
