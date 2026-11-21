"use client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4">
      <h1 className="text-3xl font-extrabold">This page didn&apos;t load</h1>
      <p className="text-lg text-muted">
        Something went wrong on the server. If this keeps happening, open <code>/api/health</code> on
        this site to see which setting is missing.
      </p>
      {error.digest && <p className="text-sm text-muted">Error reference: {error.digest}</p>}
      <button type="button" className="btn-primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
