import { loadImage } from "@/lib/storage";

export async function GET(_req: Request, ctx: RouteContext<"/api/images/[...key]">) {
  const { key } = await ctx.params;
  const image = await loadImage(key.join("/"));
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(image.body as BodyInit, {
    headers: {
      "Content-Type": image.contentType,
      // Keys are random and never reused, so the browser can keep them.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
