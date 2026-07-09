"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex w-full max-w-xs flex-col gap-3">
      <label htmlFor="login-password" className="sr-only">
        Passwort
      </label>
      <input
        id="login-password"
        type="password"
        name="password"
        placeholder="Passwort"
        autoFocus
        required
        disabled={isPending}
        className="h-11 w-full rounded-full border border-white/40 bg-white/20 px-4 text-center text-base text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-md outline-none placeholder:text-foreground/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <Button
        type="submit"
        disabled={isPending}
        className="w-full justify-center border border-white/15 bg-neutral-900/60 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-md backdrop-saturate-150 hover:bg-neutral-900/75"
      >
        {isPending ? "Anmelden …" : "Anmelden"}
      </Button>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
