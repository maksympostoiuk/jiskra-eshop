import Link from "next/link";

// Fallback for requests outside of any locale (e.g. /foo without a prefix that the middleware skipped).
export default function GlobalNotFound() {
  return (
    <html lang="cs">
      <body className="grid min-h-dvh place-items-center bg-canvas p-6 text-center text-ink">
        <div>
          <p className="font-display text-6xl">404</p>
          <p className="mt-4">
            <Link className="underline" href="/">
              jiskra
            </Link>
          </p>
        </div>
      </body>
    </html>
  );
}
