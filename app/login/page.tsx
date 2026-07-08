import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isValidSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { FlowFieldBackground } from "@/components/login/flow-field-background";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const password = process.env.AUTH_PASSWORD;
  if (password) {
    const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
    if (await isValidSessionToken(token, password)) redirect("/");
  }

  return (
    <main className="relative flex min-h-svh w-full flex-1 items-center justify-center overflow-hidden px-4">
      <FlowFieldBackground />
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-6 px-8 py-10 text-center">
        <h1 className="font-heading text-3xl font-semibold [text-shadow:0_2px_20px_rgba(250,250,250,0.9)] sm:text-4xl">
          Factcheck
        </h1>
        <LoginForm />
      </div>
    </main>
  );
}
