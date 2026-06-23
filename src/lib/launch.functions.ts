import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

function publicClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export const getLaunchInfo = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("launch_config")
    .select("launch_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return {
    launchAt: data?.launch_at ?? null,
    serverNow: new Date().toISOString(),
  };
});

const updateSchema = z.object({
  password: z.string().min(1),
  launchAt: z.string().min(1),
});

export const updateLaunchTime = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => updateSchema.parse(data))
  .handler(async ({ data }) => {
    const expected = process.env.ADMIN_LAUNCH_PASSWORD;
    if (!expected || data.password !== expected) {
      throw new Error("Invalid admin password");
    }
    const when = new Date(data.launchAt);
    if (Number.isNaN(when.getTime())) {
      throw new Error("Invalid date");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("launch_config")
      .upsert({ id: 1, launch_at: when.toISOString(), updated_at: new Date().toISOString() });

    if (error) throw new Error(error.message);
    return { success: true, launchAt: when.toISOString() };
  });

const verifySchema = z.object({ password: z.string().min(1) });

export const verifyAdminPassword = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => verifySchema.parse(data))
  .handler(async ({ data }) => {
    const expected = process.env.ADMIN_LAUNCH_PASSWORD;
    return { ok: !!expected && data.password === expected };
  });
