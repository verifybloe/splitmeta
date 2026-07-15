import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Placeholder lets `prisma generate` work on Vercel before DATABASE_URL is set.
    url: process.env.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/splitmeta",
  },
});
