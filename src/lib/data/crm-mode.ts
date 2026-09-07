export function isSupabaseOperationalDataEnabled(): boolean {
  return process.env.PIRILIGHT_OPERATIONAL_DATA_SOURCE === "supabase";
}

export const isSupabaseCrmEnabled = isSupabaseOperationalDataEnabled;
