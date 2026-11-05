import "server-only";
import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { removeUnreferencedUploads } from "@/lib/storage/cleanup";

/** Best-effort cleanup after content changes; a failure never breaks the save itself. */
export async function cleanupUploads(urls: Array<string | null | undefined>): Promise<void> {
  await removeUnreferencedUploads(prisma, getStorage(), urls).catch((error) => console.error("Upload cleanup failed", error));
}
