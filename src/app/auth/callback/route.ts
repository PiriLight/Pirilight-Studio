import { NextResponse, type NextRequest } from "next/server";

import { safeAuthCallbackPath } from "@/lib/auth/paths";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = safeAuthCallbackPath(requestUrl.searchParams.get("next"));
  const flowId = requestUrl.searchParams.get("sb_flow_id");

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(
        code,
        flowId ? { flowId } : undefined,
      );

      if (!error) {
        const response = NextResponse.redirect(new URL(nextPath, requestUrl.origin));
        response.headers.set("Cache-Control", "private, no-store");
        return response;
      }
    } catch (error) {
      console.error("[auth] Callback exchange failed", {
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth_callback", requestUrl.origin));
}
