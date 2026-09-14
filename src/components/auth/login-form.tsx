"use client";

import Link from "next/link";
import { useActionState } from "react";

import { loginAction, type AuthActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";

import { FormMessage } from "./form-message";

const initialState: AuthActionState = {};

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="next" value={nextPath} />
      <FormMessage message={state.message} status={state.status} />

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          required
          aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
        />
        {state.fieldErrors?.email?.[0] && (
          <p id="email-error" className="text-xs text-destructive-foreground">
            {state.fieldErrors.email[0]}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="password">Palavra-passe</Label>
          <Link href="/forgot-password" className="text-xs text-info hover:underline">
            Esqueci-me da palavra-passe
          </Link>
        </div>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
          aria-describedby={state.fieldErrors?.password ? "password-error" : undefined}
        />
        {state.fieldErrors?.password?.[0] && (
          <p id="password-error" className="text-xs text-destructive-foreground">
            {state.fieldErrors.password[0]}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "A entrar…" : "Entrar"}
      </Button>
    </form>
  );
}
