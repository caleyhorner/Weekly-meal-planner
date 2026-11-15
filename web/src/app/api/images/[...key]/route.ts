import sharp from "sharp";
import { loadImage } from "@/lib/storage";

// Thumbnail widths the app asks for (?w=). Anything else gets the original.
const SIZES = new Set([96, 160, 320]);

async function toBuffer(body: ReadableStream<Uint8Array> | Buffer): Promise<Buffer> {
  if (Buffer.isBuffer(body)) return body;
  return Buffer.from(await new Response(body).arrayBuffer());
}

export async function GET(req: Request, ctx: RouteContext<"/api/images/[...key]">) {
  const { key } = await ctx.params;
  const image = await loadImage(key.join("/"));
  if (!image) return new Response("Not found", { status: 404 });

  // Keys are random and never reused, so the browser can keep them.
  const headers = { "Cache-Control": "private, max-age=31536000, immutable" };
  const w = Number(new URL(req.url).searchParams.get("w"));
  if (!SIZES.has(w)) {
    return new Response(image.body as BodyInit, { headers: { ...headers, "Content-Type": image.contentType } });
  }

  // Small square thumbnail for lists, so a page of recipes doesn't download full photos.
  try {
    const thumb = await sharp(await toBuffer(image.body))
      .rotate()
      .resize(w, w, { fit: "cover" })
      .jpeg({ quality: 72 })
      .toBuffer();
    return new Response(new Uint8Array(thumb), { headers: { ...headers, "Content-Type": "image/jpeg" } });
  } catch {
    return new Response("Couldn't make a thumbnail", { status: 500 });
  }
}
