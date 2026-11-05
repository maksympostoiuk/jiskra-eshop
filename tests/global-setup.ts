import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

/** Creates a fresh SQLite database for tests that touch Prisma. */
export default function setup() {
  if (!existsSync("prisma/schema.prisma")) return;
  execSync("npx prisma db push --force-reset --skip-generate", {
    stdio: "ignore",
    env: { ...process.env, DATABASE_URL: "file:./test.db", PRISMA_HIDE_UPDATE_MESSAGE: "1" },
  });
}
