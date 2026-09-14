import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isPublicAuthPath } from "@/lib/auth/paths";

import { getSupabaseEnv, hasSupabaseEnv } from "./env";

function redirectToLogin(request: NextRequest, reason?: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";

  if (reason) {
    url.searchParams.set("error", reason);
  }

  if (request.nextUrl.pathname !== "/") {
    url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  }

  return NextResponse.redirect(url);
}

function copyResponseState(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));

  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = source.headers.get(header);
    if (value) target.headers.set(header, value);
  }

  return target;
}

export async function updateSession(request: NextRequest) {
  const publicPath = isPublicAuthPath(request.nextUrl.pathname);

  if (!hasSupabaseEnv()) {
    return publicPath ? NextResponse.next({ request }) : redirectToLogin(request, "configuration");
  }

  let response = NextResponse.next({ request });
  const { url, publishableKey } = getSupabaseEnv();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();

  if ((error || !data?.claims) && !publicPath) {
    return copyResponseState(response, redirectToLogin(request));
  }

  return response;
}
