import "server-only";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export async function orgHasFeature(orgId: string, key: string) {
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.rpc("feature_enabled", { p_org: orgId, p_feature_key: key });
  if (error) return false;
  return !!data;
}

export async function orgFeatureLimits(orgId: string, key: string) {
  const sb = await createSupabaseServerClient();
  const { data } = await sb.rpc("feature_limits", { p_org: orgId, p_feature_key: key });
  return data || {};
}