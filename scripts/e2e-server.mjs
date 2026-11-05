// Starts the production server for Playwright on a fresh, seeded SQLite database (prisma/e2e.db).
// Requires a prior `npm run build`.
import { spawn, execSync } from "node:child_process";
import { rmSync } from "node:fs";

const env = {
  ...process.env,
  DATABASE_URL: "file:./e2e.db",
  SEED_ADMIN_EMAIL: "admin@jiskra.local",
  SEED_ADMIN_PASSWORD: "e2e-admin-password",
  SEED_ADMIN_NAME: "E2E Admin",
  PRISMA_HIDE_UPDATE_MESSAGE: "1",
};
for (const f of ["prisma/e2e.db", "prisma/e2e.db-journal"]) rmSync(f, { force: true });
execSync("npx prisma db push --skip-generate", { stdio: "inherit", env });
execSync("npx prisma db seed", { stdio: "inherit", env });
const server = spawn("npx", ["next", "start", "-p", process.env.E2E_PORT ?? "3200"], { stdio: "inherit", env });
const stop = () => server.kill("SIGTERM");
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
server.on("exit", (code) => process.exit(code ?? 0));
