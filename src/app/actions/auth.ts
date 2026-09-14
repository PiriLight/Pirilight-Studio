"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getAuthorization } from "@/lib/auth/authorization";
import { safeNextPath } from "@/lib/auth/paths";
import { getSiteUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const emailSchema = z.string().trim().toLowerCase().email("Introduz um email válido.");
const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Introduz a palavra-passe."),
});
const resetSchema = z
  .object({
    password: z
      .string()
      .min(12, "A palavra-passe deve ter pelo menos 12 caracteres.")
      .max(128, "A palavra-passe é demasiado longa."),
    passwordConfirmation: z.string(),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: "As palavras-passe não coincidem.",
    path: ["passwordConfirmation"],
  });

export interface AuthActionState {
  status?: "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revê os dados de acesso.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error || !data.user) {
      return { status: "error", message: "Email ou palavra-passe inválidos." };
    }

    const authorization = await getAuthorization(
      supabase,
      data.user.id,
      data.user.email ?? parsed.data.email,
    );

    if (authorization.status !== "authorized") {
      await supabase.auth.signOut({ scope: "local" });

      if (authorization.status === "unavailable") {
        return {
          status: "error",
          message: "O controlo de acesso ainda não está disponível. Tenta novamente mais tarde.",
        };
      }

      return {
        status: "error",
        message: "Esta conta não está autorizada a entrar no Command Center.",
      };
    }
  } catch (error) {
    console.error("[auth] Login failed before completion", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return {
      status: "error",
      message: "A autenticação ainda não está configurada ou está temporariamente indisponível.",
    };
  }

  redirect(safeNextPath(formData.get("next")));
}

export async function forgotPasswordAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = emailSchema.safeParse(formData.get("email"));

  if (!parsed.success) {
    return {
      status: "error",
      message: "Introduz um email válido.",
      fieldErrors: { email: parsed.error.issues.map((issue) => issue.message) },
    };
  }

  try {
    const supabase = await createClient();
    const siteUrl = getSiteUrl();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
    });

    if (error) {
      console.error("[auth] Password recovery request failed", {
        code: error.code,
        message: error.message,
      });
    }
  } catch (error) {
    console.error("[auth] Password recovery is unavailable", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }

  // Always return the same response to avoid revealing whether an account exists.
  return {
    status: "success",
    message: "Se existir uma conta autorizada com esse email, receberás as instruções de recuperação.",
  };
}

export async function resetPasswordAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = resetSchema.safeParse({
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "A nova palavra-passe não cumpre os requisitos.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        status: "error",
        message: "Este link expirou ou já foi utilizado. Pede uma nova recuperação.",
      };
    }

    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

    if (error) {
      return { status: "error", message: "Não foi possível atualizar a palavra-passe." };
    }

    await supabase.auth.signOut({ scope: "global" });
  } catch (error) {
    console.error("[auth] Password update failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return { status: "error", message: "Não foi possível atualizar a palavra-passe." };
  }

  redirect("/login?success=password_updated");
}

export async function logoutAction(): Promise<never> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "local" });
  } catch (error) {
    console.error("[auth] Logout failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }

  redirect("/login");
}
