import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export interface AuthorizedAppUser {
  userId: string;
  email: string;
  displayName: string;
  role: "owner" | "member";
}

export type AuthorizationResult =
  | { status: "authorized"; appUser: AuthorizedAppUser }
  | { status: "unauthenticated" }
  | { status: "unauthorized" }
  | { status: "unavailable" };

export async function getAuthorization(
  supabase: SupabaseClient,
  userId: string,
  email: string,
): Promise<AuthorizationResult> {
  const { data, error } = await supabase
    .from("app_users")
    .select("user_id, display_name, role")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("[auth] Authorization lookup failed", {
      code: error.code,
      message: error.message,
    });
    return { status: "unavailable" };
  }

  if (!data || (data.role !== "owner" && data.role !== "member")) {
    return { status: "unauthorized" };
  }

  return {
    status: "authorized",
    appUser: {
      userId: data.user_id as string,
      email,
      displayName: data.display_name as string,
      role: data.role,
    },
  };
}

export async function requireAuthorizedUser(): Promise<AuthorizedAppUser> {
  if (!hasSupabaseEnv()) {
    redirect("/login?error=configuration");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const authorization = await getAuthorization(supabase, user.id, user.email ?? "");

  if (authorization.status === "authorized") {
    return authorization.appUser;
  }

  if (authorization.status === "unavailable") {
    redirect("/login?error=authorization_unavailable");
  }

  redirect("/login?error=unauthorized");
}
