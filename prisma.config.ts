import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Placeholder is fine for `prisma generate` on Vercel. Real DB comes later.
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  },
});
