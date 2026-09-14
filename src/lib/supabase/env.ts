const REQUIRED_PUBLIC_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
] as const;

export interface SupabasePublicEnv {
  url: string;
  publishableKey: string;
}

export function hasSupabaseEnv(): boolean {
  return REQUIRED_PUBLIC_ENV.every((name) => Boolean(process.env[name]?.trim()));
}

export function getSupabaseEnv(): SupabasePublicEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase Auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  return { url, publishableKey };
}

export function getSiteUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!configuredUrl) {
    throw new Error("NEXT_PUBLIC_SITE_URL is required for trusted authentication redirects.");
  }

  const parsedUrl = new URL(configuredUrl);

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_SITE_URL must use http or https.");
  }

  return parsedUrl.origin;
}
