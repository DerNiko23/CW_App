"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex w-full max-w-xs flex-col gap-3">
      <input
        type="password"
        name="password"
        placeholder="Passwort"
        autoFocus
        required
        disabled={isPending}
        className="h-10 w-full rounded-lg border border-input bg-card px-3 text-center text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <Button type="submit" disabled={isPending} className="w-full justify-center">
        {isPending ? "Anmelden …" : "Anmelden"}
      </Button>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
