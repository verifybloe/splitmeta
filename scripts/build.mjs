import { execSync } from "node:child_process";

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

run("npx prisma generate");

const dbUrl = process.env.DATABASE_URL ?? "";
const canMigrate =
  dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://");

if (canMigrate) {
  run("npx prisma migrate deploy");
} else {
  console.warn(
    "DATABASE_URL not set to Postgres — skipping migrate deploy (auth/billing need Neon).",
  );
}

run("node scripts/package-companion.mjs");
run("npx next build");
