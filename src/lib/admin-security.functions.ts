import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequestIP, getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

export const recordAdminLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    email: z.string().email().max(255).optional(),
    success: z.boolean().default(true),
    reason: z.string().max(200).optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    // Verify caller is admin before recording (this is the security gate).
    await assertAdmin(context.userId);
    const ip = (() => { try { return getRequestIP({ xForwardedFor: true }) ?? null; } catch { return null; } })();
    const ua = (() => { try { return getRequestHeader("user-agent") ?? null; } catch { return null; } })();
    await supabaseAdmin.from("admin_login_events").insert({
      admin_id: context.userId,
      email: data.email ?? null,
      ip,
      user_agent: ua,
      success: data.success,
      reason: data.reason ?? null,
    });
    return { ok: true };
  });

export const listAdminLoginEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("admin_login_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
