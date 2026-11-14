import "server-only";
import { createHash } from "node:crypto";

// Sends the shopping list to the household's OpenClaw agent through its webhook
// (POST <gateway>/hooks/agent with a hook token). OpenClaw then adds the items to the
// Groceries list in Apple Reminders, as it does with the Telegram message today.
//
// Settings (Vercel → Environment Variables):
//   OPENCLAW_HOOK_URL    full URL of the hook, e.g. https://<machine>.<tailnet>.ts.net/hooks/agent
//   OPENCLAW_HOOK_TOKEN  the hooks.token from OpenClaw's config (not the gateway password)

export function openClawConfigured(): boolean {
  return Boolean(process.env.OPENCLAW_HOOK_URL && process.env.OPENCLAW_HOOK_TOKEN);
}

export type SendResult = { ok: true } | { ok: false; error: string };

export async function sendToOpenClaw(groceries: string, weekStart: string): Promise<SendResult> {
  const url = process.env.OPENCLAW_HOOK_URL;
  const token = process.env.OPENCLAW_HOOK_TOKEN;
  if (!url || !token) return { ok: false, error: "OpenClaw isn't connected yet." };

  // Same list for the same week = same key, so pressing twice doesn't add everything twice.
  const idempotencyKey = createHash("sha256").update(`${weekStart}\n${groceries}`).digest("hex").slice(0, 32);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        name: "Dinners",
        message:
          `${groceries}\n\n` +
          "(From our Dinners meal planner: please add each line above as a separate item in the Groceries list in Apple Reminders.)",
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return {
      ok: false,
      error: "Couldn't reach OpenClaw. Is the computer it runs on switched on and online?",
    };
  }

  if (res.ok) return { ok: true };
  if (res.status === 401 || res.status === 403) {
    return { ok: false, error: "OpenClaw rejected the token. Check OPENCLAW_HOOK_TOKEN matches hooks.token." };
  }
  if (res.status === 404) {
    return { ok: false, error: "OpenClaw's webhook isn't switched on (or the address is wrong)." };
  }
  return { ok: false, error: `OpenClaw answered with an error (${res.status}).` };
}
