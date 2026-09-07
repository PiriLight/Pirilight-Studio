"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";

import type { AuthActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

import { FormMessage } from "./form-message";

const initialState: AuthActionState = {};

export function ForgotPasswordForm() {
  const [state, setState] = useState<AuthActionState>(initialState);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();

    if (!email) {
      setState({
        status: "error",
        message: "Introduz um email válido.",
        fieldErrors: { email: ["Introduz um email válido."] },
      });
      return;
    }

    setPending(true);
    setState(initialState);

    try {
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", "/reset-password");

      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: callbackUrl.toString(),
      });

      if (error) {
        console.error(
          `[auth] Password recovery request rejected (${error.code ?? "unknown"}): ${error.message}`,
        );
      }
    } catch (error) {
      console.error("[auth] Password recovery request failed", {
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setPending(false);
      // Keep the response generic so the form never reveals whether an account exists.
      setState({
        status: "success",
        message:
          "Se existir uma conta autorizada com esse email, receberás as instruções de recuperação.",
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormMessage message={state.message} status={state.status} />
      <div className="space-y-2">
        <Label htmlFor="email">Email da conta</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        {state.fieldErrors?.email?.[0] && (
          <p className="text-xs text-destructive-foreground">{state.fieldErrors.email[0]}</p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "A enviar…" : "Enviar instruções"}
      </Button>
      <Button variant="link" className="w-full" asChild>
        <Link href="/login">Voltar ao login</Link>
      </Button>
    </form>
  );
}
