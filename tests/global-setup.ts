import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";

/**
 * Creates a fresh, throwaway SQLite database (prisma/test.db) for tests that touch Prisma.
 * The file only ever holds test data, so it is simply deleted and recreated.
 */
export default function setup() {
  if (!existsSync("prisma/schema.prisma")) return;
  for (const file of ["prisma/test.db", "prisma/test.db-journal"]) rmSync(file, { force: true });
  execSync("npx prisma db push --skip-generate", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: "file:./test.db", PRISMA_HIDE_UPDATE_MESSAGE: "1" },
  });
}
