"use client";

import Link from "next/link";
import { useActionState } from "react";

import { resetPasswordAction, type AuthActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";

import { FormMessage } from "./form-message";

const initialState: AuthActionState = {};

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <FormMessage message={state.message} status={state.status} />
      <div className="space-y-2">
        <Label htmlFor="password">Nova palavra-passe</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          minLength={12}
          required
        />
        <p className="text-xs text-muted-foreground">Mínimo de 12 caracteres.</p>
        {state.fieldErrors?.password?.[0] && (
          <p className="text-xs text-destructive-foreground">{state.fieldErrors.password[0]}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="passwordConfirmation">Confirmar palavra-passe</Label>
        <PasswordInput
          id="passwordConfirmation"
          name="passwordConfirmation"
          autoComplete="new-password"
          minLength={12}
          required
        />
        {state.fieldErrors?.passwordConfirmation?.[0] && (
          <p className="text-xs text-destructive-foreground">
            {state.fieldErrors.passwordConfirmation[0]}
          </p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "A atualizar…" : "Atualizar palavra-passe"}
      </Button>
      <Button variant="link" className="w-full" asChild>
        <Link href="/login">Cancelar</Link>
      </Button>
    </form>
  );
}
