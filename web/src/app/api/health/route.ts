import { sql } from "drizzle-orm";
import { db } from "@/db";

// Public setup check: reports only whether each setting is present, never its value.
export const dynamic = "force-dynamic";

export async function GET() {
  const env = (name: string) => Boolean(process.env[name]);
  const checks: Record<string, string> = {
    HOUSEHOLD_PASSPHRASE: env("HOUSEHOLD_PASSPHRASE") ? "set" : "MISSING",
    SESSION_SECRET:
      (process.env.SESSION_SECRET?.length ?? 0) >= 32
        ? "set"
        : env("SESSION_SECRET")
          ? "TOO SHORT (needs 32+ characters)"
          : "MISSING",
    DATABASE_URL: env("DATABASE_URL") ? "set" : "MISSING",
    photo_storage:
      env("BLOB_READ_WRITE_TOKEN") || env("BLOB_STORE_ID") ? "connected" : "MISSING (connect the Blob store)",
    ANTHROPIC_API_KEY: env("ANTHROPIC_API_KEY") ? "set" : "missing (recipe reading off)",
    openclaw:
      env("OPENCLAW_HOOK_URL") && env("OPENCLAW_HOOK_TOKEN")
        ? "connected"
        : "not set up (Send to OpenClaw button hidden)",
  };
  try {
    const rows = await db.execute<{ n: number }>(sql`select count(*)::int as n from recipes`);
    checks.database = `connected, ${rows[0]?.n ?? 0} recipes`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    checks.database = /does not exist/.test(msg)
      ? "connected but tables are MISSING (migrations didn't run)"
      : `NOT REACHABLE (${msg.slice(0, 120)})`;
  }
  return Response.json(checks, { headers: { "Cache-Control": "no-store" } });
}
