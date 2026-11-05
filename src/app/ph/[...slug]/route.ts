import { PLACEHOLDER_KINDS, renderPlaceholderSvg, type PlaceholderKind } from "@/lib/placeholder";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const [kind, hex, file] = slug;
  const view = Number(/^(\d)\.svg$/.exec(file ?? "")?.[1] ?? 0);
  if (
    slug.length !== 3 ||
    !(PLACEHOLDER_KINDS as readonly string[]).includes(kind) ||
    !/^[0-9a-f]{6}$/i.test(hex) ||
    view < 1 ||
    view > 3
  ) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(renderPlaceholderSvg(kind as PlaceholderKind, hex, view), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
