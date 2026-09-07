export function isSupabaseCrmEnabled(): boolean {
  return process.env.PIRILIGHT_OPERATIONAL_DATA_SOURCE === "supabase";
}
