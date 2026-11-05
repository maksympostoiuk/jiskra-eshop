import { getStorage, uploadKey } from "@/lib/storage";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif", gif: "image/gif" };

/**
 * Serves uploaded files from the configured Storage backend. (`next start` only serves files that existed in
 * /public at build time, and S3 objects are private, so uploads always go through here; in dev Next serves
 * local files from /public first.)
 */
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const key = uploadKey(`/uploads/${path.join("/")}`);
  const type = key ? TYPES[key.split(".").pop()!] : undefined;
  if (!key || !type) return new Response("Not found", { status: 404 });
  const data = await getStorage().read(key);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
