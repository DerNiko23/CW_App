"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";

export type LoginState = { error?: string };

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const validPassword = process.env.AUTH_PASSWORD;
  if (!validPassword) {
    console.error("AUTH_PASSWORD not configured");
    return { error: "Server ist nicht korrekt konfiguriert." };
  }

  const submitted = formData.get("password");
  if (typeof submitted !== "string" || submitted !== validPassword) {
    return { error: "Passwort stimmt nicht." };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, await createSessionToken(validPassword), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  redirect("/");
}
