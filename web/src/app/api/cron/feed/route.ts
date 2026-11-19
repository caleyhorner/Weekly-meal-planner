import { refreshAll } from "@/lib/feed/refresh";

// Daily check of the household's recipe websites (scheduled in vercel.json).
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  // Vercel sends "Authorization: Bearer <CRON_SECRET>" when CRON_SECRET is set.
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const fromVercelCron = (req.headers.get("user-agent") ?? "").includes("vercel-cron");
  if (secret ? auth !== `Bearer ${secret}` : !fromVercelCron) {
    return new Response("Unauthorized", { status: 401 });
  }
  const results = await refreshAll();
  return Response.json({ checked: results });
}
