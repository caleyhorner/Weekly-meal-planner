"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  passphraseMatches,
} from "@/lib/session";

export async function login(_prev: { error: string }, formData: FormData) {
  const passphrase = String(formData.get("passphrase") ?? "");
  if (!process.env.HOUSEHOLD_PASSPHRASE || (process.env.SESSION_SECRET?.length ?? 0) < 32) {
    return {
      error:
        "Sign-in isn't set up yet: HOUSEHOLD_PASSPHRASE and SESSION_SECRET (32+ characters) need adding in Vercel's environment variables.",
    };
  }
  if (!passphraseMatches(passphrase)) {
    // Small delay to make guessing slow.
    await new Promise((r) => setTimeout(r, 800));
    return { error: "That's not it. Try again." };
  }
  (await cookies()).set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  const next = String(formData.get("next") ?? "/");
  // Only allow local paths to avoid open redirects.
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}
