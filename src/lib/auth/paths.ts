const PUBLIC_AUTH_PATHS = ["/login", "/forgot-password", "/reset-password", "/auth/callback"];

export function isPublicAuthPath(pathname: string): boolean {
  return PUBLIC_AUTH_PATHS.some(
    (publicPath) => pathname === publicPath || pathname.startsWith(`${publicPath}/`),
  );
}

export function safeNextPath(value: FormDataEntryValue | string | null | undefined): string {
  if (typeof value !== "string") return "/";

  const candidate = value.trim();

  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    isPublicAuthPath(candidate.split(/[?#]/, 1)[0] ?? candidate)
  ) {
    return "/";
  }

  return candidate;
}

export function safeAuthCallbackPath(value: string | null | undefined): string {
  return value === "/reset-password" ? value : safeNextPath(value);
}
