import "server-only";
import { put, get } from "@vercel/blob";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Photos are stored privately. The app always links to them through
// /api/images/<key>, which sits behind the household login.
//
// On Vercel: Vercel Blob (private). Locally without a Blob token: ./.uploads/

const LOCAL_DIR = path.join(process.cwd(), ".uploads");
// Vercel connects a Blob store either with a read-write token or with a store id (OIDC).
const blobConfigured = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

export function imageUrl(key: string) {
  return `/api/images/${key}`;
}

/** Stores an image and returns its key (e.g. "recipes/abc123.jpg"). */
export async function saveImage(data: Buffer, contentType: string): Promise<string> {
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const key = `recipes/${crypto.randomUUID()}.${ext}`;
  if (blobConfigured()) {
    await put(key, data, { access: "private", contentType, addRandomSuffix: false });
  } else {
    if (process.env.VERCEL) {
      throw new Error("Photo storage isn't connected. Connect the Blob store to this project in Vercel → Storage.");
    }
    await mkdir(path.join(LOCAL_DIR, "recipes"), { recursive: true });
    await writeFile(path.join(LOCAL_DIR, key), data);
  }
  return key;
}

export async function loadImage(
  key: string,
): Promise<{ body: ReadableStream<Uint8Array> | Buffer; contentType: string } | null> {
  if (!/^recipes\/[\w-]+\.(jpg|png|webp)$/.test(key)) return null;
  if (blobConfigured()) {
    const res = await get(key, { access: "private" });
    if (!res || res.statusCode !== 200) return null;
    return { body: res.stream, contentType: res.blob.contentType };
  }
  try {
    const body = await readFile(path.join(LOCAL_DIR, key));
    const contentType = key.endsWith(".png") ? "image/png" : key.endsWith(".webp") ? "image/webp" : "image/jpeg";
    return { body, contentType };
  } catch {
    return null;
  }
}
