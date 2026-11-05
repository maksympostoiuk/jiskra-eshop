import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { resolveUploadPath } from "@/lib/storage/local";

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
};

/**
 * Serves files uploaded at runtime. `next start` only serves files that existed in /public at build time,
 * so uploads made later are streamed from disk here (in dev, Next serves /public directly first).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const file = resolveUploadPath(path);
  const type = file ? TYPES[extname(file).toLowerCase()] : undefined;
  if (!file || !type) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(file);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
