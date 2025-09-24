import "server-only";
import { createSupabaseUserClient } from "@/lib/supabase/clients";

export async function orgHasFeature(orgId: string, key: string) {
  const sb = await createSupabaseUserClient();
  const { data, error } = await sb.rpc("feature_enabled", { p_org: orgId, p_feature_key: key });
  if (error) return false;
  return !!data;
}

export async function orgFeatureLimits(orgId: string, key: string) {
  const sb = await createSupabaseUserClient();
  const { data } = await sb.rpc("feature_limits", { p_org: orgId, p_feature_key: key });
  return data || {};
}