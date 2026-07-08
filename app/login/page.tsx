import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isValidSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const password = process.env.AUTH_PASSWORD;
  if (password) {
    const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
    if (await isValidSessionToken(token, password)) redirect("/");
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="font-heading text-3xl font-semibold sm:text-4xl">Factcheck</h1>
      <LoginForm />
    </main>
  );
}
