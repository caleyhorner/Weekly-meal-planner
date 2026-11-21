import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <h1 className="text-4xl font-extrabold">Dinners</h1>
      <p className="mt-2 text-muted">Enter the household passphrase to plan the week.</p>
      <LoginForm next={typeof next === "string" ? next : "/"} />
    </main>
  );
}
